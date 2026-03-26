import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Image, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Booking, SERVICE_TIER_CONFIG, store } from "../../lib/store";

import { PatientTheme, SharedColors } from "../../constants/theme";
export default function VisitCheckoutScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | null>(null);
  const [confirmedPayment, setConfirmedPayment] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dropOffUnlocked, setDropOffUnlocked] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (bookingId) {
        const bk = await store.getBooking(bookingId as string);
        if (bk) {
          setBooking(bk);
          setDropOffUnlocked(bk.dropOffUnlocked || false);
          setConfirmedPayment(bk.receiptUploaded || false);
        }
      }
      setLoading(false);
    };
    load();
  }, [bookingId]);

  const currentVisitNum = booking?.currentVisit || 1;
  const totalVisits = booking?.visitDates?.length || 1;
  const isLastVisit = currentVisitNum >= totalVisits;
  const tierLabel = booking?.serviceTier
    ? SERVICE_TIER_CONFIG[booking.serviceTier]?.label || "Standard"
    : "Standard";

  const handleSelectPayment = async (method: "cash" | "card") => {
    if (!booking) return;
    setPaymentMethod(method);
    setConfirmedPayment(true);
    await store.updateBooking(booking.id, { status: "payment_complete" });
    setBooking({ ...booking, status: "payment_complete" });
  };

  const handleUploadReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    setReceiptImage(result.assets[0].uri);

    // Simulate receipt processing (extract hospital, date, amount)
    setTimeout(async () => {
      if (!booking) return;
      await store.updateBooking(booking.id, {
        receiptUploaded: true,
        dropOffUnlocked: true,
        receiptData: {
          hospital: booking.clinicName,
          date: new Date().toISOString().split("T")[0],
          amount: booking.totalPrice,
        },
      });
      setDropOffUnlocked(true);
      setUploading(false);
    }, 2000);
  };

  const handleContinue = () => {
    if (isLastVisit) {
      router.push(`/patient/write-review?bookingId=${booking?.id}` as any);
    } else {
      router.replace("/patient/dashboard" as any);
    }
  };

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={PatientTheme.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={s.loadingContainer}>
        <Text style={{ color: SharedColors.slate }}>Booking not found</Text>
      </View>
    );
  }

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
              <Text style={s.title}>Visit Checkout</Text>
              <Text style={s.subtitle}>
                Visit {currentVisitNum} of {totalVisits} · {tierLabel} Plan
              </Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>

        <View style={s.content}>
          {/* Visit progress */}
          <View style={s.progressCard}>
            <View style={s.progressRow}>
              {Array.from({ length: totalVisits }).map((_, i) => {
                const visitNum = i + 1;
                const isDone = visitNum < currentVisitNum;
                const isCurrent = visitNum === currentVisitNum;
                return (
                  <View key={i} style={s.progressStep}>
                    <View style={[
                      s.progressDot,
                      isDone && s.progressDotDone,
                      isCurrent && s.progressDotCurrent,
                    ]}>
                      <Text style={[
                        s.progressDotText,
                        (isDone || isCurrent) && { color: SharedColors.white },
                      ]}>
                        {isDone ? "✓" : visitNum}
                      </Text>
                    </View>
                    {i < totalVisits - 1 && (
                      <View style={[s.progressLine, isDone && s.progressLineDone]} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Section A: Confirm clinic payment */}
          <View style={s.sectionCard}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionIcon}>🏥</Text>
              <Text style={s.sectionTitle}>Clinic Payment</Text>
            </View>
            <Text style={s.sectionDesc}>
              Treatment cost is paid directly to the clinic — not through Concourse.
            </Text>

            {!confirmedPayment ? (
              <>
                <View style={s.paymentInfo}>
                  <Text style={s.paymentLabel}>Estimated Treatment Cost</Text>
                  <Text style={s.paymentAmount}>${booking.totalPrice.toLocaleString()}</Text>
                  <Text style={s.paymentNote}>
                    Final amount may vary based on actual treatment
                  </Text>
                </View>
                <Text style={s.methodPrompt}>How did you pay?</Text>
                <View style={s.methodRow}>
                  <TouchableOpacity
                    style={s.methodBtn}
                    onPress={() => handleSelectPayment("cash")}
                    accessibilityRole="button"
                    accessibilityLabel="Paid with cash"
                  >
                    <Text style={s.methodIcon}>💵</Text>
                    <Text style={s.methodLabel}>Cash</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.methodBtn}
                    onPress={() => handleSelectPayment("card")}
                    accessibilityRole="button"
                    accessibilityLabel="Paid with credit card"
                  >
                    <Text style={s.methodIcon}>💳</Text>
                    <Text style={s.methodLabel}>Credit Card</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={s.confirmedBanner}>
                <Text style={s.confirmedIcon}>✓</Text>
                <Text style={s.confirmedText}>
                  Paid by {paymentMethod === "cash" ? "Cash 💵" : "Credit Card 💳"}
                </Text>
              </View>
            )}
          </View>

          {/* Section B: Receipt upload for free drop-off */}
          <View style={[s.sectionCard, !dropOffUnlocked && s.sectionCardHighlight]}>
            {!dropOffUnlocked && (
              <View style={s.dropOffPromo}>
                <Text style={s.dropOffPromoIcon}>🚗✨</Text>
                <Text style={s.dropOffPromoTitle}>Get a FREE Airport Drop-off!</Text>
                <Text style={s.dropOffPromoDesc}>
                  Upload your clinic receipt below and we'll arrange a complimentary ride to the airport — included with every plan.
                </Text>
              </View>
            )}
            <View style={s.sectionHeader}>
              <Text style={s.sectionIcon}>🧾</Text>
              <Text style={s.sectionTitle}>Upload Receipt</Text>
              <View style={s.freeBadge}>
                <Text style={s.freeBadgeText}>FREE DROP-OFF</Text>
              </View>
            </View>

            {dropOffUnlocked ? (
              <View style={s.unlockedBanner}>
                <Text style={s.unlockedIcon}>🎉</Text>
                <Text style={s.unlockedTitle}>Free Airport Drop-off Unlocked!</Text>
                <Text style={s.unlockedDesc}>
                  Your complimentary airport drop-off has been added to your booking.
                </Text>
              </View>
            ) : uploading ? (
              <View style={s.uploadingWrap}>
                <ActivityIndicator color={PatientTheme.primary} />
                <Text style={s.uploadingText}>Processing receipt...</Text>
              </View>
            ) : (
              <>
                {receiptImage && (
                  <Image source={{ uri: receiptImage }} style={s.receiptPreview} />
                )}
                <TouchableOpacity
                  style={[s.uploadBtn, !confirmedPayment && s.uploadBtnDisabled]}
                  onPress={handleUploadReceipt}
                  disabled={!confirmedPayment}
                  accessibilityRole="button"
                  accessibilityLabel={receiptImage ? "Replace receipt photo" : "Upload receipt photo"}
                >
                  <Text style={s.uploadBtnText}>
                    📸 {receiptImage ? "Replace Receipt" : "Upload Receipt Photo"}
                  </Text>
                </TouchableOpacity>
                {!confirmedPayment && (
                  <Text style={s.uploadHint}>Confirm clinic payment first</Text>
                )}
              </>
            )}

            <Text style={s.privacyNote}>
              Only hospital name, date, and amount are extracted. The image is not stored.
            </Text>
          </View>

          {/* Section C: Trip Summary */}
          <View style={s.sectionCard}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionIcon}>📋</Text>
              <Text style={s.sectionTitle}>Trip Summary</Text>
            </View>
            <Text style={s.sectionDesc}>
              A summary of your visit for your records. Can be used for insurance or tax purposes.
            </Text>

            <View style={s.summaryItems}>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Clinic</Text>
                <Text style={s.summaryValue}>{booking.clinicName}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Dentist</Text>
                <Text style={s.summaryValue}>{booking.dentistName}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Visit</Text>
                <Text style={s.summaryValue}>
                  {currentVisitNum} of {totalVisits}
                </Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Service Plan</Text>
                <Text style={s.summaryValue}>{tierLabel} (${booking.serviceFee})</Text>
              </View>
              {booking.receiptData && (
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Treatment Cost</Text>
                  <Text style={s.summaryValue}>${booking.receiptData.amount.toLocaleString()}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Disclaimer */}
          <View style={s.disclaimer}>
            <Text style={s.disclaimerText}>
              Treatment outcomes are the responsibility of the treating clinic. Concourse does not guarantee treatment quality.
            </Text>
          </View>

          <View style={{ height: 20 }} />
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={s.bottom}>
        <TouchableOpacity
          style={[s.continueBtn, !confirmedPayment && s.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!confirmedPayment}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isLastVisit ? "Write a review" : "Back to dashboard"}
        >
          <Text style={s.continueBtnText}>
            {isLastVisit ? "Write a Review →" : "Back to Dashboard →"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: SharedColors.bg },

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

  content: { padding: 20, gap: 16 },

  // Progress
  progressCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  progressStep: { flexDirection: "row", alignItems: "center" },
  progressDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: SharedColors.bg,
    borderWidth: 2, borderColor: SharedColors.border,
    alignItems: "center", justifyContent: "center",
  },
  progressDotDone: { backgroundColor: SharedColors.green, borderColor: SharedColors.green },
  progressDotCurrent: { backgroundColor: PatientTheme.primary, borderColor: PatientTheme.primary },
  progressDotText: { fontSize: 13, fontWeight: "700", color: SharedColors.slateLight },
  progressLine: { width: 28, height: 2, backgroundColor: SharedColors.border, marginHorizontal: 4 },
  progressLineDone: { backgroundColor: SharedColors.green },

  // Section card
  sectionCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 18, gap: 12,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: SharedColors.navy, flex: 1 },
  sectionDesc: { fontSize: 13, color: SharedColors.slate, lineHeight: 19 },

  // Payment info
  paymentInfo: {
    backgroundColor: PatientTheme.primaryLight, borderRadius: 12, padding: 16, alignItems: "center", gap: 4,
  },
  paymentLabel: { fontSize: 12, color: SharedColors.slate, fontWeight: "600" },
  paymentAmount: { fontSize: 28, fontWeight: "800", color: PatientTheme.primary },
  paymentNote: { fontSize: 11, color: SharedColors.slateLight, marginTop: 2 },

  methodPrompt: { fontSize: 14, fontWeight: "700", color: SharedColors.navy },
  methodRow: { flexDirection: "row", gap: 12 },
  methodBtn: {
    flex: 1, backgroundColor: SharedColors.white, borderRadius: 14, paddingVertical: 18,
    alignItems: "center", gap: 6,
    borderWidth: 1.5, borderColor: PatientTheme.primaryBorder,
  },
  methodIcon: { fontSize: 28 },
  methodLabel: { fontSize: 14, fontWeight: "700", color: SharedColors.navy },

  confirmedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: SharedColors.greenLight, borderRadius: 12, padding: 14,
  },
  confirmedIcon: { fontSize: 18, color: SharedColors.green, fontWeight: "700" },
  confirmedText: { fontSize: 14, fontWeight: "600", color: "#166534" },

  // Highlight card
  sectionCardHighlight: {
    borderColor: PatientTheme.primary, borderWidth: 1.5,
    shadowColor: PatientTheme.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  dropOffPromo: {
    backgroundColor: PatientTheme.primaryLight, borderRadius: 12,
    padding: 16, alignItems: "center", gap: 6, marginBottom: 4,
  },
  dropOffPromoIcon: { fontSize: 32 },
  dropOffPromoTitle: { fontSize: 17, fontWeight: "800", color: PatientTheme.primary, textAlign: "center" },
  dropOffPromoDesc: { fontSize: 13, color: SharedColors.slate, textAlign: "center", lineHeight: 19 },

  // Receipt upload
  freeBadge: {
    backgroundColor: SharedColors.amberLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.3)",
  },
  freeBadgeText: { fontSize: 9, fontWeight: "700", color: "#92400e", letterSpacing: 0.5 },

  uploadBtn: {
    backgroundColor: PatientTheme.primaryLight, borderRadius: 12, paddingVertical: 14, alignItems: "center",
    borderWidth: 1.5, borderColor: "rgba(74,0,128,0.2)", borderStyle: "dashed",
  },
  uploadBtnDisabled: { opacity: 0.4 },
  uploadBtnText: { color: PatientTheme.primary, fontSize: 14, fontWeight: "600" },
  uploadHint: { fontSize: 11, color: SharedColors.slateLight, textAlign: "center" },

  receiptPreview: { width: "100%", height: 120, borderRadius: 10 },

  uploadingWrap: { alignItems: "center", padding: 20, gap: 10 },
  uploadingText: { fontSize: 13, color: SharedColors.slate },

  unlockedBanner: {
    backgroundColor: SharedColors.greenLight, borderRadius: 12, padding: 16, alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: "rgba(22,163,74,0.2)",
  },
  unlockedIcon: { fontSize: 28 },
  unlockedTitle: { fontSize: 16, fontWeight: "700", color: "#166534" },
  unlockedDesc: { fontSize: 13, color: "#166534", textAlign: "center" },

  privacyNote: {
    fontSize: 11, color: SharedColors.slateLight, fontStyle: "italic", textAlign: "center",
  },

  // Trip summary
  summaryItems: { gap: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 13, color: SharedColors.slate },
  summaryValue: { fontSize: 13, fontWeight: "600", color: SharedColors.navy },

  // Disclaimer
  disclaimer: {
    backgroundColor: SharedColors.amberLight, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
  },
  disclaimerText: { fontSize: 11, color: "#92400e", lineHeight: 16 },

  // Bottom
  bottom: {
    paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 56,
    backgroundColor: SharedColors.white, borderTopWidth: 1, borderTopColor: SharedColors.border,
  },
  continueBtn: {
    backgroundColor: PatientTheme.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center",
  },
  continueBtnDisabled: { opacity: 0.4 },
  continueBtnText: { color: SharedColors.white, fontSize: 16, fontWeight: "700" },
});
