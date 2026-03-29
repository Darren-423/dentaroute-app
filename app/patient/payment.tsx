import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { DentistQuote, SERVICE_TIER_CONFIG, ServiceTier, store } from "../../lib/store";


import { PatientTheme, SharedColors } from "../../constants/theme";
const TIER_DETAILS: Record<ServiceTier, { icon: string; tagline: string; features: string[]; notIncluded?: string[] }> = {
  basic: {
    icon: "🎯",
    tagline: "Essential matching",
    features: [
      "Doctor matching & quotes",
      "In-app chat with dentist",
      "Booking confirmation",
    ],
    notIncluded: ["Airport pickup", "Airport drop-off", "Hotel ↔ clinic transport"],
  },
  standard: {
    icon: "✈️",
    tagline: "Most popular",
    features: [
      "Everything in Basic",
      "Airport pickup on arrival",
      "Airport drop-off on departure",
    ],
    notIncluded: ["Hotel ↔ clinic transport"],
  },
  premium: {
    icon: "👑",
    tagline: "Full concierge",
    features: [
      "Everything in Standard",
      "Daily hotel ↔ clinic transport",
      "Priority support",
    ],
  },
};

export default function PatientPaymentScreen() {
  const params = useLocalSearchParams<{
    quoteId: string; caseId: string;
    totalPrice?: string; dentistName?: string; clinicName?: string;
    visitDatesJson?: string;
  }>();

  const getParam = (key: string): string => {
    const v = (params as any)[key];
    if (Array.isArray(v)) return v[0] || "";
    return v || "";
  };

  const quoteId = getParam("quoteId");
  const caseId = getParam("caseId");
  const totalPriceStr = getParam("totalPrice");
  const dentistNameStr = getParam("dentistName");
  const clinicNameStr = getParam("clinicName");

  const visitDates = (() => {
    try { return JSON.parse(getParam("visitDatesJson") || "[]"); } catch { return []; }
  })();

  const [quote, setQuote] = useState<DentistQuote | null>(null);
  const [selectedTier, setSelectedTier] = useState<ServiceTier>("standard");

  useEffect(() => {
    const load = async () => {
      if (quoteId && caseId) {
        const quotes = await store.getQuotesForCase(caseId);
        const found = quotes.find((q: any) => q.id === quoteId);
        if (found) setQuote(found);
      }
    };
    load();
  }, [quoteId, caseId]);

  const totalPrice = quote?.totalPrice || parseInt(totalPriceStr) || 0;
  const tierConfig = SERVICE_TIER_CONFIG[selectedTier];

  const handlePay = () => {
    router.push({
      pathname: "/patient/card-payment" as any,
      params: {
        quoteId: quoteId || "",
        caseId: caseId || "",
        totalPrice: String(totalPrice),
        dentistName: quote?.dentistName || dentistNameStr || "",
        clinicName: quote?.clinicName || clinicNameStr || "",
        visitDatesJson: JSON.stringify(visitDates),
        selectedTier,
        serviceFee: String(tierConfig.fee),
        tierLabel: SERVICE_TIER_CONFIG[selectedTier].label,
      },
    });
  };

  // ── Tier Selection ──
  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[...PatientTheme.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.header}
        >
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
              <Text style={s.backArrow}>‹</Text>
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <Text style={s.title}>Choose Your Plan</Text>
              <Text style={s.subtitle}>Select a concierge service tier</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>

        <View style={s.content}>
          {/* Tier cards */}
          {(["basic", "standard", "premium"] as ServiceTier[]).map((tier) => {
            const config = SERVICE_TIER_CONFIG[tier];
            const details = TIER_DETAILS[tier];
            const isSelected = selectedTier === tier;
            const isPopular = tier === "standard";

            return (
              <TouchableOpacity
                key={tier}
                style={[
                  s.tierCard,
                  isSelected && s.tierCardSelected,
                  isPopular && !isSelected && s.tierCardPopular,
                ]}
                onPress={() => setSelectedTier(tier)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${config.label} plan, ${details.tagline}, $${config.fee}${isSelected ? ", selected" : ""}`}
              >
                {isPopular && (
                  <View style={s.popularBadge}>
                    <Text style={s.popularBadgeText}>MOST POPULAR</Text>
                  </View>
                )}

                <View style={s.tierHeader}>
                  <Text style={s.tierIcon}>{details.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.tierName, isSelected && s.tierNameSelected]}>
                      {config.label}
                    </Text>
                    <Text style={s.tierTagline}>{details.tagline}</Text>
                  </View>
                  <View style={[s.tierPriceWrap, isSelected && s.tierPriceWrapSelected]}>
                    <Text style={[s.tierPrice, isSelected && s.tierPriceSelected]}>
                      ${config.fee}
                    </Text>
                  </View>
                </View>

                <View style={s.tierFeatures}>
                  {details.features.map((f, i) => (
                    <View key={i} style={s.featureRow}>
                      <Text style={s.featureCheck}>✓</Text>
                      <Text style={s.featureText}>{f}</Text>
                    </View>
                  ))}
                  {details.notIncluded?.map((f, i) => (
                    <View key={`no-${i}`} style={s.featureRow}>
                      <Text style={s.featureX}>✗</Text>
                      <Text style={s.featureTextDim}>{f}</Text>
                    </View>
                  ))}
                </View>

                {/* Radio indicator */}
                <View style={s.radioRow}>
                  <View style={[s.radioOuter, isSelected && s.radioOuterSelected]}>
                    {isSelected && <View style={s.radioInner} />}
                  </View>
                  <Text style={[s.radioLabel, isSelected && s.radioLabelSelected]}>
                    {isSelected ? "Selected" : "Select"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Info note */}
          <View style={s.infoNote}>
            <Text style={s.infoIcon}>💡</Text>
            <Text style={s.infoText}>
              Upload your hospital receipt after treatment to unlock a free airport drop-off — available with all plans!
            </Text>
          </View>

          <View style={s.policyNote}>
            <Text style={s.policyTitle}>Cancellation Policy</Text>
            <Text style={s.policyText}>
              Full refund if cancelled 7+ days before your visit. 50% refund within 3-7 days. No refund within 3 days.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={s.bottom}>
        <TouchableOpacity
          style={s.payBtn}
          onPress={handlePay}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Pay $${tierConfig.fee} for ${SERVICE_TIER_CONFIG[selectedTier].label} plan`}
        >
          <Text style={s.payBtnText}>
            Pay ${tierConfig.fee} — {SERVICE_TIER_CONFIG[selectedTier].label} →
          </Text>
        </TouchableOpacity>
        <Text style={s.poweredBy}>Secure payment · Powered by Stripe</Text>
      </View>
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
  headerCenter: { flex: 1, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: SharedColors.white },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },

  content: { padding: 20, gap: 14 },

  tierCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 18, gap: 14,
    borderWidth: 1.5, borderColor: SharedColors.border,
  },
  tierCardSelected: {
    borderColor: PatientTheme.primary, backgroundColor: PatientTheme.primaryLight,
    shadowColor: PatientTheme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  tierCardPopular: {
    borderColor: "#c4b5fd",
  },
  popularBadge: {
    position: "absolute", top: -10, right: 16,
    backgroundColor: PatientTheme.primary, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  popularBadgeText: { fontSize: 10, fontWeight: "700", color: SharedColors.white, letterSpacing: 0.5 },

  tierHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  tierIcon: { fontSize: 28 },
  tierName: { fontSize: 17, fontWeight: "700", color: SharedColors.navy },
  tierNameSelected: { color: PatientTheme.primary },
  tierTagline: { fontSize: 12, color: SharedColors.slate, marginTop: 1 },
  tierPriceWrap: {
    backgroundColor: SharedColors.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  tierPriceWrapSelected: { backgroundColor: PatientTheme.primary, borderColor: PatientTheme.primary },
  tierPrice: { fontSize: 20, fontWeight: "800", color: SharedColors.navy },
  tierPriceSelected: { color: SharedColors.white },

  tierFeatures: { gap: 6, paddingLeft: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureCheck: { fontSize: 14, color: SharedColors.green, fontWeight: "700" },
  featureText: { fontSize: 13, color: SharedColors.navy },
  featureX: { fontSize: 14, color: SharedColors.slateLight, fontWeight: "500" },
  featureTextDim: { fontSize: 13, color: SharedColors.slateLight, textDecorationLine: "line-through" },

  radioRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 2 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: SharedColors.slateLight, alignItems: "center", justifyContent: "center",
  },
  radioOuterSelected: { borderColor: PatientTheme.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: PatientTheme.primary },
  radioLabel: { fontSize: 13, color: SharedColors.slateLight, fontWeight: "600" },
  radioLabelSelected: { color: PatientTheme.primary },

  infoNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: SharedColors.amberLight, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.2)",
  },
  infoIcon: { fontSize: 16, marginTop: 1 },
  infoText: { flex: 1, fontSize: 12, color: "#92400e", lineHeight: 18 },

  policyNote: {
    backgroundColor: SharedColors.white, borderRadius: 12, padding: 14, gap: 6,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  policyTitle: { fontSize: 12, fontWeight: "700", color: SharedColors.navy },
  policyText: { fontSize: 12, color: SharedColors.slate, lineHeight: 18 },

  bottom: {
    paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 56,
    backgroundColor: SharedColors.white, borderTopWidth: 1, borderTopColor: SharedColors.border,
    alignItems: "center", gap: 8,
  },
  payBtn: {
    width: "100%", backgroundColor: PatientTheme.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  payBtnText: { color: SharedColors.white, fontSize: 17, fontWeight: "700" },
  poweredBy: { fontSize: 11, color: SharedColors.slateLight },
});
