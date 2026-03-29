import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Linking,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { Booking, store } from "../../lib/store";

import { PatientTheme, SharedColors } from "../../constants/theme";

const AFFILIATE_CLINICS = [
  {
    id: "aff_1",
    name: "Bright Smile Dental Care",
    city: "Los Angeles",
    state: "CA",
    phone: "+1-213-555-0142",
    rating: 4.8,
    specialties: ["Implant Aftercare", "General Dentistry"],
  },
  {
    id: "aff_2",
    name: "Manhattan Dental Group",
    city: "New York",
    state: "NY",
    phone: "+1-212-555-0198",
    rating: 4.7,
    specialties: ["Crown & Veneer Care", "Cosmetic Dentistry"],
  },
  {
    id: "aff_3",
    name: "Peachtree Dental Clinic",
    city: "Atlanta",
    state: "GA",
    phone: "+1-404-555-0167",
    rating: 4.9,
    specialties: ["Root Canal Follow-up", "General Dentistry"],
  },
];

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
        // Allow departure_set OR payment_complete (no receipt, review only path)
        if (bk.status !== "departure_set" && bk.status !== "payment_complete") {
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
          <Text style={s.backArrow}>{"\u2039"}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Journey Complete</Text>
      </View>

      <ScrollView contentContainerStyle={[s.content, { alignItems: "center" }]} showsVerticalScrollIndicator={false}>
        <View style={s.icon}><Text style={{ fontSize: 56 }}>{"\ud83c\udf89"}</Text></View>
        <Text style={s.title}>Completed!</Text>
        <Text style={s.thankYou}>
          Thank you for completing your journey with Concourse!
        </Text>
        <Text style={s.sub}>
          Your treatment with {booking?.dentistName} at {booking?.clinicName} is complete.
        </Text>

        {/* Summary */}
        <View style={s.summaryCard}>
          <View style={s.row}>
            <Text style={s.label}>Treatment Total</Text>
            <Text style={s.value}>${booking?.finalInvoice?.totalAmount?.toLocaleString() || booking?.totalPrice?.toLocaleString()}</Text>
          </View>
          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <Text style={s.label}>Status</Text>
            <Text style={[s.value, { color: SharedColors.green }]}>{"\u2705"} Fully Paid</Text>
          </View>
        </View>

        {/* Affiliate Clinics */}
        <View style={s.affiliateSection}>
          <Text style={s.affiliateIcon}>{"\ud83c\uddfa\ud83c\uddf8"}</Text>
          <Text style={s.affiliateTitle}>Post-Treatment Care in the U.S.</Text>
          <Text style={s.affiliateDesc}>
            Here is the list of affiliate dentists you can contact for post-treatment care!
          </Text>

          {AFFILIATE_CLINICS.map((clinic) => (
            <View key={clinic.id} style={s.clinicCard}>
              <View style={s.clinicHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.clinicName}>{clinic.name}</Text>
                  <Text style={s.clinicLocation}>{clinic.city}, {clinic.state}</Text>
                </View>
                <View style={s.clinicRating}>
                  <Text style={s.clinicRatingText}>{"\u2b50"} {clinic.rating}</Text>
                </View>
              </View>
              <View style={s.clinicSpecialties}>
                {clinic.specialties.map((sp, i) => (
                  <View key={i} style={s.specialtyPill}>
                    <Text style={s.specialtyText}>{sp}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={s.clinicCallBtn}
                onPress={() => Linking.openURL(`tel:${clinic.phone}`)}
              >
                <Text style={s.clinicCallText}>{"\ud83d\udcde"} {clinic.phone}</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={s.viewAllBtn}
            onPress={() => router.push("/patient/affiliate-clinics" as any)}
          >
            <Text style={s.viewAllText}>View All Affiliate Clinics {"\u2192"}</Text>
          </TouchableOpacity>
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
              <Text style={s.reviewBtnText}>{"\u2b50"} Leave a Review</Text>
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
            <Text style={s.chatBtnText}>{"\ud83d\udcac"} Message {booking?.dentistName?.split(" ")[0]}</Text>
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
  thankYou: { fontSize: 15, fontWeight: "600", color: PatientTheme.primary, textAlign: "center", lineHeight: 22 },
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

  // Affiliate section
  affiliateSection: {
    width: "100%", alignItems: "center", gap: 12, marginTop: 8,
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  affiliateIcon: { fontSize: 36 },
  affiliateTitle: { fontSize: 17, fontWeight: "800", color: SharedColors.navy, textAlign: "center" },
  affiliateDesc: { fontSize: 13, color: SharedColors.slate, textAlign: "center", lineHeight: 19, marginBottom: 4 },

  clinicCard: {
    width: "100%", backgroundColor: SharedColors.bg, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: SharedColors.border, gap: 8,
  },
  clinicHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  clinicName: { fontSize: 14, fontWeight: "700", color: SharedColors.navy },
  clinicLocation: { fontSize: 12, color: SharedColors.slate, marginTop: 2 },
  clinicRating: {
    backgroundColor: SharedColors.amberLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  clinicRatingText: { fontSize: 12, fontWeight: "700", color: "#92400e" },
  clinicSpecialties: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  specialtyPill: {
    backgroundColor: PatientTheme.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  specialtyText: { fontSize: 11, fontWeight: "600", color: PatientTheme.primary },
  clinicCallBtn: {
    backgroundColor: SharedColors.greenLight, borderRadius: 8, paddingVertical: 8, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(22,163,74,0.2)",
  },
  clinicCallText: { fontSize: 13, fontWeight: "600", color: "#166534" },
  viewAllBtn: {
    backgroundColor: PatientTheme.primaryLight, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24,
    borderWidth: 1, borderColor: "rgba(74,0,128,0.15)",
  },
  viewAllText: { fontSize: 14, fontWeight: "600", color: PatientTheme.primary },

  // Actions
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
