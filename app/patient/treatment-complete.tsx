import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { Booking, store } from "../../lib/store";

import { PatientTheme, SharedColors } from "../../constants/theme";
export default function TreatmentCompleteScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasReview, setHasReview] = useState(false);
  const [patientName, setPatientName] = useState("Patient");

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;
      const bk = await store.getBooking(bookingId);
      if (bk) {
        // Guardrail: only show this page for fully completed bookings
        if (bk.status !== "departure_set") {
          router.replace("/patient/dashboard" as any);
          return;
        }
        setBooking(bk);
      }
      const review = await store.getReviewForBooking(bookingId);
      if (review) setHasReview(true);
      const user = await store.getCurrentUser();
      if (user?.name) setPatientName(user.name);
      const profile = await store.getPatientProfile();
      if (profile?.fullName) setPatientName(profile.fullName);
      setLoading(false);
    };
    load();
  }, [bookingId]);

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={PatientTheme.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Treatment Complete</Text>
      </View>

      <ScrollView contentContainerStyle={[s.content, { alignItems: "center" }]} showsVerticalScrollIndicator={false}>
        <View style={s.icon}><Text style={{ fontSize: 56 }}>🎉</Text></View>
        <Text style={s.title}>All Done!</Text>
        <Text style={s.sub}>
          Your treatment with {booking?.dentistName} at {booking?.clinicName} is complete and fully paid.
        </Text>

        {/* Summary */}
        <View style={s.summaryCard}>
          <View style={s.row}>
            <Text style={s.label}>Treatment Total</Text>
            <Text style={s.value}>${booking?.finalInvoice?.totalAmount?.toLocaleString() || booking?.totalPrice?.toLocaleString()}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Status</Text>
            <Text style={[s.value, { color: SharedColors.green }]}>✅ Fully Paid</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={s.actions}>
          {!hasReview && (
            <TouchableOpacity
              style={s.reviewBtn}
              onPress={() => router.push({
                pathname: "/patient/write-review" as any,
                params: { bookingId: booking?.id, dentistName: booking?.dentistName, clinicName: booking?.clinicName },
              })}
            >
              <Text style={s.reviewBtnText}>⭐ Leave a Review</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={s.chatBtn}
            onPress={async () => {
              if (!booking) return;
              const room = await store.getOrCreateChatRoom(
                booking.caseId, patientName, booking.dentistName, booking.clinicName
              );
              router.push({
                pathname: "/patient/chat" as any,
                params: { chatRoomId: room.id, dentistName: booking.dentistName, clinicName: booking.clinicName },
              });
            }}
          >
            <Text style={s.chatBtnText}>💬 Message {booking?.dentistName?.split(" ")[0]}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.dashBtn} onPress={() => router.replace("/patient/dashboard" as any)}>
            <Text style={s.dashBtnText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: {
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: SharedColors.border, backgroundColor: SharedColors.white,
    flexDirection: "row", alignItems: "center", gap: 16,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.05)", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 24, color: SharedColors.navy, fontWeight: "600", marginTop: -2 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: SharedColors.navy },
  content: { padding: 24, gap: 16 },
  icon: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: SharedColors.greenLight,
    alignItems: "center", justifyContent: "center", marginTop: 20, marginBottom: 8,
  },
  title: { fontSize: 28, fontWeight: "800", color: SharedColors.navy },
  sub: { fontSize: 14, color: SharedColors.slate, textAlign: "center", lineHeight: 22 },
  summaryCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, width: "100%", paddingHorizontal: 20,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  label: { fontSize: 13, color: SharedColors.slate },
  value: { fontSize: 14, fontWeight: "600", color: SharedColors.navy },
  actions: { gap: 10, width: "100%", marginTop: 8 },
  reviewBtn: { backgroundColor: SharedColors.amber, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  reviewBtnText: { fontSize: 15, fontWeight: "700", color: SharedColors.white },
  chatBtn: { backgroundColor: PatientTheme.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  chatBtnText: { fontSize: 15, fontWeight: "600", color: SharedColors.white },
  dashBtn: {
    backgroundColor: SharedColors.white, borderRadius: 14, paddingVertical: 16, alignItems: "center",
    borderWidth: 1, borderColor: SharedColors.border,
  },
  dashBtnText: { fontSize: 15, fontWeight: "600", color: SharedColors.navy },
});
