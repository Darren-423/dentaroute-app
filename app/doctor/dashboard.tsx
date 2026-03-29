import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Image,
    LayoutAnimation,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    UIManager,
    View
} from "react-native";
import { getDoctorDashboardCache, loadDoctorDashboardData } from "../../lib/doctorTabDataCache";
import { Booking, PatientCase, store } from "../../lib/store";
import { toDoctorLabel } from "../../lib/treatmentTerminology";



import { DoctorTheme, SharedColors } from "../../constants/theme";
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
  { key: "pending", label: "New — Send Quote", emoji: "🆕", color: SharedColors.green, colorBg: "rgba(22,163,74,0.15)" },
  { key: "checked_in_clinic", label: "At Clinic — Send Invoice", emoji: "🏥", color: SharedColors.green, colorBg: "rgba(22,163,74,0.15)" },
  { key: "confirmed", label: "Deposit Paid & Booked", emoji: "📅", color: SharedColors.green, colorBg: "rgba(22,163,74,0.15)" },
  { key: "flight_submitted", label: "Flight Submitted", emoji: "✈️", color: SharedColors.green, colorBg: "rgba(22,163,74,0.15)" },
  { key: "arrived_korea", label: "Arrived in Korea", emoji: "🛬", color: SharedColors.green, colorBg: "rgba(22,163,74,0.15)" },
  { key: "treatment_done", label: "Awaiting Payment", emoji: "💰", color: SharedColors.green, colorBg: "rgba(22,163,74,0.15)" },
  { key: "between_visits", label: "Between Visits", emoji: "🔄", color: SharedColors.green, colorBg: "rgba(22,163,74,0.15)" },
  { key: "returning_home", label: "Patient Returning Home", emoji: "🛫", color: SharedColors.green, colorBg: "rgba(22,163,74,0.15)" },
  { key: "payment_complete", label: "Payment Complete", emoji: "💵", color: SharedColors.green, colorBg: "rgba(22,163,74,0.15)" },
  { key: "departure_set", label: "Pickup Arranged", emoji: "🚗", color: SharedColors.green, colorBg: "rgba(22,163,74,0.15)" },
  { key: "quotes_received", label: "Quote Sent", emoji: "📨", color: SharedColors.green, colorBg: "rgba(22,163,74,0.15)" },
  { key: "cancelled", label: "Cancelled", emoji: "❌", color: SharedColors.green, colorBg: "rgba(22,163,74,0.15)" },
];

const getResolvedStatus = (c: PatientCase, bks: Booking[]): string => {
  if (c.status === "booked") {
    const bk = bks.find((b) => b.caseId === c.id);
    return bk?.status || "confirmed";
  }
  return c.status; // "pending" | "quotes_received"
};

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function DoctorDashboardScreen() {
  const initialDashboardData = getDoctorDashboardCache();
  const [cases, setCases] = useState<PatientCase[]>(initialDashboardData.cases);
  const [bookings, setBookings] = useState<Booking[]>(initialDashboardData.bookings);
  const [unreadCount, setUnreadCount] = useState(initialDashboardData.unreadCount);
  const [activeFilter, setActiveFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "quoted" | "appointments" | "in_process">("all");
  const [patientProfileImage, setPatientProfileImage] = useState<string | null>(initialDashboardData.patientProfileImage);
  const [unreadMessages, setUnreadMessages] = useState(initialDashboardData.unreadMessages);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [deleteCaseId, setDeleteCaseId] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState("Doctor");
  const [passedCaseIds, setPassedCaseIds] = useState<string[]>([]);

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
        const data = await loadDoctorDashboardData();
        setCases(data.cases);
        setBookings(data.bookings);
        setUnreadCount(data.unreadCount);
        setPatientProfileImage(data.patientProfileImage);
        setUnreadMessages(data.unreadMessages);
        const user = await store.getCurrentUser();
        if (user?.name) setDoctorName(user.name);
        setPassedCaseIds(await store.getPassedCases());
      };
      load();
    }, [])
  );

  // ── 치료별 필터 탭 목록 (동적) ──
  const filterTabs = useMemo(() => {
    const treatmentSet = new Set<string>();
    cases.forEach((c) => c.treatments.forEach((t) => treatmentSet.add(toDoctorLabel(t.name))));
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
      ? cases.filter((c) => !passedCaseIds.includes(c.id))
      : cases.filter((c) => !passedCaseIds.includes(c.id) && c.treatments.some((t) => toDoctorLabel(t.name) === activeFilter));

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

  // Strip colors: teal (active/progress), teal-light (done/info), amber (needs action)
  const STRIP = {
    action:   { bg: "rgba(245,158,11,0.12)", color: SharedColors.amber, border: "rgba(245,158,11,0.20)" },
    active:   { bg: "rgba(15,118,110,0.10)", color: DoctorTheme.primary, border: "rgba(15,118,110,0.18)" },
    done:     { bg: "rgba(20,184,166,0.10)", color: DoctorTheme.accentBright, border: "rgba(20,184,166,0.18)" },
  };

  const getStatusBadge = (status: string, caseId?: string) => {
    if (status === "booked" && caseId) {
      const bk = bookings.find((b) => b.caseId === caseId);
      if (bk?.status === "flight_submitted") return { label: "✈️ Flight Submitted", ...STRIP.active };
      if (bk?.status === "arrived_korea") return { label: "🛬 Arrived in Korea", ...STRIP.active };
      if (bk?.status === "checked_in_clinic") return { label: "🏥 At Clinic — Send Invoice", ...STRIP.action };
      if (bk?.status === "treatment_done") return { label: "💰 Awaiting Payment", ...STRIP.action };
      if (bk?.status === "payment_complete") return { label: "💵 Payment Complete", ...STRIP.done };
      if (bk?.status === "departure_set") return { label: "🚗 Pickup Arranged", ...STRIP.done };
    }
    switch (status) {
      case "pending":
        return { label: "🆕 New — Send Quote", ...STRIP.action };
      case "quotes_received":
        return { label: "📨 Quote Sent", ...STRIP.done };
      case "booked":
        return { label: "📅 Booked", ...STRIP.active };
      default:
        return { label: "📋 Open", bg: "#f1f5f9", color: SharedColors.navySec, border: SharedColors.border };
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
      <LinearGradient colors={[DoctorTheme.primary, DoctorTheme.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerGradient}>
        <View style={s.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.welcome}>Welcome back 👋</Text>
            <Text style={s.userName}>{doctorName}</Text>
          </View>
          <View style={s.headerIcons}>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => router.push("/doctor/earnings" as any)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="View earnings"
            >
              <Feather name="dollar-sign" size={18} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => router.push("/notifications?role=doctor" as any)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="View notifications"
            >
              <Feather name="bell" size={18} color="rgba(255,255,255,0.85)" />
              {unreadCount > 0 && (
                <View style={s.notifDot} />
              )}
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
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${item.label}`}
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
          <TouchableOpacity style={s.statsToggleBtn} onPress={toggleStats} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel={statsOpen ? "Hide stats" : "Show stats"}>
            <Text style={s.statsToggleIcon}>{statsOpen ? "▲" : "▼"}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

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
                  : cases.filter((c) => c.treatments.some((t) => toDoctorLabel(t.name) === tab)).length;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[s.filterTab, isActive && s.filterTabActive]}
                  onPress={() => setActiveFilter(tab)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${tab} filter`}
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
            <Text style={s.emptyTitle}>No cases</Text>
            <Text style={s.emptyDesc}>No patients have requested this treatment yet</Text>
          </View>
        ) : (
          groupedSections.map((section, idx) => {
            const isCollapsed = expandedSections[section.key] === false;
            return (
            <View key={section.key} style={s.statusSection}>
              {/* Section Header */}
              <TouchableOpacity
                style={[s.statusSectionHeader, idx === 0 && { marginTop: 4 }]}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setExpandedSections(prev => ({ ...prev, [section.key]: !prev[section.key] }));
                }}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel={`${section.label}, ${section.cases.length} cases, ${isCollapsed ? "expand" : "collapse"}`}
              >
                <View style={s.statusSectionLeft}>
                  <Text style={s.statusSectionEmoji}>{section.emoji}</Text>
                  <Text style={s.statusSectionLabel}>
                    {section.label}{" "}
                    <Text style={s.statusSectionInlineCount}>({section.cases.length})</Text>
                  </Text>
                  <Text style={[s.collapseChevron, isCollapsed && s.collapseChevronClosed]}>▾</Text>
                </View>
              </TouchableOpacity>

              {/* Cards */}
              {!isCollapsed && section.cases.map((c) => {
                const badge = getStatusBadge(c.status, c.id);
                const treatmentSummary = c.treatments
                  .map((t) => `${toDoctorLabel(t.name)}${t.qty > 1 ? ` ×${t.qty}` : ""}`)
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
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`View case details for ${treatmentSummary}`}
                  >
                    <View style={[s.statusStrip, { backgroundColor: badge.color }]} />
                    <View style={s.cardInner}>
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
                        </View>
                      </View>
                      <View style={s.cardBottom}>
                        <View style={[s.statusPill, { backgroundColor: badge.bg }]}>
                          <Text style={[s.statusPillText, { color: badge.color }]}>{badge.label}</Text>
                        </View>
                        {section.key === "cancelled" ? (
                          <TouchableOpacity
                            onPress={(e) => { e.stopPropagation(); setDeleteCaseId(c.id); }}
                            activeOpacity={0.6}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Feather name="more-horizontal" size={16} color={SharedColors.slate} />
                          </TouchableOpacity>
                        ) : (
                          <Text style={s.cardArrow}>›</Text>
                        )}
                      </View>
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

      {/* ── Delete Cancelled Case Modal ── */}
      <Modal visible={!!deleteCaseId} transparent animationType="fade" onRequestClose={() => setDeleteCaseId(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setDeleteCaseId(null)}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Manage Case</Text>

            <TouchableOpacity
              style={s.modalOption}
              activeOpacity={0.7}
              onPress={() => {
                const caseId = deleteCaseId;
                setDeleteCaseId(null);
                Alert.alert(
                  "Delete this case?",
                  "This cancelled case will be removed from your dashboard.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: async () => {
                      await store.updateCase(caseId!, { hidden: true } as any);
                      const data = await loadDoctorDashboardData();
                      setCases(data.cases);
                      setBookings(data.bookings);
                    }},
                  ],
                );
              }}
            >
              <Text style={s.modalOptionIcon}>🗑️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.modalOptionLabel, { color: "#b91c1c" }]}>Delete this card</Text>
                <Text style={s.modalOptionDesc}>Remove this cancelled case from your dashboard</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setDeleteCaseId(null)} activeOpacity={0.8}>
              <Text style={s.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },

  // ── Header ──
  headerGradient: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  welcome: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 2 },
  userName: { fontSize: 24, fontWeight: "700", color: SharedColors.white },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: { position: "relative", width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  iconBtnEmoji: { fontSize: 18 },
  iconBadge: { position: "absolute", top: 2, right: 2, backgroundColor: SharedColors.red, borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  iconBadgeText: { color: SharedColors.white, fontSize: 9, fontWeight: "800" },
  notifDot: { position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: 3.5, backgroundColor: SharedColors.red, borderWidth: 1.5, borderColor: "rgba(15,118,110,0.8)" },
  statsToggleWrapper: { overflow: "hidden" },
  statsClip: {},
  statsRow: { flexDirection: "row", gap: 8 },
  statsToggleBar: { backgroundColor: "transparent", alignItems: "center", paddingTop: 4, paddingBottom: 2 },
  statsToggleBtn: { width: 24, height: 14, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  statsToggleIcon: { fontSize: 8, color: "rgba(255,255,255,0.7)" },
  stat: { flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 6, alignItems: "center", borderWidth: 1.5, borderColor: "transparent" },
  statActive: { backgroundColor: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.4)" },
  statNum: { fontSize: 22, fontWeight: "700", color: SharedColors.white, marginBottom: 2 },
  statNumActive: { color: SharedColors.white },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: "500" },
  statLabelActive: { color: "rgba(255,255,255,0.9)", fontWeight: "600" },

  // ── Filter Tabs ──
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: SharedColors.border,
    backgroundColor: SharedColors.white,
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
    borderColor: SharedColors.border,
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
    color: SharedColors.navySec,
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: DoctorTheme.primary,
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
    color: SharedColors.navyMuted,
  },
  filterCountTextActive: {
    color: DoctorTheme.primary,
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
    color: SharedColors.navySec,
    letterSpacing: 0.8,
  },
  sectionDesc: {
    fontSize: 11,
    color: SharedColors.navyMuted,
    marginTop: 3,
  },
  sectionCount: {
    fontSize: 12,
    color: SharedColors.navyMuted,
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
    borderBottomColor: SharedColors.border,
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
    color: SharedColors.navy,
    letterSpacing: 0.3,
  },
  statusSectionInlineCount: {
    fontSize: 12,
    fontWeight: "600",
    color: SharedColors.navyMuted,
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
    color: SharedColors.navyMuted,
  },
  collapseChevronClosed: {
    transform: [{ rotate: "-90deg" }],
  },

  // ── Empty ──
  empty: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: SharedColors.navySec, marginBottom: 4 },
  emptyDesc: { fontSize: 13, color: SharedColors.navyMuted, textAlign: "center", paddingHorizontal: 20 },

  // ── Case Card — Clean Floating ──
  caseCard: {
    backgroundColor: SharedColors.white,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#cddbd9",
    marginBottom: 10,
    shadowColor: "#0a3d38",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 4,
  },
  statusStrip: {
    height: 4,
    width: "100%",
  },
  cardInner: {
    padding: 14,
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
    backgroundColor: "#ecf5f4",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: DoctorTheme.primary,
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
    color: SharedColors.navy,
    flex: 1,
  },
  cardMeta: {
    fontSize: 11,
    color: SharedColors.navyMuted,
    marginLeft: 8,
  },
  treatmentLine: {
    fontSize: 12,
    color: SharedColors.navySec,
    fontWeight: "500",
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#dce8e6",
  },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardArrow: {
    fontSize: 22,
    color: SharedColors.navyMuted,
    fontWeight: "300",
  },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#d1d5db", alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: SharedColors.navy, marginBottom: 16, textAlign: "center" },
  modalOption: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 12 },
  modalOptionIcon: { fontSize: 20, width: 28, textAlign: "center" },
  modalOptionLabel: { fontSize: 15, fontWeight: "600", color: SharedColors.navy },
  modalOptionDesc: { fontSize: 12, color: SharedColors.slate, marginTop: 2 },
  modalCloseBtn: { marginTop: 12, paddingVertical: 14, borderRadius: 12, backgroundColor: "#f1f5f9", alignItems: "center" },
  modalCloseBtnText: { fontSize: 15, fontWeight: "600", color: SharedColors.slate },
});
