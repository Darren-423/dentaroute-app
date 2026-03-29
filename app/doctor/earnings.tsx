import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { Booking, DoctorTier, TIER_CONFIG, store } from "../../lib/store";

import { DoctorTheme, SharedColors } from "../../constants/theme";
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
  type: "payment";
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
        }

        let allTotal = 0;
        let paid = 0;
        const earningList: EarningEntry[] = [];

        bookings.forEach((bk: Booking) => {
          const caseInfo = cases.find((c) => c.id === bk.caseId);
          const name = caseInfo?.patientName || "Patient";
          const feeRate = bk.platformFeeRate || profileFeeRate;
          const doctorShare = 1 - feeRate;

          // Treatment payment (doctor receives tier-based share of total treatment cost)
          if (bk.finalInvoice) {
            const rawAmt = bk.finalInvoice.totalAmount;
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
  const monthPayments = monthEntries.reduce((sum, e) => sum + e.amount, 0);
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

  // ── 6-month trend data ──
  const trendData = useMemo(() => {
    const months: { label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      let m = now.getMonth() - i;
      let y = now.getFullYear();
      if (m < 0) { m += 12; y -= 1; }
      const total = allEntries
        .filter(e => { const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === y; })
        .reduce((s, e) => s + e.amount, 0);
      months.push({ label: MONTHS[m], total });
    }
    return months;
  }, [allEntries]);
  const trendMax = Math.max(...trendData.map(d => d.total), 1);

  // ── Tier info tooltip ──
  const showTierInfo = () => {
    // Current month revenue (gross, before fee)
    const currentMonthGross = monthEntries.reduce((s, e) => s + e.amount + e.fee, 0);
    const tierThresholds = [
      { tier: "Standard", range: "$0 - $4,999/month", fee: "20%" },
      { tier: "Silver", range: "$5,000 - $14,999/month", fee: "18%" },
      { tier: "Gold", range: "$15,000+/month", fee: "15%" },
    ];
    // Calculate next tier progress
    let nextTierMsg = "You are at the highest tier!";
    if (tierLabel === "Standard") {
      const needed = 5000 - currentMonthGross;
      nextTierMsg = `Next tier (Silver) in: $${Math.max(0, needed).toLocaleString()} more`;
    } else if (tierLabel === "Silver") {
      const needed = 15000 - currentMonthGross;
      nextTierMsg = `Next tier (Gold) in: $${Math.max(0, needed).toLocaleString()} more`;
    }
    Alert.alert(
      "Tier Criteria",
      tierThresholds.map(t => `${t.tier}: ${t.range} (${t.fee} fee)`).join("\n") +
      `\n\nYour current monthly revenue: $${currentMonthGross.toLocaleString()}` +
      `\n${nextTierMsg}`
    );
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[DoctorTheme.primary, DoctorTheme.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerGradient}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={s.headerTitle}>Earnings</Text>
          <View style={[s.tierBadge, { backgroundColor: tierColor }]}>
            <Text style={s.tierBadgeText}>{tierLabel} Tier</Text>
          </View>
          <TouchableOpacity onPress={showTierInfo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View style={s.tierInfoBtn}>
              <Text style={s.tierInfoIcon}>i</Text>
            </View>
          </TouchableOpacity>
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
        {/* 6-Month Trend */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>6-MONTH TREND</Text>
          <View style={s.trendCard}>
            <View style={s.trendBars}>
              {trendData.map((d, i) => {
                const pct = d.total / trendMax;
                return (
                  <View key={d.label + i} style={s.trendCol}>
                    <Text style={s.trendAmt}>{d.total > 0 ? formatCompact(d.total) : "-"}</Text>
                    <View style={s.trendBarBg}>
                      <View style={[s.trendBar, { height: `${Math.max(pct * 100, 4)}%`, opacity: 0.45 + pct * 0.55 }]} />
                    </View>
                    <Text style={s.trendMonth}>{d.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Breakdown */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>BREAKDOWN</Text>
          <View style={s.breakdownCard}>
            <View style={s.breakdownRow}>
              <Text style={s.breakdownIcon}>🏦</Text>
              <Text style={s.breakdownLabel}>Treatment Revenue</Text>
              <Text style={[s.breakdownVal, { color: SharedColors.green }]}>${monthPayments.toLocaleString()}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.breakdownRow}>
              <Text style={s.breakdownIcon}>🏢</Text>
              <Text style={s.breakdownLabel}>Platform Fee ({tierLabel} {Math.round(currentFeeRate * 100)}%)</Text>
              <Text style={[s.breakdownVal, { color: SharedColors.amber }]}>-${monthFees.toLocaleString()}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.breakdownRow}>
              <Text style={s.breakdownIcon}>📊</Text>
              <Text style={s.breakdownLabel}>Net Revenue</Text>
              <Text style={[s.breakdownVal, { color: SharedColors.navy, fontWeight: "800" }]}>${monthTotal.toLocaleString()}</Text>
            </View>
          </View>
          <Text style={s.tierNote}>Tier updates monthly based on your revenue</Text>
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
                <View style={[s.txIcon, { backgroundColor: DoctorTheme.accentSoft }]}>
                  <Text style={{ fontSize: 16 }}>🏦</Text>
                </View>
                <View style={s.txInfo}>
                  <Text style={s.txName}>{e.patientName}</Text>
                  <Text style={s.txMeta}>
                    Case #{e.caseId} • Treatment Payment
                  </Text>
                  <Text style={s.txDate}>{formatDate(e.date)}</Text>
                </View>
                <Text style={s.txAmount}>+${e.amount.toLocaleString()}</Text>
              </View>
            ))
          )}
        </View>

        {/* Settlement section */}
        <View style={{ backgroundColor: "#f0fdfa", borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: "#ccfbf1" }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#0f766e", marginBottom: 6 }}>Settlement</Text>
          <Text style={{ fontSize: 13, color: "#64748b", lineHeight: 19, marginBottom: 12 }}>
            Settlements are processed monthly. Earnings are deposited to your registered account by the 15th of the following month.
          </Text>
          <View style={{ backgroundColor: "#e2e8f0", borderRadius: 10, paddingVertical: 13, alignItems: "center", opacity: 0.6 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#94a3b8" }}>Request Settlement — Coming Soon</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },

  // ── Header ──
  headerGradient: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24 },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  backArrow: { fontSize: 24, color: SharedColors.white, fontWeight: "600", marginTop: -2 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: SharedColors.white },
  tierBadge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  tierBadgeText: { fontSize: 10, fontWeight: "800", color: SharedColors.white, letterSpacing: 0.5 },
  tierInfoBtn: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  tierInfoIcon: { fontSize: 12, fontWeight: "700", color: SharedColors.white, fontStyle: "italic" },

  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginTop: 20, gap: 16,
  },
  monthArrow: { fontSize: 28, fontWeight: "300", color: SharedColors.white },
  monthLabel: {
    fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.7)",
    minWidth: 80, textAlign: "center",
  },

  bigNumSection: { marginTop: 8, alignItems: "center" },
  bigNum: { fontSize: 42, fontWeight: "800", color: SharedColors.white },

  summaryRow: { flexDirection: "row", gap: 8, marginTop: 20 },
  summaryCard: {
    flex: 1, borderRadius: 12, padding: 12, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  summaryVal: { fontSize: 18, fontWeight: "700", color: SharedColors.white },
  summaryLabel: { fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 2 },

  // ── Content area ──
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },

  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: SharedColors.navySec,
    letterSpacing: 0.8, marginBottom: 10,
  },

  breakdownCard: {
    backgroundColor: SharedColors.white, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 4,
    borderWidth: 1, borderColor: SharedColors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  breakdownRow: {
    flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14,
  },
  breakdownIcon: { fontSize: 16, width: 24, textAlign: "center" },
  breakdownLabel: { flex: 1, fontSize: 13, color: SharedColors.navySec },
  breakdownVal: { fontSize: 14, fontWeight: "700", color: SharedColors.green },
  divider: { height: 1, backgroundColor: SharedColors.border },
  tierNote: { fontSize: 11, color: SharedColors.navyMuted, textAlign: "center", marginTop: 8, fontStyle: "italic" },

  txCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: SharedColors.border, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  txIcon: {
    width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  txInfo: { flex: 1, gap: 2 },
  txName: { fontSize: 14, fontWeight: "600", color: SharedColors.navy },
  txMeta: { fontSize: 11, color: SharedColors.navyMuted },
  txDate: { fontSize: 11, color: SharedColors.navyMuted },
  txAmount: { fontSize: 15, fontWeight: "700", color: SharedColors.green },

  // Trend chart
  trendCard: {
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: SharedColors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  trendBars: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 120 },
  trendCol: { flex: 1, alignItems: "center", gap: 4 },
  trendAmt: { fontSize: 9, fontWeight: "600", color: SharedColors.navySec },
  trendBarBg: { width: "100%", height: 80, justifyContent: "flex-end", alignItems: "center" },
  trendBar: { width: "70%", borderRadius: 4, backgroundColor: DoctorTheme.primary, minHeight: 3 },
  trendMonth: { fontSize: 10, fontWeight: "600", color: SharedColors.navyMuted },

  empty: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: SharedColors.navySec, marginBottom: 4 },
  emptyDesc: { fontSize: 13, color: SharedColors.navyMuted, textAlign: "center" },
});
