import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { store } from "../../lib/store";

// ─── Theme ───────────────────────────────────────────────────────────────────
const T = {
  teal: "#0f766e",
  tealLight: "#14b8a6",
  blue: "#2563eb",
  amber: "#f59e0b",
  pink: "#ec4899",
  bg: "#f8fafc",
  white: "#fff",
  text: "#0f172a",
  textSec: "#64748b",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  red: "#ef4444",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const VISIT_COLORS = [T.teal, T.tealLight, T.blue, T.amber, T.pink];

// ─── Types ────────────────────────────────────────────────────────────────────
type PlanItem = { id: string; treatment: string; qty: number; price: number };

type CalendarDay = {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isDisabled: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

const formatShortDate = (iso: string): string => {
  const d = parseIsoDate(iso);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
};

const formatFullDate = (iso: string): string => {
  const d = parseIsoDate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
};

const daysBetween = (a: string, b: string): number => {
  const from = toDateOnly(parseIsoDate(a));
  const to = toDateOnly(parseIsoDate(b));
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
};

const buildTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 8; hour <= 22; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 22 && minute > 0) continue;
      const suffix = hour >= 12 ? "PM" : "AM";
      const h12 = hour % 12 === 0 ? 12 : hour % 12;
      slots.push(`${h12}:${String(minute).padStart(2, "0")} ${suffix}`);
    }
  }
  return slots;
};

const ALL_TIME_SLOTS = buildTimeSlots(); // 8:00 AM … 10:00 PM, 30-min

// ─── Component ────────────────────────────────────────────────────────────────
export default function SchedulePatientScreen() {
  const { caseId, planItemsJson, totalPrice: totalPriceParam } =
    useLocalSearchParams<{ caseId: string; planItemsJson: string; totalPrice: string }>();

  const planItems = useMemo<PlanItem[]>(() => {
    try {
      const parsed = planItemsJson ? JSON.parse(planItemsJson) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item: any) => ({
        id: String(item.id || Date.now()),
        treatment: String(item.treatment || "Treatment"),
        qty: Number(item.qty || 1),
        price: Number(item.price || 0),
      }));
    } catch { return []; }
  }, [planItemsJson]);

  const totalPrice = Number(totalPriceParam || 0);

  // ── remote data
  const [loading, setLoading] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [caseData, setCaseData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const profile = await store.getDoctorProfile();
      if (profile) setDoctorProfile(profile);
      if (caseId) {
        const c = await store.getCase(caseId);
        if (c) setCaseData(c);
      }
    })();
  }, [caseId]);

  // ── visit count  (1-5)
  const [visitCount, setVisitCount] = useState(1);

  // ── per-visit schedule: visitNum → { date ISO → string[] (selected times) }
  const [schedules, setSchedules] = useState<Record<number, Record<string, string[]>>>({});

  // ── active visit shown in the calendar
  const [activeVisit, setActiveVisit] = useState(1);

  // ── calendar navigation
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

  // ── time-slot modal state
  const [slotModal, setSlotModal] = useState<{
    visitNum: number;
    date: string;
    draft: Record<string, boolean>;
  } | null>(null);

  // trim schedules when visitCount shrinks
  useEffect(() => {
    setSchedules((prev) => {
      const next: Record<number, Record<string, string[]>> = {};
      for (let v = 1; v <= visitCount; v++) {
        if (prev[v]) next[v] = prev[v];
      }
      return next;
    });
    setActiveVisit((prev) => Math.min(prev, visitCount));
  }, [visitCount]);

  // ─── derived ──────────────────────────────────────────────────────────────
  const visitNumbers = useMemo(
    () => Array.from({ length: visitCount }, (_, i) => i + 1),
    [visitCount]
  );

  /** visits that have at least one date with at least one time slot */
  const readyVisitCount = useMemo(
    () =>
      visitNumbers.filter((v) => {
        const ds = schedules[v] || {};
        return Object.values(ds).some((times) => times.length > 0);
      }).length,
    [visitNumbers, schedules]
  );

  const allVisitsReady = readyVisitCount === visitCount;
  const progress = visitCount > 0 ? (readyVisitCount / visitCount) * 100 : 0;

  // ─── calendar grid ─────────────────────────────────────────────────────────
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

  /** Which visit number owns this date (any visit) */
  const getOwnerVisit = (date: string): number | null => {
    for (const [vStr, ds] of Object.entries(schedules)) {
      if (ds[date] !== undefined) return Number(vStr);
    }
    return null;
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleDatePress = (date: string, isDisabled: boolean) => {
    if (isDisabled) return;

    const owner = getOwnerVisit(date);

    // date used by another visit → reject
    if (owner !== null && owner !== activeVisit) {
      Alert.alert(
        "Date already used",
        `This date is already assigned to Visit ${owner}. Different visits cannot share the same date.`
      );
      return;
    }

    if (owner === activeVisit) {
      // already in this visit → remove it
      setSchedules((prev) => {
        const next = { ...prev };
        const visitDates = { ...(next[activeVisit] || {}) };
        delete visitDates[date];
        next[activeVisit] = visitDates;
        return next;
      });
    } else {
      // open time-slot picker
      setSlotModal({ visitNum: activeVisit, date, draft: {} });
    }
  };

  const handleSlotToggle = (time: string) => {
    setSlotModal((prev) => {
      if (!prev) return prev;
      const draft = { ...prev.draft, [time]: !prev.draft[time] };
      return { ...prev, draft };
    });
  };

  const handleSlotConfirm = () => {
    if (!slotModal) return;
    const { visitNum, date, draft } = slotModal;
    const selectedTimes = ALL_TIME_SLOTS.filter((t) => draft[t]);
    if (selectedTimes.length === 0) {
      Alert.alert("No time selected", "Please choose at least one time slot.");
      return;
    }
    setSchedules((prev) => {
      const next = { ...prev };
      const visitDates = { ...(next[visitNum] || {}) };
      visitDates[date] = selectedTimes;
      next[visitNum] = visitDates;
      return next;
    });
    setSlotModal(null);
  };

  // ─── Send quote ────────────────────────────────────────────────────────────
  const handleSendQuote = async () => {
    if (!caseData || !allVisitsReady) return;
    setLoading(true);
    try {
      const allDates = Object.values(schedules)
        .flatMap((ds) => Object.keys(ds))
        .sort();
      const firstDate = allDates[0];
      const lastDate = allDates[allDates.length - 1];
      const duration =
        firstDate && lastDate && firstDate !== lastDate
          ? `${visitCount} visit${visitCount > 1 ? "s" : ""} over ${daysBetween(firstDate, lastDate) + 1} days`
          : `${visitCount} visit${visitCount > 1 ? "s" : ""}`;

      const visits = visitNumbers.map((v) => {
        const ds = schedules[v] || {};
        const sortedDates = Object.keys(ds).sort();
        const availabilitySlots = sortedDates.flatMap((date) =>
          (ds[date] || []).map((time) => ({ date, time }))
        );
        return { visit: v, description: `Visit ${v}`, availabilitySlots };
      });

      await store.createQuote({
        caseId: caseData.id,
        dentistName: doctorProfile?.fullName || doctorProfile?.name || "Doctor",
        clinicName: doctorProfile?.clinicName || doctorProfile?.clinic || "Clinic",
        location: doctorProfile?.location || "Gangnam, Seoul",
        rating: doctorProfile?.rating || 4.9,
        reviewCount: doctorProfile?.reviewCount || 127,
        totalPrice,
        treatments: planItems.map((p) => ({ name: p.treatment, qty: p.qty, price: p.price })),
        treatmentDetails: "",
        duration,
        visits,
        message: "",
      });

      router.replace("/doctor/dashboard" as any);
    } catch (err) {
      console.error("Error sending quote:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Visit summary row ─────────────────────────────────────────────────────
  const renderSummaryRow = (v: number) => {
    const ds = schedules[v] || {};
    const dates = Object.keys(ds).sort();
    const color = VISIT_COLORS[(v - 1) % VISIT_COLORS.length];
    return (
      <View key={`sum-${v}`} style={s.sumBlock}>
        <View style={[s.sumDot, { backgroundColor: color }]}>
          <Text style={s.sumDotText}>{v}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[s.sumVisitTitle, { color }]}>Visit {v}</Text>
          {dates.length === 0 ? (
            <Text style={s.sumNone}>No dates selected</Text>
          ) : (
            dates.map((date) => {
              const times = ds[date] || [];
              return (
                <View key={date} style={s.sumDateRow}>
                  <Text style={s.sumDate}>{formatFullDate(date)}</Text>
                  <Text style={s.sumTimes}>{times.join("  ·  ")}</Text>
                </View>
              );
            })
          )}
        </View>
      </View>
    );
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient colors={["#0f766e", "#134e4a"]} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Schedule Patient</Text>
        <Text style={s.subtitle}>Case #{caseId} · {caseData?.patientName || "Patient"}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Visit count stepper */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>How many visits?</Text>
          <Text style={s.sectionHint}>Select between 1 and 5 visits.</Text>
          <View style={s.stepperRow}>
            <TouchableOpacity
              style={[s.stepperBtn, visitCount <= 1 && s.stepperBtnDisabled]}
              onPress={() => setVisitCount((v) => Math.max(1, v - 1))}
              disabled={visitCount <= 1}
            >
              <Text style={s.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <View style={s.stepperValueWrap}>
              <Text style={s.stepperValue}>{visitCount}</Text>
              <Text style={s.stepperLabel}>{visitCount === 1 ? "visit" : "visits"}</Text>
            </View>
            <TouchableOpacity
              style={[s.stepperBtn, visitCount >= 5 && s.stepperBtnDisabled]}
              onPress={() => setVisitCount((v) => Math.min(5, v + 1))}
              disabled={visitCount >= 5}
            >
              <Text style={s.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Candidate dates card */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Select Candidate Dates</Text>
          <Text style={s.sectionHint}>
            Choose a visit tab, then tap dates on the calendar. You can add unlimited dates per visit.{"\n"}
            Tap a highlighted date to remove it. Different visits cannot share the same date.
          </Text>

          {/* Visit tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll}>
            <View style={s.tabsRow}>
              {visitNumbers.map((v) => {
                const ds = schedules[v] || {};
                const dateCount = Object.keys(ds).length;
                const color = VISIT_COLORS[(v - 1) % VISIT_COLORS.length];
                const isActive = activeVisit === v;
                const hasEntries = dateCount > 0;
                return (
                  <TouchableOpacity
                    key={v}
                    style={[
                      s.visitTab,
                      isActive && { borderColor: color, backgroundColor: `${color}15` },
                      !isActive && hasEntries && { borderColor: `${color}55` },
                    ]}
                    onPress={() => setActiveVisit(v)}
                    activeOpacity={0.75}
                  >
                    <View style={[s.visitTabDot, { backgroundColor: hasEntries ? color : "#cbd5e1" }]}>
                      <Text style={s.visitTabDotText}>{hasEntries ? "✓" : v}</Text>
                    </View>
                    <Text style={[s.visitTabLabel, isActive && { color }]}>Visit {v}</Text>
                    {hasEntries && (
                      <View style={[s.visitTabBadge, { backgroundColor: color }]}>
                        <Text style={s.visitTabBadgeText}>{dateCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Calendar */}
          <View style={s.calendarWrap}>
            <View style={s.monthNav}>
              <TouchableOpacity
                style={[s.navBtn, !canGoPrev && s.navBtnDisabled]}
                onPress={() => {
                  if (!canGoPrev) return;
                  if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
                  else setViewMonth((m) => m - 1);
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
                  if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
                  else setViewMonth((m) => m + 1);
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
                const owner = getOwnerVisit(day.date);
                const isOwnedByActive = owner === activeVisit;
                const isOwnedByOther = owner !== null && owner !== activeVisit;
                const color = owner !== null ? VISIT_COLORS[(owner - 1) % VISIT_COLORS.length] : undefined;
                const timesCount = isOwnedByActive ? (schedules[activeVisit]?.[day.date]?.length ?? 0) : 0;

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
                      isOwnedByActive && { backgroundColor: color || T.teal, borderColor: color || T.teal },
                      isOwnedByOther && { borderColor: color || T.teal, borderWidth: 2 },
                    ]}>
                      <Text style={[
                        s.dayText,
                        !day.isCurrentMonth && s.dayTextOtherMonth,
                        day.isDisabled && s.dayTextDisabled,
                        isOwnedByActive && s.dayTextSelected,
                        isOwnedByOther && { color: color || T.teal, fontWeight: "700" },
                      ]}>
                        {day.day}
                      </Text>
                      {owner !== null && (
                        <Text style={[
                          s.dayVisitLabel,
                          isOwnedByOther && { color: color || T.teal },
                        ]}>V{owner}</Text>
                      )}
                      {isOwnedByActive && timesCount > 0 && (
                        <View style={s.timeBadge}>
                          <Text style={s.timeBadgeText}>{timesCount}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Text style={s.calendarNote}>
            Tap a date to add it to <Text style={{ fontWeight: "700" }}>Visit {activeVisit}</Text>.  Tap again to remove.
          </Text>
        </View>

        {/* Summary */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Selected Schedule</Text>
          {visitNumbers.map(renderSummaryRow)}
        </View>

      </ScrollView>

      {/* Bottom bar */}
      <View style={s.bottomBar}>
        <View style={s.progressRow}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={s.progressText}>{readyVisitCount}/{visitCount} ready</Text>
        </View>
        <TouchableOpacity
          style={[s.sendBtn, !allVisitsReady && s.sendBtnDisabled]}
          onPress={handleSendQuote}
          disabled={!allVisitsReady || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={T.white} size="small" />
          ) : (
            <Text style={s.sendBtnText}>Send Quote →</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Time-slot modal */}
      <Modal
        visible={slotModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSlotModal(null)}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            {/* sheet handle */}
            <View style={s.sheetHandle} />

            {/* header */}
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>Select Time Slots</Text>
                {slotModal && (
                  <Text style={s.sheetSubtitle}>
                    Visit {slotModal.visitNum}  ·  {formatFullDate(slotModal.date)}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={s.sheetCloseBtn}
                onPress={() => setSlotModal(null)}
              >
                <Text style={s.sheetCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.sheetHint}>Select as many time slots as you'd like to offer.</Text>

            {/* scrollable slot list */}
            <ScrollView style={s.slotScroll} showsVerticalScrollIndicator={false}>
              {ALL_TIME_SLOTS.map((time) => {
                const selected = slotModal?.draft[time] ?? false;
                const visitColor = slotModal
                  ? VISIT_COLORS[(slotModal.visitNum - 1) % VISIT_COLORS.length]
                  : T.teal;
                return (
                  <TouchableOpacity
                    key={time}
                    style={[
                      s.slotRow,
                      selected && { backgroundColor: `${visitColor}12`, borderColor: visitColor },
                    ]}
                    onPress={() => handleSlotToggle(time)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      s.slotCheck,
                      selected && { backgroundColor: visitColor, borderColor: visitColor },
                    ]}>
                      {selected && <Text style={s.slotCheckMark}>✓</Text>}
                    </View>
                    <Text style={[
                      s.slotTime,
                      selected && { color: visitColor, fontWeight: "700" },
                    ]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* footer */}
            <View style={s.sheetFooter}>
              <Text style={s.sheetSelectedCount}>
                {slotModal ? Object.values(slotModal.draft).filter(Boolean).length : 0} slot(s) selected
              </Text>
              <TouchableOpacity
                style={[
                  s.confirmBtn,
                  slotModal && Object.values(slotModal.draft).every((v) => !v) && s.confirmBtnDisabled,
                ]}
                onPress={handleSlotConfirm}
                activeOpacity={0.85}
              >
                <Text style={s.confirmBtnText}>Confirm →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },
  title: { fontSize: 24, fontWeight: "700", color: T.white, marginBottom: 4 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)" },

  content: { padding: 24, gap: 14, paddingBottom: 120 },

  card: {
    backgroundColor: T.white, borderRadius: 14,
    borderWidth: 1, borderColor: T.border,
    padding: 16, gap: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: T.text },
  sectionHint: { fontSize: 12, color: T.textSec, lineHeight: 18 },

  // stepper
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  stepperBtn: {
    width: 46, height: 46, borderRadius: 12,
    borderWidth: 1, borderColor: T.border, backgroundColor: "#f1f5f9",
    alignItems: "center", justifyContent: "center",
  },
  stepperBtnDisabled: { opacity: 0.35 },
  stepperBtnText: { fontSize: 24, fontWeight: "700", color: T.teal, marginTop: -2 },
  stepperValueWrap: { alignItems: "center" },
  stepperValue: { fontSize: 34, lineHeight: 38, fontWeight: "800", color: T.text },
  stepperLabel: { fontSize: 12, fontWeight: "600", color: T.textSec, marginTop: 2 },

  // visit tabs
  tabsScroll: { marginHorizontal: -4 },
  tabsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 4, paddingVertical: 2 },
  visitTab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 22, borderWidth: 1, borderColor: T.border,
    backgroundColor: T.white, paddingHorizontal: 12, paddingVertical: 8,
  },
  visitTabDot: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  visitTabDotText: { color: T.white, fontSize: 10, fontWeight: "800" },
  visitTabLabel: { fontSize: 13, fontWeight: "600", color: T.text },
  visitTabBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  visitTabBadgeText: { color: T.white, fontSize: 10, fontWeight: "800" },

  // calendar
  calendarWrap: {
    borderRadius: 12, borderWidth: 1, borderColor: T.border,
    padding: 12, backgroundColor: T.bg, marginTop: 2,
  },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  navBtn: {
    width: 34, height: 34, borderRadius: 10,
    borderWidth: 1, borderColor: T.border, backgroundColor: T.white,
    alignItems: "center", justifyContent: "center",
  },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { fontSize: 20, fontWeight: "700", color: T.text, marginTop: -2 },
  monthTitle: { fontSize: 15, fontWeight: "700", color: T.text },
  weekRow: { flexDirection: "row", marginBottom: 6 },
  weekCell: { width: "14.28%", alignItems: "center" },
  weekText: { fontSize: 11, fontWeight: "700", color: T.textMuted },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.28%", alignItems: "center", paddingVertical: 3 },
  dayInner: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1, borderColor: "transparent",
    alignItems: "center", justifyContent: "center",
  },
  dayInnerOtherMonth: { opacity: 0.45 },
  dayInnerDisabled: { backgroundColor: "#f1f5f9", borderColor: "#e5e7eb" },
  dayText: { fontSize: 14, fontWeight: "600", color: T.text },
  dayTextOtherMonth: { color: "#94a3b8" },
  dayTextDisabled: { color: "#cbd5e1" },
  dayTextSelected: { color: T.white, fontWeight: "800" },
  dayVisitLabel: {
    position: "absolute", bottom: 1, fontSize: 8,
    color: "rgba(255,255,255,0.9)", fontWeight: "800",
  },
  timeBadge: {
    position: "absolute", top: 0, right: 0,
    minWidth: 14, height: 14, borderRadius: 7,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 2,
  },
  timeBadgeText: { fontSize: 8, color: T.white, fontWeight: "800" },
  calendarNote: { fontSize: 11, color: T.textSec, lineHeight: 17 },

  // summary
  sumBlock: {
    flexDirection: "row", gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  sumDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 1 },
  sumDotText: { color: T.white, fontSize: 11, fontWeight: "800" },
  sumVisitTitle: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  sumNone: { fontSize: 12, color: T.textMuted, fontStyle: "italic" },
  sumDateRow: { marginBottom: 4 },
  sumDate: { fontSize: 13, fontWeight: "600", color: T.text },
  sumTimes: { fontSize: 11, color: T.textSec, marginTop: 1 },

  // bottom bar
  bottomBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: T.border,
    backgroundColor: T.white, gap: 10,
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: T.teal },
  progressText: { fontSize: 12, fontWeight: "700", color: T.textSec },
  sendBtn: { backgroundColor: T.teal, borderRadius: 14, paddingVertical: 15, alignItems: "center", minHeight: 52 },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnText: { fontSize: 15, fontWeight: "700", color: T.white },

  // modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: T.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32, maxHeight: "82%",
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: "#e2e8f0",
    alignSelf: "center", marginTop: 10, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 24, paddingTop: 14, paddingBottom: 6,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: T.text },
  sheetSubtitle: { fontSize: 13, color: T.textSec, marginTop: 2 },
  sheetCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center",
  },
  sheetCloseBtnText: { fontSize: 14, color: T.textSec, fontWeight: "700" },
  sheetHint: { fontSize: 12, color: T.textSec, paddingHorizontal: 24, marginBottom: 6 },

  slotScroll: { paddingHorizontal: 16 },
  slotRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 13, paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1, borderColor: "transparent",
    marginBottom: 2,
  },
  slotCheck: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: T.border,
    alignItems: "center", justifyContent: "center", backgroundColor: T.white,
  },
  slotCheckMark: { color: T.white, fontSize: 12, fontWeight: "800" },
  slotTime: { fontSize: 15, color: T.text },

  sheetFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: T.border, marginTop: 8,
  },
  sheetSelectedCount: { fontSize: 13, color: T.textSec, fontWeight: "600" },
  confirmBtn: {
    backgroundColor: T.teal, borderRadius: 12,
    paddingVertical: 11, paddingHorizontal: 24,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: T.white },
});
