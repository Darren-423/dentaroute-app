import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Booking, store } from "../../lib/store";

import { PatientTheme, SharedColors } from "../../constants/theme";
export default function CaseHubScreen() {
  const { bookingId, caseId } = useLocalSearchParams<{ bookingId: string; caseId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const bookings = await store.getBookings();
    const bk = bookings.find((b) => b.id === bookingId);
    if (bk) setBooking(bk);
  };

  if (!booking) {
    return (
      <View style={s.container}>
        <Text style={{ textAlign: "center", marginTop: 100, color: SharedColors.slate }}>Loading...</Text>
      </View>
    );
  }

  const trips = booking.tripInfos && booking.tripInfos.length > 0
    ? booking.tripInfos
    : booking.arrivalInfo ? [booking.arrivalInfo] : [];
  const hasFlightInfo = trips.length > 0 && !!trips[0]?.airline;

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient colors={[PatientTheme.primary, PatientTheme.primaryMid]} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Request Pick Up Service</Text>
        <Text style={s.headerSub}>{booking.dentistName} · {booking.clinicName}</Text>
      </LinearGradient>

      <ScrollView style={s.body} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>

        {/* Status Card */}
        <View style={[s.statusCard, { backgroundColor: hasFlightInfo ? SharedColors.greenLight : SharedColors.amberLight }]}>
          <Text style={s.statusEmoji}>{hasFlightInfo ? "✅" : "⏳"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.statusLabel, { color: hasFlightInfo ? SharedColors.green : SharedColors.amber }]}>
              {hasFlightInfo ? "Flight Booked" : "Booked — Add Trip Info"}
            </Text>
            <Text style={s.statusSub}>
              {hasFlightInfo ? "Your trip info has been submitted" : "Input your flight & hotel details to continue"}
            </Text>
          </View>
        </View>

        {/* Next Step Button */}
        {hasFlightInfo ? (
          <TouchableOpacity
            style={s.nextStepBtn}
            onPress={() => router.push(`/patient/hotel-arrived?bookingId=${bookingId}` as any)}
          >
            <Text style={s.nextStepText}>Confirm Hotel Arrival →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.nextStepBtn, { backgroundColor: SharedColors.amberLight }]}
            onPress={() => router.push(`/patient/arrival-info?bookingId=${bookingId}` as any)}
          >
            <Text style={[s.nextStepText, { color: SharedColors.amber }]}>Add Trip Info →</Text>
          </TouchableOpacity>
        )}

        {/* Visit Schedule */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionIcon}>📅</Text>
            <Text style={s.sectionTitle}>Visit Schedule</Text>
          </View>
          {booking.visitDates.map((v) => (
            <View key={v.visit} style={s.visitRow}>
              <View style={s.visitDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.visitLabel}>Visit {v.visit}</Text>
                <Text style={s.visitDesc}>{v.description}</Text>
              </View>
              <Text style={s.visitDate}>{v.date}</Text>
            </View>
          ))}
        </View>

        {/* Trip Info */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionIcon}>✈️</Text>
            <Text style={s.sectionTitle}>Trip Info</Text>
          </View>

          {trips.length > 0 ? (
            trips.map((trip, idx) => (
              <View key={idx} style={[s.tripBlock, idx > 0 && { borderTopWidth: 1, borderTopColor: SharedColors.border, paddingTop: 14, marginTop: 14 }]}>
                <View style={s.tripHeaderRow}>
                  <Text style={s.tripLabel}>Trip {idx + 1}</Text>
                  <TouchableOpacity
                    style={s.tripEditBtn}
                    onPress={() => router.push(`/patient/arrival-info?bookingId=${bookingId}&tripIndex=${idx}` as any)}
                  >
                    <Text style={s.tripEditBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.flightRow}>
                  <View style={s.flightCol}>
                    <View style={s.badge}><Text style={s.badgeIcon}>🛬</Text><Text style={s.badgeText}>Arrival</Text></View>
                    <Text style={s.infoMain}>{trip.airline}</Text>
                    <Text style={s.infoSub}>{trip.flightNumber} · {trip.flightDate || trip.arrivalDate}</Text>
                    <Text style={s.infoSub}>{trip.flightTime || trip.arrivalTime} · {trip.terminal}</Text>
                  </View>
                  <View style={s.flightDivider} />
                  <View style={s.flightCol}>
                    <View style={s.badge}><Text style={s.badgeIcon}>🛫</Text><Text style={s.badgeText}>Departure</Text></View>
                    {trip.depAirline ? (
                      <>
                        <Text style={s.infoMain}>{trip.depAirline}</Text>
                        <Text style={s.infoSub}>{trip.depFlightNumber} · {trip.depFlightDate}</Text>
                        <Text style={s.infoSub}>{trip.depFlightTime} · {trip.depTerminal}</Text>
                      </>
                    ) : (
                      <Text style={s.infoPlaceholder}>Not set</Text>
                    )}
                  </View>
                </View>
                {trip.hotelName && (
                  <View style={s.hotelRow}>
                    <View style={s.badge}><Text style={s.badgeIcon}>🏨</Text><Text style={s.badgeText}>Hotel</Text></View>
                    <Text style={s.infoMain}>{trip.hotelName}</Text>
                    <Text style={s.infoSub}>{trip.hotelAddress}</Text>
                    <Text style={s.infoSub}>Check-in: {trip.checkInDate} · Check-out: {trip.checkOutDate}</Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={s.emptySection}>
              <Text style={s.emptySectionIcon}>✈️</Text>
              <Text style={s.emptySectionText}>No trip info yet</Text>
              <TouchableOpacity
                style={[s.addTripBtn, { marginTop: 10 }]}
                onPress={() => router.push(`/patient/arrival-info?bookingId=${bookingId}&tripIndex=0` as any)}
              >
                <Text style={s.addTripBtnText}>+ Add Trip</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Add another trip button */}
          {trips.length > 0 && (
            <TouchableOpacity
              style={s.addTripBtn}
              onPress={() => router.push(`/patient/arrival-info?bookingId=${bookingId}&tripIndex=${trips.length}` as any)}
            >
              <Text style={s.addTripBtnText}>+ Add Another Trip</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Pickup — per trip */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionIcon}>🚗</Text>
            <Text style={s.sectionTitle}>Pickup Service</Text>
          </View>

          {booking.serviceTier === "basic" ? (
            <View style={{ backgroundColor: SharedColors.amberLight, borderRadius: 10, padding: 14, gap: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#92400e" }}>Not included in Basic plan</Text>
              <Text style={{ fontSize: 12, color: "#92400e", lineHeight: 18 }}>
                Upgrade to Standard ($99) or Premium ($199) to get airport pickup and drop-off service.
              </Text>
            </View>
          ) : trips.length > 0 ? (
            trips.map((trip, idx) => (
              <View key={idx} style={[idx > 0 && { borderTopWidth: 1, borderTopColor: SharedColors.border, paddingTop: 10, marginTop: 10 }]}>
                <Text style={s.pickupTripLabel}>Trip {idx + 1}</Text>
                <View style={s.pickupRow}>
                  <Text style={s.pickupLabel}>🛬 Arrival</Text>
                  {trip.pickupRequested ? (
                    <View style={[s.pickupStatus, { backgroundColor: SharedColors.greenLight }]}>
                      <Text style={[s.pickupStatusText, { color: SharedColors.green }]}>✅ Requested</Text>
                    </View>
                  ) : (
                    <View style={[s.pickupStatus, { backgroundColor: SharedColors.orangeLight }]}>
                      <Text style={[s.pickupStatusText, { color: SharedColors.orange }]}>Not requested</Text>
                    </View>
                  )}
                </View>
                <View style={s.pickupRow}>
                  <Text style={s.pickupLabel}>🛫 Departure</Text>
                  <View style={[s.pickupStatus, { backgroundColor: SharedColors.bg }]}>
                    <Text style={[s.pickupStatusText, { color: SharedColors.slateLight }]}>Available after treatment</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={s.pickupRow}>
              <Text style={s.pickupLabel}>Add trip info first</Text>
              <View style={[s.pickupStatus, { backgroundColor: SharedColors.bg }]}>
                <Text style={[s.pickupStatusText, { color: SharedColors.slateLight }]}>—</Text>
              </View>
            </View>
          )}
        </View>

        {/* Payment */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionIcon}>💳</Text>
            <Text style={s.sectionTitle}>Payment</Text>
          </View>
          <View style={s.paymentRow}>
            <Text style={s.paymentLabel}>Total</Text>
            <Text style={s.paymentValue}>${booking.totalPrice?.toLocaleString()}</Text>
          </View>
          <View style={s.paymentRow}>
            <Text style={s.paymentLabel}>Service Plan</Text>
            <Text style={[s.paymentValue, { color: SharedColors.green }]}>{booking.serviceTier?.charAt(0).toUpperCase()}{booking.serviceTier?.slice(1)} — ${booking.serviceFee}</Text>
          </View>
          <View style={[s.paymentRow, { borderBottomWidth: 0 }]}>
            <Text style={s.paymentLabel}>Treatment Cost</Text>
            <Text style={s.paymentValue}>${booking.totalPrice?.toLocaleString()} (pay at clinic)</Text>
          </View>
        </View>

        {/* Treatments */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionIcon}>🦷</Text>
            <Text style={s.sectionTitle}>Treatments</Text>
          </View>
          {booking.treatments?.map((t, i) => (
            <View key={i} style={s.treatmentRow}>
              <Text style={s.treatmentName}>{t.name}</Text>
              <Text style={s.treatmentDetail}>×{t.qty} · ${t.price?.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Cancel Booking */}
        <TouchableOpacity
          style={s.cancelBtn}
          onPress={() => router.push(`/patient/cancel-booking?bookingId=${bookingId}` as any)}
        >
          <Text style={s.cancelBtnText}>Cancel My Booking</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  backBtn: { marginBottom: 8 },
  backText: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  headerTitle: { color: SharedColors.white, fontSize: 22, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },

  body: { flex: 1 },
  bodyContent: { padding: 16 },

  /* Status Card */
  statusCard: {
    flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14,
    marginBottom: 14,
  },
  statusEmoji: { fontSize: 24, marginRight: 12 },
  statusLabel: { fontSize: 15, fontWeight: "700" },
  statusSub: { fontSize: 12, color: SharedColors.slate, marginTop: 2 },

  /* Next Step */
  nextStepBtn: {
    backgroundColor: PatientTheme.primaryLight, borderRadius: 14, paddingVertical: 14,
    alignItems: "center", marginBottom: 14,
  },
  nextStepText: { color: PatientTheme.primary, fontSize: 15, fontWeight: "700" },

  /* Section Card */
  sectionCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 18,
    marginBottom: 14, borderWidth: 1, borderColor: SharedColors.border,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sectionIcon: { fontSize: 18, marginRight: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: SharedColors.navy, flex: 1 },

  /* Trip block */
  tripBlock: {},
  tripHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  tripLabel: { fontSize: 14, fontWeight: "700", color: PatientTheme.primary },
  tripEditBtn: { backgroundColor: PatientTheme.primaryLight, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  tripEditBtnText: { color: PatientTheme.primary, fontSize: 12, fontWeight: "600" },
  addTripBtn: {
    borderWidth: 1, borderColor: PatientTheme.primary, borderStyle: "dashed", borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 20, alignItems: "center", marginTop: 14,
  },
  addTripBtnText: { color: PatientTheme.primary, fontSize: 14, fontWeight: "600" },
  pickupTripLabel: { fontSize: 13, fontWeight: "700", color: PatientTheme.primary, marginBottom: 6 },

  /* Edit button */
  editBtn: {
    backgroundColor: PatientTheme.primaryLight, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  editBtnText: { color: PatientTheme.primary, fontSize: 13, fontWeight: "600" },

  /* Visit */
  visitRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12, paddingLeft: 4 },
  visitDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: PatientTheme.primary,
    marginTop: 6, marginRight: 12,
  },
  visitLabel: { fontSize: 14, fontWeight: "600", color: SharedColors.navy },
  visitDesc: { fontSize: 12, color: SharedColors.slate, marginTop: 1 },
  visitDate: { fontSize: 12, color: PatientTheme.primary, fontWeight: "600" },

  /* Flight */
  flightRow: { flexDirection: "row", marginBottom: 12 },
  flightCol: { flex: 1 },
  flightDivider: { width: 1, backgroundColor: SharedColors.border, marginHorizontal: 12 },
  badge: {
    flexDirection: "row", alignItems: "center", backgroundColor: PatientTheme.primaryLight,
    alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    marginBottom: 8,
  },
  badgeIcon: { fontSize: 12, marginRight: 4 },
  badgeText: { fontSize: 12, fontWeight: "700", color: PatientTheme.primary },
  infoMain: { fontSize: 15, fontWeight: "600", color: SharedColors.navy, marginBottom: 2 },
  infoSub: { fontSize: 12, color: SharedColors.slate, marginBottom: 1 },
  infoPlaceholder: { fontSize: 13, color: SharedColors.slateLight, fontStyle: "italic", marginTop: 4 },

  /* Hotel */
  hotelRow: {
    borderTopWidth: 1, borderTopColor: SharedColors.border, paddingTop: 12,
  },

  /* Empty section */
  emptySection: { alignItems: "center", paddingVertical: 20 },
  emptySectionIcon: { fontSize: 32, marginBottom: 8 },
  emptySectionText: { fontSize: 15, fontWeight: "600", color: SharedColors.navy },
  emptySectionSub: { fontSize: 12, color: SharedColors.slate, marginTop: 4 },

  /* Pickup */
  pickupRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: SharedColors.border,
  },
  pickupLabel: { fontSize: 14, fontWeight: "500", color: SharedColors.navy },
  pickupStatus: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  pickupStatusText: { fontSize: 12, fontWeight: "600" },

  /* Payment */
  paymentRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: SharedColors.border,
  },
  paymentLabel: { fontSize: 14, color: SharedColors.slate },
  paymentValue: { fontSize: 14, fontWeight: "600", color: SharedColors.navy },

  /* Treatments */
  treatmentRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: SharedColors.border,
  },
  treatmentName: { fontSize: 14, color: SharedColors.navy, flex: 1 },
  treatmentDetail: { fontSize: 13, color: SharedColors.slate },

  /* Cancel Booking */
  cancelBtn: {
    backgroundColor: SharedColors.redLight, borderWidth: 1, borderColor: "#fecaca",
    borderRadius: 14, paddingVertical: 16, alignItems: "center" as const,
    marginBottom: 14,
  },
  cancelBtnText: { color: "#dc2626", fontSize: 15, fontWeight: "600" as const },
});
