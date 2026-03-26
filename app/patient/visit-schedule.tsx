import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator, Alert,
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View,
} from "react-native";
import { store } from "../../lib/store";


import { PatientTheme, SharedColors } from "../../constants/theme";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatShort = (str: string) => {
  const [, m, d] = str.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1].slice(0, 3)} ${parseInt(d)}`;
};

const formatFull = (str: string) => {
  const [y, m, d] = str.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  return `${dayName}, ${MONTH_NAMES[parseInt(m) - 1].slice(0, 3)} ${parseInt(d)}`;
};

const addDaysToDate = (dateStr: string, months: number, days: number): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (months > 0) date.setMonth(date.getMonth() + months);
  if (days > 0) date.setDate(date.getDate() + days);
  return toDateStr(date);
};

interface Visit {
  visit: number;
  description: string;
  gapMonths?: number;
  gapDays?: number;
  availabilitySlots?: { date: string; time: string }[];
}

type AvailabilitySlot = { date: string; time: string };

const formatGap = (months?: number, days?: number) => {
  const parts: string[] = [];
  if (months) parts.push(`${months}mo`);
  if (days) {
    const w = Math.floor(days / 7);
    const d = days % 7;
    if (w > 0) parts.push(`${w}w`);
    if (d > 0) parts.push(`${d}d`);
  }
  return parts.join(" ");
};

const normalizeVisits = (raw: unknown): Visit[] => {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => {
      const rawVisit = Number((item as any)?.visit);
      const visitNum = Number.isFinite(rawVisit) && rawVisit > 0 ? rawVisit : index + 1;
      const description = String((item as any)?.description || `Visit ${visitNum}`);

      const gapMonthsRaw = Number((item as any)?.gapMonths);
      const gapDaysRaw = Number((item as any)?.gapDays);
      const gapMonths = Number.isFinite(gapMonthsRaw) && gapMonthsRaw > 0 ? gapMonthsRaw : 0;
      const gapDays = Number.isFinite(gapDaysRaw) && gapDaysRaw > 0 ? gapDaysRaw : 0;

      const availabilitySlots = Array.isArray((item as any)?.availabilitySlots)
        ? (item as any).availabilitySlots
            .filter((slot: any) => slot?.date && slot?.time)
            .map((slot: any) => ({ date: String(slot.date), time: String(slot.time) }))
        : undefined;

      return {
        visit: visitNum,
        description,
        ...(gapMonths > 0 ? { gapMonths } : {}),
        ...(gapDays > 0 ? { gapDays } : {}),
        ...(availabilitySlots && availabilitySlots.length > 0 ? { availabilitySlots } : {}),
      };
    })
    .sort((a, b) => a.visit - b.visit);
};

export default function VisitScheduleScreen() {
  const rawParams = useLocalSearchParams<{
    quoteId: string; caseId: string; amount: string; totalPrice: string;
    dentistName: string; clinicName: string; duration: string; visitsJson: string;
    mode?: string; bookingId?: string;
  }>();

  const params = Object.fromEntries(
    Object.entries(rawParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] || "" : v || ""])
  ) as { quoteId: string; caseId: string; amount: string; totalPrice: string; dentistName: string; clinicName: string; duration: string; visitsJson: string; mode: string; bookingId: string };

  const isReschedule = params.mode === "reschedule";

  const visits: Visit[] = useMemo(() => {
    try {
      const parsed = JSON.parse(params.visitsJson || "[]");
      return normalizeVisits(parsed);
    } catch {
      return [];
    }
  }, [params.visitsJson]);

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDates, setSelectedDates] = useState<Record<number, string>>({});
  const [selectedTimes, setSelectedTimes] = useState<Record<number, string>>({});
  const [activeVisit, setActiveVisit] = useState(1);
  const [loading, setLoading] = useState(false);
  const [doctorAvailabilityByVisit, setDoctorAvailabilityByVisit] = useState<Record<number, AvailabilitySlot[]>>({});

  useEffect(() => {
    if (visits.length === 0) return;
    const hasActiveVisit = visits.some((v) => v.visit === activeVisit);
    if (!hasActiveVisit) {
      setActiveVisit(visits[0].visit);
    }
  }, [visits, activeVisit]);

  useEffect(() => {
    let mounted = true;

    const loadDoctorAvailability = async () => {
      const doctorProfile: any = await store.getDoctorProfile();
      if (!mounted || !doctorProfile) return;

      const profileName = doctorProfile.fullName || doctorProfile.name;
      if (params.dentistName && profileName && profileName !== params.dentistName) {
        setDoctorAvailabilityByVisit({});
        return;
      }

      const normalizeSlots = (value: any): AvailabilitySlot[] => {
        if (!Array.isArray(value)) return [];
        return value
          .filter((slot) => slot?.date && slot?.time)
          .map((slot) => ({ date: String(slot.date), time: String(slot.time) }));
      };

      const byVisitRaw = Array.isArray(doctorProfile.availableSlotsByVisit)
        ? doctorProfile.availableSlotsByVisit
        : [];
      const sharedSlots = normalizeSlots(doctorProfile.availableSlots);

      const nextMap: Record<number, AvailabilitySlot[]> = {};
      for (const v of visits) {
        const visitSpecific = byVisitRaw.find((item: any) => Number(item?.visit) === v.visit);
        const specificSlots = normalizeSlots(visitSpecific?.availabilitySlots);
        if (specificSlots.length > 0) {
          nextMap[v.visit] = specificSlots;
        } else if (sharedSlots.length > 0) {
          nextMap[v.visit] = sharedSlots;
        }
      }

      setDoctorAvailabilityByVisit(nextMap);
    };

    loadDoctorAvailability();

    return () => {
      mounted = false;
    };
  }, [params.dentistName, visits]);

  const mergedVisitAvailability = useMemo(() => {
    const map: Record<number, AvailabilitySlot[]> = {};
    for (const v of visits) {
      const quoteSlots = Array.isArray(v.availabilitySlots) ? v.availabilitySlots : [];
      map[v.visit] = quoteSlots.length > 0 ? quoteSlots : doctorAvailabilityByVisit[v.visit] || [];
    }
    return map;
  }, [doctorAvailabilityByVisit, visits]);

  const availabilityDateSetByVisit = useMemo(() => {
    const map: Record<number, Set<string>> = {};
    for (const v of visits) {
      map[v.visit] = new Set((mergedVisitAvailability[v.visit] || []).map((slot) => slot.date));
    }
    return map;
  }, [mergedVisitAvailability, visits]);

  const availabilityTimeSetByVisitDate = useMemo(() => {
    const map: Record<number, Record<string, Set<string>>> = {};
    for (const v of visits) {
      const dateMap: Record<string, Set<string>> = {};
      for (const slot of mergedVisitAvailability[v.visit] || []) {
        if (!dateMap[slot.date]) dateMap[slot.date] = new Set();
        dateMap[slot.date].add(slot.time);
      }
      map[v.visit] = dateMap;
    }
    return map;
  }, [mergedVisitAvailability, visits]);

  // Mock time slots — will be replaced with Google Calendar availability
  const AVAILABLE_SLOTS = [
    "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
    "11:00 AM", "11:30 AM", "1:00 PM", "1:30 PM",
    "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
    "4:00 PM", "4:30 PM",
  ];

  const hasAvailabilityForActiveVisit =
    (availabilityDateSetByVisit[activeVisit] && availabilityDateSetByVisit[activeVisit].size > 0) || false;

  const availableTimesForActiveVisit = useMemo(() => {
    if (!hasAvailabilityForActiveVisit) {
      return AVAILABLE_SLOTS;
    }

    const selectedDate = selectedDates[activeVisit];
    if (!selectedDate) {
      return [] as string[];
    }

    return Array.from(availabilityTimeSetByVisitDate[activeVisit]?.[selectedDate] || new Set<string>());
  }, [
    activeVisit,
    hasAvailabilityForActiveVisit,
    selectedDates,
    availabilityTimeSetByVisitDate,
    AVAILABLE_SLOTS,
  ]);

  const scrollRef = useRef<ScrollView>(null);
  const calendarY = useRef(0);
  const timeSectionY = useRef(0);

  // Calculate blocked date ranges based on selected visits + gaps
  const blockedRanges = useMemo(() => {
    const ranges: { start: string; end: string; afterVisit: number }[] = [];
    for (const v of visits) {
      const selectedDate = selectedDates[v.visit];
      if (!selectedDate) continue;
      const gapMonths = v.gapMonths || 0;
      const gapDays = v.gapDays || 0;
      if (gapMonths === 0 && gapDays === 0) continue;

      const [y, m, d] = selectedDate.split("-").map(Number);
      // Block starts the day after the visit
      const blockStart = new Date(y, m - 1, d);
      blockStart.setDate(blockStart.getDate() + 1);
      // Block ends one day before the earliest allowed date
      const blockEnd = new Date(y, m - 1, d);
      if (gapMonths > 0) blockEnd.setMonth(blockEnd.getMonth() + gapMonths);
      if (gapDays > 0) blockEnd.setDate(blockEnd.getDate() + gapDays);
      blockEnd.setDate(blockEnd.getDate() - 1);

      ranges.push({
        start: toDateStr(blockStart),
        end: toDateStr(blockEnd),
        afterVisit: v.visit,
      });
    }
    return ranges;
  }, [selectedDates, visits]);

  const isDateBlocked = (dateStr: string): { blocked: boolean; afterVisit?: number } => {
    for (const range of blockedRanges) {
      if (dateStr >= range.start && dateStr <= range.end) {
        return { blocked: true, afterVisit: range.afterVisit };
      }
    }
    return { blocked: false };
  };

  // Calendar
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

  const getVisitForDate = (dateStr: string): number | null => {
    for (const [visitNum, date] of Object.entries(selectedDates)) {
      if (date === dateStr) return parseInt(visitNum);
    }
    return null;
  };

  const getEarliestDateForVisit = (visitNum: number): string | null => {
    if (visitNum <= 1) return null;
    const prevVisit = visits.find((v) => v.visit === visitNum - 1);
    const prevDate = selectedDates[visitNum - 1];
    if (!prevVisit || !prevDate) return null;
    const gapMonths = prevVisit.gapMonths || 0;
    const gapDays = prevVisit.gapDays || 0;
    if (gapMonths === 0 && gapDays === 0) return prevDate;
    return addDaysToDate(prevDate, gapMonths, gapDays);
  };

  const handleDatePress = (dateStr: string, isPast: boolean, unavailableByDoctor: boolean) => {
    if (isPast) return;

    const activeVisitExists = visits.some((v) => v.visit === activeVisit);
    if (!activeVisitExists) {
      if (visits.length > 0) {
        setActiveVisit(visits[0].visit);
      }
      Alert.alert("Visit data error", "Please re-open this quote and try selecting dates again.");
      return;
    }

    const existingVisit = getVisitForDate(dateStr);
    if (existingVisit) {
      setSelectedDates((prev) => {
        const next = { ...prev };
        for (const v of visits) {
          if (v.visit >= existingVisit) delete next[v.visit];
        }
        return next;
      });
      setSelectedTimes((prev) => {
        const next = { ...prev };
        for (const v of visits) {
          if (v.visit >= existingVisit) delete next[v.visit];
        }
        return next;
      });
      setActiveVisit(existingVisit);
      return;
    }

    if (unavailableByDoctor) {
      Alert.alert(
        "Date unavailable",
        "Please choose a date from the options provided by your doctor for this visit."
      );
      return;
    }

    const blockInfo = isDateBlocked(dateStr);
    if (blockInfo.blocked) {
      const prevVisit = visits.find((v) => v.visit === blockInfo.afterVisit);
      Alert.alert(
        "Recovery Period",
        `This date is during the recovery period after Visit ${blockInfo.afterVisit}.\n\nYour dentist requires ${formatGap(prevVisit?.gapMonths, prevVisit?.gapDays)} between visits for healing.`
      );
      return;
    }

    const earliest = getEarliestDateForVisit(activeVisit);
    if (earliest && dateStr < earliest) {
      const prevVisit = visits.find((v) => v.visit === activeVisit - 1);
      Alert.alert(
        "Too Early",
        `Visit ${activeVisit} must be at least ${formatGap(prevVisit?.gapMonths, prevVisit?.gapDays)} after Visit ${activeVisit - 1}.\n\nEarliest available: ${formatFull(earliest)}`
      );
      return;
    }

    const nextDate = selectedDates[activeVisit + 1];
    if (nextDate && dateStr > nextDate) {
      Alert.alert("Invalid Date", `Visit ${activeVisit} must be before Visit ${activeVisit + 1} (${formatShort(nextDate)}).`);
      return;
    }

    setSelectedDates((prev) => ({ ...prev, [activeVisit]: dateStr }));

    // If doctor has fixed time options for the selected date, clear previously selected time when invalid.
    if (hasAvailabilityForActiveVisit) {
      const allowedTimes = availabilityTimeSetByVisitDate[activeVisit]?.[dateStr] || new Set<string>();
      setSelectedTimes((prev) => {
        const current = prev[activeVisit];
        if (!current || allowedTimes.has(current)) return prev;
        const next = { ...prev };
        delete next[activeVisit];
        return next;
      });
    }

    // Scroll to time section after date is selected
    setTimeout(() => scrollRef.current?.scrollTo({ y: timeSectionY.current || calendarY.current + 300, animated: true }), 150);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const allDatesSelected = visits.length > 0 && visits.every((v) => selectedDates[v.visit] && selectedTimes[v.visit]);
  const completedCount = visits.filter((v) => selectedDates[v.visit] && selectedTimes[v.visit]).length;
  const progressPercent = visits.length > 0 ? (completedCount / visits.length) * 100 : 0;

  const handleConfirm = async () => {
    if (isReschedule && params.bookingId) {
      setLoading(true);
      try {
        const newVisitDates = visits.map((v: any) => ({
          visit: v.visit,
          description: v.description,
          date: selectedDates[v.visit],
          confirmedTime: selectedTimes[v.visit],
          gapMonths: v.gapMonths,
          gapDays: v.gapDays,
          paymentAmount: v.paymentAmount,
          paymentPercent: v.paymentPercent,
        }));

        await store.updateBooking(params.bookingId, { visitDates: newVisitDates });

        await store.addNotification({
          role: "doctor",
          type: "reminder",
          title: "Booking Rescheduled",
          body: `Your patient has rescheduled their visit dates for Case #${params.caseId}.`,
          icon: "📅",
          route: `/doctor/case-detail?caseId=${params.caseId}`,
        });

        Alert.alert(
          "Visits Rescheduled",
          "Your visit dates have been updated successfully.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } catch {
        Alert.alert("Error", "Failed to reschedule. Please try again.");
      }
      setLoading(false);
    } else {
      router.push({
        pathname: "/patient/payment" as any,
        params: {
          quoteId: params.quoteId,
          caseId: params.caseId,
          amount: params.amount,
          totalPrice: params.totalPrice,
          dentistName: params.dentistName,
          clinicName: params.clinicName,
          visitDatesJson: JSON.stringify(
            visits.map((v) => ({
              visit: v.visit,
              description: v.description,
              date: selectedDates[v.visit],
              confirmedTime: selectedTimes[v.visit],
              gapMonths: v.gapMonths,
              gapDays: v.gapDays,
            }))
          ),
        },
      });
    }
  };

  const VISIT_COLORS = [PatientTheme.primary, "#eab308", SharedColors.amber, SharedColors.red, "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient
        colors={[...PatientTheme.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.title}>{isReschedule ? "Reschedule Visits" : "Schedule Your Visits"}</Text>
          <Text style={s.subtitle}>
            {visits.length} clinic visit{visits.length !== 1 ? "s" : ""} to schedule
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Doctor summary */}
        <View style={s.summaryCard}>
          <View style={s.summaryLeft}>
            <View style={s.summaryAvatar}>
              <Text style={s.summaryAvatarText}>
                {(params.dentistName || "D").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.summaryName}>{params.dentistName}</Text>
              <Text style={s.summaryClinic}>{params.clinicName}</Text>
            </View>
          </View>
          <View style={s.summaryDurationBadge}>
            <Text style={s.summaryDurationText}>{params.duration}</Text>
          </View>
        </View>

        {/* Visit chips */}
        <View style={s.visitChips}>
          {visits.map((v, idx) => {
            const isActive = activeVisit === v.visit;
            const hasDate = !!selectedDates[v.visit];
            const color = VISIT_COLORS[(v.visit - 1) % VISIT_COLORS.length];
            const hasGap = (v.gapMonths || 0) > 0 || (v.gapDays || 0) > 0;

            return (
              <View key={v.visit}>
                <TouchableOpacity
                  style={[
                    s.visitChip,
                    isActive && { borderColor: color, backgroundColor: color + "10" },
                    hasDate && !isActive && { borderColor: color + "40" },
                  ]}
                  onPress={() => {
                    setActiveVisit(v.visit);
                    setTimeout(() => scrollRef.current?.scrollTo({ y: calendarY.current, animated: true }), 100);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[s.visitChipDot, { backgroundColor: hasDate ? color : "#d1d5db" }]}>
                    {hasDate ? (
                      <Text style={s.visitChipCheck}>✓</Text>
                    ) : (
                      <Text style={s.visitChipNum}>{v.visit}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.visitChipTitle, isActive && { color }]}>Visit {v.visit}</Text>
                    <Text style={s.visitChipDesc} numberOfLines={1}>
                      {v.description}
                    </Text>
                  </View>
                  {hasDate && (
                    <View style={[s.visitDateBadge, { backgroundColor: color + "12" }]}>
                      <Text style={[s.visitDateBadgeText, { color }]}>
                        {formatShort(selectedDates[v.visit])}
                        {selectedTimes[v.visit] ? ` · ${selectedTimes[v.visit]}` : ""}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Gap indicator */}
                {hasGap && idx < visits.length - 1 && (
                  <View style={s.gapIndicator}>
                    <View style={s.gapLine} />
                    <View style={s.gapBadge}>
                      <Text style={s.gapBadgeText}>
                        {formatGap(v.gapMonths, v.gapDays)} recovery
                      </Text>
                    </View>
                    <View style={s.gapLine} />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Active visit banner */}
        <View onLayout={(e) => { calendarY.current = e.nativeEvent.layout.y; }} style={[s.activeVisitBanner, { borderLeftColor: VISIT_COLORS[(activeVisit - 1) % VISIT_COLORS.length] }]}>
          <Text style={s.activeVisitLabel}>
            Selecting date for <Text style={{ fontWeight: "700" }}>Visit {activeVisit}</Text>
          </Text>
          <Text style={s.activeVisitDesc} numberOfLines={2}>
            {visits.find((v) => v.visit === activeVisit)?.description || ""}
          </Text>
          {getEarliestDateForVisit(activeVisit) && (
            <Text style={s.earliestNote}>
              Earliest: {formatFull(getEarliestDateForVisit(activeVisit)!)}
            </Text>
          )}
        </View>

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
                <Text style={[s.weekText, (d === "Sun" || d === "Sat") && { color: SharedColors.slateLight }]}>{d}</Text>
              </View>
            ))}
          </View>

          <View style={s.daysGrid}>
            {calendarDays.map((d, i) => {
              const visitNum = getVisitForDate(d.date);
              const blockInfo = isDateBlocked(d.date);
              const isBlocked = blockInfo.blocked;
              const unavailableByDoctor =
                hasAvailabilityForActiveVisit &&
                !availabilityDateSetByVisit[activeVisit]?.has(d.date) &&
                visitNum == null;
              const visitColor = visitNum ? VISIT_COLORS[(visitNum - 1) % VISIT_COLORS.length] : null;
              const dimmed = !d.isCurrentMonth;

              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.dayCell,
                    isBlocked && s.dayCellBlocked,
                    unavailableByDoctor && !isBlocked && s.dayCellUnavailable,
                    isBlocked && dimmed && { backgroundColor: "rgba(254,226,226,0.4)" },
                  ]}
                  onPress={() => handleDatePress(d.date, d.isPast, unavailableByDoctor)}
                  disabled={false}
                  activeOpacity={0.6}
                >
                  <View style={[
                    s.dayInner,
                    visitNum != null && { backgroundColor: visitColor || PatientTheme.primary },
                    isBlocked && s.dayInnerBlocked,
                    unavailableByDoctor && !isBlocked && s.dayInnerUnavailable,
                    isBlocked && dimmed && { borderColor: "rgba(239,68,68,0.1)", backgroundColor: "rgba(239,68,68,0.04)" },
                  ]}>
                    <Text style={[
                      s.dayText,
                      dimmed && s.dayTextOther,
                      d.isPast && s.dayTextPast,
                      visitNum != null && { color: SharedColors.white, fontWeight: "700" as const },
                      isBlocked && !dimmed && { color: "#fca5a5" },
                      unavailableByDoctor && !isBlocked && { color: SharedColors.faint },
                      isBlocked && dimmed && { color: "#e5c8c8" },
                    ]}>
                      {d.day}
                    </Text>
                    {visitNum != null && (
                      <Text style={s.dayVisitLabel}>V{visitNum}</Text>
                    )}
                    {isBlocked && !visitNum && (
                      <View style={[s.dayBlockedMark, dimmed && { backgroundColor: "rgba(252,165,165,0.3)" }]} />
                    )}
                    {unavailableByDoctor && !visitNum && !isBlocked && (
                      <View style={s.dayUnavailableMark} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Time slot picker */}
        {selectedDates[activeVisit] && activeVisit > 0 && (
          <View style={s.timeSection} onLayout={(e) => { timeSectionY.current = e.nativeEvent.layout.y; }}>
            <View style={s.timeSectionHeader}>
              <Text style={s.timeSectionTitle}>Select Time for Visit {activeVisit}</Text>
              <Text style={s.timeSectionDate}>{formatFull(selectedDates[activeVisit])}</Text>
            </View>
            <View style={s.slotsGrid}>
              {(availableTimesForActiveVisit || []).map((slot) => {
                const isSelected = selectedTimes[activeVisit] === slot;
                const visitColor = VISIT_COLORS[(activeVisit - 1) % VISIT_COLORS.length];
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      s.slotBtn,
                      isSelected && { backgroundColor: visitColor, borderColor: visitColor },
                    ]}
                    onPress={() => {
                      setSelectedTimes((prev) => ({ ...prev, [activeVisit]: slot }));
                      // Auto-advance to next unfinished visit
                      const nextUnfinished = visits.find(
                        (v) => v.visit > activeVisit && (!selectedDates[v.visit] || !selectedTimes[v.visit])
                      );
                      if (nextUnfinished) {
                        setTimeout(() => setActiveVisit(nextUnfinished.visit), 300);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.slotBtnText, isSelected && { color: SharedColors.white }]}>{slot}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {(availableTimesForActiveVisit || []).length === 0 && hasAvailabilityForActiveVisit && (
              <Text style={s.noTimeOptionText}>
                No available time options for this date. Please choose another date.
              </Text>
            )}
            <Text style={s.timeSectionNote}>
              {hasAvailabilityForActiveVisit
                ? "Time options are provided by your clinic."
                : "Slots shown are estimates. Actual availability will be confirmed by the clinic."}
            </Text>
          </View>
        )}

        {/* Legend */}
        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: "#fecaca" }]} />
            <Text style={s.legendText}>Recovery</Text>
          </View>
          {visits.slice(0, 4).map((v) => (
            <View key={v.visit} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: VISIT_COLORS[(v.visit - 1) % VISIT_COLORS.length] }]} />
              <Text style={s.legendText}>Visit {v.visit}</Text>
            </View>
          ))}
        </View>

        {/* All set */}
        {allDatesSelected && (
          <View style={s.allSetCard}>
            <View style={s.allSetHeader}>
              <View style={s.allSetCheck}>
                <Text style={s.allSetCheckText}>✓</Text>
              </View>
              <Text style={s.allSetTitle}>All visits scheduled</Text>
            </View>
            <View style={s.allSetList}>
              {visits.map((v, idx) => (
                <View key={v.visit}>
                  <View style={s.allSetRow}>
                    <View style={[s.allSetDot, { backgroundColor: VISIT_COLORS[(v.visit - 1) % VISIT_COLORS.length] }]} />
                    <Text style={s.allSetVisit}>Visit {v.visit}</Text>
                    <Text style={s.allSetDate}>
                      {formatFull(selectedDates[v.visit])} · {selectedTimes[v.visit]}
                    </Text>
                  </View>
                  {(v.gapMonths || v.gapDays) && idx < visits.length - 1 ? (
                    <View style={s.allSetGap}>
                      <Text style={s.allSetGapText}>
                        {formatGap(v.gapMonths, v.gapDays)} recovery
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Bottom bar */}
      <View style={s.bottomBar}>
        <View style={s.bottomTop}>
          <View style={s.bottomProgress}>
            <View style={[s.bottomProgressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={s.bottomCount}>
            {completedCount}/{visits.length}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.nextBtn, !allDatesSelected && s.nextBtnDisabled]}
          onPress={handleConfirm}
          disabled={!allDatesSelected || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={SharedColors.white} size="small" />
          ) : (
            <Text style={s.nextBtnText}>
              {isReschedule
                ? "Confirm Reschedule"
                : `Confirm & Pay ${params.amount ? `$${Number(params.amount).toLocaleString()}` : "Deposit"} →`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },

  /* Header */
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: SharedColors.white, fontWeight: "600", marginTop: -2 },
  headerCenter: { flex: 1, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: SharedColors.white },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },

  content: { padding: 20, gap: 16, paddingBottom: 40 },

  /* Doctor summary */
  summaryCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: SharedColors.border,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  summaryLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  summaryAvatar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: PatientTheme.primaryLight, alignItems: "center", justifyContent: "center",
  },
  summaryAvatarText: { fontSize: 16, fontWeight: "700", color: PatientTheme.primary },
  summaryName: { fontSize: 15, fontWeight: "700", color: SharedColors.navy },
  summaryClinic: { fontSize: 12, color: SharedColors.slate, marginTop: 1 },
  summaryDurationBadge: {
    backgroundColor: PatientTheme.primaryLight, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  summaryDurationText: { fontSize: 12, fontWeight: "600", color: PatientTheme.primary },

  /* Visit chips */
  visitChips: { gap: 8 },
  visitChip: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14,
    backgroundColor: SharedColors.white, borderWidth: 1.5, borderColor: SharedColors.border,
  },
  visitChipDot: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: "center", justifyContent: "center",
  },
  visitChipCheck: { color: SharedColors.white, fontSize: 12, fontWeight: "800" },
  visitChipNum: { color: SharedColors.white, fontSize: 12, fontWeight: "700" },
  visitChipTitle: { fontSize: 14, fontWeight: "700", color: SharedColors.navy },
  visitChipDesc: { fontSize: 11, color: SharedColors.slate, marginTop: 1 },
  visitDateBadge: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  visitDateBadgeText: { fontSize: 12, fontWeight: "600" },

  /* Gap indicator */
  gapIndicator: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 4, gap: 8,
  },
  gapLine: { height: 1, width: 20, backgroundColor: "#fde68a" },
  gapBadge: {
    backgroundColor: SharedColors.amberLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: "#fde68a",
  },
  gapBadgeText: { fontSize: 10, fontWeight: "600", color: "#b45309" },

  /* Active visit banner */
  activeVisitBanner: {
    backgroundColor: SharedColors.white, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: SharedColors.border,
    borderLeftWidth: 4,
  },
  activeVisitLabel: { fontSize: 13, color: SharedColors.navy },
  activeVisitDesc: { fontSize: 11, color: SharedColors.slate, marginTop: 3 },
  earliestNote: { fontSize: 11, fontWeight: "600", color: "#b45309", marginTop: 6 },

  /* Calendar */
  calendar: {
    backgroundColor: SharedColors.white, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  monthNav: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 14,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: SharedColors.bg, alignItems: "center", justifyContent: "center",
  },
  navBtnText: { fontSize: 22, color: SharedColors.navy, fontWeight: "600" },
  monthTitle: { fontSize: 16, fontWeight: "700", color: SharedColors.navy },

  weekRow: { flexDirection: "row", marginBottom: 6 },
  weekCell: { flex: 1, alignItems: "center", paddingVertical: 4 },
  weekText: { fontSize: 11, fontWeight: "600", color: SharedColors.slate },

  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.28%", alignItems: "center", justifyContent: "center",
    paddingVertical: 2,
  },
  dayCellBlocked: { backgroundColor: SharedColors.redLight },
  dayCellUnavailable: { backgroundColor: "rgba(241,245,249,0.5)" },

  dayInner: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  dayInnerBlocked: {
    backgroundColor: "rgba(239,68,68,0.06)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.15)", borderStyle: "dashed",
  },
  dayInnerUnavailable: {
    backgroundColor: "rgba(241,245,249,0.6)",
    borderWidth: 1,
    borderColor: "rgba(203,213,225,0.8)",
    borderStyle: "dashed",
  },
  dayText: { fontSize: 14, fontWeight: "500", color: SharedColors.navy },
  dayTextOther: { color: "#c8cdd3" },
  dayTextPast: { color: "#d1d5db" },
  dayVisitLabel: {
    position: "absolute", bottom: 1,
    fontSize: 7, fontWeight: "800", color: "rgba(255,255,255,0.85)",
  },
  dayBlockedMark: {
    position: "absolute", bottom: 5,
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: "#fca5a5",
  },
  dayUnavailableMark: {
    position: "absolute",
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: SharedColors.faint,
  },

  /* Time slot picker */
  timeSection: {
    backgroundColor: SharedColors.white, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: SharedColors.border, gap: 12,
  },
  timeSectionHeader: { gap: 2 },
  timeSectionTitle: { fontSize: 14, fontWeight: "700", color: SharedColors.navy },
  timeSectionDate: { fontSize: 12, color: SharedColors.slate },
  slotsGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 8,
  },
  slotBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: SharedColors.border, backgroundColor: SharedColors.bg,
    minWidth: 72, alignItems: "center",
  },
  slotBtnText: { fontSize: 13, fontWeight: "600", color: SharedColors.navy },
  noTimeOptionText: {
    fontSize: 12,
    color: SharedColors.red,
    fontWeight: "600",
  },
  timeSectionNote: {
    fontSize: 11, color: SharedColors.slateLight, fontStyle: "italic",
  },

  /* Legend */
  legend: {
    flexDirection: "row", flexWrap: "wrap", gap: 14, justifyContent: "center",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: SharedColors.slate },

  /* All set */
  allSetCard: {
    backgroundColor: SharedColors.greenLight, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: "#bbf7d0",
  },
  allSetHeader: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14,
  },
  allSetCheck: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: SharedColors.green, alignItems: "center", justifyContent: "center",
  },
  allSetCheckText: { color: SharedColors.white, fontSize: 14, fontWeight: "800" },
  allSetTitle: { fontSize: 16, fontWeight: "700", color: SharedColors.green },
  allSetList: { gap: 8 },
  allSetRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  allSetDot: { width: 8, height: 8, borderRadius: 4 },
  allSetVisit: { fontSize: 13, fontWeight: "600", color: SharedColors.navy, width: 56 },
  allSetDate: { fontSize: 13, color: SharedColors.slate, flex: 1 },
  allSetGap: {
    marginLeft: 18, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: "#fde68a",
    paddingVertical: 3,
  },
  allSetGapText: { fontSize: 10, color: "#b45309", fontWeight: "500" },

  /* Bottom bar */
  bottomBar: {
    paddingHorizontal: 24, paddingTop: 14, paddingBottom: 48,
    borderTopWidth: 1, borderTopColor: SharedColors.border, backgroundColor: SharedColors.white,
    gap: 12,
  },
  bottomTop: {
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  bottomProgress: {
    flex: 1, height: 4, backgroundColor: "#e5e7eb", borderRadius: 2, overflow: "hidden",
  },
  bottomProgressFill: {
    height: "100%", backgroundColor: PatientTheme.primary, borderRadius: 2,
  },
  bottomCount: { fontSize: 12, fontWeight: "600", color: SharedColors.slate },
  nextBtn: {
    backgroundColor: PatientTheme.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: SharedColors.white, fontSize: 15, fontWeight: "600" },
});
