import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Booking, PatientCase, store } from "../../lib/store";

import { PatientTheme, SharedColors } from "../../constants/theme";
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
    return { label: "Cancelled", next: "View quotes to rebook", emoji: "❌", step: 0, total: BOOKING_STEPS.length, bg: SharedColors.redLight, color: SharedColors.red };
  }
  const idx = BOOKING_STEPS.findIndex((s) => s.key === booking.status);
  if (idx >= 0) {
    const step = BOOKING_STEPS[idx];
    let label = step.label;
    if (booking.status === "treatment_done" && booking.visitDates && booking.visitDates.length > 1) {
      const cur = booking.currentVisit || 1;
      label = `Visit ${cur} of ${booking.visitDates.length} Complete`;
    }
    return { label, next: step.next, emoji: step.emoji, step: idx + 1, total: BOOKING_STEPS.length, bg: PatientTheme.primaryLight, color: PatientTheme.primary };
  }
  return { label: "Booked", next: "Input flight info", emoji: "📖", step: 0, total: BOOKING_STEPS.length, bg: PatientTheme.primaryLight, color: PatientTheme.primary };
}

function navigateToBookingStep(booking: Booking, caseId: string) {
  const st = booking.status;
  if (st === "confirmed") router.push(`/patient/arrival-info?bookingId=${booking.id}` as any);
  else if (st === "flight_submitted") router.push(`/patient/hotel-arrived?bookingId=${booking.id}` as any);
  else if (st === "arrived_korea" || st === "checked_in_clinic") router.push(`/patient/clinic-checkin?bookingId=${booking.id}` as any);
  else if (st === "treatment_done") router.push(`/patient/visit-checkout?bookingId=${booking.id}` as any);
  else if (st === "between_visits") router.push(`/patient/stay-or-return?bookingId=${booking.id}` as any);
  else if (st === "returning_home" || st === "payment_complete") router.push(`/patient/departure-pickup?bookingId=${booking.id}` as any);
  else if (st === "departure_set") router.push(`/patient/treatment-complete?bookingId=${booking.id}` as any);
  else if (st === "cancelled") router.push(`/patient/quotes?caseId=${caseId}` as any);
  else router.push(`/patient/quotes?caseId=${caseId}` as any);
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Returns all dates between start and end inclusive as "YYYY-MM-DD" strings */
function getDateRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return dates;
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// Types of dots that can appear on a date
type DotType = "booking" | "arrival" | "departure";

interface DayInfo {
  dots: DotType[];
  isStayRange: boolean;
  isStayStart: boolean;
  isStayEnd: boolean;
  bookings: Booking[];
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

  // Build date → DayInfo map
  const dayInfoMap = new Map<string, DayInfo>();

  const getOrCreate = (dateKey: string): DayInfo => {
    let info = dayInfoMap.get(dateKey);
    if (!info) {
      info = { dots: [], isStayRange: false, isStayStart: false, isStayEnd: false, bookings: [] };
      dayInfoMap.set(dateKey, info);
    }
    return info;
  };

  // Map booking visit dates
  bookings.forEach((bk) => {
    bk.visitDates?.forEach((v) => {
      if (v.date) {
        const info = getOrCreate(v.date);
        if (!info.dots.includes("booking")) info.dots.push("booking");
        if (!info.bookings.find((b) => b.id === bk.id)) info.bookings.push(bk);
      }
    });
  });

  // Map booking trip infos (only after flight is submitted)
  bookings.forEach((bk) => {
    if (bk.status === "confirmed") return;
    const tripList = bk.tripInfos && bk.tripInfos.length > 0
      ? bk.tripInfos
      : bk.arrivalInfo ? [bk.arrivalInfo] : [];

    tripList.forEach((ai) => {
      // Arrival dot
      const arrDate = ai.flightDate || ai.arrivalDate;
      if (arrDate) {
        const info = getOrCreate(arrDate);
        if (!info.dots.includes("arrival")) info.dots.push("arrival");
        if (!info.bookings.find((b) => b.id === bk.id)) info.bookings.push(bk);
      }

      // Departure dot
      if (ai.depFlightDate) {
        const info = getOrCreate(ai.depFlightDate);
        if (!info.dots.includes("departure")) info.dots.push("departure");
        if (!info.bookings.find((b) => b.id === bk.id)) info.bookings.push(bk);
      }

      // Hotel stay range
      if (ai.checkInDate && ai.checkOutDate) {
        const range = getDateRange(ai.checkInDate, ai.checkOutDate);
        range.forEach((dateKey, idx) => {
          const info = getOrCreate(dateKey);
          info.isStayRange = true;
          if (idx === 0) info.isStayStart = true;
          if (idx === range.length - 1) info.isStayEnd = true;
          if (!info.bookings.find((b) => b.id === bk.id)) info.bookings.push(bk);
        });
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

  const selectedDayInfo = selectedDate ? dayInfoMap.get(selectedDate) : null;
  const selectedBookings = selectedDayInfo?.bookings || [];

  const handleReschedule = (bk: Booking) => {
    setMenuBookingId(null);
    router.push(`/patient/visit-schedule?bookingId=${bk.id}` as any);
  };

  const handleCancel = (bk: Booking) => {
    setMenuBookingId(null);
    router.push(`/patient/cancel-booking?bookingId=${bk.id}` as any);
  };


  const dotColor = (type: DotType, isSelected: boolean) => {
    if (isSelected) return SharedColors.white;
    if (type === "booking") return "#7C3AED";
    if (type === "arrival") return SharedColors.sky;
    return SharedColors.orange;
  };

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[...PatientTheme.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <Text style={s.headerTitle}>My Reservations</Text>
        <Text style={s.headerSub}>
          {bookings.length > 0
            ? `${bookings.length} reservation${bookings.length !== 1 ? "s" : ""}`
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
                const info = dayInfoMap.get(dateKey);
                const hasDots = info && info.dots.length > 0;
                const hasContent = !!info && (info.dots.length > 0 || info.isStayRange);
                const isSelected = selectedDate === dateKey;
                const isToday =
                  day === new Date().getDate() &&
                  month === new Date().getMonth() &&
                  year === new Date().getFullYear();

                // Stay range background styles
                const stayStyle: any = {};
                if (info?.isStayRange && !isSelected) {
                  stayStyle.backgroundColor = SharedColors.skySoft;
                  if (info.isStayStart && info.isStayEnd) {
                    stayStyle.borderRadius = 12;
                  } else if (info.isStayStart) {
                    stayStyle.borderTopLeftRadius = 12;
                    stayStyle.borderBottomLeftRadius = 12;
                    stayStyle.borderTopRightRadius = 0;
                    stayStyle.borderBottomRightRadius = 0;
                  } else if (info.isStayEnd) {
                    stayStyle.borderTopRightRadius = 12;
                    stayStyle.borderBottomRightRadius = 12;
                    stayStyle.borderTopLeftRadius = 0;
                    stayStyle.borderBottomLeftRadius = 0;
                  } else {
                    stayStyle.borderRadius = 0;
                  }
                }

                return (
                  <TouchableOpacity
                    key={di}
                    style={[
                      s.dayCell,
                      stayStyle,
                      isSelected && s.dayCellSelected,
                      isToday && !isSelected && !info?.isStayRange && s.dayCellToday,
                    ]}
                    onPress={() => hasContent ? setSelectedDate(dateKey) : setSelectedDate(null)}
                    activeOpacity={hasContent ? 0.6 : 1}
                  >
                    <Text
                      style={[
                        s.dayText,
                        isSelected && s.dayTextSelected,
                        isToday && !isSelected && s.dayTextToday,
                        !hasContent && !isToday && s.dayTextDim,
                      ]}
                    >
                      {day}
                    </Text>
                    {hasDots && (
                      <View style={s.dotsRow}>
                        {info!.dots.map((dotType, i) => (
                          <View
                            key={i}
                            style={[
                              s.dot,
                              { backgroundColor: dotColor(dotType, isSelected) },
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Legend */}
          <View style={s.legendRow}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: "#7C3AED" }]} />
              <Text style={s.legendText}>Treatment</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: SharedColors.sky }]} />
              <Text style={s.legendText}>Arrival</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: SharedColors.orange }]} />
              <Text style={s.legendText}>Departure</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendBar, { backgroundColor: SharedColors.skySoftStrong }]} />
              <Text style={s.legendText}>Stay</Text>
            </View>
          </View>
        </View>

        {/* Selected date details */}
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

              // Multi-trip support: iterate over tripInfos or fallback to arrivalInfo
              const tripList = bk.tripInfos && bk.tripInfos.length > 0
                ? bk.tripInfos
                : bk.arrivalInfo ? [bk.arrivalInfo] : [];

              // Find which trips are relevant for the selected date
              const arrivalTrips = tripList.filter((ai) => selectedDate === (ai.flightDate || ai.arrivalDate));
              const departureTrips = tripList.filter((ai) => ai.depFlightDate && selectedDate === ai.depFlightDate && selectedDate !== (ai.flightDate || ai.arrivalDate));
              const stayTrips = tripList.filter((ai) => {
                if (!ai.checkInDate || !ai.checkOutDate) return false;
                const arrDate = ai.flightDate || ai.arrivalDate;
                if (selectedDate === arrDate || selectedDate === ai.depFlightDate) return false;
                return selectedDate! >= ai.checkInDate && selectedDate! <= ai.checkOutDate;
              });

              return (
                <React.Fragment key={bk.id}>
                  {/* ── Arrival Flight cards ── */}
                  {arrivalTrips.map((ai, idx) => (
                    <View key={`arr-${idx}`} style={s.tripInfoCard}>
                      <View style={[s.tripInfoBadge, { backgroundColor: "rgba(14,165,233,0.12)" }]}>
                        <Text style={[s.tripInfoBadgeText, { color: SharedColors.sky }]}>🛬 Arrival Flight{tripList.length > 1 ? ` (Trip ${tripList.indexOf(ai) + 1})` : ""}</Text>
                      </View>
                      <View style={s.tripInfoBody}>
                        <Text style={s.tripInfoMain}>{ai.airline ? `${ai.airline} ` : ""}{ai.flightNumber}</Text>
                        <Text style={s.tripInfoSub}>{ai.flightDate || ai.arrivalDate}{(ai.flightTime || ai.arrivalTime) ? `  ·  ${ai.flightTime || ai.arrivalTime}` : ""}</Text>
                        {ai.terminal ? <Text style={s.tripInfoSub}>Terminal: {ai.terminal}</Text> : null}
                      </View>
                    </View>
                  ))}

                  {/* ── Departure Flight cards ── */}
                  {departureTrips.map((ai, idx) => (
                    <View key={`dep-${idx}`} style={s.tripInfoCard}>
                      <View style={[s.tripInfoBadge, { backgroundColor: "rgba(249,115,22,0.12)" }]}>
                        <Text style={[s.tripInfoBadgeText, { color: SharedColors.orange }]}>🛫 Departure Flight{tripList.length > 1 ? ` (Trip ${tripList.indexOf(ai) + 1})` : ""}</Text>
                      </View>
                      <View style={s.tripInfoBody}>
                        <Text style={s.tripInfoMain}>{ai.depAirline ? `${ai.depAirline} ` : ""}{ai.depFlightNumber || ""}</Text>
                        <Text style={s.tripInfoSub}>{ai.depFlightDate}{ai.depFlightTime ? `  ·  ${ai.depFlightTime}` : ""}</Text>
                        {ai.depTerminal ? <Text style={s.tripInfoSub}>Terminal: {ai.depTerminal}</Text> : null}
                      </View>
                    </View>
                  ))}

                  {/* ── Booking card (visit day) ── */}
                  {visit && (
                    <View style={s.bookingCard}>
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

                      {menuBookingId === bk.id && (
                        <View style={s.dropdown}>
                          <TouchableOpacity style={s.dropdownItem} onPress={() => handleReschedule(bk)}>
                            <Text style={s.dropdownText}>📅 Reschedule</Text>
                          </TouchableOpacity>
                          <View style={s.dropdownDivider} />
                          <TouchableOpacity style={s.dropdownItem} onPress={() => handleCancel(bk)}>
                            <Text style={[s.dropdownText, { color: SharedColors.red }]}>❌ Cancel Booking</Text>
                          </TouchableOpacity>
                        </View>
                      )}

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
                                  !isCompleted && !isCurrent && { backgroundColor: SharedColors.white, borderColor: SharedColors.border },
                                ]}
                              />
                              {!isLast && (
                                <View style={[s.stepLine, { backgroundColor: isCompleted ? info.color : SharedColors.border }]} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </View>

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

                        <View style={s.visitInfo}>
                          <Text style={s.visitText}>
                            Visit {visit.visit}: {visit.description}
                            {visit.confirmedTime ? ` at ${visit.confirmedTime}` : ""}
                          </Text>
                        </View>

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
                  )}

                  {/* ── Hotel cards (from all relevant trips) ── */}
                  {[...arrivalTrips, ...stayTrips, ...departureTrips]
                    .filter((ai, idx, arr) => ai.hotelName && arr.findIndex((a) => a.hotelName === ai.hotelName && a.checkInDate === ai.checkInDate) === idx)
                    .map((ai, idx) => {
                      const isDep = departureTrips.includes(ai) && !arrivalTrips.includes(ai);
                      return (
                        <View key={`hotel-${idx}`} style={s.tripInfoCard}>
                          <View style={[s.tripInfoBadge, { backgroundColor: SharedColors.skySoft }]}>
                            <Text style={[s.tripInfoBadgeText, { color: SharedColors.sky }]}>
                              {isDep ? "🏨 Hotel Check-out" : "🏨 Hotel"}{tripList.length > 1 ? ` (Trip ${tripList.indexOf(ai) + 1})` : ""}
                            </Text>
                          </View>
                          <View style={s.tripInfoBody}>
                            <Text style={s.tripInfoMain}>{ai.hotelName}</Text>
                            {ai.hotelAddress ? <Text style={s.tripInfoSub}>{ai.hotelAddress}</Text> : null}
                            {ai.checkInDate && ai.checkOutDate && (
                              <Text style={s.tripInfoSub}>{ai.checkInDate} → {ai.checkOutDate}</Text>
                            )}
                            {ai.confirmationNumber ? <Text style={s.tripInfoSub}>Confirmation: #{ai.confirmationNumber}</Text> : null}
                          </View>
                        </View>
                      );
                    })}
                </React.Fragment>
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
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: SharedColors.white },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  // Calendar
  calendarCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 20,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  monthRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 20,
  },
  monthArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: PatientTheme.primaryLight, alignItems: "center", justifyContent: "center" },
  monthArrowText: { fontSize: 26, color: PatientTheme.primary, fontWeight: "600" },
  monthTitle: { fontSize: 20, fontWeight: "700", color: SharedColors.navy },

  weekdayRow: { flexDirection: "row", marginBottom: 8 },
  weekdayCell: { flex: 1, alignItems: "center", paddingVertical: 6 },
  weekdayText: { fontSize: 13, fontWeight: "600", color: SharedColors.slateLight },

  weekRow: { flexDirection: "row" },
  dayCell: { flex: 1, alignItems: "center", paddingVertical: 10, minHeight: 56 },
  dayCellSelected: { backgroundColor: PatientTheme.primary, borderRadius: 12 },
  dayCellToday: { backgroundColor: PatientTheme.primaryLight, borderRadius: 12 },
  dayText: { fontSize: 17, fontWeight: "500", color: SharedColors.navy },
  dayTextSelected: { color: SharedColors.white, fontWeight: "700" },
  dayTextToday: { color: PatientTheme.primary, fontWeight: "700" },
  dayTextDim: { color: SharedColors.slateLight },

  // Multi-dot row
  dotsRow: { flexDirection: "row", gap: 3, marginTop: 3 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },

  // Legend
  legendRow: {
    flexDirection: "row", justifyContent: "center", gap: 16,
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: SharedColors.border,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 9, height: 9, borderRadius: 4.5 },
  legendBar: { width: 18, height: 9, borderRadius: 3.5 },
  legendText: { fontSize: 12, color: SharedColors.slateLight, fontWeight: "500" },

  // Selected date
  selectedSection: { marginTop: 16 },
  selectedDateTitle: { fontSize: 16, fontWeight: "700", color: SharedColors.navy, marginBottom: 12 },

  // Booking card
  bookingCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: SharedColors.border,
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

  menuBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: SharedColors.bg, alignItems: "center", justifyContent: "center" },
  menuBtnText: { fontSize: 18, color: SharedColors.slate, fontWeight: "700" },

  dropdown: {
    marginHorizontal: 14, marginBottom: 8,
    backgroundColor: SharedColors.white, borderRadius: 12, borderWidth: 1, borderColor: SharedColors.border,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  dropdownItem: { padding: 12 },
  dropdownText: { fontSize: 14, fontWeight: "600", color: SharedColors.navy },
  dropdownDivider: { height: 1, backgroundColor: SharedColors.border },

  stepProgressWrap: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingBottom: 8,
  },
  stepDot: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 2, backgroundColor: SharedColors.white, borderColor: SharedColors.border,
  },
  stepLine: { flex: 1, height: 2, backgroundColor: SharedColors.border },

  bookingBody: { paddingHorizontal: 14, paddingBottom: 12 },
  clinicName: { fontSize: 17, fontWeight: "700", color: SharedColors.navy },
  dentistName: { fontSize: 13, color: SharedColors.slate, marginTop: 2 },

  treatmentRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  treatmentChip: { backgroundColor: PatientTheme.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  treatmentChipText: { fontSize: 12, color: PatientTheme.primary, fontWeight: "600" },
  moreText: { fontSize: 12, color: SharedColors.slateLight, alignSelf: "center" },

  visitInfo: { marginTop: 8, backgroundColor: SharedColors.bg, borderRadius: 8, padding: 8 },
  visitText: { fontSize: 13, color: SharedColors.slate },

  // Trip info card (separate card for flight/hotel)
  tripInfoCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: SharedColors.border,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  tripInfoBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: SharedColors.border },
  tripInfoBadgeText: { fontSize: 14, fontWeight: "700" },
  tripInfoBody: { padding: 14 },
  tripInfoMain: { fontSize: 16, fontWeight: "700", color: SharedColors.navy, marginBottom: 4 },
  tripInfoSub: { fontSize: 13, color: SharedColors.slate, marginTop: 2 },

  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  priceLabel: { fontSize: 13, color: SharedColors.slate },
  priceValue: { fontSize: 18, fontWeight: "800", color: PatientTheme.primary },

  continueBtn: {
    borderTopWidth: 1, borderTopColor: SharedColors.border,
    padding: 12, alignItems: "center",
  },
  continueBtnText: { fontSize: 14, fontWeight: "600", color: PatientTheme.primary },

  // Empty
  emptyWrap: { alignItems: "center", marginTop: 80 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: SharedColors.navy, marginTop: 16 },
  emptySub: { fontSize: 14, color: SharedColors.slate, textAlign: "center", marginTop: 8, lineHeight: 20 },
});
