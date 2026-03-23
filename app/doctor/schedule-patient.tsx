import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setDoctorTabSwipeBlocked } from "../../lib/doctorTabSwipeGuard";
import { store } from "../../lib/store";

/* ── colours ── */
const T = {
  teal: "#0f766e",
  tealDark: "#134e4a",
  tealSoft: "rgba(15,118,110,0.08)",
  bg: "#f8fafc",
  white: "#fff",
  text: "#0f172a",
  textSec: "#64748b",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  redSoft: "#fff1f2",
  redText: "#be123c",
};

/* ── constants ── */
const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const WEEKDAY_LABELS: Record<string, string> = {
  mon: "MON", tue: "TUE", wed: "WED", thu: "THU", fri: "FRI", sat: "SAT", sun: "SUN",
};
const CAL_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const HALF_HOUR = 30;
const MIN_TIME = 7 * 60;
const MAX_TIME = 22 * 60;

type DayHours = {
  open: boolean;
  start: number;
  end: number;
  lunch: { start: number; end: number } | null;
};
type WeeklyHours = Record<string, DayHours>;

type OpeningHoursData = {
  defaultHours: WeeklyHours;
  weekOverrides: Record<string, WeeklyHours>; // key = "2026-W12"
  dateOverrides?: Record<string, boolean>;     // key = "2026-03-25", true = force open, false = force closed
};

/* ── default hours ── */
const DEFAULT_HOURS: WeeklyHours = {
  mon: { open: true, start: 540, end: 1080, lunch: { start: 720, end: 780 } },
  tue: { open: true, start: 540, end: 1080, lunch: { start: 720, end: 780 } },
  wed: { open: true, start: 540, end: 1080, lunch: { start: 720, end: 780 } },
  thu: { open: true, start: 540, end: 1080, lunch: { start: 720, end: 780 } },
  fri: { open: true, start: 540, end: 1080, lunch: { start: 720, end: 780 } },
  sat: { open: false, start: 540, end: 1080, lunch: null },
  sun: { open: false, start: 540, end: 1080, lunch: null },
};

/* ── helpers ── */
const clamp = (v: number) => Math.max(MIN_TIME, Math.min(MAX_TIME, v));
const fmtTime = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
const deepClone = <T2,>(v: T2): T2 => JSON.parse(JSON.stringify(v));

const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/* ── ISO week helpers ── */
const getISOWeekKey = (d: Date): string => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // Monday-based: adjust so Monday=0
  const dayOfWeek = (date.getDay() + 6) % 7; // Mon=0 ... Sun=6
  // Thursday of this week
  date.setDate(date.getDate() - dayOfWeek + 3);
  const firstThursday = new Date(date.getFullYear(), 0, 4);
  const diff = date.getTime() - firstThursday.getTime();
  const weekNum = 1 + Math.round(diff / (7 * 86400000));
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
};

const getWeekMonday = (d: Date): Date => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday
  date.setDate(date.getDate() + diff);
  return date;
};

const getWeekRange = (d: Date): { start: Date; end: Date } => {
  const mon = getWeekMonday(d);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: mon, end: sun };
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const fmtShortDate = (d: Date): string =>
  `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;

type CalDay = { date: Date; day: number; isCurrentMonth: boolean; weekKey: string };

const buildCalendarDays = (year: number, month: number): CalDay[] => {
  const days: CalDay[] = [];
  const first = new Date(year, month, 1);
  // Sunday-based
  const startPad = first.getDay();
  const start = new Date(year, month, 1 - startPad);
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    days.push({
      date: d,
      day: d.getDate(),
      isCurrentMonth: d.getMonth() === month && d.getFullYear() === year,
      weekKey: getISOWeekKey(d),
    });
  }
  return days;
};

/* ── convert from old store format ── */
const fromLegacy = (profile: any): OpeningHoursData | null => {
  // New format
  if (profile?.openingHours) {
    const oh = profile.openingHours;
    const dh: any = {};
    for (const k of WEEKDAY_KEYS) {
      const d = oh.defaultHours?.[k];
      dh[k] = d ? {
        open: d.open ?? false,
        start: typeof d.start === "number" ? d.start : 540,
        end: typeof d.end === "number" ? d.end : 1080,
        lunch: d.lunch ? { start: d.lunch.start ?? 720, end: d.lunch.end ?? 780 } : null,
      } : { open: false, start: 540, end: 1080, lunch: null };
    }
    const wo: Record<string, WeeklyHours> = {};
    if (oh.weekOverrides && typeof oh.weekOverrides === "object") {
      for (const [wk, wv] of Object.entries(oh.weekOverrides)) {
        const wh: any = {};
        for (const k of WEEKDAY_KEYS) {
          const d = (wv as any)?.[k];
          wh[k] = d ? {
            open: d.open ?? false,
            start: typeof d.start === "number" ? d.start : 540,
            end: typeof d.end === "number" ? d.end : 1080,
            lunch: d.lunch ? { start: d.lunch.start ?? 720, end: d.lunch.end ?? 780 } : null,
          } : { open: false, start: 540, end: 1080, lunch: null };
        }
        wo[wk] = wh;
      }
    }
    const dateOv: Record<string, boolean> = {};
    if (oh.dateOverrides && typeof oh.dateOverrides === "object") {
      for (const [date, val] of Object.entries(oh.dateOverrides)) {
        if (typeof val === "boolean") dateOv[date] = val;
        else if (val && typeof (val as any).open === "boolean") dateOv[date] = (val as any).open;
      }
    }
    return { defaultHours: dh, weekOverrides: wo, dateOverrides: dateOv };
  }

  // Legacy weeklyHours → migrate to defaultHours
  if (profile?.weeklyHours) {
    const wh = profile.weeklyHours;
    const dh: any = {};
    for (const k of WEEKDAY_KEYS) {
      const d = wh[k];
      dh[k] = d ? {
        open: d.open ?? false,
        start: typeof d.start === "number" ? d.start : 540,
        end: typeof d.end === "number" ? d.end : 1080,
        lunch: d.lunch ? { start: d.lunch.start ?? 720, end: d.lunch.end ?? 780 } : null,
      } : { open: false, start: 540, end: 1080, lunch: null };
    }
    return { defaultHours: dh, weekOverrides: {}, dateOverrides: {} };
  }

  // Legacy weekdayBusinessHours
  if (profile?.weekdayBusinessHours) {
    const old = profile.weekdayBusinessHours;
    const dayMap = [6, 0, 1, 2, 3, 4, 5];
    const dh: any = {};
    for (const k of WEEKDAY_KEYS) dh[k] = { open: false, start: 540, end: 1080, lunch: null };
    for (const [idx, val] of Object.entries(old)) {
      const i = Number(idx);
      if (i < 0 || i > 6 || !val) continue;
      const v = val as any;
      const key = WEEKDAY_KEYS[dayMap[i]];
      if (!key) continue;
      dh[key] = {
        open: !!v.enabled,
        start: typeof v.openMin === "number" ? v.openMin : 540,
        end: typeof v.closeMin === "number" ? v.closeMin : 1080,
        lunch: v.lunchEnabled ? { start: v.lunchStartMin ?? 720, end: v.lunchEndMin ?? 780 } : null,
      };
    }
    return { defaultHours: dh, weekOverrides: {}, dateOverrides: {} };
  }

  return null;
};

/* ── validation ── */
const validate = (hours: WeeklyHours): string | null => {
  const openDays = WEEKDAY_KEYS.filter((k) => hours[k].open);
  if (openDays.length === 0) return "All days are closed. Please enable at least one day.";
  for (const k of openDays) {
    const d = hours[k];
    if (d.end <= d.start) return `${WEEKDAY_LABELS[k]}: End time must be after start time.`;
    if (d.end - d.start < 60) return `${WEEKDAY_LABELS[k]}: Minimum operating time is 1 hour.`;
    if (d.lunch) {
      if (d.lunch.start < d.start || d.lunch.end > d.end)
        return `${WEEKDAY_LABELS[k]}: Lunch break is outside operating hours.`;
      if (d.lunch.end <= d.lunch.start)
        return `${WEEKDAY_LABELS[k]}: Lunch end must be after lunch start.`;
    }
  }
  return null;
};

const fullStateKey = (dh: WeeklyHours, wo: Record<string, WeeklyHours>, dov: Record<string, boolean> = {}) =>
  JSON.stringify({ dh, wo, dov });

/* ================================================================ */
export default function SchedulePatientScreen() {
  const insets = useSafeAreaInsets();

  // Core data
  const [defaultHours, setDefaultHours] = useState<WeeklyHours>(deepClone(DEFAULT_HOURS));
  const [weekOverrides, setWeekOverrides] = useState<Record<string, WeeklyHours>>({});
  const [dateOverrides, setDateOverrides] = useState<Record<string, boolean>>({});
  const [savedKey, setSavedKey] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Calendar
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Week selection: null = editing defaultHours (all year), string = specific week
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedWeekDate, setSelectedWeekDate] = useState<Date | null>(null);

  // Copy modal
  const [copyModal, setCopyModal] = useState<{ sourceDay: string; checked: Record<string, boolean> } | null>(null);

  /* ── The hours being edited right now ── */
  const activeHours = useMemo<WeeklyHours>(() => {
    if (!selectedWeek) return defaultHours;
    return weekOverrides[selectedWeek] ?? defaultHours;
  }, [selectedWeek, defaultHours, weekOverrides]);

  const setActiveHours = useCallback((updater: (prev: WeeklyHours) => WeeklyHours) => {
    if (!selectedWeek) {
      setDefaultHours(updater);
    } else {
      setWeekOverrides((prev) => {
        const current = prev[selectedWeek] ?? deepClone(defaultHours);
        const next = updater(current);
        return { ...prev, [selectedWeek]: next };
      });
    }
  }, [selectedWeek, defaultHours]);

  /* ── load ── */
  useEffect(() => {
    (async () => {
      const profile = (await store.getDoctorProfile()) || {};
      const data = fromLegacy(profile);
      if (data) {
        setDefaultHours(data.defaultHours);
        setWeekOverrides(data.weekOverrides);
        setDateOverrides(data.dateOverrides || {});
        setSavedKey(fullStateKey(data.defaultHours, data.weekOverrides, data.dateOverrides || {}));
      } else {
        setSavedKey(fullStateKey(DEFAULT_HOURS, {}, {}));
      }
      setLoaded(true);
    })();
    return () => { setDoctorTabSwipeBlocked(false); };
  }, []);

  const isDirty = useMemo(
    () => loaded && fullStateKey(defaultHours, weekOverrides, dateOverrides) !== savedKey,
    [loaded, defaultHours, weekOverrides, dateOverrides, savedKey]
  );
  useEffect(() => { setDoctorTabSwipeBlocked(isDirty); }, [isDirty]);

  /* ── calendar ── */
  const calDays = useMemo(() => buildCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const selectedWeekRange = useMemo(() => {
    if (!selectedWeekDate) return null;
    return getWeekRange(selectedWeekDate);
  }, [selectedWeekDate]);

  const overrideWeekKeys = useMemo(() => new Set(Object.keys(weekOverrides)), [weekOverrides]);

  /* Helper: is a date "open" by default (considering week overrides + default hours) */
  const isDateDefaultOpen = useCallback((d: Date): boolean => {
    const dayIdx = (d.getDay() + 6) % 7;
    const dayKey = WEEKDAY_KEYS[dayIdx];
    const weekKey = getISOWeekKey(d);
    const hours = weekOverrides[weekKey]?.[dayKey] ?? defaultHours[dayKey];
    return hours?.open ?? false;
  }, [defaultHours, weekOverrides]);

  /* Tap → toggle individual date available/unavailable */
  const handleDatePress = useCallback((d: Date) => {
    const dateStr = toDateStr(d);
    setDateOverrides((prev) => {
      const next = { ...prev };
      if (dateStr in next) {
        // Already overridden → remove override (back to default)
        delete next[dateStr];
      } else {
        // Not overridden → set opposite of default
        const defaultOpen = isDateDefaultOpen(d);
        next[dateStr] = !defaultOpen;
      }
      return next;
    });
  }, [isDateDefaultOpen]);

  const clearWeekOverride = useCallback(() => {
    if (!selectedWeek) return;
    Alert.alert(
      "Reset to Default",
      "Remove custom schedule for this week? It will use the default schedule.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setWeekOverrides((prev) => {
              const next = { ...prev };
              delete next[selectedWeek];
              return next;
            });
            setSelectedWeek(null);
            setSelectedWeekDate(null);
          },
        },
      ]
    );
  }, [selectedWeek]);

  const goMonth = (dir: -1 | 1) => {
    setViewMonth((m) => {
      if (dir === -1 && m === 0) { setViewYear((y) => y - 1); return 11; }
      if (dir === 1 && m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + dir;
    });
  };

  /* ── month toggle — only affects clinic-hours days ── */
  // Check if all default-open (clinic hours) days in this month are effectively open
  const isClinicDaysAllOpen = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    let hasClinicDay = false;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      if (!isDateDefaultOpen(date)) continue; // skip non-clinic days
      hasClinicDay = true;
      const dateStr = toDateStr(date);
      const hasOverride = dateStr in dateOverrides;
      const effectiveOpen = hasOverride ? dateOverrides[dateStr] : true; // default is open
      if (!effectiveOpen) return false;
    }
    return hasClinicDay; // false if no clinic days exist
  }, [viewYear, viewMonth, dateOverrides, isDateDefaultOpen]);

  const toggleMonth = useCallback(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    setDateOverrides((prev) => {
      const next = { ...prev };
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(viewYear, viewMonth, d);
        if (!isDateDefaultOpen(date)) continue; // skip non-clinic days
        const dateStr = toDateStr(date);
        if (isClinicDaysAllOpen) {
          // Deselect: force clinic-hours days closed
          next[dateStr] = false;
        } else {
          // Select: remove any force-closed override (back to default open)
          delete next[dateStr];
        }
      }
      return next;
    });
  }, [viewYear, viewMonth, isClinicDaysAllOpen, isDateDefaultOpen]);

  /* ── day mutations ── */
  const toggleDay = (day: string) => {
    setActiveHours((prev) => {
      const next = deepClone(prev);
      next[day].open = !next[day].open;
      return next;
    });
  };

  const shiftTime = (day: string, field: "start" | "end", dir: -1 | 1) => {
    setActiveHours((prev) => {
      const next = deepClone(prev);
      const d = next[day];
      d[field] = clamp(d[field] + dir * HALF_HOUR);
      if (d.start >= d.end) {
        if (field === "start") d.start = d.end - HALF_HOUR;
        else d.end = d.start + HALF_HOUR;
      }
      if (d.lunch) {
        if (d.lunch.start < d.start) d.lunch.start = d.start;
        if (d.lunch.end > d.end) d.lunch.end = d.end;
        if (d.lunch.start >= d.lunch.end) d.lunch = null;
      }
      return next;
    });
  };

  const toggleLunch = (day: string) => {
    setActiveHours((prev) => {
      const next = deepClone(prev);
      const d = next[day];
      if (d.lunch) { d.lunch = null; }
      else {
        d.lunch = { start: 720, end: 780 };
        if (d.lunch.start < d.start) d.lunch.start = d.start;
        if (d.lunch.end > d.end) d.lunch.end = d.end;
        if (d.lunch.start >= d.lunch.end) d.lunch = { start: d.start, end: Math.min(d.start + 60, d.end) };
      }
      return next;
    });
  };

  const shiftLunch = (day: string, field: "start" | "end", dir: -1 | 1) => {
    setActiveHours((prev) => {
      const next = deepClone(prev);
      const d = next[day];
      if (!d.lunch) return next;
      d.lunch[field] = clamp(d.lunch[field] + dir * HALF_HOUR);
      if (d.lunch.start < d.start) d.lunch.start = d.start;
      if (d.lunch.end > d.end) d.lunch.end = d.end;
      if (d.lunch.start >= d.lunch.end) {
        if (field === "start") d.lunch.start = d.lunch.end - HALF_HOUR;
        else d.lunch.end = d.lunch.start + HALF_HOUR;
      }
      return next;
    });
  };

  /* ── copy to days ── */
  const openCopyModal = (sourceDay: string) => {
    const checked: Record<string, boolean> = {};
    for (const k of WEEKDAY_KEYS) if (k !== sourceDay) checked[k] = false;
    setCopyModal({ sourceDay, checked });
  };
  const toggleCopyTarget = (day: string) => {
    setCopyModal((prev) => prev ? { ...prev, checked: { ...prev.checked, [day]: !prev.checked[day] } } : prev);
  };
  const selectAllCopyTargets = () => {
    setCopyModal((prev) => {
      if (!prev) return prev;
      const checked: Record<string, boolean> = {};
      for (const k of Object.keys(prev.checked)) checked[k] = true;
      return { ...prev, checked };
    });
  };
  const applyCopy = () => {
    if (!copyModal) return;
    const targets = Object.entries(copyModal.checked).filter(([, v]) => v).map(([k]) => k);
    if (targets.length === 0) { setCopyModal(null); return; }
    setActiveHours((prev) => {
      const next = deepClone(prev);
      const src = next[copyModal.sourceDay];
      for (const t of targets) next[t] = { open: src.open, start: src.start, end: src.end, lunch: src.lunch ? { ...src.lunch } : null };
      return next;
    });
    setCopyModal(null);
    Alert.alert("Applied", `${WEEKDAY_LABELS[copyModal.sourceDay]} copied to ${targets.map((t) => WEEKDAY_LABELS[t]).join(", ")}.`);
  };

  /* ── save ── */
  const handleSave = async () => {
    // Validate default
    const errDefault = validate(defaultHours);
    if (errDefault) { Alert.alert("Default Schedule Error", errDefault); return; }
    // Validate overrides
    for (const [wk, wh] of Object.entries(weekOverrides)) {
      const errOv = validate(wh);
      if (errOv) { Alert.alert(`Week ${wk} Error`, errOv); return; }
    }

    setSaving(true);
    try {
      const profile = (await store.getDoctorProfile()) || {};
      // Clean overrides that are identical to default
      const cleanOverrides: Record<string, WeeklyHours> = {};
      for (const [wk, wh] of Object.entries(weekOverrides)) {
        if (JSON.stringify(wh) !== JSON.stringify(defaultHours)) {
          cleanOverrides[wk] = wh;
        }
      }
      // Clean dateOverrides: remove past dates
      const todayStr = toDateStr(today);
      const cleanDateOverrides: Record<string, boolean> = {};
      for (const [date, val] of Object.entries(dateOverrides)) {
        if (date >= todayStr) cleanDateOverrides[date] = val;
      }
      await store.saveDoctorProfile({
        ...profile,
        openingHours: { defaultHours, weekOverrides: cleanOverrides, dateOverrides: cleanDateOverrides },
        weeklyHours: defaultHours, // backward compat
      });
      setWeekOverrides(cleanOverrides);
      setDateOverrides(cleanDateOverrides);
      setSavedKey(fullStateKey(defaultHours, cleanOverrides, cleanDateOverrides));
      setDoctorTabSwipeBlocked(false);
      Alert.alert("Saved", "Your opening hours have been updated.");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save opening hours.");
    } finally {
      setSaving(false);
    }
  };

  /* ── derived ── */
  const openDays = WEEKDAY_KEYS.filter((k) => activeHours[k].open);
  const bottomBarOffset = Math.max(insets.bottom, 4) + 64;

  const weekLabel = useMemo(() => {
    if (!selectedWeek || !selectedWeekDate) return null;
    const range = getWeekRange(selectedWeekDate);
    return `${fmtShortDate(range.start)} – ${fmtShortDate(range.end)}`;
  }, [selectedWeek, selectedWeekDate]);

  /* ── render ── */
  return (
    <View style={s.container}>
      <LinearGradient colors={[T.teal, T.tealDark]} style={s.header}>
        <Text style={s.title}>Opening Hours</Text>
        <Text style={s.subtitle}>Set your clinic's weekly schedule</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomBarOffset + 100 }]} showsVerticalScrollIndicator={false}>

        {/* ── Calendar ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Calendar</Text>
          <Text style={s.sectionHint}>Tap a date to toggle available/unavailable.</Text>

          <View style={s.calCard}>
            {/* Month nav */}
            <View style={s.calNav}>
              <TouchableOpacity style={s.calNavBtn} onPress={() => goMonth(-1)} activeOpacity={0.6}>
                <Text style={s.calNavArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={s.calMonthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
              <TouchableOpacity style={s.calNavBtn} onPress={() => goMonth(1)} activeOpacity={0.6}>
                <Text style={s.calNavArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={s.calWeekRow}>
              {CAL_WEEKDAYS.map((w) => (
                <View key={w} style={s.calWeekCell}>
                  <Text style={s.calWeekText}>{w}</Text>
                </View>
              ))}
            </View>

            {/* Day grid */}
            <View style={s.calGrid}>
              {calDays.map((cd, idx) => {
                const dateStr = toDateStr(cd.date);
                const inSelectedWeek = selectedWeekRange
                  ? cd.date >= selectedWeekRange.start && cd.date <= selectedWeekRange.end
                  : false;
                const hasWeekOverride = overrideWeekKeys.has(cd.weekKey);
                const isToday = isSameDay(cd.date, today);
                const isWeekStart = inSelectedWeek && selectedWeekRange && isSameDay(cd.date, selectedWeekRange.start);
                const isWeekEnd = inSelectedWeek && selectedWeekRange && isSameDay(cd.date, selectedWeekRange.end);

                // Effective open status (override > default weekly hours)
                const hasDateOverride = dateStr in dateOverrides;
                const defaultOpen = isDateDefaultOpen(cd.date);
                const effectiveOpen = hasDateOverride ? dateOverrides[dateStr] : defaultOpen;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={s.calDayCell}
                    onPress={() => handleDatePress(cd.date)}
                    activeOpacity={0.6}
                  >
                    {/* Week highlight band */}
                    {inSelectedWeek && (
                      <View style={[
                        s.calWeekBand,
                        isWeekStart && s.calWeekBandStart,
                        isWeekEnd && s.calWeekBandEnd,
                      ]} />
                    )}
                    <View style={[
                      s.calDayInner,
                      !cd.isCurrentMonth && s.calDayOther,
                      isToday && !inSelectedWeek && !effectiveOpen && s.calDayToday,
                      cd.isCurrentMonth && effectiveOpen && s.calDayOpen,
                    ]}>
                      <Text style={[
                        s.calDayText,
                        !cd.isCurrentMonth && s.calDayTextOther,
                        inSelectedWeek && s.calDayTextSelected,
                        isToday && !inSelectedWeek && !effectiveOpen && s.calDayTextToday,
                        cd.isCurrentMonth && effectiveOpen && s.calDayTextOpen,
                      ]}>
                        {cd.day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected week indicator */}
            {selectedWeek && weekLabel && (
              <View style={s.calSelectedBar}>
                <View style={s.calSelectedInfo}>
                  <View style={s.calSelectedDot} />
                  <Text style={s.calSelectedText}>Week: {weekLabel}</Text>
                </View>
                <TouchableOpacity style={s.calResetBtn} onPress={clearWeekOverride} activeOpacity={0.7}>
                  <Text style={s.calResetText}>Reset</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Month toggle button */}
            <TouchableOpacity
              style={[s.monthToggleBtn, isClinicDaysAllOpen && s.monthToggleBtnActive]}
              onPress={toggleMonth}
              activeOpacity={0.7}
            >
              <Text style={[s.monthToggleIcon, isClinicDaysAllOpen && s.monthToggleIconActive]}>
                {isClinicDaysAllOpen ? "↺" : "✓"}
              </Text>
              <Text style={[s.monthToggleText, isClinicDaysAllOpen && s.monthToggleTextActive]}>
                {isClinicDaysAllOpen ? "Deselect This Month" : "Select This Month"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Weekly Schedule ── */}
        <View style={s.section}>
          <View style={s.scheduleHeader}>
            <Text style={s.sectionTitle}>
              {selectedWeek ? "Week Schedule" : "Default Schedule"}
            </Text>
            {selectedWeek && weekLabel && (
              <View style={s.weekBadge}>
                <Text style={s.weekBadgeText}>{weekLabel}</Text>
              </View>
            )}
          </View>
          <Text style={s.sectionHint}>
            {selectedWeek
              ? "Editing this specific week only. Changes won't affect other weeks."
              : "This schedule applies to all weeks unless overridden."}
          </Text>

          <View style={s.daysList}>
            {WEEKDAY_KEYS.map((day) => {
              const d = activeHours[day];
              return (
                <View key={day} style={[s.dayCard, !d.open && s.dayCardClosed]}>
                  <View style={s.dayHeader}>
                    <View style={s.dayNameWrap}>
                      <View style={[s.dayDot, d.open ? s.dayDotOpen : s.dayDotClosed]} />
                      <Text style={[s.dayLabel, !d.open && s.dayLabelClosed]}>{WEEKDAY_LABELS[day]}</Text>
                      {!d.open && <Text style={s.closedTag}>Closed</Text>}
                    </View>
                    <View style={s.dayActions}>
                      {d.open && (
                        <TouchableOpacity style={s.copyBtn} onPress={() => openCopyModal(day)} activeOpacity={0.65}>
                          <Text style={s.copyBtnIcon}>⊞</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={[s.togglePill, d.open && s.togglePillOn]} onPress={() => toggleDay(day)} activeOpacity={0.7}>
                        <View style={[s.toggleDot, d.open && s.toggleDotOn]} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {d.open && (
                    <>
                      <View style={s.timeBar}>
                        <TouchableOpacity style={s.arrowBtn} onPress={() => shiftTime(day, "start", -1)} activeOpacity={0.6}>
                          <Text style={s.arrowText}>‹</Text>
                        </TouchableOpacity>
                        <View style={s.timePill}>
                          <Text style={s.timePillText}>{fmtTime(d.start)}</Text>
                        </View>
                        <TouchableOpacity style={s.arrowBtn} onPress={() => shiftTime(day, "start", 1)} activeOpacity={0.6}>
                          <Text style={s.arrowText}>›</Text>
                        </TouchableOpacity>
                        <View style={s.timeLine} />
                        <TouchableOpacity style={s.arrowBtn} onPress={() => shiftTime(day, "end", -1)} activeOpacity={0.6}>
                          <Text style={s.arrowText}>‹</Text>
                        </TouchableOpacity>
                        <View style={s.timePill}>
                          <Text style={s.timePillText}>{fmtTime(d.end)}</Text>
                        </View>
                        <TouchableOpacity style={s.arrowBtn} onPress={() => shiftTime(day, "end", 1)} activeOpacity={0.6}>
                          <Text style={s.arrowText}>›</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={s.lunchSection}>
                        <TouchableOpacity style={s.lunchToggle} onPress={() => toggleLunch(day)} activeOpacity={0.65}>
                          <View style={[s.lunchCheck, d.lunch && s.lunchCheckOn]}>
                            {d.lunch && <Text style={s.lunchCheckIcon}>✓</Text>}
                          </View>
                          <Text style={[s.lunchLabel, d.lunch && s.lunchLabelOn]}>Lunch</Text>
                        </TouchableOpacity>
                        {d.lunch && (
                          <View style={s.lunchTimeRow}>
                            <TouchableOpacity style={s.arrowBtnSm} onPress={() => shiftLunch(day, "start", -1)} activeOpacity={0.6}>
                              <Text style={s.arrowSmText}>‹</Text>
                            </TouchableOpacity>
                            <Text style={s.lunchTimeText}>{fmtTime(d.lunch.start)}</Text>
                            <TouchableOpacity style={s.arrowBtnSm} onPress={() => shiftLunch(day, "start", 1)} activeOpacity={0.6}>
                              <Text style={s.arrowSmText}>›</Text>
                            </TouchableOpacity>
                            <Text style={s.lunchTimeSep}>–</Text>
                            <TouchableOpacity style={s.arrowBtnSm} onPress={() => shiftLunch(day, "end", -1)} activeOpacity={0.6}>
                              <Text style={s.arrowSmText}>‹</Text>
                            </TouchableOpacity>
                            <Text style={s.lunchTimeText}>{fmtTime(d.lunch.end)}</Text>
                            <TouchableOpacity style={s.arrowBtnSm} onPress={() => shiftLunch(day, "end", 1)} activeOpacity={0.6}>
                              <Text style={s.arrowSmText}>›</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Weekly Overview ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Weekly Overview</Text>
          <View style={s.ovCard}>
            <View style={s.ovGrid}>
              {WEEKDAY_KEYS.map((day) => {
                const d = activeHours[day];
                return (
                  <View key={day} style={s.ovCol}>
                    <Text style={[s.ovDayLabel, d.open && s.ovDayLabelOn]}>{WEEKDAY_LABELS[day]}</Text>
                    <View style={[s.ovBar, d.open ? s.ovBarOpen : s.ovBarOff]} />
                    {d.open ? (
                      <View style={s.ovInfo}>
                        <Text style={s.ovTime}>{fmtTime(d.start)}</Text>
                        <Text style={s.ovTime}>{fmtTime(d.end)}</Text>
                        {d.lunch ? <View style={s.ovLunchDot} /> : <View style={s.ovLunchDotEmpty} />}
                      </View>
                    ) : (
                      <View style={s.ovInfo}>
                        <Text style={s.ovOff}>–</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
            <View style={s.ovFooter}>
              <View style={s.ovLegendItem}>
                <View style={[s.ovLegendDot, { backgroundColor: T.teal }]} />
                <Text style={s.ovLegendText}>{openDays.length} days open</Text>
              </View>
              {WEEKDAY_KEYS.some((k) => activeHours[k].lunch) && (
                <View style={s.ovLegendItem}>
                  <View style={[s.ovLegendDot, { backgroundColor: "#f59e0b" }]} />
                  <Text style={s.ovLegendText}>Lunch break</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Bottom Save Bar ── */}
      <View style={[s.bottomBar, { bottom: bottomBarOffset }]}>
        <Text style={s.bottomMeta}>
          {isDirty ? "Unsaved changes" : `${openDays.length} day(s) configured`}
          {Object.keys(weekOverrides).length > 0 ? ` · ${Object.keys(weekOverrides).length} week override(s)` : ""}
          {Object.keys(dateOverrides).length > 0 ? ` · ${Object.keys(dateOverrides).length} date override(s)` : ""}
        </Text>
        <TouchableOpacity
          style={[s.saveBtn, (!isDirty || saving) && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!isDirty || saving}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color={T.white} size="small" /> : <Text style={s.saveBtnText}>Save Opening Hours</Text>}
        </TouchableOpacity>
      </View>

      {/* ── Copy Modal ── */}
      <Modal visible={copyModal !== null} transparent animationType="slide" onRequestClose={() => setCopyModal(null)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>Copy to Other Days</Text>
                <Text style={s.sheetSub}>Copy {copyModal ? WEEKDAY_LABELS[copyModal.sourceDay] : ""} settings to:</Text>
              </View>
              <TouchableOpacity style={s.sheetClose} onPress={() => setCopyModal(null)}>
                <Text style={s.sheetCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.selectAllBtn} onPress={selectAllCopyTargets} activeOpacity={0.7}>
              <Text style={s.selectAllText}>Select All</Text>
            </TouchableOpacity>
            <View style={s.copyTargets}>
              {copyModal && WEEKDAY_KEYS.filter((k) => k !== copyModal.sourceDay).map((day) => {
                const checked = copyModal.checked[day];
                return (
                  <TouchableOpacity key={day} style={[s.copyTarget, checked && s.copyTargetChecked]} onPress={() => toggleCopyTarget(day)} activeOpacity={0.7}>
                    <View style={[s.checkbox, checked && s.checkboxOn]}>
                      {checked && <Text style={s.checkboxMark}>✓</Text>}
                    </View>
                    <Text style={[s.copyTargetLabel, checked && s.copyTargetLabelChecked]}>{WEEKDAY_LABELS[day]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={s.sheetFooter}>
              <TouchableOpacity style={s.applyBtn} onPress={applyCopy} activeOpacity={0.85}>
                <Text style={s.applyBtnText}>Apply Copy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ================================================================ */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 18 },
  title: { fontSize: 28, fontWeight: "700", color: T.white },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  content: { paddingHorizontal: 14, paddingTop: 16, gap: 24 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: T.text },
  sectionHint: { fontSize: 14, color: T.textSec, lineHeight: 20 },

  /* Calendar */
  calCard: {
    backgroundColor: T.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    gap: 10,
  },
  calNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calNavBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  calNavArrow: { fontSize: 24, fontWeight: "600", color: T.text },
  calMonthTitle: { fontSize: 17, fontWeight: "700", color: T.text },
  calWeekRow: { flexDirection: "row", marginBottom: 2 },
  calWeekCell: { flex: 1, alignItems: "center" },
  calWeekText: { fontSize: 11, fontWeight: "700", color: T.textMuted },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calDayCell: {
    width: "14.28%",
    alignItems: "center",
    justifyContent: "center",
    height: 42,
  },
  calWeekBand: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 4,
    bottom: 4,
    backgroundColor: "rgba(15,118,110,0.10)",
  },
  calWeekBandStart: { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  calWeekBandEnd: { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  calDayInner: { alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 17 },
  calDayOther: { opacity: 0.35 },
  calDayToday: { borderWidth: 1.5, borderColor: T.teal },
  calDayText: { fontSize: 14, fontWeight: "600", color: T.text },
  calDayTextOther: { color: T.textMuted },
  calDayTextSelected: { color: T.teal, fontWeight: "800" },
  calDayTextToday: { color: T.teal, fontWeight: "700" },
  calDayOpen: { backgroundColor: "#16a34a" },
  calDayTextOpen: { color: "#fff", fontWeight: "800" },
  calSelectedBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: T.tealSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(15,118,110,0.15)",
  },
  calSelectedInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  calSelectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.teal },
  calSelectedText: { fontSize: 13, fontWeight: "700", color: T.teal },
  calResetBtn: {
    backgroundColor: T.white,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: T.border,
  },
  calResetText: { fontSize: 12, fontWeight: "700", color: T.redText },

  /* Month toggle button */
  monthToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: T.tealSoft,
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(15,118,110,0.15)",
  },
  monthToggleBtnActive: {
    backgroundColor: T.redSoft,
    borderColor: "rgba(190,18,60,0.12)",
  },
  monthToggleIcon: { fontSize: 14, fontWeight: "800", color: T.teal },
  monthToggleIconActive: { color: T.redText },
  monthToggleText: { fontSize: 13, fontWeight: "700", color: T.teal },
  monthToggleTextActive: { color: T.redText },

  /* Schedule section header */
  scheduleHeader: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  weekBadge: {
    backgroundColor: T.tealSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(15,118,110,0.15)",
  },
  weekBadgeText: { fontSize: 12, fontWeight: "700", color: T.teal },

  /* Day cards */
  daysList: { gap: 8 },
  dayCard: { backgroundColor: T.white, borderRadius: 16, borderWidth: 1, borderColor: T.border, paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  dayCardClosed: { backgroundColor: "#fafbfc", paddingVertical: 12 },
  dayHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayNameWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  dayDot: { width: 8, height: 8, borderRadius: 4 },
  dayDotOpen: { backgroundColor: T.teal },
  dayDotClosed: { backgroundColor: "#d1d5db" },
  dayLabel: { fontSize: 16, fontWeight: "700", color: T.text, letterSpacing: 0.5 },
  dayLabelClosed: { color: T.textMuted },
  closedTag: { fontSize: 12, fontWeight: "600", color: T.textMuted, marginLeft: 4 },
  dayActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  copyBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: "rgba(15,118,110,0.06)", alignItems: "center", justifyContent: "center" },
  copyBtnIcon: { fontSize: 16, color: T.teal, fontWeight: "600" },
  togglePill: { width: 44, height: 26, borderRadius: 13, backgroundColor: "#e2e8f0", justifyContent: "center", paddingHorizontal: 3 },
  togglePillOn: { backgroundColor: T.teal },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: T.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },
  toggleDotOn: { alignSelf: "flex-end" },

  /* Time bar */
  timeBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: "#f4f7fa", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6 },
  arrowBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  arrowText: { fontSize: 22, fontWeight: "600", color: T.teal, marginTop: -1 },
  timePill: { backgroundColor: T.white, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(15,118,110,0.15)", minWidth: 68, alignItems: "center" },
  timePillText: { fontSize: 16, fontWeight: "700", color: T.text, letterSpacing: 0.5 },
  timeLine: { width: 20, height: 2, backgroundColor: "#cbd5e1", borderRadius: 1, marginHorizontal: 4 },

  /* Lunch */
  lunchSection: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 12, flexWrap: "wrap", gap: 8 },
  lunchToggle: { flexDirection: "row", alignItems: "center", gap: 8 },
  lunchCheck: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: "#cbd5e1", backgroundColor: T.white, alignItems: "center", justifyContent: "center" },
  lunchCheckOn: { backgroundColor: T.teal, borderColor: T.teal },
  lunchCheckIcon: { color: T.white, fontSize: 12, fontWeight: "800" },
  lunchLabel: { fontSize: 13, fontWeight: "600", color: T.textMuted },
  lunchLabelOn: { color: T.text },
  lunchTimeRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  arrowBtnSm: { width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  arrowSmText: { fontSize: 18, fontWeight: "600", color: T.teal, marginTop: -1 },
  lunchTimeText: { fontSize: 13, fontWeight: "700", color: T.text, backgroundColor: "#f4f7fa", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, overflow: "hidden", minWidth: 50, textAlign: "center" },
  lunchTimeSep: { fontSize: 13, color: "#cbd5e1", fontWeight: "700", marginHorizontal: 2 },

  /* Weekly Overview */
  ovCard: { backgroundColor: T.white, borderRadius: 16, borderWidth: 1, borderColor: T.border, paddingTop: 14, paddingBottom: 0, overflow: "hidden" },
  ovGrid: { flexDirection: "row", paddingHorizontal: 4 },
  ovCol: { flex: 1, alignItems: "center", gap: 6, paddingHorizontal: 1 },
  ovDayLabel: { fontSize: 10, fontWeight: "700", color: T.textMuted, letterSpacing: 0.2 },
  ovDayLabelOn: { color: T.teal },
  ovBar: { width: 4, height: 28, borderRadius: 2 },
  ovBarOpen: { backgroundColor: T.teal },
  ovBarOff: { backgroundColor: "#e5e7eb" },
  ovInfo: { alignItems: "center", gap: 1, minHeight: 32 },
  ovTime: { fontSize: 9, fontWeight: "700", color: T.text, letterSpacing: 0.1 },
  ovLunchDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#f59e0b", marginTop: 3 },
  ovLunchDotEmpty: { width: 5, height: 5, marginTop: 3 },
  ovOff: { fontSize: 12, fontWeight: "600", color: "#d1d5db", marginTop: 4 },
  ovFooter: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, paddingVertical: 10, marginTop: 12, backgroundColor: "#f8fafb", borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  ovLegendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  ovLegendDot: { width: 6, height: 6, borderRadius: 3 },
  ovLegendText: { fontSize: 11, fontWeight: "600", color: T.textSec },

  /* Bottom bar */
  bottomBar: { position: "absolute", left: 0, right: 0, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16, borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.white, gap: 8, zIndex: 20, elevation: 10 },
  bottomMeta: { fontSize: 13, color: T.textSec, fontWeight: "600" },
  saveBtn: { backgroundColor: T.teal, borderRadius: 14, paddingVertical: 15, alignItems: "center", minHeight: 52 },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { fontSize: 17, fontWeight: "700", color: T.white },

  /* Copy Modal */
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: T.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#e2e8f0", alignSelf: "center", marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 24, paddingTop: 14, paddingBottom: 10 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: T.text },
  sheetSub: { fontSize: 13, color: T.textSec, marginTop: 2 },
  sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  sheetCloseText: { fontSize: 14, color: T.textSec, fontWeight: "700" },
  selectAllBtn: { alignSelf: "flex-start", marginLeft: 24, marginBottom: 10, backgroundColor: T.tealSoft, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(15,118,110,0.25)" },
  selectAllText: { fontSize: 13, fontWeight: "700", color: T.teal },
  copyTargets: { paddingHorizontal: 24, gap: 6 },
  copyTarget: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: "transparent" },
  copyTargetChecked: { backgroundColor: T.tealSoft, borderColor: "rgba(15,118,110,0.2)" },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: T.border, backgroundColor: T.white, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: T.teal, borderColor: T.teal },
  checkboxMark: { color: T.white, fontSize: 14, fontWeight: "800" },
  copyTargetLabel: { fontSize: 16, fontWeight: "600", color: T.text },
  copyTargetLabelChecked: { color: T.teal, fontWeight: "700" },
  sheetFooter: { paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: T.border, marginTop: 12 },
  applyBtn: { backgroundColor: T.teal, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  applyBtnText: { fontSize: 16, fontWeight: "700", color: T.white },
});
