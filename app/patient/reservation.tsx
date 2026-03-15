import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Booking, PatientCase, store } from "../../lib/store";

const T = {
  purple: "#4A0080", purpleMid: "#5C10A0", purpleLight: "#f0e6f6",
  navy: "#0f172a", slate: "#64748b", slateLight: "#94a3b8",
  border: "#e2e8f0", bg: "#f8fafc", white: "#fff",
  red: "#ef4444", redLight: "#fef2f2",
};

const BOOKING_STEPS: { key: string; label: string; next: string; emoji: string }[] = [
  { key: "confirmed", label: "Booked", next: "Input flight info for pickup service", emoji: "📖" },
  { key: "flight_submitted", label: "Flight Booked", next: "Confirm hotel arrival", emoji: "🏨" },
  { key: "arrived_korea", label: "In Korea", next: "Check in at clinic", emoji: "🇰🇷" },
  { key: "checked_in_clinic", label: "At Clinic", next: "Treatment in progress", emoji: "🦷" },
  { key: "treatment_done", label: "Treatment Done", next: "Complete payment", emoji: "✅" },
  { key: "between_visits", label: "Visit Complete", next: "Choose stay or return", emoji: "🎉" },
  { key: "returning_home", label: "Returning Home", next: "Book departure pickup", emoji: "🛫" },
  { key: "payment_complete", label: "Paid", next: "Book departure pickup", emoji: "🚗" },
  { key: "departure_set", label: "Complete", next: "Leave a review!", emoji: "⭐" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getStepInfo(booking: Booking) {
  if (booking.status === "cancelled") {
    return { label: "Cancelled", next: "View quotes to rebook", emoji: "❌", step: 0, total: BOOKING_STEPS.length, bg: T.redLight, color: T.red };
  }
  const idx = BOOKING_STEPS.findIndex((s) => s.key === booking.status);
  if (idx >= 0) {
    const step = BOOKING_STEPS[idx];
    let label = step.label;
    if (booking.status === "treatment_done" && booking.visitDates && booking.visitDates.length > 1) {
      const cur = booking.currentVisit || 1;
      label = `Visit ${cur} of ${booking.visitDates.length} Complete`;
    }
    return { label, next: step.next, emoji: step.emoji, step: idx + 1, total: BOOKING_STEPS.length, bg: T.purpleLight, color: T.purple };
  }
  return { label: "Booked", next: "Input flight info", emoji: "📖", step: 0, total: BOOKING_STEPS.length, bg: T.purpleLight, color: T.purple };
}

function navigateToBookingStep(booking: Booking, caseId: string) {
  const s = booking.status;
  if (s === "confirmed") router.push(`/patient/arrival-info?bookingId=${booking.id}` as any);
  else if (s === "flight_submitted") router.push(`/patient/hotel-arrived?bookingId=${booking.id}` as any);
  else if (s === "arrived_korea" || s === "checked_in_clinic") router.push(`/patient/clinic-checkin?bookingId=${booking.id}` as any);
  else if (s === "treatment_done") router.push(`/patient/final-payment?bookingId=${booking.id}` as any);
  else if (s === "between_visits") router.push(`/patient/stay-or-return?bookingId=${booking.id}` as any);
  else if (s === "returning_home" || s === "payment_complete") router.push(`/patient/departure-pickup?bookingId=${booking.id}` as any);
  else if (s === "departure_set") router.push(`/patient/treatment-complete?bookingId=${booking.id}` as any);
  else if (s === "cancelled") router.push(`/patient/quotes?caseId=${caseId}` as any);
  else router.push(`/patient/quotes?caseId=${caseId}` as any);
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function ReservationScreen() {
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [menuBookingId, setMenuBookingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const allBookings = await store.getBookings();
        const active = allBookings.filter((b) => b.status !== "cancelled");
        active.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setBookings(active);
        setCases(await store.getCases());
      };
      load();
    }, [])
  );

  // Build date → bookings map
  const dateMap = new Map<string, Booking[]>();
  bookings.forEach((bk) => {
    bk.visitDates?.forEach((v) => {
      if (v.date) {
        const existing = dateMap.get(v.date) || [];
        if (!existing.find((b) => b.id === bk.id)) {
          existing.push(bk);
          dateMap.set(v.date, existing);
        }
      }
    });
  });

  // Calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - firstDayOfWeek + 1;
    cells.push(day >= 1 && day <= daysInMonth ? day : null);
  }

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
    setSelectedDate(null);
  };

  const selectedBookings = selectedDate ? (dateMap.get(selectedDate) || []) : [];

  const handleReschedule = (bk: Booking) => {
    setMenuBookingId(null);
    router.push(`/patient/visit-schedule?bookingId=${bk.id}` as any);
  };

  const handleCancel = (bk: Booking) => {
    setMenuBookingId(null);
    router.push(`/patient/cancel-booking?bookingId=${bk.id}` as any);
  };

  return (
    <View style={s.container}>
      <LinearGradient
        colors={["#3D0070", "#2F0058", "#220040"]}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <Text style={s.headerTitle}>My Reservations</Text>
        <Text style={s.headerSub}>
          {bookings.length > 0
            ? `${bookings.length} active reservation${bookings.length > 1 ? "s" : ""}`
            : "No reservations yet"}
        </Text>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Calendar */}
        <View style={s.calendarCard}>
          {/* Month navigation */}
          <View style={s.monthRow}>
            <TouchableOpacity onPress={prevMonth} style={s.monthArrow}>
              <Text style={s.monthArrowText}>‹</Text>
            </TouchableOpacity>
            <Text style={s.monthTitle}>{MONTHS[month]} {year}</Text>
            <TouchableOpacity onPress={nextMonth} style={s.monthArrow}>
              <Text style={s.monthArrowText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View style={s.weekdayRow}>
            {WEEKDAYS.map((d) => (
              <View key={d} style={s.weekdayCell}>
                <Text style={s.weekdayText}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          {weeks.map((week, wi) => (
            <View key={wi} style={s.weekRow}>
              {week.map((day, di) => {
                if (day === null) {
                  return <View key={di} style={s.dayCell} />;
                }
                const dateKey = formatDateKey(year, month, day);
                const hasBooking = dateMap.has(dateKey);
                const isSelected = selectedDate === dateKey;
                const isToday =
                  day === new Date().getDate() &&
                  month === new Date().getMonth() &&
                  year === new Date().getFullYear();

                return (
                  <TouchableOpacity
                    key={di}
                    style={[
                      s.dayCell,
                      isSelected && s.dayCellSelected,
                      isToday && !isSelected && s.dayCellToday,
                    ]}
                    onPress={() => hasBooking ? setSelectedDate(dateKey) : setSelectedDate(null)}
                    activeOpacity={hasBooking ? 0.6 : 1}
                  >
                    <Text
                      style={[
                        s.dayText,
                        isSelected && s.dayTextSelected,
                        isToday && !isSelected && s.dayTextToday,
                        !hasBooking && !isToday && s.dayTextDim,
                      ]}
                    >
                      {day}
                    </Text>
                    {hasBooking && (
                      <View style={[s.bookingDot, isSelected && s.bookingDotSelected]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Selected date bookings */}
        {selectedDate && selectedBookings.length > 0 && (
          <View style={s.selectedSection}>
            <Text style={s.selectedDateTitle}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>

            {selectedBookings.map((bk) => {
              const patientCase = cases.find((c) => c.id === bk.caseId);
              const info = getStepInfo(bk);
              const treatments = bk.treatments || patientCase?.treatments || [];
              const visit = bk.visitDates?.find((v) => v.date === selectedDate);

              return (
                <View key={bk.id} style={s.bookingCard}>
                  {/* Header with menu */}
                  <View style={s.bookingCardHeader}>
                    <View style={[s.statusBadge, { backgroundColor: info.bg }]}>
                      <Text style={s.statusEmoji}>{info.emoji}</Text>
                      <Text style={[s.statusLabel, { color: info.color }]}>{info.label}</Text>
                    </View>
                    <TouchableOpacity
                      style={s.menuBtn}
                      onPress={() => setMenuBookingId(menuBookingId === bk.id ? null : bk.id)}
                    >
                      <Text style={s.menuBtnText}>⋯</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Dropdown menu */}
                  {menuBookingId === bk.id && (
                    <View style={s.dropdown}>
                      <TouchableOpacity style={s.dropdownItem} onPress={() => handleReschedule(bk)}>
                        <Text style={s.dropdownText}>📅 Reschedule</Text>
                      </TouchableOpacity>
                      <View style={s.dropdownDivider} />
                      <TouchableOpacity style={s.dropdownItem} onPress={() => handleCancel(bk)}>
                        <Text style={[s.dropdownText, { color: T.red }]}>❌ Cancel Booking</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Step progress */}
                  <View style={s.stepProgressWrap}>
                    {BOOKING_STEPS.map((step, i) => {
                      const stepNum = i + 1;
                      const isCompleted = stepNum < info.step;
                      const isCurrent = stepNum === info.step;
                      const isLast = i === BOOKING_STEPS.length - 1;
                      return (
                        <React.Fragment key={i}>
                          <View
                            style={[
                              s.stepDot,
                              isCompleted && { backgroundColor: info.color, borderColor: info.color },
                              isCurrent && { backgroundColor: info.color, borderColor: info.color, width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
                              !isCompleted && !isCurrent && { backgroundColor: T.white, borderColor: T.border },
                            ]}
                          />
                          {!isLast && (
                            <View style={[s.stepLine, { backgroundColor: isCompleted ? info.color : T.border }]} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </View>

                  {/* Body */}
                  <View style={s.bookingBody}>
                    <Text style={s.clinicName}>{bk.clinicName}</Text>
                    <Text style={s.dentistName}>Dr. {bk.dentistName}</Text>

                    {treatments.length > 0 && (
                      <View style={s.treatmentRow}>
                        {treatments.slice(0, 3).map((t, i) => (
                          <View key={i} style={s.treatmentChip}>
                            <Text style={s.treatmentChipText}>{t.name}{t.qty > 1 ? ` x${t.qty}` : ""}</Text>
                          </View>
                        ))}
                        {treatments.length > 3 && (
                          <Text style={s.moreText}>+{treatments.length - 3} more</Text>
                        )}
                      </View>
                    )}

                    {visit && (
                      <View style={s.visitInfo}>
                        <Text style={s.visitText}>
                          Visit {visit.visit}: {visit.description}
                          {visit.confirmedTime ? ` at ${visit.confirmedTime}` : ""}
                        </Text>
                      </View>
                    )}

                    <View style={s.priceRow}>
                      <Text style={s.priceLabel}>Total</Text>
                      <Text style={s.priceValue}>${bk.totalPrice.toLocaleString()}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={s.continueBtn}
                    onPress={() => navigateToBookingStep(bk, bk.caseId)}
                  >
                    <Text style={s.continueBtnText}>Continue →</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty state */}
        {bookings.length === 0 && (
          <View style={s.emptyWrap}>
            <Text style={s.emptyEmoji}>📅</Text>
            <Text style={s.emptyTitle}>No Reservations</Text>
            <Text style={s.emptySub}>
              When you accept a quote and book a treatment,{"\n"}your reservations will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  // Calendar
  calendarCard: {
    backgroundColor: T.white, borderRadius: 16, padding: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  monthRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 16,
  },
  monthArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.purpleLight, alignItems: "center", justifyContent: "center" },
  monthArrowText: { fontSize: 22, color: T.purple, fontWeight: "600" },
  monthTitle: { fontSize: 18, fontWeight: "700", color: T.navy },

  weekdayRow: { flexDirection: "row", marginBottom: 8 },
  weekdayCell: { flex: 1, alignItems: "center", paddingVertical: 4 },
  weekdayText: { fontSize: 12, fontWeight: "600", color: T.slateLight },

  weekRow: { flexDirection: "row" },
  dayCell: { flex: 1, alignItems: "center", paddingVertical: 8, minHeight: 44 },
  dayCellSelected: { backgroundColor: T.purple, borderRadius: 12 },
  dayCellToday: { backgroundColor: T.purpleLight, borderRadius: 12 },
  dayText: { fontSize: 15, fontWeight: "500", color: T.navy },
  dayTextSelected: { color: T.white, fontWeight: "700" },
  dayTextToday: { color: T.purple, fontWeight: "700" },
  dayTextDim: { color: T.slateLight },
  bookingDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: T.purple,
    marginTop: 2,
  },
  bookingDotSelected: { backgroundColor: T.white },

  // Selected date
  selectedSection: { marginTop: 16 },
  selectedDateTitle: { fontSize: 16, fontWeight: "700", color: T.navy, marginBottom: 12 },

  bookingCard: {
    backgroundColor: T.white, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: T.border,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  bookingCardHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 14,
  },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  statusEmoji: { fontSize: 16 },
  statusLabel: { fontSize: 13, fontWeight: "700" },

  menuBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.bg, alignItems: "center", justifyContent: "center" },
  menuBtnText: { fontSize: 18, color: T.slate, fontWeight: "700" },

  dropdown: {
    marginHorizontal: 14, marginBottom: 8,
    backgroundColor: T.white, borderRadius: 12, borderWidth: 1, borderColor: T.border,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  dropdownItem: { padding: 12 },
  dropdownText: { fontSize: 14, fontWeight: "600", color: T.navy },
  dropdownDivider: { height: 1, backgroundColor: T.border },

  stepProgressWrap: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingBottom: 8,
  },
  stepDot: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 2, backgroundColor: T.white, borderColor: T.border,
  },
  stepLine: { flex: 1, height: 2, backgroundColor: T.border },

  bookingBody: { paddingHorizontal: 14, paddingBottom: 12 },
  clinicName: { fontSize: 17, fontWeight: "700", color: T.navy },
  dentistName: { fontSize: 13, color: T.slate, marginTop: 2 },

  treatmentRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  treatmentChip: { backgroundColor: T.purpleLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  treatmentChipText: { fontSize: 12, color: T.purple, fontWeight: "600" },
  moreText: { fontSize: 12, color: T.slateLight, alignSelf: "center" },

  visitInfo: { marginTop: 8, backgroundColor: T.bg, borderRadius: 8, padding: 8 },
  visitText: { fontSize: 13, color: T.slate },

  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  priceLabel: { fontSize: 13, color: T.slate },
  priceValue: { fontSize: 18, fontWeight: "800", color: T.purple },

  continueBtn: {
    borderTopWidth: 1, borderTopColor: T.border,
    padding: 12, alignItems: "center",
  },
  continueBtnText: { fontSize: 14, fontWeight: "600", color: T.purple },

  // Empty
  emptyWrap: { alignItems: "center", marginTop: 80 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: T.navy, marginTop: 16 },
  emptySub: { fontSize: 14, color: T.slate, textAlign: "center", marginTop: 8, lineHeight: 20 },
});
