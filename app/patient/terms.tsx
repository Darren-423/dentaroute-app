import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PatientTheme, SharedColors } from "../../constants/theme";
export default function TermsScreen() {
  return (
    <View style={s.container}>
      <LinearGradient
        colors={[...PatientTheme.gradient]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.title}>Terms of Service</Text>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.updated}>Last updated: March 25, 2026</Text>

        <Text style={s.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={s.body}>
          By accessing or using the Concourse mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the App.
        </Text>

        <Text style={s.sectionTitle}>2. Description of Service</Text>
        <Text style={s.body}>
          Concourse is a medical tourism concierge platform that connects patients with dental clinics in South Korea. Concourse is NOT a medical provider, clinic, or healthcare facility. We facilitate introductions, provide logistics support (airport transfers, accommodation guidance), and offer an in-app communication channel between patients and dentists.
        </Text>

        <Text style={s.sectionTitle}>3. Service Fees</Text>
        <Text style={s.body}>
          Concourse charges a one-time service fee based on the plan you select (Basic, Standard, or Premium). This fee covers concierge services only and is separate from any treatment costs. Treatment costs are paid directly to the clinic and are not processed by Concourse.
        </Text>

        <Text style={s.sectionTitle}>4. No Medical Advice</Text>
        <Text style={s.body}>
          Concourse does not provide medical advice, diagnosis, or treatment. All treatment decisions must be made between you and your treating dentist through an in-person consultation. Quotes provided through the App are estimates only and may change after examination.
        </Text>

        <Text style={s.sectionTitle}>5. Dentist Credentials</Text>
        <Text style={s.body}>
          Concourse performs basic verification of dentist credentials. However, we do not guarantee the accuracy, completeness, or currency of any dentist's profile information. You are responsible for independently verifying credentials before proceeding with treatment.
        </Text>

        <Text style={s.sectionTitle}>6. Cancellation & Refunds</Text>
        <Text style={s.body}>
          Service fee refunds follow this policy:{"\n"}
          • 7+ days before visit: 100% refund{"\n"}
          • 3–7 days before visit: 50% refund{"\n"}
          • Less than 3 days: No refund{"\n\n"}
          Treatment costs paid to clinics are subject to the clinic's own refund policy.
        </Text>

        <Text style={s.sectionTitle}>7. Limitation of Liability</Text>
        <Text style={s.body}>
          Concourse is not responsible for the quality, outcome, or safety of any dental treatment. All treatment-related liability rests with the treating dental clinic. Concourse's total liability is limited to the service fee you paid.
        </Text>

        <Text style={s.sectionTitle}>8. Privacy</Text>
        <Text style={s.body}>
          Your use of the App is also governed by our Privacy Policy. Please review it to understand how we collect, use, and protect your information.
        </Text>

        <Text style={s.sectionTitle}>9. Governing Law</Text>
        <Text style={s.body}>
          These Terms are governed by the laws of the Republic of Korea and the applicable laws of the United States. Disputes shall be resolved through arbitration in Seoul, South Korea.
        </Text>

        <Text style={s.placeholder}>
          [Full legal terms to be finalized by legal counsel. This is a placeholder version for development purposes.]
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: SharedColors.white, fontWeight: "600", marginTop: -2 },
  title: { flex: 1, fontSize: 18, fontWeight: "700", color: SharedColors.white, textAlign: "center" },
  scroll: { paddingHorizontal: 24, paddingTop: 20 },
  updated: { fontSize: 12, color: SharedColors.slate, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: SharedColors.navy, marginTop: 20, marginBottom: 8 },
  body: { fontSize: 14, color: SharedColors.slate, lineHeight: 22 },
  placeholder: {
    fontSize: 13, color: "#b45309", fontStyle: "italic",
    backgroundColor: SharedColors.amberLight, borderRadius: 8, padding: 12, marginTop: 24,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.2)",
  },
});
