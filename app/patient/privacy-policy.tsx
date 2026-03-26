import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const C = {
  plum: "#4A0080", navy: "#0f172a", slate: "#64748b",
  border: "#e2e8f0", bg: "#f8fafc", white: "#ffffff",
};

export default function PrivacyPolicyScreen() {
  return (
    <View style={s.container}>
      <LinearGradient
        colors={["#3D0070", "#2F0058", "#220040"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.title}>Privacy Policy</Text>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.updated}>Last updated: March 25, 2026</Text>

        <Text style={s.sectionTitle}>1. Information We Collect</Text>
        <Text style={s.body}>
          We collect the following categories of information:{"\n\n"}
          <Text style={s.bold}>Account Information:</Text> Name, email, phone number, nationality, date of birth.{"\n\n"}
          <Text style={s.bold}>Health Information:</Text> Medical history, dental history, X-ray images, and treatment preferences that you voluntarily provide for obtaining dental quotes. This information is classified as sensitive personal data under Korean law.{"\n\n"}
          <Text style={s.bold}>Payment Information:</Text> Service plan selection. Payment processing is handled by Stripe — we do not store credit card details.{"\n\n"}
          <Text style={s.bold}>Usage Data:</Text> App usage patterns, device information, and crash reports.
        </Text>

        <Text style={s.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={s.body}>
          • Matching you with dental clinics and facilitating quotes{"\n"}
          • Processing service fee payments{"\n"}
          • Providing concierge services (airport transfers, accommodation guidance){"\n"}
          • In-app communication between you and dentists{"\n"}
          • Improving our services and user experience
        </Text>

        <Text style={s.sectionTitle}>3. Who We Share With</Text>
        <Text style={s.body}>
          Your health information is shared only with dental clinics you choose to receive quotes from. We do not sell or share your personal data with third parties for marketing purposes. Service providers (Stripe for payments, cloud hosting) process data on our behalf under strict data protection agreements.
        </Text>

        <Text style={s.sectionTitle}>4. Data Protection</Text>
        <Text style={s.body}>
          Health information and other sensitive data are encrypted in storage and transit. We comply with the Korean Personal Information Protection Act (PIPA) and follow best practices aligned with HIPAA and CCPA standards. You have the right to request access, correction, or deletion of your personal data.
        </Text>

        <Text style={s.sectionTitle}>5. Data Retention</Text>
        <Text style={s.body}>
          Account and health data are retained while your account is active and for up to 3 years after deletion for legal compliance. Hospital receipts are processed for data extraction only — images are immediately discarded and not stored.
        </Text>

        <Text style={s.sectionTitle}>6. Your Rights</Text>
        <Text style={s.body}>
          Under applicable laws (Korean PIPA, US CCPA), you have the right to:{"\n"}
          • Access your personal data{"\n"}
          • Request correction of inaccurate data{"\n"}
          • Request deletion of your data{"\n"}
          • Withdraw consent for data processing{"\n"}
          • Request data portability{"\n\n"}
          To exercise these rights, contact us at privacy@concourse.health
        </Text>

        <Text style={s.sectionTitle}>7. International Data Transfers</Text>
        <Text style={s.body}>
          Your data may be transferred between South Korea and the United States. All transfers comply with applicable data protection laws and are protected by appropriate safeguards.
        </Text>

        <Text style={s.sectionTitle}>8. Contact</Text>
        <Text style={s.body}>
          For privacy-related inquiries: privacy@concourse.health
        </Text>

        <Text style={s.placeholder}>
          [Full privacy policy to be finalized by legal counsel. This is a placeholder version for development purposes.]
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },
  title: { flex: 1, fontSize: 18, fontWeight: "700", color: "#fff", textAlign: "center" },
  scroll: { paddingHorizontal: 24, paddingTop: 20 },
  updated: { fontSize: 12, color: C.slate, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: C.navy, marginTop: 20, marginBottom: 8 },
  body: { fontSize: 14, color: C.slate, lineHeight: 22 },
  bold: { fontWeight: "700", color: C.navy },
  placeholder: {
    fontSize: 13, color: "#b45309", fontStyle: "italic",
    backgroundColor: "#fffbeb", borderRadius: 8, padding: 12, marginTop: 24,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.2)",
  },
});
