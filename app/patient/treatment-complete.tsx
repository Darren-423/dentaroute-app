import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { Booking, TreatmentWarranty, store } from "../../lib/store";
import { warrantyLabel } from "../../constants/warranty";

const T = {
  teal: "#4A0080", tealLight: "#f0e6f6",
  navy: "#0f172a", slate: "#64748b", slateLight: "#94a3b8",
  border: "#e2e8f0", bg: "#f8fafc", white: "#fff",
  green: "#10b981", greenLight: "#ecfdf5",
  amber: "#f59e0b",
};

export default function TreatmentCompleteScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasReview, setHasReview] = useState(false);
  const [patientName, setPatientName] = useState("Patient");
  const [warranties, setWarranties] = useState<TreatmentWarranty[]>([]);

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

      // Auto-create warranties for this booking
      if (bookingId) {
        const created = await store.createWarrantiesForBooking(bookingId);
        setWarranties(created);
      }

      setLoading(false);
    };
    load();
  }, [bookingId]);

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={T.teal} size="large" />
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
            <Text style={[s.value, { color: T.green }]}>✅ Fully Paid</Text>
          </View>
        </View>

        {/* Warranty Card */}
        {warranties.length > 0 && (
          <View style={s.warrantyCard}>
            <View style={s.warrantyHeader}>
              <Text style={s.warrantyIcon}>🛡️</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.warrantyTitle}>Warranty Activated!</Text>
                <Text style={s.warrantySub}>Your treatments are now protected</Text>
              </View>
            </View>
            {warranties.map((w) => (
              <View key={w.id} style={s.warrantyRow}>
                <Text style={s.warrantyTreatment}>{w.treatmentName} ×{w.treatmentQty}</Text>
                <Text style={s.warrantyPeriod}>{warrantyLabel(w.warrantyMonths)}</Text>
              </View>
            ))}
            <View style={s.warrantyAftercare}>
              <Text style={s.warrantyAftercareText}>
                🇺🇸 US aftercare available at partner clinics
              </Text>
            </View>
            <TouchableOpacity
              style={s.warrantyBtn}
              onPress={() => router.push("/patient/warranty" as any)}
            >
              <Text style={s.warrantyBtnText}>View My Warranties →</Text>
            </TouchableOpacity>
          </View>
        )}

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
  container: { flex: 1, backgroundColor: T.bg },
  header: {
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.white,
    flexDirection: "row", alignItems: "center", gap: 16,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.05)", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 24, color: "#0f172a", fontWeight: "600", marginTop: -2 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: T.navy },
  content: { padding: 24, gap: 16 },
  icon: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: T.greenLight,
    alignItems: "center", justifyContent: "center", marginTop: 20, marginBottom: 8,
  },
  title: { fontSize: 28, fontWeight: "800", color: T.navy },
  sub: { fontSize: 14, color: T.slate, textAlign: "center", lineHeight: 22 },
  summaryCard: {
    backgroundColor: T.white, borderRadius: 16, width: "100%", paddingHorizontal: 20,
    borderWidth: 1, borderColor: T.border,
  },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  label: { fontSize: 13, color: T.slate },
  value: { fontSize: 14, fontWeight: "600", color: T.navy },
  actions: { gap: 10, width: "100%", marginTop: 8 },
  reviewBtn: { backgroundColor: T.amber, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  reviewBtnText: { fontSize: 15, fontWeight: "700", color: T.white },
  chatBtn: { backgroundColor: T.teal, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  chatBtnText: { fontSize: 15, fontWeight: "600", color: T.white },
  dashBtn: {
    backgroundColor: T.white, borderRadius: 14, paddingVertical: 16, alignItems: "center",
    borderWidth: 1, borderColor: T.border,
  },
  dashBtnText: { fontSize: 15, fontWeight: "600", color: T.navy },

  // Warranty
  warrantyCard: {
    backgroundColor: "#f0fdf4", borderRadius: 16, padding: 16, width: "100%",
    borderWidth: 1, borderColor: "#bbf7d0",
  },
  warrantyHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  warrantyIcon: { fontSize: 28 },
  warrantyTitle: { fontSize: 16, fontWeight: "700", color: "#15803d" },
  warrantySub: { fontSize: 12, color: "#166534", marginTop: 2 },
  warrantyRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "rgba(22,163,74,0.1)",
  },
  warrantyTreatment: { fontSize: 13, color: "#166534", fontWeight: "600" },
  warrantyPeriod: { fontSize: 13, color: "#15803d", fontWeight: "700" },
  warrantyAftercare: {
    marginTop: 10, paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: "rgba(37,99,235,0.08)", borderRadius: 8,
  },
  warrantyAftercareText: { fontSize: 12, color: "#1d4ed8", fontWeight: "600" },
  warrantyBtn: {
    marginTop: 12, paddingVertical: 12, borderRadius: 10,
    backgroundColor: "#15803d", alignItems: "center",
  },
  warrantyBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
