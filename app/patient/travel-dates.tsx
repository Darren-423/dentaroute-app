import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { store } from "../../lib/store";

const T = {
  teal: "#4A0080", tealMid: "#5C10A0", tealLight: "#f0e6f6",
  navy: "#0f172a", slate: "#64748b", slateLight: "#94a3b8",
  border: "#e2e8f0", bg: "#f8fafc", white: "#fff",
  blue: "#3b82f6", blueLight: "#eff6ff",
  amber: "#f59e0b", amberLight: "#fffbeb",
  purple: "#8b5cf6", purpleLight: "#f5f3ff",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const formatDisplay = (str: string) => {
  const [y, m, d] = str.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1].slice(0, 3)} ${parseInt(d)}, ${y}`;
};

type ScheduleType = "fixed" | "flexible" | "undetermined";

const SCHEDULE_OPTIONS: { key: ScheduleType; icon: string; title: string; desc: string; color: string; bgColor: string }[] = [
  {
    key: "fixed",
    icon: "📌",
    title: "Fixed Dates",
    desc: "I have confirmed flight tickets",
    color: T.teal,
    bgColor: T.tealLight,
  },
  {
    key: "flexible",
    icon: "🔄",
    title: "Flexible Dates",
    desc: "Approximate dates, can adjust",
    color: T.amber,
    bgColor: T.amberLight,
  },
  {
    key: "undetermined",
    icon: "❓",
    title: "Not Decided Yet",
    desc: "I'll decide after seeing treatment plans",
    color: T.purple,
    bgColor: T.purpleLight,
  },
];

export default function TravelDatesScreen() {
  const today = new Date();
  const [scheduleType, setScheduleType] = useState<ScheduleType | null>(null);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [arrivalDate, setArrivalDate] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [selecting, setSelecting] = useState<"arrival" | "departure">("arrival");
  const [loading, setLoading] = useState(false);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const days: { date: string; day: number; isCurrentMonth: boolean; isPast: boolean }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const date = new Date(viewYear, viewMonth - 1, d);
      days.push({ date: toDateStr(date), day: d, isCurrentMonth: false, isPast: date < new Date(today.getFullYear(), today.getMonth(), today.getDate()) });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(viewYear, viewMonth, i);
      days.push({ date: toDateStr(date), day: i, isCurrentMonth: true, isPast: date < new Date(today.getFullYear(), today.getMonth(), today.getDate()) });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(viewYear, viewMonth + 1, i);
      days.push({ date: toDateStr(date), day: i, isCurrentMonth: false, isPast: false });
    }

    return days;
  }, [viewMonth, viewYear]);

  const isInRange = (dateStr: string) => {
    if (!arrivalDate || !departureDate) return false;
    return dateStr > arrivalDate && dateStr < departureDate;
  };

  const tripDays = useMemo(() => {
    if (!arrivalDate || !departureDate) return 0;
    const a = new Date(arrivalDate);
    const b = new Date(departureDate);
    return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  }, [arrivalDate, departureDate]);

  const handleDatePress = (dateStr: string, isPast: boolean) => {
    if (isPast) return;

    if (selecting === "arrival") {
      setArrivalDate(dateStr);
      setDepartureDate("");
      setSelecting("departure");
    } else {
      if (dateStr <= arrivalDate) {
        setArrivalDate(dateStr);
        setDepartureDate("");
        setSelecting("departure");
      } else {
        setDepartureDate(dateStr);
        setSelecting("arrival");
      }
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const handleNext = async () => {
    if (!scheduleType) return;
    if (scheduleType !== "undetermined" && (!arrivalDate || !departureDate)) return;
    setLoading(true);
    try {
      await store.savePatientTravel({
        scheduleType,
        arrivalDate: scheduleType !== "undetermined" ? arrivalDate : null,
        departureDate: scheduleType !== "undetermined" ? departureDate : null,
        tripDays: scheduleType !== "undetermined" ? tripDays : null,
      });
    } catch {}
    setTimeout(() => {
      setLoading(false);
      router.push("/patient/upload" as any);
    }, 300);
  };

  const needsCalendar = scheduleType === "fixed" || scheduleType === "flexible";
  const isComplete = scheduleType === "undetermined" || (needsCalendar && arrivalDate && departureDate);

  const activeOption = SCHEDULE_OPTIONS.find((o) => o.key === scheduleType);

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient colors={["#3D0070", "#2F0058", "#220040"]} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.title}>Travel Schedule</Text>
            <Text style={s.subtitle}>How set are your travel dates?</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.stepRow}>
          <View style={[s.stepDot, s.stepDotActive]} />
          <View style={s.stepLine} />
          <View style={s.stepDot} />
          <View style={s.stepLine} />
          <View style={s.stepDot} />
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* ── Schedule Type Selection ── */}
        <View style={s.typeSection}>
          {SCHEDULE_OPTIONS.map((opt) => {
            const active = scheduleType === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  s.typeCard,
                  active && { borderColor: opt.color, backgroundColor: opt.bgColor },
                ]}
                onPress={() => {
                  setScheduleType(opt.key);
                  if (opt.key === "undetermined") {
                    setArrivalDate("");
                    setDepartureDate("");
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={s.typeIcon}>{opt.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.typeTitle, active && { color: opt.color }]}>{opt.title}</Text>
                  <Text style={s.typeDesc}>{opt.desc}</Text>
                </View>
                <View style={[s.typeRadio, active && { borderColor: opt.color }]}>
                  {active && <View style={[s.typeRadioDot, { backgroundColor: opt.color }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Flexible Note ── */}
        {scheduleType === "flexible" && (
          <View style={[s.infoBox, { backgroundColor: T.amberLight, borderColor: T.amber }]}>
            <Text style={[s.infoBoxText, { color: "#92400e" }]}>
              💡 Select your approximate dates. Your dentist may suggest adjusting them based on the treatment plan.
            </Text>
          </View>
        )}

        {/* ── Undetermined Note ── */}
        {scheduleType === "undetermined" && (
          <View style={[s.infoBox, { backgroundColor: T.purpleLight, borderColor: T.purple }]}>
            <Text style={[s.infoBoxText, { color: "#5b21b6" }]}>
              👍 No problem! Your dentist will recommend a treatment duration, and you can plan your trip around it.
            </Text>
          </View>
        )}

        {/* ── Calendar (Fixed & Flexible only) ── */}
        {needsCalendar && (
          <>
            {/* Selection Tabs */}
            <View style={s.selectionRow}>
              <TouchableOpacity
                style={[s.selectionTab, selecting === "arrival" && s.selectionTabActive]}
                onPress={() => setSelecting("arrival")}
              >
                <Text style={s.selectionIcon}>✈️</Text>
                <View>
                  <Text style={s.selectionLabel}>Arrival</Text>
                  <Text style={[s.selectionDate, arrivalDate && s.selectionDateFilled]}>
                    {arrivalDate ? formatDisplay(arrivalDate) : "Select date"}
                  </Text>
                </View>
              </TouchableOpacity>
              <Text style={s.arrow}>→</Text>
              <TouchableOpacity
                style={[s.selectionTab, selecting === "departure" && s.selectionTabActive]}
                onPress={() => setSelecting("departure")}
              >
                <Text style={s.selectionIcon}>🏠</Text>
                <View>
                  <Text style={s.selectionLabel}>Departure</Text>
                  <Text style={[s.selectionDate, departureDate && s.selectionDateFilled]}>
                    {departureDate ? formatDisplay(departureDate) : "Select date"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Trip Duration */}
            {tripDays > 0 && (
              <View style={s.durationBadge}>
                <Text style={s.durationText}>
                  📅 {tripDays} day{tripDays !== 1 ? "s" : ""} in Korea
                  {scheduleType === "flexible" ? "  (approx.)" : ""}
                </Text>
              </View>
            )}

            {/* Calendar */}
            <View style={s.calendar}>
              <View style={s.monthNav}>
                <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
                  <Text style={s.navBtnText}>‹</Text>
                </TouchableOpacity>
                <Text style={s.monthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
                <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
                  <Text style={s.navBtnText}>›</Text>
                </TouchableOpacity>
              </View>

              <View style={s.weekRow}>
                {WEEKDAYS.map((d) => (
                  <View key={d} style={s.weekCell}>
                    <Text style={s.weekText}>{d}</Text>
                  </View>
                ))}
              </View>

              <View style={s.daysGrid}>
                {calendarDays.map((d, i) => {
                  const isArrival = d.date === arrivalDate;
                  const isDeparture = d.date === departureDate;
                  const inRange = isInRange(d.date);
                  const isSelected = isArrival || isDeparture;

                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        s.dayCell,
                        inRange && s.dayCellRange,
                        isArrival && s.dayCellRangeStart,
                        isDeparture && s.dayCellRangeEnd,
                      ]}
                      onPress={() => handleDatePress(d.date, d.isPast)}
                      disabled={d.isPast}
                      activeOpacity={0.6}
                    >
                      <View style={[s.dayInner, isSelected && s.dayInnerSelected]}>
                        <Text style={[
                          s.dayText,
                          !d.isCurrentMonth && s.dayTextOther,
                          d.isPast && s.dayTextPast,
                          isSelected && s.dayTextSelected,
                          inRange && s.dayTextRange,
                        ]}>
                          {d.day}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Hint */}
            <View style={s.hint}>
              <Text style={s.hintText}>
                {!arrivalDate
                  ? "✈️ Tap to select your arrival date"
                  : !departureDate
                    ? "🏠 Now select your departure date"
                    : "✅ Your travel dates are set!"}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom */}
      <View style={s.bottomBar}>
        {scheduleType && (
          <View style={s.bottomSummary}>
            <Text style={s.bottomSummaryIcon}>{activeOption?.icon}</Text>
            <Text style={s.bottomSummaryText}>
              {scheduleType === "undetermined"
                ? "Dates to be determined after consultation"
                : scheduleType === "flexible"
                  ? tripDays > 0
                    ? `~${tripDays} days (flexible)`
                    : "Select approximate dates above"
                  : tripDays > 0
                    ? `${tripDays} days (${formatDisplay(arrivalDate)} – ${formatDisplay(departureDate)})`
                    : "Select your travel dates above"
              }
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[s.nextBtn, !isComplete && s.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!isComplete || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={T.white} size="small" />
          ) : (
            <Text style={s.nextBtnText}>Next: Upload Files →</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },
  title: { fontSize: 18, fontWeight: "700", color: "#fff" },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  stepRow: { flexDirection: "row", alignItems: "center", marginTop: 14, paddingHorizontal: 20 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)" },
  stepDotActive: { backgroundColor: "#f59e0b", width: 10, height: 10, borderRadius: 5 },
  stepLine: { flex: 1, height: 2, backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 6 },

  content: { padding: 20, gap: 16, paddingBottom: 60 },

  // ── Schedule Type ──
  typeSection: { gap: 10 },
  typeCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 16,
    backgroundColor: T.white, borderWidth: 1.5, borderColor: T.border,
  },
  typeIcon: { fontSize: 26 },
  typeTitle: { fontSize: 15, fontWeight: "700", color: T.navy },
  typeDesc: { fontSize: 12, color: T.slate, marginTop: 2 },
  typeRadio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: T.border,
    alignItems: "center", justifyContent: "center",
  },
  typeRadioDot: { width: 12, height: 12, borderRadius: 6 },

  // ── Info Box ──
  infoBox: {
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderLeftWidth: 4,
  },
  infoBoxText: { fontSize: 13, lineHeight: 19 },

  // ── Selection tabs ──
  selectionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  selectionTab: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, backgroundColor: T.white, borderWidth: 1.5, borderColor: T.border },
  selectionTabActive: { borderColor: T.tealMid, backgroundColor: T.tealLight },
  selectionIcon: { fontSize: 20 },
  selectionLabel: { fontSize: 10, fontWeight: "600", color: T.slateLight, letterSpacing: 0.5, textTransform: "uppercase" },
  selectionDate: { fontSize: 13, color: T.slateLight, marginTop: 2, fontWeight: "500" },
  selectionDateFilled: { color: T.navy, fontWeight: "600" },
  arrow: { fontSize: 16, color: T.slateLight },

  // ── Duration ──
  durationBadge: { alignSelf: "center", backgroundColor: T.tealLight, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  durationText: { fontSize: 13, fontWeight: "600", color: T.teal },

  // ── Calendar ──
  calendar: { backgroundColor: T.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: T.border },
  monthNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  navBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: T.bg, alignItems: "center", justifyContent: "center" },
  navBtnText: { fontSize: 22, color: T.navy, fontWeight: "600" },
  monthTitle: { fontSize: 16, fontWeight: "700", color: T.navy },

  weekRow: { flexDirection: "row", marginBottom: 6 },
  weekCell: { flex: 1, alignItems: "center", paddingVertical: 4 },
  weekText: { fontSize: 11, fontWeight: "600", color: T.slateLight },

  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.28%", alignItems: "center", justifyContent: "center", paddingVertical: 2 },
  dayCellRange: { backgroundColor: T.tealLight },
  dayCellRangeStart: { backgroundColor: T.tealLight, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
  dayCellRangeEnd: { backgroundColor: T.tealLight, borderTopRightRadius: 20, borderBottomRightRadius: 20 },

  dayInner: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  dayInnerSelected: { backgroundColor: T.teal },

  dayText: { fontSize: 14, fontWeight: "500", color: T.navy },
  dayTextOther: { color: T.slateLight },
  dayTextPast: { color: "#d1d5db" },
  dayTextSelected: { color: T.white, fontWeight: "700" },
  dayTextRange: { color: T.teal, fontWeight: "600" },

  // ── Hint ──
  hint: { backgroundColor: T.blueLight, borderRadius: 12, padding: 14, alignItems: "center" },
  hintText: { fontSize: 13, color: T.blue, fontWeight: "500" },

  // ── Bottom ──
  bottomBar: { paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.white, gap: 10 },
  bottomSummary: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  bottomSummaryIcon: { fontSize: 16 },
  bottomSummaryText: { fontSize: 12, color: T.slate, flex: 1 },
  nextBtn: { backgroundColor: T.teal, borderRadius: 14, paddingVertical: 15, alignItems: "center", minHeight: 52 },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: T.white, fontSize: 15, fontWeight: "600" },
});
