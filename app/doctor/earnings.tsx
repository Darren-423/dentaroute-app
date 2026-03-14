import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { Booking, DoctorTier, Review, TIER_CONFIG, store } from "../../lib/store";

const T = {
  teal: "#0f766e",
  bg: "#f8fafc", white: "#fff",
  text: "#0f172a", textSec: "#64748b", textMuted: "#94a3b8",
  border: "#e2e8f0",
  green: "#16a34a", greenBg: "rgba(22,163,74,0.08)",
  amber: "#f59e0b", amberBg: "rgba(245,158,11,0.08)",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const formatCompact = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 100_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
};

interface EarningEntry {
  bookingId: string;
  caseId: string;
  patientName: string;
  type: "deposit" | "payment";
  amount: number;
  fee: number;
  date: string;
}

export default function DoctorEarningsScreen() {
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [allEntries, setAllEntries] = useState<EarningEntry[]>([]);
  const [totalAllTime, setTotalAllTime] = useState(0);
  const [activeCases, setActiveCases] = useState(0);
  const [paidCases, setPaidCases] = useState(0);
  const [currentFeeRate, setCurrentFeeRate] = useState(0.20);
  const [tierLabel, setTierLabel] = useState("Standard");
  const [tierColor, setTierColor] = useState("#78716c");
  const [currentTier, setCurrentTier] = useState<DoctorTier>("standard");
  const [reviewStats, setReviewStats] = useState({ total: 0, verified: 0, avgRating: 0 });

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const bookings = await store.getBookings();
        const cases = await store.getCases();

        // Load doctor tier info
        const dp = await store.getDoctorProfile();
        let profileFeeRate = 0.20;
        if (dp) {
          const tier = (dp.tier || "standard") as DoctorTier;
          const cfg = TIER_CONFIG[tier] || TIER_CONFIG.standard;
          profileFeeRate = dp.platformFeeRate || cfg.feeRate;
          setCurrentFeeRate(profileFeeRate);
          setTierLabel(cfg.label);
          setTierColor(cfg.color);
          setCurrentTier(tier);

          // Review stats
          const reviews: Review[] = await store.getReviewsForDentist(dp.fullName || dp.name || "");
          const verifiedReviews = reviews.filter((r: Review) => r.verified);
          const avgRating = reviews.length > 0
            ? reviews.reduce((s: number, r: Review) => s + r.rating, 0) / reviews.length : 0;
          setReviewStats({ total: reviews.length, verified: verifiedReviews.length, avgRating });
        }

        let allTotal = 0;
        let paid = 0;
        const earningList: EarningEntry[] = [];

        bookings.forEach((bk: Booking) => {
          const caseInfo = cases.find((c) => c.id === bk.caseId);
          const name = caseInfo?.patientName || "Patient";
          const feeRate = bk.platformFeeRate || profileFeeRate;
          const doctorShare = 1 - feeRate;

          // Deposit (doctor receives tier-based share)
          if (bk.depositPaid > 0) {
            const doctorAmt = Math.round(bk.depositPaid * doctorShare);
            const fee = bk.depositPaid - doctorAmt;
            allTotal += doctorAmt;
            earningList.push({
              bookingId: bk.id, caseId: bk.caseId, patientName: name,
              type: "deposit", amount: doctorAmt, fee, date: bk.createdAt,
            });
          }

          // Final payment (doctor sees undiscounted amount, platform absorbs 5% discount)
          if (bk.finalInvoice) {
            const rawAmt = bk.finalInvoice.totalAmount - (bk.depositPaid || 0);
            if (rawAmt > 0) {
              const doctorAmt = Math.round(rawAmt * doctorShare);
              const fee = rawAmt - doctorAmt;
              allTotal += doctorAmt;
              const invoiceDate = bk.finalInvoice.createdAt || bk.createdAt;
              earningList.push({
                bookingId: bk.id, caseId: bk.caseId, patientName: name,
                type: "payment", amount: doctorAmt, fee, date: invoiceDate,
              });
            }
          }

          if (bk.status === "payment_complete") paid++;
        });

        earningList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setTotalAllTime(allTotal);
        setAllEntries(earningList);
        setActiveCases(bookings.length);
        setPaidCases(paid);
      };
      load();
    }, [])
  );

  // Derived: selected month data
  const monthEntries = useMemo(() =>
    allEntries.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === selMonth && d.getFullYear() === selYear;
    }),
    [allEntries, selMonth, selYear]
  );
  const monthTotal = monthEntries.reduce((sum, e) => sum + e.amount, 0);
  const monthDeposits = monthEntries.filter(e => e.type === "deposit").reduce((sum, e) => sum + e.amount, 0);
  const monthPayments = monthEntries.filter(e => e.type === "payment").reduce((sum, e) => sum + e.amount, 0);
  const monthFees = monthEntries.reduce((sum, e) => sum + e.fee, 0);

  const isCurrentMonth = selMonth === now.getMonth() && selYear === now.getFullYear();

  const goPrev = () => {
    if (selMonth === 0) { setSelMonth(11); setSelYear(y => y - 1); }
    else setSelMonth(m => m - 1);
  };
  const goNext = () => {
    if (isCurrentMonth) return;
    if (selMonth === 11) { setSelMonth(0); setSelYear(y => y + 1); }
    else setSelMonth(m => m + 1);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={["#0f766e", "#134e4a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerGradient}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={s.headerTitle}>Earnings</Text>
          <View style={[s.tierBadge, { backgroundColor: tierColor }]}>
            <Text style={s.tierBadgeText}>{tierLabel} Tier</Text>
          </View>
        </View>

        {/* Month navigator */}
        <View style={s.monthNav}>
          <TouchableOpacity onPress={goPrev} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.monthArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.monthLabel}>{MONTHS[selMonth]} {selYear}</Text>
          <TouchableOpacity onPress={goNext} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} disabled={isCurrentMonth}>
            <Text style={[s.monthArrow, isCurrentMonth && { opacity: 0.2 }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Big number */}
        <View style={s.bigNumSection}>
          <Text style={s.bigNum}>${monthTotal.toLocaleString()}</Text>
        </View>

        {/* Summary cards */}
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryVal}>{formatCompact(totalAllTime)}</Text>
            <Text style={s.summaryLabel}>All Time</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryVal}>{activeCases}</Text>
            <Text style={s.summaryLabel}>Active</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryVal}>{paidCases}</Text>
            <Text style={s.summaryLabel}>Completed</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Breakdown */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>BREAKDOWN</Text>
          <View style={s.breakdownCard}>
            <View style={s.breakdownRow}>
              <Text style={s.breakdownIcon}>💳</Text>
              <Text style={s.breakdownLabel}>Deposits Received</Text>
              <Text style={[s.breakdownVal, { color: T.green }]}>${monthDeposits.toLocaleString()}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.breakdownRow}>
              <Text style={s.breakdownIcon}>🏦</Text>
              <Text style={s.breakdownLabel}>Treatment Payments</Text>
              <Text style={[s.breakdownVal, { color: T.green }]}>${monthPayments.toLocaleString()}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.breakdownRow}>
              <Text style={s.breakdownIcon}>🏢</Text>
              <Text style={s.breakdownLabel}>Platform Fee ({tierLabel} {Math.round(currentFeeRate * 100)}%)</Text>
              <Text style={[s.breakdownVal, { color: T.amber }]}>-${monthFees.toLocaleString()}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.breakdownRow}>
              <Text style={s.breakdownIcon}>📊</Text>
              <Text style={s.breakdownLabel}>Net Revenue</Text>
              <Text style={[s.breakdownVal, { color: T.text, fontWeight: "800" }]}>${monthTotal.toLocaleString()}</Text>
            </View>
          </View>
          <Text style={s.tierNote}>Tier updates monthly based on your revenue</Text>
        </View>

        {/* Tier Progress */}
        {currentTier !== "gold" && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>TIER PROGRESS</Text>
            <View style={s.tierCard}>
              <View style={s.tierProgressRow}>
                {(["standard", "silver", "gold"] as DoctorTier[]).map((t, i) => {
                  const cfg = TIER_CONFIG[t];
                  const isActive = t === currentTier;
                  const isPast = (["standard", "silver", "gold"].indexOf(currentTier) >= i);
                  return (
                    <View key={t} style={s.tierStep}>
                      <View style={[s.tierDot, isPast && { backgroundColor: cfg.color }, isActive && s.tierDotActive]}>
                        <Text style={s.tierDotText}>{isActive ? "●" : isPast ? "✓" : ""}</Text>
                      </View>
                      <Text style={[s.tierStepLabel, isActive && { fontWeight: "700", color: "#0f172a" }]}>{cfg.label}</Text>
                      <Text style={s.tierStepFee}>{Math.round(cfg.feeRate * 100)}% fee</Text>
                    </View>
                  );
                })}
              </View>
              <View style={s.tierProgressBar}>
                <View style={[s.tierProgressFill, {
                  width: currentTier === "gold" ? "100%" : currentTier === "silver" ? "50%" : "10%",
                  backgroundColor: TIER_CONFIG[currentTier].color,
                }]} />
              </View>
              <Text style={s.tierProgressHint}>
                {currentTier === "standard"
                  ? "💡 Increase bookings to reach Silver tier and save 2% on every transaction"
                  : "💡 Keep growing to reach Gold tier and save an additional 3% on fees"}
              </Text>
            </View>
          </View>
        )}

        {/* Platform Value */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>PLATFORM VALUE</Text>
          <View style={s.valueCard}>
            <View style={s.valueRow}>
              <Text style={s.valueIcon}>⭐</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.valueLabel}>Verified Reviews</Text>
                <Text style={s.valueDesc}>{reviewStats.verified} verified / {reviewStats.total} total{reviewStats.avgRating > 0 ? ` • ${reviewStats.avgRating.toFixed(1)} avg` : ""}</Text>
              </View>
            </View>
            <View style={s.valueDivider} />
            <View style={s.valueRow}>
              <Text style={s.valueIcon}>🛡️</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.valueLabel}>Treatment Warranty</Text>
                <Text style={s.valueDesc}>Up to 5-year warranty for your patients, building long-term trust</Text>
              </View>
            </View>
            <View style={s.valueDivider} />
            <View style={s.valueRow}>
              <Text style={s.valueIcon}>🇺🇸</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.valueLabel}>US Aftercare Network</Text>
                <Text style={s.valueDesc}>5 partner clinics across the US provide aftercare for your patients</Text>
              </View>
            </View>
            <View style={s.valueDivider} />
            <View style={s.valueRow}>
              <Text style={s.valueIcon}>🔒</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.valueLabel}>Secure Payments</Text>
                <Text style={s.valueDesc}>Escrow-protected deposits and guaranteed payment collection</Text>
              </View>
            </View>
            <View style={s.valueDivider} />
            <View style={s.valueRow}>
              <Text style={s.valueIcon}>🌍</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.valueLabel}>Global Patient Access</Text>
                <Text style={s.valueDesc}>Reach international patients you wouldn't find through other channels</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Transaction history */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>TRANSACTION HISTORY</Text>
          {monthEntries.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>💰</Text>
              <Text style={s.emptyTitle}>No earnings this month</Text>
              <Text style={s.emptyDesc}>Earnings will appear here when patients book and pay</Text>
            </View>
          ) : (
            monthEntries.map((e, i) => (
              <View key={`${e.bookingId}_${e.type}_${i}`} style={s.txCard}>
                <View style={[s.txIcon, e.type === "deposit" ? { backgroundColor: T.amberBg } : { backgroundColor: T.greenBg }]}>
                  <Text style={{ fontSize: 16 }}>{e.type === "deposit" ? "💳" : "🏦"}</Text>
                </View>
                <View style={s.txInfo}>
                  <Text style={s.txName}>{e.patientName}</Text>
                  <Text style={s.txMeta}>
                    Case #{e.caseId} • {e.type === "deposit" ? "Deposit" : "Payment"}
                  </Text>
                  <Text style={s.txDate}>{formatDate(e.date)}</Text>
                </View>
                <Text style={s.txAmount}>+${e.amount.toLocaleString()}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  // ── Header ──
  headerGradient: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24 },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: T.white },
  tierBadge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  tierBadgeText: { fontSize: 10, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },

  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginTop: 20, gap: 16,
  },
  monthArrow: { fontSize: 28, fontWeight: "300", color: T.white },
  monthLabel: {
    fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.7)",
    minWidth: 80, textAlign: "center",
  },

  bigNumSection: { marginTop: 8, alignItems: "center" },
  bigNum: { fontSize: 42, fontWeight: "800", color: T.white },

  summaryRow: { flexDirection: "row", gap: 8, marginTop: 20 },
  summaryCard: {
    flex: 1, borderRadius: 12, padding: 12, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  summaryVal: { fontSize: 18, fontWeight: "700", color: T.white },
  summaryLabel: { fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 2 },

  // ── Content area ──
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },

  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: T.textSec,
    letterSpacing: 0.8, marginBottom: 10,
  },

  breakdownCard: {
    backgroundColor: T.white, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 4,
    borderWidth: 1, borderColor: T.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  breakdownRow: {
    flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14,
  },
  breakdownIcon: { fontSize: 16, width: 24, textAlign: "center" },
  breakdownLabel: { flex: 1, fontSize: 13, color: T.textSec },
  breakdownVal: { fontSize: 14, fontWeight: "700", color: T.green },
  divider: { height: 1, backgroundColor: T.border },
  tierNote: { fontSize: 11, color: T.textMuted, textAlign: "center", marginTop: 8, fontStyle: "italic" },

  txCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: T.white, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: T.border, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  txIcon: {
    width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  txInfo: { flex: 1, gap: 2 },
  txName: { fontSize: 14, fontWeight: "600", color: T.text },
  txMeta: { fontSize: 11, color: T.textMuted },
  txDate: { fontSize: 11, color: T.textMuted },
  txAmount: { fontSize: 15, fontWeight: "700", color: T.green },

  empty: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: T.textSec, marginBottom: 4 },
  emptyDesc: { fontSize: 13, color: T.textMuted, textAlign: "center" },

  // ── Tier Progress ──
  tierCard: {
    backgroundColor: T.white, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: T.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  tierProgressRow: {
    flexDirection: "row", justifyContent: "space-between", marginBottom: 16,
  },
  tierStep: { alignItems: "center", flex: 1, gap: 4 },
  tierDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "transparent",
  },
  tierDotActive: { borderColor: T.teal, borderWidth: 2 },
  tierDotText: { fontSize: 10, color: "#fff", fontWeight: "800" },
  tierStepLabel: { fontSize: 12, color: T.textMuted, fontWeight: "500" },
  tierStepFee: { fontSize: 10, color: T.textMuted },
  tierProgressBar: {
    height: 6, backgroundColor: "#f1f5f9", borderRadius: 3, overflow: "hidden", marginBottom: 12,
  },
  tierProgressFill: { height: "100%", borderRadius: 3 },
  tierProgressHint: { fontSize: 11, color: T.textSec, textAlign: "center", lineHeight: 16 },

  // ── Platform Value ──
  valueCard: {
    backgroundColor: T.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4,
    borderWidth: 1, borderColor: T.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  valueRow: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14,
  },
  valueIcon: { fontSize: 20, width: 28, textAlign: "center" },
  valueLabel: { fontSize: 13, fontWeight: "600", color: T.text },
  valueDesc: { fontSize: 11, color: T.textMuted, lineHeight: 16, marginTop: 2 },
  valueDivider: { height: 1, backgroundColor: T.border },
});
