import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from "react-native";
import { DentistQuote, TIER_CONFIG, store } from "../../lib/store";

const T = {
  teal: "#4A0080", tealMid: "#5C10A0", tealLight: "#f0e6f6",
  navy: "#0f172a", slate: "#64748b", slateLight: "#94a3b8",
  border: "#e2e8f0", bg: "#f8fafc", white: "#ffffff",
  green: "#16a34a", greenLight: "#f0fdf4",
  amber: "#f59e0b", amberLight: "#fffbeb",
  red: "#ef4444",
};

export default function PatientPaymentScreen() {
  const params = useLocalSearchParams<{
    quoteId: string; caseId: string; amount: string;
    totalPrice?: string; dentistName?: string; clinicName?: string;
    visitDatesJson?: string;
  }>();

  // expo-router can return string[] — always extract first value
  const getParam = (key: string): string => {
    const v = (params as any)[key];
    if (Array.isArray(v)) return v[0] || "";
    return v || "";
  };

  const quoteId = getParam("quoteId");
  const caseId = getParam("caseId");
  const amountStr = getParam("amount");
  const totalPriceStr = getParam("totalPrice");
  const dentistNameStr = getParam("dentistName");
  const clinicNameStr = getParam("clinicName");

  const visitDates = (() => {
    try { return JSON.parse(getParam("visitDatesJson") || "[]"); } catch { return []; }
  })();
  const [quote, setQuote] = useState<DentistQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  const [card, setCard] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: "",
  });

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
  const depositAmount = parseInt(amountStr) || Math.round(totalPrice * 0.10);

  const formatCardNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const isCardValid =
    card.number.replace(/\s/g, "").length === 16 &&
    card.expiry.length === 5 &&
    card.cvc.length >= 3 &&
    card.name.trim().length > 0;

  const getCardBrand = (num: string) => {
    const n = num.replace(/\s/g, "");
    if (/^4/.test(n)) return "Visa";
    if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "Mastercard";
    if (/^3[47]/.test(n)) return "Amex";
    if (/^6(?:011|5)/.test(n)) return "Discover";
    return "Card";
  };

  const handlePay = async () => {
    if (!isCardValid) {
      Alert.alert("Incomplete", "Please fill in all card details.");
      return;
    }
    setLoading(true);
    setTimeout(async () => {
      if (caseId) {
        await store.updateCaseStatus(caseId, "booked");
        const rawNum = card.number.replace(/\s/g, "");
        // 의사 프로필에서 현재 티어의 수수료율을 스냅샷으로 저장
        let platformFeeRate = TIER_CONFIG.standard.feeRate; // 기본값 20%
        try {
          const dp = await store.getDoctorProfile();
          if (dp?.platformFeeRate) platformFeeRate = dp.platformFeeRate;
          else if (dp?.tier) platformFeeRate = TIER_CONFIG[dp.tier as keyof typeof TIER_CONFIG]?.feeRate || platformFeeRate;
        } catch {}
        await store.createBooking({
          caseId,
          quoteId: quoteId || "",
          dentistName: quote?.dentistName || dentistNameStr || "",
          clinicName: quote?.clinicName || clinicNameStr || "",
          depositPaid: depositAmount,
          totalPrice: quote?.totalPrice || parseInt(totalPriceStr) || 0,
          treatments: quote?.treatments || [],
          visitDates: visitDates,
          status: "confirmed",
          platformFeeRate,
          savedCard: {
            last4: rawNum.slice(-4),
            brand: getCardBrand(rawNum),
            name: card.name.trim(),
            expiry: card.expiry,
          },
        });
      }
      setLoading(false);
      setPaid(true);
    }, 2000);
  };

  // ── Payment Success ──
  if (paid) {
    return (
      <View style={s.successContainer}>
        <View style={s.successContent}>
          <View style={s.successIconWrap}>
            <Text style={s.successIcon}>✓</Text>
          </View>
          <Text style={s.successTitle}>Payment Successful!</Text>
          <Text style={s.successDesc}>
            Your deposit of ${depositAmount.toLocaleString()} has been processed.{"\n"}
            Your booking is confirmed!
          </Text>

          <View style={s.bookingSummary}>
            <Text style={s.bookingLabel}>BOOKING CONFIRMED</Text>
            <View style={s.bookingRow}>
              <Text style={s.bookingKey}>Dentist</Text>
              <Text style={s.bookingValue}>{quote?.dentistName || dentistNameStr}</Text>
            </View>
            <View style={s.bookingRow}>
              <Text style={s.bookingKey}>Clinic</Text>
              <Text style={s.bookingValue}>{quote?.clinicName || clinicNameStr}</Text>
            </View>
            <View style={s.bookingRow}>
              <Text style={s.bookingKey}>Deposit Paid</Text>
              <Text style={[s.bookingValue, { color: T.green, fontWeight: "700" }]}>
                ${depositAmount.toLocaleString()}
              </Text>
            </View>
            <View style={s.bookingRow}>
              <Text style={s.bookingKey}>Remaining</Text>
              <Text style={s.bookingValue}>
                ${(totalPrice - depositAmount).toLocaleString()} (pay at clinic)
              </Text>
            </View>
          </View>

          <View style={s.nextSteps}>
            <Text style={s.nextStepsTitle}>What's next?</Text>
            <View style={s.stepItem}>
              <View style={s.stepDot}><Text style={s.stepDotText}>1</Text></View>
              <Text style={s.stepText}>You'll receive a confirmation email</Text>
            </View>
            <View style={s.stepItem}>
              <View style={s.stepDot}><Text style={s.stepDotText}>2</Text></View>
              <Text style={s.stepText}>The clinic will contact you with visit details</Text>
            </View>
            <View style={s.stepItem}>
              <View style={s.stepDot}><Text style={s.stepDotText}>3</Text></View>
              <Text style={s.stepText}>Pay the remaining balance at the clinic</Text>
            </View>
          </View>

          <TouchableOpacity
            style={s.dashboardBtn}
            onPress={() => router.replace("/patient/dashboard" as any)}
            activeOpacity={0.85}
          >
            <Text style={s.dashboardBtnText}>Go to Dashboard →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Payment Form ──
  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#3D0070", "#2F0058", "#220040"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.header}
        >
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backArrow}>‹</Text>
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <Text style={s.title}>Pay Deposit</Text>
              <Text style={s.subtitle}>Secure payment to confirm your booking</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>

        <View style={s.content}>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>ORDER SUMMARY</Text>

            {(quote || dentistNameStr) && (
              <View style={s.summaryDentist}>
                <View style={s.summaryAvatar}>
                  <Text style={s.summaryAvatarText}>
                    {((quote?.dentistName || dentistNameStr || "D").split(" ").pop() || "D")[0]}
                  </Text>
                </View>
                <View>
                  <Text style={s.summaryDentistName}>{quote?.dentistName || dentistNameStr}</Text>
                  <Text style={s.summaryClinic}>{quote?.clinicName || clinicNameStr}</Text>
                </View>
              </View>
            )}

            <View style={s.summaryDivider} />

            <View style={s.summaryRow}>
              <Text style={s.summaryKey}>Treatment Total</Text>
              <Text style={s.summaryValue}>${totalPrice.toLocaleString()}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryKey}>Deposit (10%)</Text>
              <Text style={[s.summaryValue, { color: T.teal, fontWeight: "700" }]}>
                ${depositAmount.toLocaleString()}
              </Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryKey}>Pay at clinic</Text>
              <Text style={[s.summaryValue, { color: T.slateLight }]}>
                ${(totalPrice - depositAmount).toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={s.depositHighlight}>
            <Text style={s.depositLabel}>Amount Due Now</Text>
            <Text style={s.depositAmount}>${depositAmount.toLocaleString()}</Text>
          </View>

          <View style={s.cardForm}>
            <Text style={s.cardFormTitle}>💳 CARD DETAILS</Text>

            <View style={s.field}>
              <Text style={s.fieldLabel}>CARDHOLDER NAME</Text>
              <TextInput
                style={s.input}
                placeholder="John Doe"
                placeholderTextColor={T.slateLight}
                value={card.name}
                onChangeText={(v) => setCard({ ...card, name: v })}
                autoCapitalize="words"
              />
            </View>

            <View style={s.field}>
              <Text style={s.fieldLabel}>CARD NUMBER</Text>
              <TextInput
                style={s.input}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={T.slateLight}
                value={card.number}
                onChangeText={(v) => setCard({ ...card, number: formatCardNumber(v) })}
                keyboardType="number-pad"
                maxLength={19}
              />
            </View>

            <View style={s.fieldRow}>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.fieldLabel}>EXPIRY</Text>
                <TextInput
                  style={s.input}
                  placeholder="MM/YY"
                  placeholderTextColor={T.slateLight}
                  value={card.expiry}
                  onChangeText={(v) => setCard({ ...card, expiry: formatExpiry(v) })}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.fieldLabel}>CVC</Text>
                <TextInput
                  style={s.input}
                  placeholder="123"
                  placeholderTextColor={T.slateLight}
                  value={card.cvc}
                  onChangeText={(v) => setCard({ ...card, cvc: v.replace(/\D/g, "").slice(0, 4) })}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>
          </View>

          <View style={s.securityNote}>
            <Text style={s.securityIcon}>🔒</Text>
            <Text style={s.securityText}>
              Your payment is secured with 256-bit SSL encryption. We never store your card details.
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
          style={[s.payBtn, (!isCardValid || loading) && s.payBtnDisabled]}
          onPress={handlePay}
          disabled={!isCardValid || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={T.white} size="small" />
          ) : (
            <Text style={s.payBtnText}>
              Pay ${depositAmount.toLocaleString()} →
            </Text>
          )}
        </TouchableOpacity>
        <Text style={s.poweredBy}>Powered by Stripe</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  header: {
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18,
  },
  headerRow: {
    flexDirection: "row", alignItems: "center",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },
  headerCenter: { flex: 1, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: "#fff" },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },

  content: { padding: 24, gap: 16 },

  summaryCard: {
    backgroundColor: T.white, borderRadius: 16, padding: 18, gap: 12,
    borderWidth: 1, borderColor: T.border,
  },
  summaryLabel: {
    fontSize: 11, fontWeight: "700", color: T.slate, letterSpacing: 0.8,
  },
  summaryDentist: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.tealLight, alignItems: "center", justifyContent: "center",
  },
  summaryAvatarText: { fontSize: 16, fontWeight: "700", color: T.teal },
  summaryDentistName: { fontSize: 15, fontWeight: "700", color: T.navy },
  summaryClinic: { fontSize: 12, color: T.slate, marginTop: 1 },
  summaryDivider: { height: 1, backgroundColor: T.border },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  summaryKey: { fontSize: 13, color: T.slate },
  summaryValue: { fontSize: 14, fontWeight: "600", color: T.navy },

  depositHighlight: {
    backgroundColor: T.tealLight, borderRadius: 16, padding: 20,
    alignItems: "center", gap: 6,
    borderWidth: 1.5, borderColor: "rgba(74,0,128,0.2)",
  },
  depositLabel: { fontSize: 12, fontWeight: "600", color: T.teal },
  depositAmount: { fontSize: 36, fontWeight: "800", color: T.teal },

  cardForm: {
    backgroundColor: T.white, borderRadius: 16, padding: 18, gap: 14,
    borderWidth: 1, borderColor: T.border,
  },
  cardFormTitle: {
    fontSize: 12, fontWeight: "700", color: T.navy, letterSpacing: 0.5,
  },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 11, fontWeight: "600", color: T.slate, letterSpacing: 0.5,
  },
  fieldRow: { flexDirection: "row", gap: 12 },
  input: {
    backgroundColor: T.bg, borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 13, fontSize: 15, color: T.navy,
    borderWidth: 1, borderColor: T.border,
  },

  securityNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: T.greenLight, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "rgba(22,163,74,0.15)",
  },
  securityIcon: { fontSize: 16, marginTop: 1 },
  securityText: { flex: 1, fontSize: 12, color: "#166534", lineHeight: 18 },

  policyNote: {
    backgroundColor: T.white, borderRadius: 12, padding: 14, gap: 6,
    borderWidth: 1, borderColor: T.border,
  },
  policyTitle: { fontSize: 12, fontWeight: "700", color: T.navy },
  policyText: { fontSize: 12, color: T.slate, lineHeight: 18 },

  bottom: {
    paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 56,
    backgroundColor: T.white, borderTopWidth: 1, borderTopColor: T.border,
    alignItems: "center", gap: 8,
  },
  payBtn: {
    width: "100%", backgroundColor: T.teal, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  payBtnDisabled: { opacity: 0.5 },
  payBtnText: { color: T.white, fontSize: 17, fontWeight: "700" },
  poweredBy: { fontSize: 11, color: T.slateLight },

  successContainer: {
    flex: 1, backgroundColor: T.bg,
    justifyContent: "center", alignItems: "center", paddingHorizontal: 28,
  },
  successContent: { alignItems: "center", width: "100%" },
  successIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: T.green, alignItems: "center", justifyContent: "center",
    marginBottom: 20,
    shadowColor: T.green, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  successIcon: { color: T.white, fontSize: 36, fontWeight: "700" },
  successTitle: { fontSize: 26, fontWeight: "700", color: T.navy, marginBottom: 10 },
  successDesc: {
    fontSize: 14, color: T.slate, textAlign: "center", lineHeight: 22, marginBottom: 24,
  },

  bookingSummary: {
    width: "100%", backgroundColor: T.white, borderRadius: 16, padding: 18, gap: 12,
    borderWidth: 1, borderColor: T.border, marginBottom: 16,
  },
  bookingLabel: {
    fontSize: 11, fontWeight: "700", color: T.green, letterSpacing: 0.8,
  },
  bookingRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  bookingKey: { fontSize: 13, color: T.slate },
  bookingValue: { fontSize: 13, fontWeight: "600", color: T.navy },

  nextSteps: {
    width: "100%", backgroundColor: T.white, borderRadius: 16, padding: 18, gap: 12,
    borderWidth: 1, borderColor: T.border, marginBottom: 24,
  },
  nextStepsTitle: { fontSize: 14, fontWeight: "700", color: T.navy },
  stepItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: T.tealLight, alignItems: "center", justifyContent: "center",
  },
  stepDotText: { fontSize: 11, fontWeight: "700", color: T.teal },
  stepText: { flex: 1, fontSize: 13, color: T.slate, lineHeight: 18 },

  dashboardBtn: {
    width: "100%", backgroundColor: T.teal, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  dashboardBtnText: { color: T.white, fontSize: 16, fontWeight: "700" },
});
