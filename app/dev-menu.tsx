import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { DoctorTier, TIER_CONFIG, store } from "../lib/store";

const T = {
  teal: "#0d7a6e", tealMid: "#1a9e8f", tealLight: "#e6f4f2",
  navy: "#0f172a", slate: "#64748b", slateLight: "#94a3b8",
  border: "#e2e8f0", bg: "#f8fafc", white: "#ffffff",
  red: "#ef4444", amber: "#f59e0b",
};

export default function DevMenuScreen() {
  const [seeded, setSeeded] = useState(false);
  const [currentTier, setCurrentTier] = useState<DoctorTier>("standard");

  const handleSeed = async () => {
    await store.seedDemoData();
    setSeeded(true);
    Alert.alert("✅ Done!", "Demo data loaded. You can now test any screen.");
  };

  const handleReset = async () => {
    await store.resetAll();
    setSeeded(false);
    Alert.alert("🗑 Reset", "All data cleared.");
  };

  const nav = (path: string) => router.push(path as any);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>🛠 Dev Menu</Text>
        <Text style={s.subtitle}>Demo data seeding & quick navigation</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Seed / Reset */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>DATA</Text>
          <TouchableOpacity
            style={[s.btn, s.btnTeal]}
            onPress={handleSeed}
            activeOpacity={0.8}
          >
            <Text style={s.btnText}>
              {seeded ? "✅ Demo Data Loaded" : "🌱 Seed Demo Data"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, s.btnRed]}
            onPress={handleReset}
            activeOpacity={0.8}
          >
            <Text style={s.btnText}>🗑 Reset All Data</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, s.btnSlate]}
            onPress={async () => {
              const data = await store.debugAll();
              Alert.alert("Store Data", JSON.stringify(data, null, 2).slice(0, 500) + "...");
            }}
            activeOpacity={0.8}
          >
            <Text style={s.btnText}>🔍 Debug Store</Text>
          </TouchableOpacity>
        </View>

        {/* Patient Screens */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>PATIENT SCREENS</Text>
          {[
            ["/patient/basic-info", "1. Basic Info"],
            ["/patient/medical-history", "2. Medical History"],
            ["/patient/dental-history", "3. Dental History"],
            ["/patient/dashboard", "4. Dashboard"],
            ["/patient/travel-dates", "5. Travel Dates"],
            ["/patient/upload", "6. Upload Files"],
            ["/patient/treatment-select", "7. Treatment Select"],
            ["/patient/review", "8. Review & Submit"],
            ["/patient/quotes?caseId=1001", "9. Quotes (Case 1001)"],
            ["/patient/chat-list", "10. Chat List"],
            ["/patient/visit-schedule?quoteId=q001&caseId=1001&amount=420&totalPrice=2800&dentistName=Dr.%20Kim%20Minjun&clinicName=Seoul%20Bright%20Dental&duration=6%20Days&visitsJson=" + encodeURIComponent(JSON.stringify([{visit:1,description:"Initial consultation"},{visit:2,description:"Implant surgery"},{visit:3,description:"Follow-up check"},{visit:4,description:"Crown fitting"}])), "11. Visit Schedule"],
            ["/patient/write-review?bookingId=bk_demo_001", "12. Write Review"],
            ["/patient/dentist-reviews?dentistName=Dr.%20Kim%20Minjun&clinicName=Seoul%20Bright%20Dental&rating=4.9&reviewCount=127", "14. Dentist Reviews"],
            ["/patient/clinic-map?caseId=1001", "15. Clinic Map"],
            ["/patient/profile", "16. My Profile"],
            ["/patient/dentist-profile?dentistName=Dr.%20Kim%20Minjun&clinicName=Seoul%20Bright%20Dental&caseId=1001", "17. Dentist Profile"],
            ["/patient/arrival-info?bookingId=bk_demo_001", "18. Arrival Info"],
            ["/patient/hotel-arrived?bookingId=bk_demo_001", "19. Hotel Arrived"],
            ["/patient/clinic-checkin?bookingId=bk_demo_001", "20. Clinic Check-in"],
            ["/patient/visit-checkout?bookingId=bk_demo_001", "21. Visit Checkout"],
            ["/patient/departure-pickup?bookingId=bk_demo_001", "22. Departure Pickup"],
            ["/patient/stay-or-return?bookingId=bk_demo_001", "23. Stay or Return"],
          ].map(([path, label]) => (
            <TouchableOpacity
              key={path}
              style={s.navBtn}
              onPress={() => nav(path)}
              activeOpacity={0.7}
            >
              <Text style={s.navBtnText}>{label}</Text>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Doctor Screens */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>DOCTOR SCREENS</Text>
          {[
            ["/doctor/profile-setup", "1. Profile Setup"],
            ["/doctor/dashboard", "2. Dashboard"],
            ["/doctor/case-detail?caseId=1001", "3. Case Detail (1001)"],
            ["/doctor/chat-list", "4. Chat List"],
            ["/doctor/profile", "5. My Profile"],
            ["/doctor/patient-info?patientName=Sarah%20Johnson&caseId=1001", "6. Patient Info"],
            ["/doctor/final-invoice?bookingId=bk_demo_001", "7. Final Invoice"],
          ].map(([path, label]) => (
            <TouchableOpacity
              key={path}
              style={s.navBtnDark}
              onPress={() => nav(path)}
              activeOpacity={0.7}
            >
              <Text style={s.navBtnDarkText}>{label}</Text>
              <Text style={s.chevronDark}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notifications */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>NOTIFICATIONS</Text>
          <TouchableOpacity style={s.navBtn} onPress={() => nav("/notifications?role=patient")} activeOpacity={0.7}>
            <Text style={s.navBtnText}>Patient Notifications</Text>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.navBtnDark} onPress={() => nav("/notifications?role=doctor")} activeOpacity={0.7}>
            <Text style={s.navBtnDarkText}>Doctor Notifications</Text>
            <Text style={s.chevronDark}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Auth */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>AUTH</Text>
          <TouchableOpacity
            style={s.navBtn}
            onPress={() => nav("/auth/role-select")}
            activeOpacity={0.7}
          >
            <Text style={s.navBtnText}>Role Select (Start)</Text>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Demo Status Override */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>⚡ DEMO: FORCE BOOKING STATUS</Text>
          <Text style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>
            Tap to jump booking bk_demo_001 to any stage
          </Text>
          {([
            { status: "confirmed", label: "✅ Confirmed", color: "#0d7a6e" },
            { status: "flight_submitted", label: "✈️ Flight Submitted", color: "#3b82f6" },
            { status: "arrived_korea", label: "🇰🇷 Arrived in Korea", color: "#7c3aed" },
            { status: "checked_in_clinic", label: "🏥 Checked in at Clinic", color: "#f59e0b" },
            { status: "treatment_done", label: "💳 Treatment Done (Invoice Sent)", color: "#d97706" },
            { status: "payment_complete", label: "💰 Payment Complete", color: "#10b981" },
            { status: "departure_set", label: "🚗 Departure Set", color: "#059669" },
          ] as const).map((item) => (
            <TouchableOpacity
              key={item.status}
              style={[s.statusBtn, { borderColor: item.color + "40" }]}
              onPress={async () => {
                const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
                const raw = await AsyncStorage.getItem("dr_bookings");
                if (raw) {
                  const bookings = JSON.parse(raw);
                  const idx = bookings.findIndex((b: any) => b.id === "bk_demo_001");
                  if (idx >= 0) {
                    bookings[idx].status = item.status;
                    await AsyncStorage.setItem("dr_bookings", JSON.stringify(bookings));
                    Alert.alert("✅ Done", `Booking status → ${item.label}\n\nGo to patient dashboard to see the change.`);
                  } else {
                    Alert.alert("⚠️", "Demo booking not found. Seed demo data first!");
                  }
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={[s.statusBtnText, { color: item.color }]}>{item.label}</Text>
              <Text style={{ fontSize: 10, color: "#94a3b8" }}>→ {item.status}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Doctor Tier Override */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🏷️ SET DOCTOR TIER</Text>
          <Text style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>
            Changes platform fee rate for doctor profile
          </Text>
          {(["gold", "silver", "standard"] as DoctorTier[]).map((tier) => {
            const cfg = TIER_CONFIG[tier];
            const isActive = currentTier === tier;
            return (
              <TouchableOpacity
                key={tier}
                style={[s.statusBtn, {
                  borderColor: isActive ? cfg.color : cfg.color + "40",
                  backgroundColor: isActive ? cfg.color + "12" : "transparent",
                }]}
                onPress={async () => {
                  const dp = await store.getDoctorProfile();
                  if (dp) {
                    await store.saveDoctorProfile({
                      ...dp,
                      tier,
                      platformFeeRate: cfg.feeRate,
                      tierUpdatedAt: new Date().toISOString(),
                    });
                    setCurrentTier(tier);
                    Alert.alert("✅ Done", `Doctor tier → ${cfg.label} (${Math.round(cfg.feeRate * 100)}% fee)`);
                  } else {
                    Alert.alert("⚠️", "Doctor profile not found. Seed demo data first!");
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cfg.color }} />
                  <Text style={[s.statusBtnText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                <Text style={{ fontSize: 10, color: "#94a3b8" }}>Fee: {Math.round(cfg.feeRate * 100)}%</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: {
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20,
    backgroundColor: T.white, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  title: { fontSize: 24, fontWeight: "700", color: T.navy, marginBottom: 4 },
  subtitle: { fontSize: 13, color: T.slate },

  content: { padding: 20, gap: 20, paddingBottom: 40 },

  section: { gap: 8 },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: T.slate,
    letterSpacing: 0.8, marginBottom: 4,
  },

  btn: {
    borderRadius: 12, paddingVertical: 14, alignItems: "center",
  },
  btnTeal: { backgroundColor: T.teal },
  btnRed: { backgroundColor: T.red },
  btnSlate: { backgroundColor: T.slate },
  btnText: { color: T.white, fontSize: 14, fontWeight: "600" },

  navBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: T.white, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 13,
    borderWidth: 1, borderColor: T.border,
  },
  navBtnText: { fontSize: 14, color: T.navy, fontWeight: "500" },
  chevron: { fontSize: 18, color: T.slateLight },

  navBtnDark: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: T.navy, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 13,
  },
  navBtnDarkText: { fontSize: 14, color: "#e2e8f0", fontWeight: "500" },
  chevronDark: { fontSize: 18, color: "rgba(255,255,255,0.3)" },
  statusBtn: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 6,
    borderWidth: 1.5, borderColor: "#e2e8f0",
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  statusBtnText: { fontSize: 14, fontWeight: "700" },
});
