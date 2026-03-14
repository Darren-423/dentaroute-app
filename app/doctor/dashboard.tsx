import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { Booking, DoctorTier, PatientCase, Review, TIER_CONFIG, store } from "../../lib/store";

const T = {
  teal: "#0f766e",
  tealLight: "#14b8a6",
  bg: "#f8fafc",
  white: "#fff",
  text: "#0f172a",
  textSec: "#64748b",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  borderLight: "rgba(255,255,255,0.15)",
};

// Country code → flag + name
const countryMap: Record<string, { flag: string; name: string }> = {
  US: { flag: "🇺🇸", name: "USA" },
  UK: { flag: "🇬🇧", name: "UK" },
  CN: { flag: "🇨🇳", name: "China" },
  JP: { flag: "🇯🇵", name: "Japan" },
  KR: { flag: "🇰🇷", name: "Korea" },
  DE: { flag: "🇩🇪", name: "Germany" },
  AU: { flag: "🇦🇺", name: "Australia" },
  CA: { flag: "🇨🇦", name: "Canada" },
};

const getCountryDisplay = (code: string) => {
  const c = countryMap[code];
  return c ? `${c.flag} ${c.name}` : `🌍 ${code}`;
};

// ── Status sections (action-required first) ──
const SECTION_ORDER = [
  { key: "pending", label: "New — Send Quote", emoji: "🆕", color: "#f59e0b", colorBg: "rgba(245,158,11,0.15)" },
  { key: "checked_in_clinic", label: "At Clinic — Send Invoice", emoji: "🏥", color: "#f59e0b", colorBg: "rgba(245,158,11,0.15)" },
  { key: "confirmed", label: "Deposit Paid & Booked", emoji: "📅", color: "#f59e0b", colorBg: "rgba(245,158,11,0.15)" },
  { key: "flight_submitted", label: "Flight Submitted", emoji: "✈️", color: "#3b82f6", colorBg: "rgba(59,130,246,0.15)" },
  { key: "arrived_korea", label: "Arrived in Korea", emoji: "🛬", color: "#7c3aed", colorBg: "rgba(124,58,237,0.15)" },
  { key: "treatment_done", label: "Awaiting Payment", emoji: "💰", color: "#f59e0b", colorBg: "rgba(245,158,11,0.15)" },
  { key: "between_visits", label: "Between Visits", emoji: "🔄", color: "#7c3aed", colorBg: "rgba(124,58,237,0.15)" },
  { key: "returning_home", label: "Patient Returning Home", emoji: "🛫", color: "#3b82f6", colorBg: "rgba(59,130,246,0.15)" },
  { key: "payment_complete", label: "Payment Complete", emoji: "💵", color: "#16a34a", colorBg: "rgba(22,163,74,0.15)" },
  { key: "departure_set", label: "Pickup Arranged", emoji: "🚗", color: "#3b82f6", colorBg: "rgba(59,130,246,0.15)" },
  { key: "quotes_received", label: "Quote Sent", emoji: "📨", color: "#16a34a", colorBg: "rgba(22,163,74,0.15)" },
  { key: "cancelled", label: "Cancelled", emoji: "❌", color: "#ef4444", colorBg: "rgba(239,68,68,0.12)" },
];

const getResolvedStatus = (c: PatientCase, bks: Booking[]): string => {
  if (c.status === "booked") {
    const bk = bks.find((b) => b.caseId === c.id);
    return bk?.status || "confirmed";
  }
  return c.status; // "pending" | "quotes_received"
};

export default function DoctorDashboardScreen() {
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "quoted" | "appointments" | "in_process">("all");
  const [patientProfileImage, setPatientProfileImage] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [reviewStats, setReviewStats] = useState({ total: 0, verified: 0, avgRating: 0 });
  const [tierInfo, setTierInfo] = useState({ tier: "standard" as DoctorTier, label: "Standard", color: "#78716c", feeRate: 0.20 });
  const [showBenefits, setShowBenefits] = useState(true);

  // Stats toggle
  const STATS_HEIGHT = 80;
  const [statsOpen, setStatsOpen] = useState(true);
  const statsAnim = useRef(new Animated.Value(0)).current;
  const toggleStats = useCallback(() => {
    const toValue = statsOpen ? -STATS_HEIGHT : 0;
    setStatsOpen(!statsOpen);
    Animated.timing(statsAnim, {
      toValue, duration: 250, useNativeDriver: false,
    }).start();
  }, [statsOpen]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const c = await store.getCases();
        c.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setCases(c);
        const b = await store.getBookings();
        setBookings(b);
        const uc = await store.getUnreadCount("doctor");
        setUnreadCount(uc);
        const pp = await store.getPatientProfile();
        if (pp?.profileImage) setPatientProfileImage(pp.profileImage);
        // Unread messages count
        const rooms = await store.getChatRooms();
        const totalUnread = rooms.reduce((sum, r) => sum + (r.unreadDoctor || 0), 0);
        setUnreadMessages(totalUnread);

        // Review stats
        const dp = await store.getDoctorProfile();
        if (dp) {
          const reviews: Review[] = await store.getReviewsForDentist(dp.fullName || dp.name || "");
          const verifiedReviews = reviews.filter((r) => r.verified);
          const avgRating = reviews.length > 0
            ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
          setReviewStats({ total: reviews.length, verified: verifiedReviews.length, avgRating });

          const tier = (dp.tier || "standard") as DoctorTier;
          const cfg = TIER_CONFIG[tier] || TIER_CONFIG.standard;
          setTierInfo({
            tier,
            label: cfg.label,
            color: cfg.color,
            feeRate: dp.platformFeeRate || cfg.feeRate,
          });
        }
      };
      load();
    }, [])
  );

  // ── 치료별 필터 탭 목록 (동적) ──
  const filterTabs = useMemo(() => {
    const treatmentSet = new Set<string>();
    cases.forEach((c) => c.treatments.forEach((t) => treatmentSet.add(t.name)));
    return ["All", ...Array.from(treatmentSet).sort()];
  }, [cases]);

  // ── Status group helpers ──
  const STATIC_GROUPS = {
    new: ["pending"],
    quoted: ["quotes_received"],
    appointments: ["confirmed", "flight_submitted", "arrived_korea", "checked_in_clinic", "between_visits", "returning_home"],
  };

  // In Process = treatment_done 상태이면서 visitInvoice 중 최소 1개 paid, 전부 paid는 아닌 케이스
  const isInProcess = useCallback((c: PatientCase): boolean => {
    if (c.status !== "booked") return false;
    const bk = bookings.find((b) => b.caseId === c.id);
    if (!bk || bk.status !== "treatment_done") return false;
    const vis = bk.finalInvoice?.visitInvoices;
    if (!vis || vis.length < 2) return false;
    const paidCount = vis.filter((v) => v.paid).length;
    return paidCount > 0 && paidCount < vis.length;
  }, [bookings]);

  const matchesStatusFilter = useCallback((c: PatientCase, filter: "new" | "quoted" | "appointments" | "in_process"): boolean => {
    if (filter === "in_process") return isInProcess(c);
    const resolved = getResolvedStatus(c, bookings);
    return STATIC_GROUPS[filter].includes(resolved);
  }, [bookings, isInProcess]);

  // ── 통계 ──
  const newCount = useMemo(() => cases.filter((c) => matchesStatusFilter(c, "new")).length, [cases, matchesStatusFilter]);
  const quotedCount = useMemo(() => cases.filter((c) => matchesStatusFilter(c, "quoted")).length, [cases, matchesStatusFilter]);
  const appointmentsCount = useMemo(() => cases.filter((c) => matchesStatusFilter(c, "appointments")).length, [cases, matchesStatusFilter]);
  const inProcessCount = useMemo(() => cases.filter((c) => matchesStatusFilter(c, "in_process")).length, [cases, matchesStatusFilter]);

  // ── 상태별 섹션 그룹화 (치료 필터 + 상태 필터 적용) ──
  const groupedSections = useMemo(() => {
    let filtered = activeFilter === "All"
      ? cases
      : cases.filter((c) => c.treatments.some((t) => t.name === activeFilter));

    // 상태 필터 적용
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => matchesStatusFilter(c, statusFilter));
    }

    const map: Record<string, PatientCase[]> = {};
    filtered.forEach((c) => {
      const key = getResolvedStatus(c, bookings);
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });

    return SECTION_ORDER
      .filter((sec) => map[sec.key] && map[sec.key].length > 0)
      .map((sec) => ({ ...sec, cases: map[sec.key] }));
  }, [cases, bookings, activeFilter, statusFilter, matchesStatusFilter]);

  const totalFiltered = groupedSections.reduce((sum, sec) => sum + sec.cases.length, 0);

  const getStatusBadge = (status: string, caseId?: string) => {
    if (status === "booked" && caseId) {
      const bk = bookings.find((b) => b.caseId === caseId);
      if (bk?.status === "flight_submitted") return { label: "✈️ Flight Submitted", bg: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "rgba(59,130,246,0.25)" };
      if (bk?.status === "arrived_korea") return { label: "🛬 Arrived in Korea", bg: "rgba(124,58,237,0.15)", color: "#7c3aed", border: "rgba(124,58,237,0.25)" };
      if (bk?.status === "checked_in_clinic") return { label: "🏥 At Clinic — Send Invoice", bg: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "rgba(245,158,11,0.25)" };
      if (bk?.status === "treatment_done") return { label: "💰 Awaiting Payment", bg: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "rgba(245,158,11,0.25)" };
      if (bk?.status === "payment_complete") return { label: "💵 Payment Complete", bg: "rgba(22,163,74,0.15)", color: "#16a34a", border: "rgba(22,163,74,0.25)" };
      if (bk?.status === "departure_set") return { label: "🚗 Pickup Arranged", bg: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "rgba(59,130,246,0.25)" };
    }
    switch (status) {
      case "pending":
        return { label: "🆕 New — Send Quote", bg: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "rgba(245,158,11,0.25)" };
      case "quotes_received":
        return { label: "📨 Quote Sent", bg: "rgba(22,163,74,0.15)", color: "#16a34a", border: "rgba(22,163,74,0.25)" };
      case "booked":
        return { label: "📅 Booked", bg: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "rgba(59,130,246,0.25)" };
      default:
        return { label: "📋 Open", bg: "#f1f5f9", color: T.textSec, border: T.border };
    }
  };

  // ── 치료 아이콘 ──
  const getTreatmentIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("implant")) return "🦷";
    if (n.includes("crown")) return "👑";
    if (n.includes("veneer")) return "✨";
    if (n.includes("whitening")) return "💎";
    if (n.includes("root")) return "🏥";
    if (n.includes("extraction")) return "🔧";
    if (n.includes("aesthetics") || n.includes("cosmetic")) return "💄";
    if (n.includes("orthodont") || n.includes("braces")) return "🔗";
    if (n.includes("filling")) return "🪥";
    return "🦷";
  };

  return (
    <View style={s.container}>
      {/* ── Header ── */}
      <LinearGradient colors={["#0f766e", "#134e4a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerGradient}>
        <View style={s.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.welcome}>Welcome back 👋</Text>
            <Text style={s.userName}>Dr. Kim</Text>
          </View>
          <View style={s.headerIcons}>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => router.push("/doctor/chat-list" as any)}
              activeOpacity={0.7}
            >
              <Text style={s.iconBtnEmoji}>💬</Text>
              {unreadMessages > 0 && (
                <View style={s.iconBadge}><Text style={s.iconBadgeText}>{unreadMessages}</Text></View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => router.push("/notifications?role=doctor" as any)}
              activeOpacity={0.7}
            >
              <Text style={s.iconBtnEmoji}>🔔</Text>
              {unreadCount > 0 && (
                <View style={s.iconBadge}><Text style={s.iconBadgeText}>{unreadCount}</Text></View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => router.push("/doctor/earnings" as any)}
              activeOpacity={0.7}
            >
              <Text style={s.iconBtnEmoji}>💰</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => router.push("/doctor/profile" as any)}
              activeOpacity={0.7}
            >
              <Text style={s.iconBtnEmoji}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats with toggle */}
        <View style={s.statsToggleWrapper}>
          <Animated.View style={[s.statsClip, { marginTop: statsAnim }]}>
            <View style={s.statsRow}>
              {([
                { key: "new" as const, label: "New", count: newCount },
                { key: "quoted" as const, label: "Quoted", count: quotedCount },
                { key: "appointments" as const, label: "Appts", count: appointmentsCount },
                { key: "in_process" as const, label: "In Process", count: inProcessCount },
              ]).map((item) => {
                const isActive = statusFilter === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[s.stat, isActive && s.statActive]}
                    onPress={() => setStatusFilter(statusFilter === item.key ? "all" : item.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.statNum, isActive && s.statNumActive]}>{item.count}</Text>
                    <Text style={[s.statLabel, isActive && s.statLabelActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>
        <View style={s.statsToggleBar}>
          <TouchableOpacity style={s.statsToggleBtn} onPress={toggleStats} activeOpacity={0.6}>
            <Text style={s.statsToggleIcon}>{statsOpen ? "▲" : "▼"}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Platform Benefits Card ── */}
      {showBenefits && (
        <View style={s.benefitsCard}>
          <View style={s.benefitsHeader}>
            <Text style={s.benefitsTitle}>📊 Your DentaRoute Profile</Text>
            <TouchableOpacity onPress={() => setShowBenefits(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={s.benefitsClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={s.benefitsRow}>
            <View style={s.benefitItem}>
              <Text style={s.benefitNum}>⭐ {reviewStats.avgRating > 0 ? reviewStats.avgRating.toFixed(1) : "—"}</Text>
              <Text style={s.benefitLabel}>Rating</Text>
            </View>
            <View style={s.benefitDivider} />
            <View style={s.benefitItem}>
              <Text style={s.benefitNum}>✓ {reviewStats.verified}</Text>
              <Text style={s.benefitLabel}>Verified Reviews</Text>
            </View>
            <View style={s.benefitDivider} />
            <View style={s.benefitItem}>
              <View style={[s.tierMini, { backgroundColor: tierInfo.color }]}>
                <Text style={s.tierMiniText}>{tierInfo.label}</Text>
              </View>
              <Text style={s.benefitLabel}>{Math.round(tierInfo.feeRate * 100)}% Fee</Text>
            </View>
          </View>
          <View style={s.benefitsFooter}>
            <Text style={s.benefitsFooterIcon}>🛡️</Text>
            <Text style={s.benefitsFooterText}>
              Your patients receive up to 5-year treatment warranty + US aftercare through DentaRoute
            </Text>
          </View>
          {tierInfo.tier !== "gold" && (
            <View style={s.tierUpgrade}>
              <Text style={s.tierUpgradeText}>
                💡 {tierInfo.tier === "standard" ? "Reach Silver tier to lower your fee to 18%" : "Reach Gold tier for the lowest 15% fee"}
              </Text>
              <TouchableOpacity onPress={() => router.push("/doctor/earnings" as any)}>
                <Text style={s.tierUpgradeLink}>View Progress →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── Treatment Filter Tabs ── */}
      {cases.length > 0 && (
        <View style={s.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterScroll}
          >
            {filterTabs.map((tab) => {
              const isActive = activeFilter === tab;
              const count =
                tab === "All"
                  ? cases.length
                  : cases.filter((c) => c.treatments.some((t) => t.name === tab)).length;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[s.filterTab, isActive && s.filterTabActive]}
                  onPress={() => setActiveFilter(tab)}
                  activeOpacity={0.7}
                >
                  {tab !== "All" && (
                    <Text style={s.filterIcon}>{getTreatmentIcon(tab)}</Text>
                  )}
                  <Text style={[s.filterTabText, isActive && s.filterTabTextActive]}>
                    {tab === "All" ? "All" : tab}
                  </Text>
                  <View style={[s.filterCount, isActive && s.filterCountActive]}>
                    <Text style={[s.filterCountText, isActive && s.filterCountTextActive]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Case List ── */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.sectionHeader}>
          <View>
            <Text style={s.sectionTitle}>
              {statusFilter !== "all"
                ? ({ new: "NEW CASES", quoted: "QUOTED", appointments: "APPOINTMENTS", in_process: "IN PROCESS" }[statusFilter])
                : activeFilter === "All" ? "ALL CASES" : activeFilter.toUpperCase()}
            </Text>
            {statusFilter !== "all" && (
              <Text style={s.sectionDesc}>
                {{ new: "New cases awaiting your quote",
                   quoted: "Quote sent, awaiting deposit payment",
                   appointments: "Upcoming visits & patients at clinic",
                   in_process: "Multi-visit cases with partial visits completed",
                }[statusFilter]}
              </Text>
            )}
          </View>
          <Text style={s.sectionCount}>{totalFiltered} case{totalFiltered !== 1 ? "s" : ""}</Text>
        </View>

        {cases.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📋</Text>
            <Text style={s.emptyTitle}>No cases yet</Text>
            <Text style={s.emptyDesc}>
              Switch to Patient mode and submit a case to see it here!
            </Text>
          </View>
        ) : totalFiltered === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>{getTreatmentIcon(activeFilter)}</Text>
            <Text style={s.emptyTitle}>No {activeFilter} cases</Text>
            <Text style={s.emptyDesc}>No patients have requested this treatment yet</Text>
          </View>
        ) : (
          groupedSections.map((section, idx) => {
            const isCollapsed = !!collapsedSections[section.key];
            return (
            <View key={section.key} style={s.statusSection}>
              {/* Section Header */}
              <TouchableOpacity
                style={[s.statusSectionHeader, idx === 0 && { marginTop: 4 }]}
                onPress={() => setCollapsedSections(prev => ({ ...prev, [section.key]: !prev[section.key] }))}
                activeOpacity={0.6}
              >
                <View style={s.statusSectionLeft}>
                  <Text style={s.statusSectionEmoji}>{section.emoji}</Text>
                  <Text style={s.statusSectionLabel}>{section.label}</Text>
                  <Text style={[s.collapseChevron, isCollapsed && s.collapseChevronClosed]}>▾</Text>
                </View>
                <View style={[s.statusSectionCount, { backgroundColor: section.colorBg }]}>
                  <Text style={[s.statusSectionCountText, { color: section.color }]}>
                    {section.cases.length}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Cards */}
              {!isCollapsed && section.cases.map((c) => {
                const badge = getStatusBadge(c.status, c.id);
                const treatmentSummary = c.treatments
                  .map((t) => `${t.name}${t.qty > 1 ? ` ×${t.qty}` : ""}`)
                  .join(", ");
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={s.caseCard}
                    onPress={() => {
                      if (c.status === "booked") {
                        const bk = bookings.find((b) => b.caseId === c.id);
                        if (bk && (bk.status === "checked_in_clinic" || bk.status === "treatment_done")) {
                          router.push(`/doctor/final-invoice?bookingId=${bk.id}` as any);
                          return;
                        }
                      }
                      router.push(`/doctor/case-detail?caseId=${c.id}` as any);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={s.cardRow}>
                      {patientProfileImage ? (
                        <Image source={{ uri: patientProfileImage }} style={s.avatarImg} />
                      ) : (
                        <View style={s.avatar}>
                          <Text style={s.avatarText}>
                            {c.patientName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={s.cardContent}>
                        <View style={s.cardTopRow}>
                          <Text style={s.patientName} numberOfLines={1}>
                            {c.patientName}
                          </Text>
                          <Text style={s.cardMeta}>
                            {countryMap[c.country]?.flag || "🌍"} #{c.id}
                          </Text>
                        </View>
                        <Text style={s.treatmentLine} numberOfLines={1}>
                          {treatmentSummary}
                        </Text>
                        <View style={[s.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                          <Text style={[s.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
                        </View>
                      </View>
                      <Text style={s.chevron}>›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            );
          })
        )}
        <View style={{ height: 70 }} />
      </ScrollView>

      {/* Tab bar is rendered by _layout.tsx */}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  // ── Header ──
  headerGradient: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  welcome: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 2 },
  userName: { fontSize: 24, fontWeight: "700", color: T.white },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: { position: "relative", width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)" },
  iconBtnEmoji: { fontSize: 18 },
  iconBadge: { position: "absolute", top: 2, right: 2, backgroundColor: "#ef4444", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  iconBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  statsToggleWrapper: { overflow: "hidden" },
  statsClip: {},
  statsRow: { flexDirection: "row", gap: 8 },
  statsToggleBar: { backgroundColor: "transparent", alignItems: "center", paddingTop: 4, paddingBottom: 2 },
  statsToggleBtn: { width: 24, height: 14, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  statsToggleIcon: { fontSize: 8, color: "rgba(255,255,255,0.7)" },
  stat: { flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 6, alignItems: "center", borderWidth: 1.5, borderColor: "transparent" },
  statActive: { backgroundColor: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.4)" },
  statNum: { fontSize: 22, fontWeight: "700", color: T.white, marginBottom: 2 },
  statNumActive: { color: T.white },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: "500" },
  statLabelActive: { color: "rgba(255,255,255,0.9)", fontWeight: "600" },

  // ── Filter Tabs ──
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.white,
  },
  filterScroll: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: T.border,
  },
  filterTabActive: {
    backgroundColor: "rgba(15,118,110,0.08)",
    borderColor: "rgba(15,118,110,0.2)",
  },
  filterIcon: {
    fontSize: 14,
  },
  filterTabText: {
    fontSize: 13,
    color: T.textSec,
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: T.teal,
    fontWeight: "600",
  },
  filterCount: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  filterCountActive: {
    backgroundColor: "rgba(15,118,110,0.1)",
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: T.textMuted,
  },
  filterCountTextActive: {
    color: T.teal,
  },

  // ── Case List ──
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: T.textSec,
    letterSpacing: 0.8,
  },
  sectionDesc: {
    fontSize: 11,
    color: T.textMuted,
    marginTop: 3,
  },
  sectionCount: {
    fontSize: 12,
    color: T.textMuted,
  },

  // ── Status Sections ──
  statusSection: {
    marginBottom: 4,
  },
  statusSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  statusSectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusSectionEmoji: {
    fontSize: 16,
  },
  statusSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: T.text,
    letterSpacing: 0.3,
  },
  statusSectionCount: {
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  statusSectionCountText: {
    fontSize: 11,
    fontWeight: "800",
  },
  collapseChevron: {
    fontSize: 14,
    color: T.textMuted,
  },
  collapseChevronClosed: {
    transform: [{ rotate: "-90deg" }],
  },

  // ── Empty ──
  empty: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: T.textSec, marginBottom: 4 },
  emptyDesc: { fontSize: 13, color: T.textMuted, textAlign: "center", paddingHorizontal: 20 },

  // ── Case Card ──
  caseCard: {
    backgroundColor: T.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(15,118,110,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(15,118,110,0.15)",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: T.teal,
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  patientName: {
    fontSize: 14,
    fontWeight: "700",
    color: T.text,
    flex: 1,
  },
  cardMeta: {
    fontSize: 11,
    color: T.textMuted,
    marginLeft: 8,
  },
  treatmentLine: {
    fontSize: 12,
    color: T.textSec,
    fontWeight: "400",
  },
  statusBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  chevron: {
    fontSize: 20,
    color: T.textMuted,
    fontWeight: "300",
  },

  // ── Platform Benefits Card ──
  benefitsCard: {
    marginHorizontal: 16, marginTop: 12, backgroundColor: T.white,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: T.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  benefitsHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12,
  },
  benefitsTitle: { fontSize: 13, fontWeight: "700", color: T.text },
  benefitsClose: { fontSize: 14, color: T.textMuted, fontWeight: "600" },
  benefitsRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    paddingVertical: 8,
  },
  benefitItem: { alignItems: "center", gap: 4 },
  benefitNum: { fontSize: 16, fontWeight: "700", color: T.teal },
  benefitLabel: { fontSize: 10, color: T.textMuted },
  benefitDivider: { width: 1, height: 32, backgroundColor: T.border },
  tierMini: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tierMiniText: { fontSize: 11, fontWeight: "800", color: "#fff" },
  benefitsFooter: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f0fdf4", borderRadius: 10, padding: 10,
    marginTop: 12, borderWidth: 1, borderColor: "#bbf7d0",
  },
  benefitsFooterIcon: { fontSize: 14 },
  benefitsFooterText: { flex: 1, fontSize: 11, color: "#166534", lineHeight: 16 },
  tierUpgrade: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border,
  },
  tierUpgradeText: { fontSize: 11, color: T.textSec, flex: 1 },
  tierUpgradeLink: { fontSize: 11, fontWeight: "700", color: T.teal },
});
