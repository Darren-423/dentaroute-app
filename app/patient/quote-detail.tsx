import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View,
} from "react-native";
import { DentistQuote, store } from "../../lib/store";
import { toPatientLabel } from "../../lib/treatmentTerminology";
import { buildQuoteVisitsForTreatments } from "../../lib/treatmentVisitRules";

const T = {
  teal: "#4A0080", tealMid: "#5C10A0", tealLight: "#f0e6f6",
  navy: "#0f172a", navyMid: "#1e293b", slate: "#64748b", slateLight: "#94a3b8",
  border: "#e2e8f0", bg: "#f8fafc", white: "#ffffff",
  green: "#16a34a", greenLight: "#f0fdf4",
  amber: "#f59e0b", amberLight: "#fffbeb",
  blue: "#3b82f6", blueLight: "#eff6ff",
};

const screenWidth = Dimensions.get("window").width;

export default function QuoteDetailScreen() {
  const rawParams = useLocalSearchParams<{ quoteId: string; caseId: string }>();
  const quoteId = Array.isArray(rawParams.quoteId) ? rawParams.quoteId[0] : rawParams.quoteId || "";
  const caseId = Array.isArray(rawParams.caseId) ? rawParams.caseId[0] : rawParams.caseId || "";
  const [quote, setQuote] = useState<DentistQuote | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      if (quoteId && caseId) {
        const quotes = await store.getQuotesForCase(caseId);
        const found = quotes.find((q) => q.id === quoteId);
        setQuote(found ?? null);
        if (found) {
          const rt = await store.getAverageResponseTime(found.dentistName);
          setAvgResponseTime(rt);
        }
      }
    };
    load();
  }, [quoteId, caseId]);

  if (!quote) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={T.teal} />
      </View>
    );
  }

  const clinicPhotos = quote.clinicPhotos || [];
  const totalPrice = quote.totalPrice || 0;
  const depositAmount = Math.round(totalPrice * 0.10);
  const dentistInitial = (quote.dentistName || "D").split(" ").pop()?.[0] || "D";

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={["#3D0070", "#2F0058", "#220040"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.header}
        >
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Quote Details</Text>
          <View style={{ width: 36 }} />
        </LinearGradient>

        {/* Clinic Photos */}
        {clinicPhotos.length > 0 ? (
          <View style={s.photoSection}>
            <ScrollView
              horizontal pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / (screenWidth - 48));
                setActivePhoto(index);
              }}
            >
              {clinicPhotos.map((uri: string, i: number) => (
                <Image key={i} source={{ uri }} style={s.clinicPhoto} />
              ))}
            </ScrollView>
            {clinicPhotos.length > 1 && (
              <View style={s.photoDots}>
                {clinicPhotos.map((_: any, i: number) => (
                  <View key={i} style={[s.photoDot, i === activePhoto && s.photoDotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={s.photoPlaceholder}>
            <View style={s.photoPlaceholderInner}>
              <Text style={s.photoPlaceholderText}>Clinic Photos</Text>
            </View>
          </View>
        )}

        <View style={s.content}>
          {/* Dentist Profile Card */}
          <View style={s.profileCard}>
            <View style={s.profileTop}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{dentistInitial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={s.dentistName}>{quote.dentistName}</Text>
                  {quote.licenseVerified && (
                    <View style={s.verifiedBadge}>
                      <Text style={s.verifiedIcon}>✓</Text>
                    </View>
                  )}
                </View>
                <Text style={s.clinicName}>{quote.clinicName}</Text>
              </View>
              <TouchableOpacity
                style={s.profileViewBtn}
                onPress={() => router.push({
                  pathname: "/patient/dentist-profile" as any,
                  params: { dentistName: quote.dentistName, clinicName: quote.clinicName, quoteId: quote.id, caseId },
                })}
              >
                <Text style={s.profileViewBtnText}>Profile</Text>
                <View style={s.miniChevron} />
              </TouchableOpacity>
            </View>

            {/* Info grid */}
            <View style={s.infoGrid}>
              <TouchableOpacity
                style={s.infoItem}
                onPress={() => router.push({
                  pathname: "/patient/dentist-reviews" as any,
                  params: {
                    dentistName: quote.dentistName, clinicName: quote.clinicName,
                    rating: String(quote.rating || 4.8), reviewCount: String(quote.reviewCount || 0),
                  },
                })}
              >
                <Text style={s.infoValue}>{quote.rating || "4.8"}</Text>
                <Text style={s.infoLabel}>Rating</Text>
              </TouchableOpacity>
              <View style={s.infoDivider} />
              <View style={s.infoItem}>
                <Text style={s.infoValue}>{quote.reviewCount || 0}</Text>
                <Text style={s.infoLabel}>Reviews</Text>
              </View>
              <View style={s.infoDivider} />
              <View style={s.infoItem}>
                <Text style={s.infoValue}>{quote.yearsExperience || "–"}</Text>
                <Text style={s.infoLabel}>Experience</Text>
              </View>
              <View style={s.infoDivider} />
              <View style={s.infoItem}>
                <Text style={s.infoValue}>
                  {avgResponseTime !== null
                    ? avgResponseTime < 60
                      ? `${avgResponseTime}m`
                      : `${Math.round(avgResponseTime / 60)}h`
                    : "–"}
                </Text>
                <Text style={s.infoLabel}>Response</Text>
              </View>
            </View>

            {/* Location */}
            <TouchableOpacity
              style={s.locationRow}
              onPress={() => router.push({
                pathname: "/patient/clinic-map" as any,
                params: { caseId, highlightQuoteId: quote.id },
              })}
              activeOpacity={0.7}
            >
              <Text style={s.locationPin}>📍</Text>
              <Text style={s.locationText} numberOfLines={1}>{quote.address || quote.location}</Text>
              <Text style={s.locationAction}>Map</Text>
              <View style={s.miniChevron} />
            </TouchableOpacity>

            {/* Specialties */}
            {quote.specialties && quote.specialties.length > 0 && (
              <View style={s.specRow}>
                {quote.specialties.map((sp: string) => (
                  <View key={sp} style={s.specTag}>
                    <Text style={s.specTagText}>{sp}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Price card */}
          <View style={s.priceCard}>
            <View style={s.priceTop}>
              <Text style={s.priceSectionLabel}>Total Estimate</Text>
              <Text style={s.priceTotal}>${totalPrice.toLocaleString()}</Text>
            </View>
            <View style={s.priceBreakdown}>
              {quote.treatments?.map((t, i) => (
                <View key={i} style={s.treatmentRow}>
                  <View style={s.treatmentDot} />
                  <Text style={s.treatmentName}>{toPatientLabel(t.name)}</Text>
                  <Text style={s.treatmentQty}>×{t.qty}</Text>
                  <Text style={s.treatmentPrice}>${(t.price * t.qty).toLocaleString()}</Text>
                </View>
              ))}
            </View>
            <View style={s.depositRow}>
              <View>
                <Text style={s.depositLabel}>Deposit (10%)</Text>
                <Text style={s.depositSub}>Applied to your first visit payment</Text>
              </View>
              <Text style={s.depositValue}>${depositAmount.toLocaleString()}</Text>
            </View>
          </View>

          {/* Plan details */}
          {quote.treatmentDetails && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Plan Details</Text>
              <Text style={s.planText}>{quote.treatmentDetails}</Text>
            </View>
          )}

          {/* Message from dentist */}
          {quote.message && (
            <View style={s.messageCard}>
              <Text style={s.messageLabel}>Message from dentist</Text>
              <Text style={s.messageText}>{quote.message}</Text>
            </View>
          )}

          {/* Payment info */}
          <View style={s.paymentSection}>
            <Text style={s.paymentTitle}>How payment works</Text>
            {[
              "Pay 10% deposit now to confirm booking",
              "Pay per visit as scheduled by your dentist",
              "Final balance after treatment completion",
            ].map((text, i) => (
              <View key={i} style={s.paymentStep}>
                <View style={s.paymentStepNum}>
                  <Text style={s.paymentStepNumText}>{i + 1}</Text>
                </View>
                <Text style={s.paymentStepText}>{text}</Text>
              </View>
            ))}
          </View>

          {/* Promo */}
          <View style={s.promoCard}>
            <View style={s.promoLeft}>
              <Text style={s.promoTitle}>Save 5%</Text>
              <Text style={s.promoDesc}>Pay through DentaRoute for an exclusive discount applied to your final invoice.</Text>
            </View>
            <View style={s.promoBadge}>
              <Text style={s.promoBadgeText}>-5%</Text>
            </View>
          </View>

          <View style={{ height: 20 }} />
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={s.bottom}>
        <View style={s.bottomLeft}>
          <Text style={s.bottomPrice}>${totalPrice.toLocaleString()}</Text>
          <Text style={s.bottomDeposit}>Deposit ${depositAmount.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={s.selectBtn}
          onPress={() => {
            const effectiveVisits = quote.visits && quote.visits.length > 0
              ? quote.visits
              : buildQuoteVisitsForTreatments(quote.treatments || []);
            const durationLabel = quote.duration || (effectiveVisits.length > 0
              ? `${effectiveVisits.length} visit${effectiveVisits.length !== 1 ? "s" : ""}`
              : "");

            router.push({
              pathname: "/patient/visit-schedule" as any,
              params: {
                quoteId: quote.id, caseId,
                amount: String(depositAmount),
                totalPrice: String(totalPrice),
                dentistName: quote.dentistName,
                clinicName: quote.clinicName,
                duration: durationLabel,
                visitsJson: JSON.stringify(effectiveVisits),
              },
            });
          }}
          activeOpacity={0.85}
        >
          <Text style={s.selectBtnText}>
            Schedule Visits →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  /* Header */
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#fff" },

  /* Photos */
  photoSection: { marginBottom: 4 },
  clinicPhoto: {
    width: screenWidth - 48, height: 180, borderRadius: 16,
    marginHorizontal: 24, marginTop: 16,
  },
  photoDots: {
    flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10,
  },
  photoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.border },
  photoDotActive: { backgroundColor: T.teal, width: 18 },
  photoPlaceholder: {
    marginHorizontal: 24, marginTop: 16,
  },
  photoPlaceholderInner: {
    height: 120, borderRadius: 16,
    backgroundColor: T.tealLight, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(74,0,128,0.12)", borderStyle: "dashed",
  },
  photoPlaceholderText: { fontSize: 14, color: T.teal, fontWeight: "500" },

  content: { padding: 24, gap: 16 },

  /* Profile card */
  profileCard: {
    backgroundColor: T.white, borderRadius: 18, padding: 18, gap: 14,
    borderWidth: 1, borderColor: T.border,
  },
  profileTop: { flexDirection: "row", gap: 14, alignItems: "center" },
  avatar: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: T.tealLight, alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: T.teal },
  dentistName: { fontSize: 17, fontWeight: "700", color: T.navy },
  verifiedBadge: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: "#2563eb",
    alignItems: "center", justifyContent: "center",
  },
  verifiedIcon: { color: "#fff", fontSize: 11, fontWeight: "700" },
  clinicName: { fontSize: 13, color: T.slate, marginTop: 2 },
  profileViewBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: T.tealLight, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  profileViewBtnText: { fontSize: 12, fontWeight: "600", color: T.teal },
  miniChevron: {
    width: 6, height: 6,
    borderTopWidth: 1.5, borderRightWidth: 1.5,
    borderColor: T.teal,
    transform: [{ rotate: "45deg" }],
  },

  infoGrid: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.bg, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 8,
  },
  infoItem: { flex: 1, alignItems: "center" },
  infoValue: { fontSize: 16, fontWeight: "700", color: T.navy },
  infoLabel: { fontSize: 10, color: T.slateLight, marginTop: 2 },
  infoDivider: { width: 1, height: 28, backgroundColor: T.border },

  locationRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: T.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  locationPin: { fontSize: 14 },
  locationText: { flex: 1, fontSize: 13, color: T.slate },
  locationAction: { fontSize: 12, fontWeight: "600", color: T.teal },

  specRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  specTag: {
    backgroundColor: T.bg, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  specTagText: { fontSize: 11, color: T.slate, fontWeight: "500" },

  /* Price card */
  priceCard: {
    backgroundColor: T.white, borderRadius: 18, overflow: "hidden",
    borderWidth: 1, borderColor: T.border,
  },
  priceTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 18, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  priceSectionLabel: { fontSize: 14, fontWeight: "600", color: T.slate },
  priceTotal: { fontSize: 26, fontWeight: "800", color: T.teal },

  priceBreakdown: { padding: 16, gap: 0 },
  treatmentRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  treatmentDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: T.teal,
  },
  treatmentName: { flex: 1, fontSize: 14, fontWeight: "500", color: T.navy },
  treatmentQty: { fontSize: 12, color: T.slateLight, marginRight: 4 },
  treatmentPrice: { fontSize: 14, fontWeight: "600", color: T.navy },

  depositRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: T.tealLight,
  },
  depositLabel: { fontSize: 13, fontWeight: "600", color: T.teal },
  depositSub: { fontSize: 10, color: "#64748b", marginTop: 2 },
  depositValue: { fontSize: 16, fontWeight: "700", color: T.teal },

  /* Sections */
  section: {
    backgroundColor: T.white, borderRadius: 18, padding: 18, gap: 12,
    borderWidth: 1, borderColor: T.border,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: T.navy },
  sectionHeaderRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  planText: { fontSize: 14, color: T.slate, lineHeight: 22 },

  /* Duration */
  durationCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: T.amberLight, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
  },
  durationLeft: { gap: 2 },
  durationLabel: { fontSize: 12, color: T.amber, fontWeight: "500" },
  durationValue: { fontSize: 20, fontWeight: "800", color: T.navy },
  durationBadge: {
    backgroundColor: T.white, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  durationBadgeText: { fontSize: 12, fontWeight: "600", color: T.slate },

  /* Visit timeline */
  visitCountBadge: {
    backgroundColor: T.tealLight, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  visitCountText: { fontSize: 11, fontWeight: "600", color: T.teal },
  visitsTimeline: { gap: 0 },
  visitRow: { flexDirection: "row", gap: 14, minHeight: 56 },
  visitTimelineCol: { alignItems: "center", width: 18 },
  visitDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: T.teal, borderWidth: 2, borderColor: T.tealLight,
    marginTop: 4,
  },
  visitLine: { width: 2, flex: 1, backgroundColor: T.tealLight, marginVertical: 4 },
  visitContent: { flex: 1, paddingBottom: 14 },
  visitHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  visitLabel: { fontSize: 13, fontWeight: "700", color: T.teal },
  visitPayBadge: { backgroundColor: T.blueLight, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  visitPayText: { fontSize: 10, fontWeight: "600", color: T.blue },
  visitDesc: { fontSize: 13, color: T.slate, marginTop: 4, lineHeight: 18 },

  gapRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginVertical: 2, marginLeft: 32,
  },
  gapLine: { height: 1, width: 20, backgroundColor: "#fde68a" },
  gapText: { fontSize: 10, fontWeight: "600", color: "#b45309" },

  /* Message */
  messageCard: {
    backgroundColor: T.tealLight, borderRadius: 14, padding: 16, gap: 6,
  },
  messageLabel: { fontSize: 12, fontWeight: "600", color: T.teal },
  messageText: { fontSize: 13, color: "#0f5c53", lineHeight: 20 },

  /* Chat button */
  chatBtn: {
    alignItems: "center", justifyContent: "center",
    backgroundColor: T.white, borderRadius: 14, paddingVertical: 15,
    borderWidth: 1.5, borderColor: T.teal,
  },
  chatBtnText: { fontSize: 15, fontWeight: "600", color: T.teal },

  /* Payment info */
  paymentSection: {
    backgroundColor: T.white, borderRadius: 18, padding: 18, gap: 14,
    borderWidth: 1, borderColor: T.border,
  },
  paymentTitle: { fontSize: 15, fontWeight: "700", color: T.navy },
  paymentStep: { flexDirection: "row", alignItems: "center", gap: 12 },
  paymentStepNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: T.tealLight,
    alignItems: "center", justifyContent: "center",
  },
  paymentStepNumText: { fontSize: 12, fontWeight: "700", color: T.teal },
  paymentStepText: { flex: 1, fontSize: 13, color: T.slate, lineHeight: 18 },

  /* Promo */
  promoCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.tealLight, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "rgba(74,0,128,0.12)", gap: 14,
  },
  promoLeft: { flex: 1, gap: 4 },
  promoTitle: { fontSize: 14, fontWeight: "700", color: T.teal },
  promoDesc: { fontSize: 12, color: T.tealMid, lineHeight: 18 },
  promoBadge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: T.teal, alignItems: "center", justifyContent: "center",
  },
  promoBadgeText: { fontSize: 15, fontWeight: "800", color: T.white },

  /* Bottom CTA */
  bottom: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 48,
    borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.white,
  },
  bottomLeft: { gap: 2 },
  bottomPrice: { fontSize: 20, fontWeight: "800", color: T.navy },
  bottomDeposit: { fontSize: 12, color: T.slateLight },
  selectBtn: {
    flex: 1, backgroundColor: T.teal, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  selectBtnText: { color: T.white, fontSize: 15, fontWeight: "600" },
});
