import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { DentistQuote, ServiceTier, store } from "../../lib/store";
import { PatientTheme, SharedColors } from "../../constants/theme";

export default function CardPaymentScreen() {
  const params = useLocalSearchParams<{
    quoteId: string; caseId: string;
    totalPrice: string; dentistName: string; clinicName: string;
    visitDatesJson: string; selectedTier: string;
    serviceFee: string; tierLabel: string;
  }>();

  const getParam = (key: string): string => {
    const v = (params as any)[key];
    if (Array.isArray(v)) return v[0] || "";
    return v || "";
  };

  const quoteId = getParam("quoteId");
  const caseId = getParam("caseId");
  const totalPrice = parseInt(getParam("totalPrice")) || 0;
  const dentistName = getParam("dentistName");
  const clinicName = getParam("clinicName");
  const selectedTier = (getParam("selectedTier") || "standard") as ServiceTier;
  const serviceFee = parseInt(getParam("serviceFee")) || 0;
  const tierLabel = getParam("tierLabel") || "Standard";
  const visitDates = (() => {
    try { return JSON.parse(getParam("visitDatesJson") || "[]"); } catch { return []; }
  })();

  const [quote, setQuote] = useState<DentistQuote | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (quoteId && caseId) {
      store.getQuotesForCase(caseId).then((quotes) => {
        const found = quotes.find((q: any) => q.id === quoteId);
        if (found) setQuote(found);
      });
    }
  }, [quoteId, caseId]);

  const formatCardNumber = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const rawCardDigits = cardNumber.replace(/\s/g, "");
  const rawExpiryDigits = expiry.replace(/\//g, "");
  const isValid =
    rawCardDigits.length === 16 &&
    rawExpiryDigits.length === 4 &&
    cvv.length >= 3 &&
    cardName.trim().length >= 2;

  const handlePayment = async () => {
    if (!isValid) return;
    setLoading(true);
    setTimeout(async () => {
      if (caseId) {
        await store.updateCaseStatus(caseId, "booked");
        await store.createBooking({
          caseId,
          quoteId: quoteId || "",
          dentistName,
          clinicName,
          serviceTier: selectedTier,
          serviceFee,
          totalPrice,
          treatments: quote?.treatments || [],
          visitDates,
          status: "confirmed",
        });
      }
      setLoading(false);
      setPaid(true);
    }, 2000);
  };

  // ── Success Screen ──
  if (paid) {
    return (
      <View style={s.successContainer}>
        <View style={s.successContent}>
          <View style={s.successIconWrap}>
            <Text style={s.successIcon}>✓</Text>
          </View>
          <Text style={s.successTitle}>Payment Complete!</Text>
          <Text style={s.successDesc}>
            Your booking is confirmed.{"\n"}
            {tierLabel} plan (${serviceFee}) has been processed.
          </Text>

          <View style={s.bookingSummary}>
            <Text style={s.bookingLabel}>BOOKING CONFIRMED</Text>
            <View style={s.bookingRow}>
              <Text style={s.bookingKey}>Dentist</Text>
              <Text style={s.bookingVal}>{dentistName}</Text>
            </View>
            <View style={s.bookingRow}>
              <Text style={s.bookingKey}>Clinic</Text>
              <Text style={s.bookingVal}>{clinicName}</Text>
            </View>
            <View style={s.bookingRow}>
              <Text style={s.bookingKey}>Service Plan</Text>
              <Text style={[s.bookingVal, { color: PatientTheme.primary, fontWeight: "700" }]}>
                {tierLabel} — ${serviceFee}
              </Text>
            </View>
            <View style={s.bookingRow}>
              <Text style={s.bookingKey}>Card</Text>
              <Text style={s.bookingVal}>•••• {rawCardDigits.slice(-4)}</Text>
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

  // ── Card Entry Form ──
  return (
    <View style={s.container}>
      <LinearGradient
        colors={[...PatientTheme.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.title}>Payment</Text>
            <Text style={s.subtitle}>Enter your card details</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Card Form */}
        <View style={s.formCard}>
          <View style={s.fieldGroup}>
            <Text style={s.label}>Card Number</Text>
            <TextInput
              style={s.input}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={SharedColors.slateLight}
              value={cardNumber}
              onChangeText={(t) => setCardNumber(formatCardNumber(t))}
              keyboardType="number-pad"
              maxLength={19}
            />
          </View>

          <View style={s.row}>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <Text style={s.label}>Expiry Date</Text>
              <TextInput
                style={s.input}
                placeholder="MM/YY"
                placeholderTextColor={SharedColors.slateLight}
                value={expiry}
                onChangeText={(t) => setExpiry(formatExpiry(t))}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <Text style={s.label}>CVV</Text>
              <TextInput
                style={s.input}
                placeholder="123"
                placeholderTextColor={SharedColors.slateLight}
                value={cvv}
                onChangeText={(t) => setCvv(t.replace(/\D/g, "").slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />
            </View>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>Cardholder Name</Text>
            <TextInput
              style={s.input}
              placeholder="Name on card"
              placeholderTextColor={SharedColors.slateLight}
              value={cardName}
              onChangeText={setCardName}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Amount Summary */}
        <View style={s.amountCard}>
          <View style={s.amountRow}>
            <Text style={s.amountLabel}>{tierLabel} Plan</Text>
            <Text style={s.amountValue}>${serviceFee}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.amountRow}>
            <Text style={[s.amountLabel, { fontWeight: "700", color: SharedColors.navy }]}>Total</Text>
            <Text style={[s.amountValue, { fontWeight: "800", color: PatientTheme.primary, fontSize: 20 }]}>${serviceFee}</Text>
          </View>
        </View>

        <View style={s.secureNote}>
          <Text style={s.lockIcon}>🔒</Text>
          <Text style={s.secureText}>Your payment is encrypted and secure</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Pay Button */}
      <View style={s.bottom}>
        <TouchableOpacity
          style={[s.payBtn, !isValid && s.payBtnDisabled]}
          onPress={handlePayment}
          disabled={!isValid || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={SharedColors.white} size="small" />
          ) : (
            <Text style={s.payBtnText}>Pay ${serviceFee} — {tierLabel}</Text>
          )}
        </TouchableOpacity>
        <Text style={s.poweredBy}>Powered by Stripe</Text>
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

  content: { padding: 20, gap: 16 },

  formCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 20, gap: 16,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  fieldGroup: { gap: 6 },
  label: { fontSize: 12, fontWeight: "600", color: SharedColors.slate },
  input: {
    backgroundColor: SharedColors.bg, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: SharedColors.navy, fontWeight: "500",
    borderWidth: 1, borderColor: SharedColors.border,
  },
  row: { flexDirection: "row", gap: 12 },

  amountCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 18, gap: 12,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  amountLabel: { fontSize: 14, color: SharedColors.slate },
  amountValue: { fontSize: 16, fontWeight: "700", color: SharedColors.navy },
  divider: { height: 1, backgroundColor: SharedColors.border },

  secureNote: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
  },
  lockIcon: { fontSize: 14 },
  secureText: { fontSize: 12, color: SharedColors.slateLight },

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
  payBtnDisabled: { opacity: 0.45 },
  payBtnText: { color: SharedColors.white, fontSize: 17, fontWeight: "700" },
  poweredBy: { fontSize: 11, color: SharedColors.slateLight },

  // Success screen
  successContainer: {
    flex: 1, backgroundColor: SharedColors.bg,
    justifyContent: "center", alignItems: "center", paddingHorizontal: 28,
  },
  successContent: { alignItems: "center", width: "100%" },
  successIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: SharedColors.green, alignItems: "center", justifyContent: "center",
    marginBottom: 20,
    shadowColor: SharedColors.green, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  successIcon: { color: SharedColors.white, fontSize: 36, fontWeight: "700" },
  successTitle: { fontSize: 26, fontWeight: "700", color: SharedColors.navy, marginBottom: 10 },
  successDesc: {
    fontSize: 14, color: SharedColors.slate, textAlign: "center", lineHeight: 22, marginBottom: 24,
  },
  bookingSummary: {
    width: "100%", backgroundColor: SharedColors.white, borderRadius: 16, padding: 18, gap: 12,
    borderWidth: 1, borderColor: SharedColors.border, marginBottom: 24,
  },
  bookingLabel: { fontSize: 11, fontWeight: "700", color: SharedColors.green, letterSpacing: 0.8 },
  bookingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bookingKey: { fontSize: 13, color: SharedColors.slate },
  bookingVal: { fontSize: 13, fontWeight: "600", color: SharedColors.navy },
  dashboardBtn: {
    width: "100%", backgroundColor: PatientTheme.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  dashboardBtnText: { color: SharedColors.white, fontSize: 16, fontWeight: "700" },
});
