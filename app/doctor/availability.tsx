import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  red: "#ef4444",
};

/* ── constants ── */
const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const WEEKDAY_FULL: Record<string, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};
const CAL_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/* ── types (shared with schedule-patient.tsx) ── */
type DayHours = {
  open: boolean;
  start: number;
  end: number;
  lunch: { start: number; end: number } | null;
};
type WeeklyHours = Record<string, DayHours>;
type OpeningHoursData = {
  defaultHours: WeeklyHours;
  weekOverrides: Record<string, WeeklyHours>;
};

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
const fmtTime12 = (min: number): string => {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};

const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseDate = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/* ISO week key */
const getISOWeekKey = (d: Date): string => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayOfWeek = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dayOfWeek + 3);
  const firstThursday = new Date(date.getFullYear(), 0, 4);
  const diff = date.getTime() - firstThursday.getTime();
  const weekNum = 1 + Math.round(diff / (7 * 86400000));
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
};

/* Calendar grid builder (Sunday-based) */
type CalDay = { date: Date; day: number; isCurrentMonth: boolean };
const buildCalendarDays = (year: number, month: number): CalDay[] => {
  const days: CalDay[] = [];
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const start = new Date(year, month, 1 - startPad);
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    days.push({ date: d, day: d.getDate(), isCurrentMonth: d.getMonth() === month && d.getFullYear() === year });
  }
  return days;
};

/* Load opening hours from doctor profile (supports legacy formats) */
const loadOpeningHours = (profile: any): OpeningHoursData => {
  if (profile?.openingHours) {
    const oh = profile.openingHours;
    const dh: any = {};
    for (const k of WEEKDAY_KEYS) {
      const d = oh.defaultHours?.[k];
      dh[k] = d ? { open: d.open ?? false, start: d.start ?? 540, end: d.end ?? 1080, lunch: d.lunch ? { start: d.lunch.start ?? 720, end: d.lunch.end ?? 780 } : null } : { open: false, start: 540, end: 1080, lunch: null };
    }
    const wo: Record<string, WeeklyHours> = {};
    if (oh.weekOverrides) {
      for (const [wk, wv] of Object.entries(oh.weekOverrides)) {
        const wh: any = {};
        for (const k of WEEKDAY_KEYS) {
          const d = (wv as any)?.[k];
          wh[k] = d ? { open: d.open ?? false, start: d.start ?? 540, end: d.end ?? 1080, lunch: d.lunch ? { start: d.lunch.start ?? 720, end: d.lunch.end ?? 780 } : null } : { open: false, start: 540, end: 1080, lunch: null };
        }
        wo[wk] = wh;
      }
    }
    return { defaultHours: dh, weekOverrides: wo };
  }
  if (profile?.weeklyHours) {
    const wh = profile.weeklyHours;
    const dh: any = {};
    for (const k of WEEKDAY_KEYS) {
      const d = wh[k];
      dh[k] = d ? { open: d.open ?? false, start: d.start ?? 540, end: d.end ?? 1080, lunch: d.lunch ? { start: d.lunch.start ?? 720, end: d.lunch.end ?? 780 } : null } : { open: false, start: 540, end: 1080, lunch: null };
    }
    return { defaultHours: dh, weekOverrides: {} };
  }
  return { defaultHours: DEFAULT_HOURS, weekOverrides: {} };
};

/* Generate time blocks for a specific date from opening hours */
const generateBlocks = (date: Date, oh: OpeningHoursData, dateOverrides?: Record<string, boolean>): number[] => {
  const dateStr = toDateStr(date);
  // dateOverrides take highest priority
  if (dateOverrides && dateStr in dateOverrides) {
    if (!dateOverrides[dateStr]) return []; // force closed
    // force open → use default hours for that weekday
  }
  const dayIdx = (date.getDay() + 6) % 7; // Mon=0...Sun=6
  const dayKey = WEEKDAY_KEYS[dayIdx];
  const weekKey = getISOWeekKey(date);
  const hours = oh.weekOverrides[weekKey]?.[dayKey] ?? oh.defaultHours[dayKey];
  if (!hours || (!hours.open && !(dateOverrides && dateOverrides[dateStr] === true))) return [];
  const blocks: number[] = [];
  const start = hours.start || 540;
  const end = hours.end || 1080;
  for (let t = start; t < end; t += 30) {
    if (hours.lunch && t >= hours.lunch.start && t < hours.lunch.end) continue;
    blocks.push(t);
  }
  return blocks;
};

/* Get day key for a date */
const getDayKey = (d: Date) => WEEKDAY_KEYS[(d.getDay() + 6) % 7];

/* ================================================================ */
export default function AvailabilityScreen() {
  const insets = useSafeAreaInsets();
  const today = useMemo(() => new Date(), []);

  // Calendar state
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  // Data state
  const [openingHours, setOpeningHours] = useState<OpeningHoursData>({ defaultHours: DEFAULT_HOURS, weekOverrides: {} });
  const [dateOverrides, setDateOverrides] = useState<Record<string, boolean>>({});
  const [blockedSlots, setBlockedSlots] = useState<Record<string, Set<number>>>({});
  const [savedKey, setSavedKey] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ── load ── */
  useEffect(() => {
    (async () => {
      const profile = (await store.getDoctorProfile()) || {};
      const oh = loadOpeningHours(profile);
      setOpeningHours(oh);
      // Load dateOverrides
      const dov: Record<string, boolean> = {};
      if (profile?.openingHours?.dateOverrides) {
        for (const [date, val] of Object.entries(profile.openingHours.dateOverrides)) {
          if (typeof val === "boolean") dov[date] = val;
        }
      }
      setDateOverrides(dov);

      const raw = profile.blockedSlots || {};
      const parsed: Record<string, Set<number>> = {};
      for (const [date, arr] of Object.entries(raw)) {
        if (Array.isArray(arr) && arr.length > 0) parsed[date] = new Set(arr as number[]);
      }
      setBlockedSlots(parsed);
      setSavedKey(JSON.stringify(profile.blockedSlots || {}));
      setLoaded(true);
    })();
    return () => { setDoctorTabSwipeBlocked(false); };
  }, []);

  /* ── dirty check ── */
  const serializedBlocked = useMemo(() => {
    const obj: Record<string, number[]> = {};
    for (const [date, set] of Object.entries(blockedSlots)) {
      const arr = Array.from(set).sort((a, b) => a - b);
      if (arr.length > 0) obj[date] = arr;
    }
    return JSON.stringify(obj);
  }, [blockedSlots]);

  const isDirty = useMemo(() => loaded && serializedBlocked !== savedKey, [loaded, serializedBlocked, savedKey]);
  useEffect(() => { setDoctorTabSwipeBlocked(isDirty); }, [isDirty]);

  /* ── calendar ── */
  const calDays = useMemo(() => buildCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const goMonth = (dir: -1 | 1) => {
    setViewMonth((m) => {
      if (dir === -1 && m === 0) { setViewYear((y) => y - 1); return 11; }
      if (dir === 1 && m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + dir;
    });
  };

  /* ── time blocks for selected date ── */
  const selectedDateStr = useMemo(() => toDateStr(selectedDate), [selectedDate]);
  const dayKey = useMemo(() => getDayKey(selectedDate), [selectedDate]);
  const timeBlocks = useMemo(() => generateBlocks(selectedDate, openingHours, dateOverrides), [selectedDate, openingHours, dateOverrides]);
  const blockedSet = useMemo(() => blockedSlots[selectedDateStr] || new Set<number>(), [blockedSlots, selectedDateStr]);

  const isClosed = timeBlocks.length === 0;
  const blockedCount = blockedSet.size;
  const availCount = timeBlocks.length - blockedCount;

  /* ── toggle slot ── */
  const toggleSlot = useCallback((minute: number) => {
    setBlockedSlots((prev) => {
      const dateStr = toDateStr(selectedDate);
      const current = new Set(prev[dateStr] || []);
      if (current.has(minute)) current.delete(minute);
      else current.add(minute);
      const next = { ...prev };
      if (current.size === 0) delete next[dateStr];
      else next[dateStr] = current;
      return next;
    });
  }, [selectedDate]);

  const blockAll = useCallback(() => {
    const dateStr = toDateStr(selectedDate);
    setBlockedSlots((prev) => ({ ...prev, [dateStr]: new Set(timeBlocks) }));
  }, [selectedDate, timeBlocks]);

  const unblockAll = useCallback(() => {
    const dateStr = toDateStr(selectedDate);
    setBlockedSlots((prev) => {
      const next = { ...prev };
      delete next[dateStr];
      return next;
    });
  }, [selectedDate]);

  /* ── save ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const profile = (await store.getDoctorProfile()) || {};
      const todayStr = toDateStr(today);
      const cleaned: Record<string, number[]> = {};
      for (const [date, set] of Object.entries(blockedSlots)) {
        if (date < todayStr) continue; // prune past
        const arr = Array.from(set).sort((a, b) => a - b);
        if (arr.length > 0) cleaned[date] = arr;
      }
      await store.saveDoctorProfile({ ...profile, blockedSlots: cleaned });
      setSavedKey(JSON.stringify(cleaned));
      setBlockedSlots(() => {
        const result: Record<string, Set<number>> = {};
        for (const [d, a] of Object.entries(cleaned)) result[d] = new Set(a);
        return result;
      });
      setDoctorTabSwipeBlocked(false);
      Alert.alert("Saved", "Your availability has been updated.");
    } catch {
      Alert.alert("Error", "Failed to save availability.");
    } finally {
      setSaving(false);
    }
  };

  /* ── dates with blocks ── */
  const blockedDateSet = useMemo(() => new Set(Object.keys(blockedSlots)), [blockedSlots]);

  const bottomBarOffset = Math.max(insets.bottom, 4) + 64;
  const selectedDayLabel = `${WEEKDAY_FULL[dayKey]}, ${MONTH_NAMES[selectedDate.getMonth()].slice(0, 3)} ${selectedDate.getDate()}`;

  /* ── render ── */
  return (
    <View style={s.container}>
      <LinearGradient colors={[T.teal, T.tealDark]} style={s.header}>
        <Text style={s.title}>My Schedule</Text>
        <Text style={s.subtitle}>Manage your availability for patients</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomBarOffset + 100 }]} showsVerticalScrollIndicator={false}>

        {/* ── Calendar ── */}
        <View style={s.calCard}>
          <View style={s.calNav}>
            <TouchableOpacity style={s.calNavBtn} onPress={() => goMonth(-1)} activeOpacity={0.6}>
              <Text style={s.calNavArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={s.calMonthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity style={s.calNavBtn} onPress={() => goMonth(1)} activeOpacity={0.6}>
              <Text style={s.calNavArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={s.calWeekRow}>
            {CAL_WEEKDAYS.map((w) => (
              <View key={w} style={s.calWeekCell}>
                <Text style={s.calWeekText}>{w}</Text>
              </View>
            ))}
          </View>

          <View style={s.calGrid}>
            {calDays.map((cd, idx) => {
              const dateStr = toDateStr(cd.date);
              const isPast = cd.date < today && !isSameDay(cd.date, today);
              const isSelected = isSameDay(cd.date, selectedDate);
              const isToday = isSameDay(cd.date, today);
              const hasBlocks = blockedDateSet.has(dateStr);
              const dayBlocks = generateBlocks(cd.date, openingHours, dateOverrides);
              const dayClosed = dayBlocks.length === 0;

              return (
                <TouchableOpacity
                  key={idx}
                  style={s.calDayCell}
                  onPress={() => { if (!isPast) setSelectedDate(cd.date); }}
                  activeOpacity={isPast ? 1 : 0.6}
                  disabled={isPast}
                >
                  <View style={[
                    s.calDayInner,
                    !cd.isCurrentMonth && s.calDayOther,
                    isPast && s.calDayPast,
                    isToday && !isSelected && s.calDayToday,
                    isSelected && !isPast && s.calDaySelected,
                  ]}>
                    <Text style={[
                      s.calDayText,
                      !cd.isCurrentMonth && s.calDayTextOther,
                      isPast && s.calDayTextPast,
                      dayClosed && cd.isCurrentMonth && !isPast && s.calDayTextClosed,
                      isToday && !isSelected && s.calDayTextToday,
                      isSelected && !isPast && s.calDayTextSelected,
                    ]}>
                      {cd.day}
                    </Text>
                  </View>
                  {hasBlocks && cd.isCurrentMonth && !isSelected && !isPast && (
                    <View style={s.calBlockDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Selected Date Header ── */}
        <View style={s.dateHeader}>
          <Text style={s.dateHeaderTitle}>{selectedDayLabel}</Text>
          {!isClosed && (
            <View style={s.dateHeaderMeta}>
              <View style={[s.metaPill, { backgroundColor: T.tealSoft }]}>
                <Text style={[s.metaPillText, { color: T.teal }]}>{availCount} available</Text>
              </View>
              {blockedCount > 0 && (
                <View style={[s.metaPill, { backgroundColor: T.redSoft }]}>
                  <Text style={[s.metaPillText, { color: T.redText }]}>{blockedCount} blocked</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Time Blocks ── */}
        {isClosed ? (
          <View style={s.closedCard}>
            <Text style={s.closedIcon}>🏥</Text>
            <Text style={s.closedTitle}>Clinic Closed</Text>
            <Text style={s.closedSub}>No operating hours on {WEEKDAY_FULL[dayKey]}s</Text>
          </View>
        ) : (
          <>
            {/* Quick actions */}
            <View style={s.quickRow}>
              <TouchableOpacity style={s.quickBtn} onPress={blockAll} activeOpacity={0.7}>
                <Text style={s.quickBtnText}>Block All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.quickBtn} onPress={unblockAll} activeOpacity={0.7}>
                <Text style={s.quickBtnText}>Unblock All</Text>
              </TouchableOpacity>
            </View>

            {/* Grid */}
            <View style={s.blockGrid}>
              {timeBlocks.map((min) => {
                const isBlocked = blockedSet.has(min);
                return (
                  <TouchableOpacity
                    key={min}
                    style={[s.blockItem, isBlocked ? s.blockItemBlocked : s.blockItemAvail]}
                    onPress={() => toggleSlot(min)}
                    activeOpacity={0.6}
                  >
                    <Text style={[s.blockTime, isBlocked ? s.blockTimeBlocked : s.blockTimeAvail]}>
                      {fmtTime12(min)}
                    </Text>
                    {isBlocked && <Text style={s.blockX}>✕</Text>}
                    {!isBlocked && <View style={s.blockDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Bottom Save Bar ── */}
      <View style={[s.bottomBar, { bottom: bottomBarOffset }]}>
        <Text style={s.bottomMeta}>
          {isDirty ? "Unsaved changes" : isClosed ? "No slots for this day" : `${availCount} slot(s) available`}
        </Text>
        <TouchableOpacity
          style={[s.saveBtn, (!isDirty || saving) && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!isDirty || saving}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color={T.white} size="small" /> : <Text style={s.saveBtnText}>Save Availability</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ================================================================ */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 18 },
  title: { fontSize: 28, fontWeight: "700", color: T.white },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  content: { paddingHorizontal: 14, paddingTop: 16, gap: 16 },

  /* Calendar */
  calCard: { backgroundColor: T.white, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 14, gap: 10 },
  calNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calNavBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  calNavArrow: { fontSize: 24, fontWeight: "600", color: T.text },
  calMonthTitle: { fontSize: 17, fontWeight: "700", color: T.text },
  calWeekRow: { flexDirection: "row", marginBottom: 2 },
  calWeekCell: { flex: 1, alignItems: "center" },
  calWeekText: { fontSize: 11, fontWeight: "700", color: T.textMuted },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calDayCell: { width: "14.28%", alignItems: "center", justifyContent: "center", height: 44 },
  calDayInner: { alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 18 },
  calDayOther: { opacity: 0.30 },
  calDayPast: { opacity: 0.35 },
  calDayToday: { borderWidth: 1.5, borderColor: T.teal },
  calDaySelected: { backgroundColor: T.teal },
  calDayText: { fontSize: 14, fontWeight: "600", color: T.text },
  calDayTextOther: { color: T.textMuted },
  calDayTextPast: { color: "#cbd5e1" },
  calDayTextClosed: { color: "#cbd5e1" },
  calDayTextToday: { color: T.teal, fontWeight: "700" },
  calDayTextSelected: { color: T.white, fontWeight: "800" },
  calBlockDot: { position: "absolute", bottom: 3, width: 5, height: 5, borderRadius: 3, backgroundColor: T.red },

  /* Date header */
  dateHeader: { gap: 6 },
  dateHeaderTitle: { fontSize: 20, fontWeight: "800", color: T.text },
  dateHeaderMeta: { flexDirection: "row", gap: 8 },
  metaPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  metaPillText: { fontSize: 12, fontWeight: "700" },

  /* Closed state */
  closedCard: { backgroundColor: T.white, borderRadius: 16, borderWidth: 1, borderColor: T.border, paddingVertical: 40, alignItems: "center", gap: 8 },
  closedIcon: { fontSize: 32 },
  closedTitle: { fontSize: 18, fontWeight: "700", color: T.text },
  closedSub: { fontSize: 14, color: T.textSec },

  /* Quick actions */
  quickRow: { flexDirection: "row", gap: 10 },
  quickBtn: { flex: 1, backgroundColor: T.white, borderRadius: 12, borderWidth: 1, borderColor: T.border, paddingVertical: 10, alignItems: "center" },
  quickBtnText: { fontSize: 14, fontWeight: "700", color: T.teal },

  /* Block grid */
  blockGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  blockItem: {
    width: "31%",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  blockItemAvail: { backgroundColor: T.white, borderColor: "rgba(15,118,110,0.2)" },
  blockItemBlocked: { backgroundColor: T.redSoft, borderColor: "rgba(239,68,68,0.25)" },
  blockTime: { fontSize: 13, fontWeight: "700" },
  blockTimeAvail: { color: T.teal },
  blockTimeBlocked: { color: T.redText, textDecorationLine: "line-through" },
  blockX: { fontSize: 11, fontWeight: "800", color: T.red },
  blockDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: T.teal },

  /* Bottom bar */
  bottomBar: { position: "absolute", left: 0, right: 0, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16, borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.white, gap: 8, zIndex: 20, elevation: 10 },
  bottomMeta: { fontSize: 13, color: T.textSec, fontWeight: "600" },
  saveBtn: { backgroundColor: T.teal, borderRadius: 14, paddingVertical: 15, alignItems: "center", minHeight: 52 },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { fontSize: 17, fontWeight: "700", color: T.white },
});
