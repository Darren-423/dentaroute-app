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

const T = {
  purple: "#4A0080", purpleMid: "#5C10A0", purpleLight: "#f0e6f6",
  navy: "#0f172a", slate: "#64748b", slateLight: "#94a3b8",
  border: "#e2e8f0", bg: "#f8fafc", white: "#fff",
  amber: "#f59e0b", amberLight: "#fffbeb",
  green: "#16a34a", greenLight: "#f0fdf4",
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

export default function ReservationScreen() {
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cases, setCases] = useState<PatientCase[]>([]);

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

  const getCase = (caseId: string) => cases.find((c) => c.id === caseId);

  return (
    <View style={s.container}>
      {/* Header */}
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
        {bookings.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyEmoji}>📅</Text>
            <Text style={s.emptyTitle}>No Reservations</Text>
            <Text style={s.emptySub}>
              When you accept a quote and book a treatment,{"\n"}your reservations will appear here.
            </Text>
          </View>
        ) : (
          bookings.map((bk) => {
            const patientCase = getCase(bk.caseId);
            const info = getStepInfo(bk);
            const treatments = bk.treatments || patientCase?.treatments || [];
            const nextVisit = bk.visitDates?.find((v) => !v.paid);

            return (
              <TouchableOpacity
                key={bk.id}
                style={s.card}
                activeOpacity={0.7}
                onPress={() => navigateToBookingStep(bk, bk.caseId)}
              >
                {/* Status badge */}
                <View style={[s.statusRow, { backgroundColor: info.bg }]}>
                  <Text style={s.statusEmoji}>{info.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.statusLabel, { color: info.color }]}>{info.label}</Text>
                    <Text style={s.statusNext}>{info.next}</Text>
                  </View>
                </View>

                {/* Step progress bar */}
                <View style={s.stepProgressWrap}>
                  {BOOKING_STEPS.map((step, i) => {
                    const stepNum = i + 1;
                    const isCompleted = stepNum < info.step;
                    const isCurrent = stepNum === info.step;
                    const isLast = i === BOOKING_STEPS.length - 1;

                    return (
                      <React.Fragment key={i}>
                        <View style={s.stepItem}>
                          <View
                            style={[
                              s.stepDot,
                              isCompleted && { backgroundColor: info.color, borderColor: info.color },
                              isCurrent && { backgroundColor: info.color, borderColor: info.color, width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
                              !isCompleted && !isCurrent && { backgroundColor: T.white, borderColor: T.border },
                            ]}
                          />
                        </View>
                        {!isLast && (
                          <View
                            style={[
                              s.stepLine,
                              { backgroundColor: isCompleted ? info.color : T.border },
                            ]}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </View>

                {/* Clinic info */}
                <View style={s.cardBody}>
                  <Text style={s.clinicName}>{bk.clinicName}</Text>
                  <Text style={s.dentistName}>Dr. {bk.dentistName}</Text>

                  {/* Treatments */}
                  {treatments.length > 0 && (
                    <View style={s.treatmentRow}>
                      {treatments.slice(0, 3).map((t, i) => (
                        <View key={i} style={s.treatmentChip}>
                          <Text style={s.treatmentChipText}>
                            {t.name}{t.qty > 1 ? ` x${t.qty}` : ""}
                          </Text>
                        </View>
                      ))}
                      {treatments.length > 3 && (
                        <Text style={s.moreText}>+{treatments.length - 3} more</Text>
                      )}
                    </View>
                  )}

                  {/* Visit date */}
                  {nextVisit && (
                    <View style={s.dateRow}>
                      <Text style={s.dateIcon}>📅</Text>
                      <Text style={s.dateText}>
                        Next visit: {nextVisit.date}
                        {nextVisit.confirmedTime ? ` at ${nextVisit.confirmedTime}` : ""}
                      </Text>
                    </View>
                  )}

                  {/* Price */}
                  <View style={s.priceRow}>
                    <Text style={s.priceLabel}>Total</Text>
                    <Text style={s.priceValue}>${bk.totalPrice.toLocaleString()}</Text>
                  </View>
                </View>

                <View style={s.cardFooter}>
                  <Text style={s.tapHint}>Tap to continue →</Text>
                </View>
              </TouchableOpacity>
            );
          })
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

  // Empty state
  emptyWrap: { alignItems: "center", marginTop: 80 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: T.navy, marginTop: 16 },
  emptySub: { fontSize: 14, color: T.slate, textAlign: "center", marginTop: 8, lineHeight: 20 },

  // Card
  card: {
    backgroundColor: T.white, borderRadius: 16, marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  statusRow: {
    flexDirection: "row", alignItems: "center", padding: 14,
    borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 10,
  },
  statusEmoji: { fontSize: 24 },
  statusLabel: { fontSize: 15, fontWeight: "700" },
  statusNext: { fontSize: 12, color: T.slate, marginTop: 2 },
  stepProgressWrap: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10,
  },
  stepItem: { alignItems: "center", justifyContent: "center" },
  stepDot: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 2, backgroundColor: T.white, borderColor: T.border,
  },
  stepLine: { flex: 1, height: 2, backgroundColor: T.border },

  cardBody: { padding: 14 },
  clinicName: { fontSize: 17, fontWeight: "700", color: T.navy },
  dentistName: { fontSize: 13, color: T.slate, marginTop: 2 },

  treatmentRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  treatmentChip: {
    backgroundColor: T.purpleLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  treatmentChipText: { fontSize: 12, color: T.purple, fontWeight: "600" },
  moreText: { fontSize: 12, color: T.slateLight, alignSelf: "center" },

  dateRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 6 },
  dateIcon: { fontSize: 14 },
  dateText: { fontSize: 13, color: T.slate },

  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  priceLabel: { fontSize: 13, color: T.slate },
  priceValue: { fontSize: 18, fontWeight: "800", color: T.purple },

  cardFooter: {
    borderTopWidth: 1, borderTopColor: T.border,
    padding: 12, alignItems: "flex-end",
  },
  tapHint: { fontSize: 12, color: T.slateLight, fontWeight: "600" },
});
