import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
  blue: "#0b5ed7",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const HALF_HOUR = 30;
const MIN_TIME = 7 * 60;
const MAX_TIME = 22 * 60;

type CalendarDay = {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isDisabled: boolean;
};

type WeekdayHours = {
  enabled: boolean;
  lunchEnabled: boolean;
  openMin: number;
  lunchStartMin: number;
  lunchEndMin: number;
  closeMin: number;
};

const DEFAULT_WEEKDAY_HOURS: Record<number, WeekdayHours> = {
  0: { enabled: false, lunchEnabled: false, openMin: 9 * 60, lunchStartMin: 13 * 60, lunchEndMin: 14 * 60, closeMin: 13 * 60 },
  1: { enabled: true, lunchEnabled: true, openMin: 9 * 60, lunchStartMin: 13 * 60, lunchEndMin: 14 * 60, closeMin: 18 * 60 },
  2: { enabled: true, lunchEnabled: true, openMin: 9 * 60, lunchStartMin: 13 * 60, lunchEndMin: 14 * 60, closeMin: 18 * 60 },
  3: { enabled: true, lunchEnabled: true, openMin: 9 * 60, lunchStartMin: 13 * 60, lunchEndMin: 14 * 60, closeMin: 18 * 60 },
  4: { enabled: true, lunchEnabled: true, openMin: 9 * 60, lunchStartMin: 13 * 60, lunchEndMin: 14 * 60, closeMin: 18 * 60 },
  5: { enabled: true, lunchEnabled: true, openMin: 9 * 60, lunchStartMin: 13 * 60, lunchEndMin: 14 * 60, closeMin: 18 * 60 },
  6: { enabled: true, lunchEnabled: false, openMin: 9 * 60, lunchStartMin: 13 * 60, lunchEndMin: 14 * 60, closeMin: 13 * 60 },
};

const toDateOnly = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const toIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseIsoDate = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const formatFullDate = (iso: string): string => {
  const d = parseIsoDate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
};

const formatTime = (totalMin: number): string => {
  const hour = Math.floor(totalMin / 60);
  const minute = totalMin % 60;
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${suffix}`;
};

const clampTime = (value: number) => Math.max(MIN_TIME, Math.min(MAX_TIME, value));

const buildSlotsForHours = (hours: WeekdayHours): string[] => {
  if (!hours.enabled) return [];
  if (hours.closeMin <= hours.openMin) return [];

  const slots: string[] = [];
  for (let min = hours.openMin; min + HALF_HOUR <= hours.closeMin; min += HALF_HOUR) {
    const inLunch = min >= hours.lunchStartMin && min < hours.lunchEndMin;
    if (!inLunch) slots.push(formatTime(min));
  }
  return slots;
};

const getHourFromLabel = (label: string): number => {
  const m = label.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/);
  if (!m) return 0;
  const hh = Number(m[1]);
  const ampm = m[3];
  let h = hh % 12;
  if (ampm === "PM") h += 12;
  return h;
};

const buildStateKey = (
  hours: Record<number, WeekdayHours>,
  schedules: Record<string, string[]>
): string => {
  const normalizedHours: Record<number, WeekdayHours> = {
    0: hours[0] || DEFAULT_WEEKDAY_HOURS[0],
    1: hours[1] || DEFAULT_WEEKDAY_HOURS[1],
    2: hours[2] || DEFAULT_WEEKDAY_HOURS[2],
    3: hours[3] || DEFAULT_WEEKDAY_HOURS[3],
    4: hours[4] || DEFAULT_WEEKDAY_HOURS[4],
    5: hours[5] || DEFAULT_WEEKDAY_HOURS[5],
    6: hours[6] || DEFAULT_WEEKDAY_HOURS[6],
  };

  const normalizedSchedules: Record<string, string[]> = {};
  for (const date of Object.keys(schedules).sort()) {
    const times = Array.isArray(schedules[date]) ? [...schedules[date]].sort() : [];
    if (times.length > 0) normalizedSchedules[date] = times;
  }

  return JSON.stringify({ normalizedHours, normalizedSchedules });
};

export default function SchedulePatientScreen() {
  const insets = useSafeAreaInsets();
  const rawParams = useLocalSearchParams<{
    caseId: string; planItemsJson: string; totalPrice: string;
  }>();
  
  const params = Object.fromEntries(
    Object.entries(rawParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] || "" : v || ""])
  ) as { caseId: string; planItemsJson: string; totalPrice: string };

  const [loading, setLoading] = useState(false);
  const [weekdayHours, setWeekdayHours] = useState<Record<number, WeekdayHours>>(DEFAULT_WEEKDAY_HOURS);
  const [schedules, setSchedules] = useState<Record<string, string[]>>({});
  const [savedStateKey, setSavedStateKey] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);

  const today = useMemo(() => toDateOnly(new Date()), []);
  const maxMonthDate = useMemo(
    () => new Date(today.getFullYear(), today.getMonth() + 11, 1),
    [today]
  );
  const maxSelectableDate = useMemo(
    () => new Date(maxMonthDate.getFullYear(), maxMonthDate.getMonth() + 1, 0),
    [maxMonthDate]
  );
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const [slotModal, setSlotModal] = useState<{
    date: string;
    options: string[];
    draft: Record<string, boolean>;
  } | null>(null);

  useEffect(() => {
    return () => {
      setDoctorTabSwipeBlocked(false);
    };
  }, []);

  useEffect(() => {
    (async () => {
      const profile = (await store.getDoctorProfile()) || {};
      const flatSlots = Array.isArray(profile.availableSlots) ? profile.availableSlots : [];

      const fromProfile: Record<string, string[]> = {};
      for (const slot of flatSlots) {
        if (!slot?.date || !slot?.time) continue;
        if (!fromProfile[slot.date]) fromProfile[slot.date] = [];
        fromProfile[slot.date].push(slot.time);
      }

      let loadedHours: Record<number, WeekdayHours> = { ...DEFAULT_WEEKDAY_HOURS };

      if (profile.weekdayBusinessHours && typeof profile.weekdayBusinessHours === "object") {
        const merged = { ...DEFAULT_WEEKDAY_HOURS };
        for (const [k, raw] of Object.entries(profile.weekdayBusinessHours)) {
          const idx = Number(k);
          if (!Number.isInteger(idx) || idx < 0 || idx > 6 || !raw) continue;
          const value = raw as Partial<WeekdayHours>;
          merged[idx] = {
            enabled: typeof value.enabled === "boolean" ? value.enabled : merged[idx].enabled,
            lunchEnabled: typeof value.lunchEnabled === "boolean" ? value.lunchEnabled : merged[idx].lunchEnabled,
            openMin: typeof value.openMin === "number" ? value.openMin : merged[idx].openMin,
            lunchStartMin: typeof value.lunchStartMin === "number" ? value.lunchStartMin : merged[idx].lunchStartMin,
            lunchEndMin: typeof value.lunchEndMin === "number" ? value.lunchEndMin : merged[idx].lunchEndMin,
            closeMin: typeof value.closeMin === "number" ? value.closeMin : merged[idx].closeMin,
          };
        }
        loadedHours = merged;
      }

      setSchedules(fromProfile);
      setWeekdayHours(loadedHours);
      setSavedStateKey(buildStateKey(loadedHours, fromProfile));
      setProfileLoaded(true);
    })();
  }, []);

  const isDirty = useMemo(() => {
    if (!profileLoaded) return false;
    return buildStateKey(weekdayHours, schedules) !== savedStateKey;
  }, [profileLoaded, weekdayHours, schedules, savedStateKey]);

  useEffect(() => {
    setDoctorTabSwipeBlocked(isDirty);
  }, [isDirty]);

  const selectedDates = useMemo(() => Object.keys(schedules).sort(), [schedules]);
  const selectedDateCount = selectedDates.filter((date) => (schedules[date] || []).length > 0).length;
  const canSave = selectedDateCount > 0;
  const bottomBarOffset = Math.max(insets.bottom, 4) + 64;

  const calendarDays = useMemo<CalendarDay[]>(() => {
    const days: CalendarDay[] = [];
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const firstWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    for (let i = firstWeekday - 1; i >= 0; i--) {
      const date = toDateOnly(new Date(viewYear, viewMonth - 1, prevMonthDays - i));
      days.push({ date: toIsoDate(date), day: prevMonthDays - i, isCurrentMonth: false, isDisabled: date < today || date > maxSelectableDate });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const date = toDateOnly(new Date(viewYear, viewMonth, i));
      days.push({ date: toIsoDate(date), day: i, isCurrentMonth: true, isDisabled: date < today || date > maxSelectableDate });
    }
    const remain = 42 - days.length;
    for (let i = 1; i <= remain; i++) {
      const date = toDateOnly(new Date(viewYear, viewMonth + 1, i));
      days.push({ date: toIsoDate(date), day: i, isCurrentMonth: false, isDisabled: date < today || date > maxSelectableDate });
    }
    return days;
  }, [viewYear, viewMonth, today, maxSelectableDate]);

  const canGoPrev =
    viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());
  const canGoNext =
    viewYear < maxMonthDate.getFullYear() ||
    (viewYear === maxMonthDate.getFullYear() && viewMonth < maxMonthDate.getMonth());

  const setTimeField = (
    weekday: number,
    field: keyof Pick<WeekdayHours, "openMin" | "lunchStartMin" | "lunchEndMin" | "closeMin">,
    value: number
  ) => {
    setWeekdayHours((prev) => {
      const current = prev[weekday];
      const next = { ...current, [field]: clampTime(value) };

      if (field === "openMin" && next.openMin >= next.closeMin) next.openMin = next.closeMin - HALF_HOUR;
      if (field === "closeMin" && next.closeMin <= next.openMin) next.closeMin = next.openMin + HALF_HOUR;

      if (next.lunchStartMin < next.openMin) next.lunchStartMin = next.openMin;
      if (next.lunchEndMin > next.closeMin) next.lunchEndMin = next.closeMin;
      if (next.lunchStartMin >= next.lunchEndMin) {
        next.lunchEndMin = Math.min(next.closeMin, next.lunchStartMin + HALF_HOUR);
        if (next.lunchEndMin <= next.lunchStartMin) {
          next.lunchStartMin = Math.max(next.openMin, next.closeMin - HALF_HOUR * 2);
          next.lunchEndMin = Math.min(next.closeMin, next.lunchStartMin + HALF_HOUR);
        }
      }

      return { ...prev, [weekday]: next };
    });
  };

  const shiftTime = (
    weekday: number,
    field: keyof Pick<WeekdayHours, "openMin" | "lunchStartMin" | "lunchEndMin" | "closeMin">,
    direction: -1 | 1
  ) => {
    const current = weekdayHours[weekday][field];
    setTimeField(weekday, field, current + direction * HALF_HOUR);
  };

  const toggleOpenDay = (weekday: number) => {
    setWeekdayHours((prev) => ({
      ...prev,
      [weekday]: { ...prev[weekday], enabled: !prev[weekday].enabled },
    }));
  };

  const copyMondayToWeekdays = () => {
    setWeekdayHours((prev) => {
      const monday = { ...prev[1] };
      return {
        ...prev,
        2: { ...monday },
        3: { ...monday },
        4: { ...monday },
        5: { ...monday },
      };
    });
    Alert.alert("Applied", "Monday settings were copied to Tuesday-Friday.");
  };

  const clearAllClinicHours = () => {
    Alert.alert(
      "Clear All Clinic Hours",
      "This will set all weekdays to Closed and clear all selected availability slots. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            setWeekdayHours((prev) => {
              const next: Record<number, WeekdayHours> = { ...prev };
              for (const day of [0, 1, 2, 3, 4, 5, 6]) {
                next[day] = {
                  ...next[day],
                  enabled: false,
                  lunchEnabled: true,
                };
              }
              return next;
            });
            setSchedules({});
          },
        },
      ]
    );
  };

  const autoFillCurrentMonthFromHours = () => {
    setSchedules((prev) => {
      const next = { ...prev };

      for (const d of Object.keys(next)) {
        const p = parseIsoDate(d);
        if (p.getFullYear() === viewYear && p.getMonth() === viewMonth) {
          delete next[d];
        }
      }

      for (const day of calendarDays) {
        if (!day.isCurrentMonth || day.isDisabled) continue;
        const weekday = parseIsoDate(day.date).getDay();
        const slots = buildSlotsForHours(weekdayHours[weekday]);
        if (slots.length > 0) {
          next[day.date] = slots;
        }
      }

      return next;
    });
  };

  const clearCurrentMonthAvailability = () => {
    setSchedules((prev) => {
      const next = { ...prev };
      for (const d of Object.keys(next)) {
        const p = parseIsoDate(d);
        if (p.getFullYear() === viewYear && p.getMonth() === viewMonth) {
          delete next[d];
        }
      }
      return next;
    });
  };

  const handleDatePress = (date: string, isDisabled: boolean) => {
    if (isDisabled) return;

    const weekday = parseIsoDate(date).getDay();
    const hours = weekdayHours[weekday];
    const options = buildSlotsForHours(hours);

    if (!hours.enabled || options.length === 0) {
      Alert.alert("Clinic Closed", `${WEEKDAYS[weekday]} has no bookable hospital hours configured.`);
      return;
    }

    const existing = schedules[date] || [];
    const draft = Object.fromEntries(options.map((time) => [time, existing.includes(time)]));
    setSlotModal({ date, options, draft });
  };

  const handleSlotToggle = (time: string) => {
    setSlotModal((prev) => {
      if (!prev) return prev;
      return { ...prev, draft: { ...prev.draft, [time]: !prev.draft[time] } };
    });
  };

  const handleSlotConfirm = () => {
    if (!slotModal) return;
    const selectedTimes = slotModal.options.filter((time) => slotModal.draft[time]);

    setSchedules((prev) => {
      const next = { ...prev };
      if (selectedTimes.length === 0) delete next[slotModal.date];
      else next[slotModal.date] = selectedTimes;
      return next;
    });
    setSlotModal(null);
  };

  const applyPresetToModal = (preset: "all" | "am" | "pm" | "clear") => {
    setSlotModal((prev) => {
      if (!prev) return prev;
      const draft: Record<string, boolean> = {};

      for (const option of prev.options) {
        const hour24 = getHourFromLabel(option);
        if (preset === "all") draft[option] = true;
        else if (preset === "clear") draft[option] = false;
        else if (preset === "am") draft[option] = hour24 < 12;
        else draft[option] = hour24 >= 12;
      }

      return { ...prev, draft };
    });
  };

  const handleSaveAvailability = async () => {
    if (!canSave) return;
    setLoading(true);
    try {
      const availableSlots = selectedDates.flatMap((date) =>
        (schedules[date] || []).map((time) => ({ date, time }))
      );
      const availableSlotsByVisit = [
        {
          visit: 1,
          description: "Available Slots",
          availabilitySlots: availableSlots,
        },
      ];

      const profile = (await store.getDoctorProfile()) || {};
      await store.saveDoctorProfile({
        ...profile,
        availableSlots,
        availableSlotsByVisit,
        weekdayBusinessHours: weekdayHours,
      });

      // Create quote with available slots if caseId and planItems provided
      if (params.caseId && params.planItemsJson) {
        try {
          const planItems = JSON.parse(params.planItemsJson || "[]");
          const totalPrice = Number(params.totalPrice || 0);

          const visits = [
            {
              visit: 1,
              description: "Visit 1",
              availabilitySlots: availableSlots,
            },
          ];

          await store.createQuote({
            caseId: params.caseId,
            dentistName: profile?.fullName || profile?.name || "Doctor",
            clinicName: profile?.clinicName || profile?.clinic || "Clinic",
            location: profile?.location || "Gangnam, Seoul",
            rating: profile?.rating || 4.9,
            reviewCount: profile?.reviewCount || 127,
            totalPrice,
            treatments: planItems.map((p: any) => ({
              name: p.treatment,
              qty: p.qty,
              price: Number(p.price || 0),
            })),
            treatmentDetails: "",
            duration: "1 Visit",
            visits,
            message: "",
          });
        } catch (quoteErr) {
          console.error("Error creating quote:", quoteErr);
        }
      }

      setSavedStateKey(buildStateKey(weekdayHours, schedules));
      setDoctorTabSwipeBlocked(false);

      Alert.alert("Saved", "Your available slots have been updated.");
    } catch (err) {
      console.error("Error saving availability:", err);
      Alert.alert("Error", "Failed to save your available slots.");
    } finally {
      setLoading(false);
    }
  };

  const handleDentwebConnect = () => {
    Alert.alert("Coming Soon", "Dentweb integration will be added in a future update.");
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[T.teal, T.tealDark]} style={s.header}>
        <Text style={s.title}>Set Available Slots</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomBarOffset + 156 }]} showsVerticalScrollIndicator={false}>
        <View style={s.sectionBlock}>
          <Text style={s.sectionTitle}>Clinic Hours</Text>
          <Text style={s.sectionHint}>Set morning/evening hours.</Text>

          <View style={s.hoursActionRow}>
            <TouchableOpacity style={s.copyMonBtn} onPress={copyMondayToWeekdays} activeOpacity={0.85}>
              <Text style={s.copyMonBtnText}>Copy Monday to Tue-Fri</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.clearHoursBtn} onPress={clearAllClinicHours} activeOpacity={0.85}>
              <Text style={s.clearHoursBtnText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          <View style={s.hoursList}>
            {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
              const hours = weekdayHours[weekday];
              return (
                <View key={weekday} style={s.hoursRow}>
                  <View style={s.hoursTopRow}>
                    <View style={s.hoursHeaderLeft}>
                      <Text style={s.weekdayLabel}>{WEEKDAYS[weekday]}</Text>
                    </View>
                    <TouchableOpacity
                      style={[s.toggleChip, hours.enabled && s.toggleChipActive]}
                      onPress={() => toggleOpenDay(weekday)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.toggleChipText, hours.enabled && s.toggleChipTextActive]}>
                        {hours.enabled ? "Open" : "Closed"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {hours.enabled && (
                    <>
                      <View style={s.periodCard}>
                        <View style={s.periodHead}>
                          <Text style={s.periodTitle}>Morning</Text>
                        </View>
                        <View style={s.periodFieldsRow}>
                          <View style={s.periodField}>
                            <Text style={s.periodFieldLabel}>Start</Text>
                            <View style={s.timeAdjustWrapInline}>
                              <TouchableOpacity style={s.timeAdjustBtnSm} onPress={() => shiftTime(weekday, "openMin", -1)} activeOpacity={0.8}>
                                <Text style={s.timeAdjustBtnText}>-</Text>
                              </TouchableOpacity>
                              <Text style={s.timeValueTiny}>{formatTime(hours.openMin)}</Text>
                              <TouchableOpacity style={s.timeAdjustBtnSm} onPress={() => shiftTime(weekday, "openMin", 1)} activeOpacity={0.8}>
                                <Text style={s.timeAdjustBtnText}>+</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                          <View style={s.periodField}>
                            <Text style={s.periodFieldLabel}>End</Text>
                            <View style={s.timeAdjustWrapInline}>
                              <TouchableOpacity style={s.timeAdjustBtnSm} onPress={() => shiftTime(weekday, "lunchStartMin", -1)} activeOpacity={0.8}>
                                <Text style={s.timeAdjustBtnText}>-</Text>
                              </TouchableOpacity>
                              <Text style={s.timeValueTiny}>{formatTime(hours.lunchStartMin)}</Text>
                              <TouchableOpacity style={s.timeAdjustBtnSm} onPress={() => shiftTime(weekday, "lunchStartMin", 1)} activeOpacity={0.8}>
                                <Text style={s.timeAdjustBtnText}>+</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </View>

                      <View style={s.periodCard}>
                        <View style={s.periodHead}>
                          <Text style={s.periodTitle}>Evening</Text>
                        </View>
                        <View style={s.periodFieldsRow}>
                          <View style={s.periodField}>
                            <Text style={s.periodFieldLabel}>Start</Text>
                            <View style={s.timeAdjustWrapInline}>
                              <TouchableOpacity style={s.timeAdjustBtnSm} onPress={() => shiftTime(weekday, "lunchEndMin", -1)} activeOpacity={0.8}>
                                <Text style={s.timeAdjustBtnText}>-</Text>
                              </TouchableOpacity>
                              <Text style={s.timeValueTiny}>{formatTime(hours.lunchEndMin)}</Text>
                              <TouchableOpacity style={s.timeAdjustBtnSm} onPress={() => shiftTime(weekday, "lunchEndMin", 1)} activeOpacity={0.8}>
                                <Text style={s.timeAdjustBtnText}>+</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                          <View style={s.periodField}>
                            <Text style={s.periodFieldLabel}>End</Text>
                            <View style={s.timeAdjustWrapInline}>
                              <TouchableOpacity style={s.timeAdjustBtnSm} onPress={() => shiftTime(weekday, "closeMin", -1)} activeOpacity={0.8}>
                                <Text style={s.timeAdjustBtnText}>-</Text>
                              </TouchableOpacity>
                              <Text style={s.timeValueTiny}>{formatTime(hours.closeMin)}</Text>
                              <TouchableOpacity style={s.timeAdjustBtnSm} onPress={() => shiftTime(weekday, "closeMin", 1)} activeOpacity={0.8}>
                                <Text style={s.timeAdjustBtnText}>+</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.sectionBlock}>
          <Text style={s.sectionTitle}>Calendar</Text>
          <Text style={s.sectionHint}>Tap a date, then select which 30-minute slots you want to open for DentaRoute patients.</Text>

          <View style={s.monthActionRow}>
            <TouchableOpacity style={s.monthActionBtn} onPress={autoFillCurrentMonthFromHours} activeOpacity={0.85}>
              <Text style={s.monthActionBtnText}>Auto Fill This Month</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.monthActionBtnOutline} onPress={clearCurrentMonthAvailability} activeOpacity={0.85}>
              <Text style={s.monthActionBtnOutlineText}>Clear This Month</Text>
            </TouchableOpacity>
          </View>

          <View style={s.calendarWrap}>
            <View style={s.monthNav}>
              <TouchableOpacity
                style={[s.navBtn, !canGoPrev && s.navBtnDisabled]}
                onPress={() => {
                  if (!canGoPrev) return;
                  if (viewMonth === 0) {
                    setViewMonth(11);
                    setViewYear((y) => y - 1);
                  } else {
                    setViewMonth((m) => m - 1);
                  }
                }}
                disabled={!canGoPrev}
              >
                <Text style={s.navBtnText}>‹</Text>
              </TouchableOpacity>

              <Text style={s.monthTitle}>{MONTHS[viewMonth]} {viewYear}</Text>

              <TouchableOpacity
                style={[s.navBtn, !canGoNext && s.navBtnDisabled]}
                onPress={() => {
                  if (!canGoNext) return;
                  if (viewMonth === 11) {
                    setViewMonth(0);
                    setViewYear((y) => y + 1);
                  } else {
                    setViewMonth((m) => m + 1);
                  }
                }}
                disabled={!canGoNext}
              >
                <Text style={s.navBtnText}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={s.weekRow}>
              {WEEKDAYS.map((w) => (
                <View key={w} style={s.weekCell}>
                  <Text style={s.weekText}>{w}</Text>
                </View>
              ))}
            </View>

            <View style={s.daysGrid}>
              {calendarDays.map((day, idx) => {
                const selected = (schedules[day.date] || []).length > 0;
                const count = schedules[day.date]?.length || 0;
                const weekday = parseIsoDate(day.date).getDay();
                const closed = !weekdayHours[weekday].enabled;

                return (
                  <TouchableOpacity
                    key={`${day.date}-${idx}`}
                    style={s.dayCell}
                    activeOpacity={day.isDisabled ? 1 : 0.75}
                    onPress={() => handleDatePress(day.date, day.isDisabled)}
                  >
                    <View style={[
                      s.dayInner,
                      !day.isCurrentMonth && s.dayInnerOtherMonth,
                      day.isDisabled && s.dayInnerDisabled,
                      closed && day.isCurrentMonth && !day.isDisabled && s.dayInnerClosed,
                      selected && s.dayInnerSelected,
                    ]}>
                      <Text style={[
                        s.dayText,
                        !day.isCurrentMonth && s.dayTextOtherMonth,
                        day.isDisabled && s.dayTextDisabled,
                        closed && day.isCurrentMonth && !day.isDisabled && s.dayTextClosed,
                        selected && s.dayTextSelected,
                      ]}>
                        {day.day}
                      </Text>
                      {selected && count > 0 && (
                        <View style={s.timeBadge}>
                          <Text style={s.timeBadgeText}>{count}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={s.sectionBlock}>
          <Text style={s.sectionTitle}>Dentweb</Text>
          <Text style={s.sectionHint}>This button is prepared for possible future Dentweb integration.</Text>
          <TouchableOpacity style={s.dentwebBtn} onPress={handleDentwebConnect} activeOpacity={0.85}>
            <Text style={s.dentwebBtnText}>Connect with Dentweb</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[s.bottomBar, { bottom: bottomBarOffset }]}>
        <Text style={s.bottomMeta}>
          {isDirty
            ? "Unsaved changes. Save to apply slots to patient schedule visits."
            : `${selectedDateCount} date(s) selected`}
        </Text>
        <TouchableOpacity
          style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
          onPress={handleSaveAvailability}
          disabled={!canSave || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={T.white} size="small" />
          ) : (
            <Text style={s.saveBtnText}>
              {params.caseId ? "Save Availability & Send Quote →" : "Save Availability →"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={slotModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSlotModal(null)}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>Open Slots for DentaRoute</Text>
                {slotModal ? <Text style={s.sheetSubtitle}>{formatFullDate(slotModal.date)}</Text> : null}
              </View>
              <TouchableOpacity style={s.sheetCloseBtn} onPress={() => setSlotModal(null)}>
                <Text style={s.sheetCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.sheetHint}>These 30-minute slots are inside your hospital hours. Choose the ones you want to open.</Text>

            <View style={s.quickSelectRow}>
              <TouchableOpacity style={s.quickChip} onPress={() => applyPresetToModal("all")} activeOpacity={0.8}>
                <Text style={s.quickChipText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.quickChip} onPress={() => applyPresetToModal("am")} activeOpacity={0.8}>
                <Text style={s.quickChipText}>Morning</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.quickChip} onPress={() => applyPresetToModal("pm")} activeOpacity={0.8}>
                <Text style={s.quickChipText}>Afternoon</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.quickChip} onPress={() => applyPresetToModal("clear")} activeOpacity={0.8}>
                <Text style={s.quickChipText}>Clear</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.slotScroll} showsVerticalScrollIndicator={false}>
              {(slotModal?.options || []).map((time) => {
                const selected = slotModal?.draft?.[time] ?? false;
                return (
                  <TouchableOpacity
                    key={time}
                    style={[s.slotRow, selected && s.slotRowSelected]}
                    onPress={() => handleSlotToggle(time)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.slotCheck, selected && s.slotCheckSelected]}>
                      {selected && <Text style={s.slotCheckMark}>✓</Text>}
                    </View>
                    <Text style={[s.slotTime, selected && s.slotTimeSelected]}>{time}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={s.sheetFooter}>
              <Text style={s.sheetSelectedCount}>
                {slotModal ? Object.values(slotModal.draft).filter(Boolean).length : 0} slot(s) selected
              </Text>
              <TouchableOpacity style={s.confirmBtn} onPress={handleSlotConfirm} activeOpacity={0.85}>
                <Text style={s.confirmBtnText}>Confirm →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: T.white, marginBottom: 4 },

  content: { paddingHorizontal: 12, paddingTop: 12, gap: 20 },

  sectionBlock: {
    gap: 12,
  },

  card: {
    backgroundColor: T.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    gap: 10,
  },
  sectionTitle: { fontSize: 23, fontWeight: "800", color: T.text },
  sectionHint: { fontSize: 15, color: T.textSec, lineHeight: 21 },

  hoursActionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },

  copyMonBtn: {
    alignSelf: "flex-start",
    backgroundColor: T.tealSoft,
    borderWidth: 1,
    borderColor: "rgba(15,118,110,0.25)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  copyMonBtnText: { fontSize: 14, fontWeight: "700", color: T.teal },
  clearHoursBtn: {
    alignSelf: "flex-start",
    backgroundColor: T.redSoft,
    borderWidth: 1,
    borderColor: "#fecdd3",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearHoursBtnText: { fontSize: 14, fontWeight: "700", color: T.redText },

  monthActionRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  monthActionBtn: {
    flex: 1,
    backgroundColor: T.teal,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  monthActionBtnText: { color: T.white, fontSize: 15, fontWeight: "700" },
  monthActionBtnOutline: {
    flex: 1,
    backgroundColor: T.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  monthActionBtnOutlineText: { color: T.textSec, fontSize: 15, fontWeight: "700" },

  hoursList: { gap: 10 },
  hoursRow: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    backgroundColor: "#fbfdff",
  },
  hoursTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hoursHeaderLeft: { flex: 1, paddingRight: 8, gap: 3 },
  weekdayLabel: { fontSize: 18, fontWeight: "700", color: T.text },
  toggleChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.white,
  },
  toggleChipActive: { backgroundColor: T.tealSoft, borderColor: "rgba(15,118,110,0.28)" },
  toggleChipText: { fontSize: 14, fontWeight: "700", color: T.textSec },
  toggleChipTextActive: { color: T.teal },

  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  timeLabel: { fontSize: 12, color: T.textSec, fontWeight: "700" },
  timeAdjustWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginLeft: 10 },
  timeAdjustWrapInline: { flexDirection: "row", alignItems: "center", gap: 4 },
  periodAdjustWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  periodCard: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    backgroundColor: T.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 7,
  },
  periodHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  periodTitle: { fontSize: 15, fontWeight: "800", color: T.text },
  periodFieldsRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 6 },
  periodField: { flex: 1, minWidth: 0, gap: 5 },
  periodFieldLabel: { fontSize: 12, fontWeight: "700", color: T.textMuted, textAlign: "center" },
  periodDivider: { fontSize: 11, color: T.textMuted, fontWeight: "700", marginTop: 14 },
  timeAdjustBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.white,
    alignItems: "center",
    justifyContent: "center",
  },
  timeAdjustBtnText: { fontSize: 18, fontWeight: "700", color: T.teal, marginTop: -1 },
  timeValue: { minWidth: 88, textAlign: "center", fontSize: 12, fontWeight: "700", color: T.text },
  timeValueSmall: { minWidth: 76, textAlign: "center", fontSize: 11, fontWeight: "700", color: T.text },
  timeValueTiny: { minWidth: 84, textAlign: "center", fontSize: 15, fontWeight: "700", color: T.text },
  timeAdjustBtnSm: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.white,
    alignItems: "center",
    justifyContent: "center",
  },

  calendarWrap: {
    paddingTop: 4,
    marginTop: 2,
  },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.white,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { fontSize: 22, fontWeight: "700", color: T.text, marginTop: -2 },
  monthTitle: { fontSize: 18, fontWeight: "700", color: T.text },
  weekRow: { flexDirection: "row", marginBottom: 6 },
  weekCell: { width: "14.28%", alignItems: "center" },
  weekText: { fontSize: 13, fontWeight: "700", color: T.textMuted },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.28%", alignItems: "center", paddingVertical: 3 },
  dayInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  dayInnerOtherMonth: { opacity: 0.45 },
  dayInnerDisabled: { backgroundColor: "#f1f5f9", borderColor: "#e5e7eb" },
  dayInnerClosed: { backgroundColor: T.redSoft, borderColor: "#fecdd3" },
  dayInnerSelected: { backgroundColor: T.teal, borderColor: T.teal },
  dayText: { fontSize: 16, fontWeight: "600", color: T.text },
  dayTextOtherMonth: { color: "#94a3b8" },
  dayTextDisabled: { color: "#cbd5e1" },
  dayTextClosed: { color: T.redText },
  dayTextSelected: { color: T.white, fontWeight: "800" },
  timeBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  timeBadgeText: { fontSize: 9, color: T.white, fontWeight: "800" },

  emptyText: { fontSize: 12, color: T.textMuted, fontStyle: "italic" },
  monthlyWrap: { gap: 12 },
  monthMiniCard: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    backgroundColor: "#fbfdff",
    padding: 10,
    gap: 8,
  },
  monthMiniHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  monthMiniTitle: { fontSize: 14, fontWeight: "700", color: T.text },
  monthMiniMeta: { fontSize: 11, color: T.textSec, fontWeight: "600" },
  miniWeekRow: { flexDirection: "row" },
  miniWeekCell: { width: "14.28%", alignItems: "center" },
  miniWeekText: { fontSize: 10, color: T.textMuted, fontWeight: "700" },
  miniDaysGrid: { flexDirection: "row", flexWrap: "wrap" },
  miniDayCell: { width: "14.28%", alignItems: "center", paddingVertical: 2 },
  miniDayInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  miniDayInnerSelected: { backgroundColor: T.teal, borderColor: T.teal },
  miniDayText: { fontSize: 11, color: T.text, fontWeight: "600" },
  miniDayTextSelected: { color: T.white, fontWeight: "800" },
  miniCountBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 1,
  },
  miniCountText: { fontSize: 7, color: T.white, fontWeight: "800" },
  monthLegendRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.teal },
  legendText: { fontSize: 10, color: T.textSec, fontWeight: "600" },
  legendHint: { fontSize: 10, color: T.textMuted },
  summaryRow: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 10,
    gap: 8,
    backgroundColor: "#fbfdff",
  },
  summaryHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  summaryDate: { fontSize: 13, fontWeight: "600", color: T.text },
  summaryCountBadge: {
    backgroundColor: T.tealSoft,
    borderWidth: 1,
    borderColor: "rgba(15,118,110,0.25)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  summaryCountText: { fontSize: 10, color: T.teal, fontWeight: "700" },
  summaryRange: { fontSize: 11, color: T.textSec, fontWeight: "600" },
  summaryChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  summaryTimeChip: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  summaryTimeChipText: { fontSize: 10, color: T.textSec, fontWeight: "700" },
  summaryMoreChip: {
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  summaryMoreChipText: { fontSize: 10, color: T.text, fontWeight: "700" },

  dentwebBtn: {
    backgroundColor: T.blue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dentwebBtnText: { color: T.white, fontSize: 18, fontWeight: "700" },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: T.border,
    backgroundColor: T.white,
    gap: 8,
    zIndex: 20,
    elevation: 10,
  },
  bottomMeta: { fontSize: 13, color: T.textSec, fontWeight: "600" },
  saveBtn: {
    backgroundColor: T.teal,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    minHeight: 52,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { fontSize: 17, fontWeight: "700", color: T.white },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: T.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: "82%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: T.text },
  sheetSubtitle: { fontSize: 13, color: T.textSec, marginTop: 2 },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseBtnText: { fontSize: 14, color: T.textSec, fontWeight: "700" },
  sheetHint: { fontSize: 12, color: T.textSec, paddingHorizontal: 24, marginBottom: 6 },
  quickSelectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  quickChip: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickChipText: { fontSize: 11, fontWeight: "700", color: T.textSec },
  slotScroll: { paddingHorizontal: 16 },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
    marginBottom: 2,
  },
  slotRowSelected: { backgroundColor: T.tealSoft, borderColor: T.teal },
  slotCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.white,
  },
  slotCheckSelected: { backgroundColor: T.teal, borderColor: T.teal },
  slotCheckMark: { color: T.white, fontSize: 12, fontWeight: "800" },
  slotTime: { fontSize: 15, color: T.text },
  slotTimeSelected: { color: T.teal, fontWeight: "700" },
  sheetFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: T.border,
    marginTop: 8,
  },
  sheetSelectedCount: { fontSize: 13, color: T.textSec, fontWeight: "600" },
  confirmBtn: {
    backgroundColor: T.teal,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 24,
  },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: T.white },
});
