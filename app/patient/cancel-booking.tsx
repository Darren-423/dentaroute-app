import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Booking, getRefundInfo, store } from "../../lib/store";

/* ── Palette: monochrome + single warm accent ── */
const C = {
  bg: "#f6f7f9",
  card: "#ffffff",
  navy: "#0f172a",
  text: "#1e293b",
  sub: "#64748b",
  muted: "#94a3b8",
  faint: "#cbd5e1",
  border: "#e8ecf1",
  accent: "#b91c1c",       // warm, serious red — the ONLY color accent
  accentSoft: "#fef2f2",
  accentMid: "#dc2626",
  overlay: "rgba(15,23,42,0.04)",
};

const REASONS = [
  "Changed my mind",
  "Found another dentist",
  "Travel plans changed",
  "Financial reasons",
  "Medical reasons",
  "Other",
];

export default function CancelBookingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [refund, setRefund] = useState<{ percent: number; amount: number; tier: "full" | "partial" | "none" }>({ percent: 0, amount: 0, tier: "none" });

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;
      const bk = await store.getBooking(bookingId);
      if (bk) {
        setBooking(bk);
        setRefund(getRefundInfo(bk));
      }
      setLoading(false);
    };
    load();
  }, [bookingId]);

  const handleCancel = () => {
    if (!selectedReason) {
      Alert.alert("Select a Reason", "Please select a reason for cancellation.");
      return;
    }

    const msg = refund.amount > 0
      ? `You will receive a $${refund.amount} refund (${refund.percent}% of your $${booking?.depositPaid} deposit). This action cannot be undone.`
      : `No refund is available for this cancellation. Your $${booking?.depositPaid} deposit will not be returned. This action cannot be undone.`;

    Alert.alert(
      "Confirm Cancellation",
      msg,
      [
        { text: "Keep Booking", style: "cancel" },
        {
          text: "Cancel Booking",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              await store.cancelBooking(bookingId!, selectedReason);
              setCancelled(true);
            } catch {}
            setCancelling(false);
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.sub} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: C.sub, fontSize: 16 }}>Booking not found</Text>
      </View>
    );
  }

  /* ════════ Success state ════════ */
  if (cancelled) {
    return (
      <View style={s.container}>
        <LinearGradient colors={["#3D0070", "#2F0058", "#220040"]} style={s.header}>
          <View style={s.headerRow}>
            <View style={{ width: 36 }} />
            <View style={s.headerCenter}>
              <Text style={s.headerTitle}>Cancellation Complete</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>

        <View style={s.successWrap}>
          <View style={s.successIcon}>
            <Text style={s.successIconText}>✓</Text>
          </View>
          <Text style={s.successTitle}>Booking Cancelled</Text>
          <Text style={s.successDesc}>
            Your booking with {booking.clinicName} has been cancelled.
          </Text>

          <View style={s.successRefundBox}>
            {refund.amount > 0 ? (
              <>
                <Text style={s.successRefundLabel}>Refund amount</Text>
                <Text style={s.successRefundAmount}>${refund.amount}</Text>
                <Text style={s.successRefundNote}>
                  Will be returned to your original payment method
                </Text>
              </>
            ) : (
              <>
                <Text style={s.successRefundLabel}>Refund</Text>
                <Text style={[s.successRefundAmount, { fontSize: 20 }]}>Not applicable</Text>
                <Text style={s.successRefundNote}>
                  Cancellation was within 3 days of your visit
                </Text>
              </>
            )}
          </View>

          <TouchableOpacity
            style={s.successPrimaryBtn}
            onPress={() => router.replace("/patient/dashboard" as any)}
            activeOpacity={0.85}
          >
            <Text style={s.successPrimaryText}>Back to Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.successSecondaryBtn}
            onPress={() => router.replace(`/patient/quotes?caseId=${booking.caseId}` as any)}
            activeOpacity={0.7}
          >
            <Text style={s.successSecondaryText}>View Other Quotes</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ════════ Main form ════════ */
  const firstVisitDate = booking.visitDates?.[0]?.date;
  const daysUntil = firstVisitDate
    ? Math.ceil((new Date(firstVisitDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const TIERS = [
    { tier: "full" as const, window: "7+ days before", pct: "100%", note: "Full deposit refund" },
    { tier: "partial" as const, window: "3–7 days before", pct: "50%", note: "Half deposit refund" },
    { tier: "none" as const, window: "Less than 3 days", pct: "0%", note: "No refund" },
  ];

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient colors={["#3D0070", "#2F0058", "#220040"]} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.backArrow}>{"<"}</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Cancel Booking</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Booking summary ── */}
        <View style={s.card}>
          <View style={s.clinicRow}>
            <View style={s.clinicIcon}>
              <Text style={{ fontSize: 18 }}>🏥</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.clinicName}>{booking.dentistName}</Text>
              <Text style={s.clinicSub}>{booking.clinicName}</Text>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.detailGrid}>
            <View style={s.detailCell}>
              <Text style={s.detailLabel}>Deposit</Text>
              <Text style={s.detailVal}>${booking.depositPaid}</Text>
            </View>
            <View style={s.detailCell}>
              <Text style={s.detailLabel}>Total</Text>
              <Text style={s.detailVal}>${booking.totalPrice.toLocaleString()}</Text>
            </View>
            {firstVisitDate && (
              <View style={s.detailCell}>
                <Text style={s.detailLabel}>First Visit</Text>
                <Text style={s.detailVal}>{firstVisitDate}</Text>
              </View>
            )}
            {daysUntil !== null && (
              <View style={s.detailCell}>
                <Text style={s.detailLabel}>Days Left</Text>
                <Text style={[s.detailVal, { fontWeight: "800" }]}>
                  {daysUntil}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Refund policy ── */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Refund Policy</Text>

          {TIERS.map((t) => {
            const active = refund.tier === t.tier;
            return (
              <View key={t.tier} style={[s.tierRow, active && s.tierRowActive]}>
                {active && <View style={s.tierAccent} />}
                <View style={{ flex: 1, paddingLeft: active ? 0 : 4 }}>
                  <Text style={[s.tierWindow, active && s.tierWindowActive]}>{t.window}</Text>
                  <Text style={[s.tierNote, active && s.tierNoteActive]}>{t.note}</Text>
                </View>
                <Text style={[s.tierPct, active && s.tierPctActive]}>{t.pct}</Text>
              </View>
            );
          })}

          {/* Your refund summary */}
          <View style={s.refundSummary}>
            <Text style={s.refundSummaryLabel}>Your refund</Text>
            <Text style={s.refundSummaryVal}>
              ${refund.amount}{" "}
              <Text style={s.refundSummaryOf}>of ${booking.depositPaid}</Text>
            </Text>
          </View>
        </View>

        {/* ── Reason ── */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Reason for Cancellation</Text>
          <View style={s.reasonGrid}>
            {REASONS.map((r) => {
              const sel = selectedReason === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[s.reasonChip, sel && s.reasonChipSel]}
                  onPress={() => setSelectedReason(r)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.reasonText, sel && s.reasonTextSel]}>{r}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Warning ── */}
        <View style={s.warningRow}>
          <View style={s.warningDot} />
          <Text style={s.warningText}>
            This action cannot be undone. You'll need to accept a new quote to rebook.
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Bottom actions ── */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={[s.cancelBtn, !selectedReason && { opacity: 0.4 }]}
          onPress={handleCancel}
          disabled={cancelling || !selectedReason}
          activeOpacity={0.85}
        >
          {cancelling ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.cancelBtnText}>Cancel Booking</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={s.keepBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.keepBtnText}>Keep My Booking</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════ */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  /* ── Header ── */
  header: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 20, color: "#fff", fontWeight: "600" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#fff", letterSpacing: 0.1 },

  /* ── Scroll ── */
  scrollContent: { padding: 20, gap: 14, paddingBottom: 20 },

  /* ── Card ── */
  card: {
    backgroundColor: C.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: C.border,
  },
  sectionLabel: {
    fontSize: 13, fontWeight: "700", color: C.navy,
    letterSpacing: 0.2, marginBottom: 16,
  },

  /* ── Booking summary ── */
  clinicRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  clinicIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.overlay, alignItems: "center", justifyContent: "center",
  },
  clinicName: { fontSize: 15, fontWeight: "700", color: C.navy },
  clinicSub: { fontSize: 12, color: C.sub, marginTop: 2 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  detailGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 0,
  },
  detailCell: {
    width: "50%", paddingVertical: 6,
  },
  detailLabel: { fontSize: 11, color: C.muted, fontWeight: "500", marginBottom: 3 },
  detailVal: { fontSize: 15, fontWeight: "600", color: C.navy },

  /* ── Refund tiers ── */
  tierRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 4,
    borderRadius: 10, marginBottom: 4,
  },
  tierRowActive: {
    backgroundColor: C.overlay,
    paddingHorizontal: 14,
  },
  tierAccent: {
    width: 3, height: 28, borderRadius: 2,
    backgroundColor: C.navy, marginRight: 12,
  },
  tierWindow: { fontSize: 13, color: C.muted, fontWeight: "500" },
  tierWindowActive: { color: C.navy, fontWeight: "600" },
  tierNote: { fontSize: 11, color: C.faint, marginTop: 1 },
  tierNoteActive: { color: C.sub },
  tierPct: { fontSize: 17, fontWeight: "700", color: C.faint },
  tierPctActive: { color: C.navy },

  refundSummary: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  refundSummaryLabel: { fontSize: 13, fontWeight: "600", color: C.sub },
  refundSummaryVal: { fontSize: 18, fontWeight: "800", color: C.navy },
  refundSummaryOf: { fontSize: 13, fontWeight: "400", color: C.muted },

  /* ── Reasons ── */
  reasonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reasonChip: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.card,
  },
  reasonChipSel: {
    borderColor: C.navy, backgroundColor: C.navy,
  },
  reasonText: { fontSize: 13, color: C.sub, fontWeight: "500" },
  reasonTextSel: { color: "#fff", fontWeight: "600" },

  /* ── Warning ── */
  warningRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingHorizontal: 4,
  },
  warningDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: C.muted, marginTop: 6,
  },
  warningText: { fontSize: 12, color: C.muted, lineHeight: 18, flex: 1 },

  /* ── Bottom bar ── */
  bottomBar: {
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.card,
    gap: 10,
  },
  cancelBtn: {
    backgroundColor: C.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  cancelBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  keepBtn: { alignItems: "center", paddingVertical: 10 },
  keepBtnText: { color: C.sub, fontSize: 14, fontWeight: "600" },

  /* ── Success state ── */
  successWrap: {
    flex: 1, justifyContent: "center", alignItems: "center", padding: 32,
  },
  successIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.overlay, alignItems: "center", justifyContent: "center",
    marginBottom: 24, borderWidth: 2, borderColor: C.border,
  },
  successIconText: { fontSize: 28, color: C.navy, fontWeight: "700" },
  successTitle: { fontSize: 22, fontWeight: "700", color: C.navy, marginBottom: 6 },
  successDesc: { fontSize: 14, color: C.sub, textAlign: "center", lineHeight: 22 },
  successRefundBox: {
    alignItems: "center", paddingVertical: 24, paddingHorizontal: 32,
    borderRadius: 16, marginTop: 28, width: "100%",
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
  },
  successRefundLabel: { fontSize: 12, color: C.muted, fontWeight: "500", marginBottom: 6 },
  successRefundAmount: { fontSize: 32, fontWeight: "800", color: C.navy, marginBottom: 4 },
  successRefundNote: { fontSize: 12, color: C.sub, textAlign: "center", lineHeight: 18 },
  successPrimaryBtn: {
    backgroundColor: C.navy, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
    marginTop: 28, width: "100%",
  },
  successPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  successSecondaryBtn: { marginTop: 12, paddingVertical: 10 },
  successSecondaryText: { color: C.sub, fontSize: 14, fontWeight: "600" },
});
