import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Booking, PatientCase, store } from "../../lib/store";

const T = {
  teal: "#4A0080", tealMid: "#5C10A0", tealLight: "#f0e6f6",
  navy: "#0f172a", navyMid: "#1e293b", slate: "#64748b", slateLight: "#94a3b8",
  border: "#e2e8f0", bg: "#f8fafc", white: "#fff",
  amber: "#f59e0b", amberLight: "#fffbeb",
  green: "#16a34a", greenLight: "#f0fdf4",
  yellow: "#a16207", yellowLight: "#fef9c3",
  red: "#ef4444", redLight: "#fef2f2",
};

// ── Treatment → Emoji mapping (keyword-based) ──
const TREATMENT_EMOJI_RULES: [string, string][] = [
  ["implant", "🦷"],
  ["veneer", "✨"],
  ["smile makeover", "😁"],
  ["filling", "🪥"],
  ["crown", "👑"],
  ["root canal", "🏥"],
  ["gum", "🩺"],
  ["invisalign", "🔗"],
  ["sleep appliance", "😴"],
  ["tongue tie", "✂️"],
  ["wisdom", "🦷"],
  ["whitening", "🪥"],
  ["extraction", "🦷"],
];

const getCaseEmoji = (treatments: { name: string; qty: number }[]): string => {
  if (!treatments || treatments.length === 0) return "🦷";
  const name = treatments[0].name.toLowerCase();
  for (const [keyword, emoji] of TREATMENT_EMOJI_RULES) {
    if (name.includes(keyword)) return emoji;
  }
  return "🦷";
};

export default function PatientDashboardScreen() {
  const insets = useSafeAreaInsets();
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userName, setUserName] = useState("Patient");
  const [quoteCounts, setQuoteCounts] = useState<Record<string, number>>({});
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "with_quotes" | "bookings" | "in_treatment" | "completed">("all");
  const [manageBooking, setManageBooking] = useState<Booking | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const scrollRef = useRef<ScrollView>(null);

  const loadData = useCallback(async () => {
    const c = await store.getCases();
    c.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setCases(c);
    const b = await store.getBookings();
    setBookings(b);
    const uc = await store.getUnreadCount("patient");
    setUnreadCount(uc);
    const user = await store.getCurrentUser();
    if (user?.name) setUserName(user.name);
    const profile = await store.getPatientProfile();
    if (profile?.fullName) setUserName(profile.fullName);
    if (profile?.profileImage) setProfileImage(profile.profileImage);

    const counts: Record<string, number> = {};
    for (const cs of c) {
      const quotes = await store.getQuotesForCase(cs.id);
      counts[cs.id] = quotes.length;
    }
    setQuoteCounts(counts);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const totalQuotes = cases.filter((c) => c.status === "quotes_received").length;
  const firstName = userName.split(" ")[0];
  const initials = userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const IN_TREATMENT_STATUSES = ["checked_in_clinic", "treatment_done", "between_visits", "returning_home"];
  const COMPLETED_STATUSES = ["payment_complete", "departure_set"];
  const inTreatmentCount = bookings.filter((b) => IN_TREATMENT_STATUSES.includes(b.status)).length;
  const completedCount = bookings.filter((b) => COMPLETED_STATUSES.includes(b.status)).length;

  const filteredCases = useMemo(() => {
    let result: PatientCase[];
    switch (statusFilter) {
      case "with_quotes": result = cases.filter((c) => c.status === "quotes_received"); break;
      case "bookings": result = cases.filter((c) => c.status === "booked"); break;
      case "in_treatment": result = cases.filter((c) => {
        const bk = bookings.find((b) => b.caseId === c.id);
        return bk && IN_TREATMENT_STATUSES.includes(bk.status);
      }); break;
      case "completed": result = cases.filter((c) => {
        const bk = bookings.find((b) => b.caseId === c.id);
        return bk && COMPLETED_STATUSES.includes(bk.status);
      }); break;
      default: result = [...cases];
    }
    return result;
  }, [cases, bookings, statusFilter]);

  const filterSectionTitle = statusFilter === "all"
    ? "My Cases"
    : { with_quotes: "Cases With Quotes", bookings: "Booked Cases", in_treatment: "In Treatment", completed: "Completed" }[statusFilter];

  const BOOKING_STEPS = [
    { key: "confirmed", label: "Booked", next: "Input flight info for pickup service", emoji: "📖" },
    { key: "flight_submitted", label: "Flight Booked", next: "Confirm hotel arrival", emoji: "🏨" },
    { key: "arrived_korea", label: "In Korea", next: "Check in at clinic", emoji: "🇰🇷" },
    { key: "checked_in_clinic", label: "At Clinic", next: "Treatment in progress", emoji: "🦷" },
    { key: "treatment_done", label: "Treatment Done", next: "Complete payment", emoji: "✅", dynamic: true },
    { key: "between_visits", label: "Visit Complete", next: "Choose stay or return", emoji: "🎉" },
    { key: "returning_home", label: "Returning Home", next: "Book departure pickup", emoji: "🛫" },
    { key: "payment_complete", label: "Paid", next: "Book departure pickup", emoji: "🚗" },
    { key: "departure_set", label: "Complete", next: "Leave a review!", emoji: "⭐" },
    { key: "cancelled", label: "Cancelled", next: "View quotes to rebook", emoji: "❌" },
  ];

  const sortedCases = useMemo(() => {
    const getPriority = (c: PatientCase): number => {
      if (c.status === "booked") {
        const bk = bookings.find((b) => b.caseId === c.id);
        if (bk?.status === "cancelled") return -1;
        const stepIdx = BOOKING_STEPS.findIndex((st) => st.key === bk?.status);
        return stepIdx >= 0 ? 100 + stepIdx : 100;
      }
      if (c.status === "quotes_received") return 10;
      if (c.status === "pending") return 5;
      return 0;
    };
    return [...filteredCases].sort((a, b) => getPriority(b) - getPriority(a));
  }, [filteredCases, bookings]);

  const getCaseProgress = (status: string, caseId?: string) => {
    if (status === "booked" && caseId) {
      const bk = bookings.find((b) => b.caseId === caseId);
      // Cancelled gets special red styling
      if (bk?.status === "cancelled") {
        return {
          label: "Cancelled", next: "View quotes to rebook", emoji: "❌",
          step: 0, total: BOOKING_STEPS.length,
          bg: T.redLight, color: T.red,
          isBooking: true,
        };
      }
      const stepIdx = BOOKING_STEPS.findIndex((st) => st.key === bk?.status);
      if (stepIdx >= 0) {
        const step = BOOKING_STEPS[stepIdx];
        let label = step.label;
        // Dynamic label for treatment_done: "Visit X of Y Complete"
        if (bk?.status === "treatment_done" && bk.visitDates && bk.visitDates.length > 1) {
          const cur = bk.currentVisit || 1;
          label = `Visit ${cur} of ${bk.visitDates.length} Complete`;
        }
        return {
          label, next: step.next, emoji: step.emoji,
          step: stepIdx + 1, total: BOOKING_STEPS.length,
          bg: T.tealLight, color: T.teal,
          isBooking: true,
        };
      }
      return { label: "Booked", next: "Input flight info for pickup service", emoji: "📖", step: 0, total: BOOKING_STEPS.length, bg: T.tealLight, color: T.teal, isBooking: true };
    }
    if (status === "pending") {
      return { label: "Awaiting Quotes", next: "Dentists are reviewing your case", emoji: "⏳", step: 1, total: 3, bg: T.amberLight, color: T.amber, isBooking: false };
    }
    if (status === "quotes_received") {
      return { label: "Quotes Ready", next: "Review & accept a quote", emoji: "📋", step: 2, total: 3, bg: T.yellowLight, color: T.yellow, isBooking: false };
    }
    return { label: "Submitted", next: "Waiting for processing", emoji: "📄", step: 0, total: 3, bg: T.bg, color: T.slate, isBooking: false };
  };

  const handleCasePress = (c: PatientCase) => {
    if (c.status === "booked") {
      const bk = bookings.find((b) => b.caseId === c.id);
      if (bk?.status === "confirmed") {
        router.push(`/patient/arrival-info?bookingId=${bk.id}` as any);
        return;
      } else if (bk?.status === "flight_submitted") {
        router.push(`/patient/hotel-arrived?bookingId=${bk.id}` as any);
        return;
      } else if (bk?.status === "arrived_korea") {
        router.push(`/patient/clinic-checkin?bookingId=${bk.id}` as any);
        return;
      } else if (bk?.status === "checked_in_clinic") {
        router.push(`/patient/clinic-checkin?bookingId=${bk.id}` as any);
        return;
      } else if (bk?.status === "treatment_done") {
        router.push(`/patient/final-payment?bookingId=${bk.id}` as any);
        return;
      } else if (bk?.status === "between_visits") {
        router.push(`/patient/stay-or-return?bookingId=${bk.id}` as any);
        return;
      } else if (bk?.status === "returning_home") {
        router.push(`/patient/departure-pickup?bookingId=${bk.id}` as any);
        return;
      } else if (bk?.status === "payment_complete") {
        router.push(`/patient/departure-pickup?bookingId=${bk.id}` as any);
        return;
      } else if (bk?.status === "departure_set") {
        router.push(`/patient/treatment-complete?bookingId=${bk.id}` as any);
        return;
      } else if (bk?.status === "cancelled") {
        router.push(`/patient/quotes?caseId=${c.id}` as any);
        return;
      }
    }
    router.push(`/patient/quotes?caseId=${c.id}` as any);
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient
        colors={["#3D0070", "#2F0058", "#220040"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerTop}>
          <TouchableOpacity
            style={s.profileRow}
            onPress={() => router.push("/patient/profile" as any)}
            activeOpacity={0.7}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={s.avatarImg} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
            )}
            <View>
              <Text style={s.greeting}>Welcome back</Text>
              <Text style={s.userName}>{firstName}</Text>
            </View>
          </TouchableOpacity>

          <View style={s.headerActions}>
            <TouchableOpacity
              style={s.headerIconBtn}
              onPress={() => router.push("/patient/alerts" as any)}
            >
              <Feather name="bell" size={18} color="rgba(255,255,255,0.85)" />
              {unreadCount > 0 && (
                <View style={s.notifDot} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.headerIconBtn}
              onPress={() => router.push("/dev-menu" as any)}
            >
              <Feather name="settings" size={18} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.headerIconBtn}
              onPress={() => setMenuOpen(!menuOpen)}
            >
              <Feather name="more-vertical" size={18} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats with toggle */}
        <View style={s.statsToggleWrapper}>
          <Animated.View style={[s.statsClip, { marginTop: statsAnim }]}>
            <View style={s.statsRow}>
              {([
                { key: "with_quotes" as const, label: "Quotes", count: totalQuotes },
                { key: "bookings" as const, label: "Bookings", count: bookings.length },
                { key: "in_treatment" as const, label: "Treatment", count: inTreatmentCount },
                { key: "completed" as const, label: "Completed", count: completedCount },
              ]).map((item) => {
                const isActive = statusFilter === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[s.statCard, isActive && s.statCardActive]}
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

      {/* Kebab dropdown menu */}
      {menuOpen && (
        <>
          <TouchableOpacity
            style={s.menuOverlay}
            activeOpacity={1}
            onPress={() => setMenuOpen(false)}
          />
          <View style={s.menuDropdown}>
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuOpen(false); router.push("/patient/help-center" as any); }}>
              <Text style={s.menuItemText}>Help Center</Text>
            </TouchableOpacity>
            <View style={s.menuDivider} />
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuOpen(false); router.push("/patient/affiliate-clinics" as any); }}>
              <Text style={s.menuItemText}>Affiliate Clinics</Text>
            </TouchableOpacity>
            <View style={s.menuDivider} />
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuOpen(false); }}>
              <Text style={s.menuItemText}>Menu Item 3</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section header */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{filterSectionTitle}</Text>
          <TouchableOpacity
            style={s.newCaseBtn}
            onPress={() => router.push("/patient/treatment-select" as any)}
            activeOpacity={0.7}
          >
            <Text style={s.newCasePlus}>+</Text>
            <Text style={s.newCaseText}>New Case</Text>
          </TouchableOpacity>
        </View>

        {/* Empty state */}
        {cases.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIconWrap}>
              <Text style={s.emptyIcon}>📋</Text>
            </View>
            <Text style={s.emptyTitle}>No cases yet</Text>
            <Text style={s.emptyDesc}>
              Create your first case to get quotes{"\n"}from dentists in Korea
            </Text>
            <TouchableOpacity
              style={s.createBtn}
              onPress={() => router.push("/patient/treatment-select" as any)}
              activeOpacity={0.85}
            >
              <Text style={s.createBtnText}>Create First Case</Text>
            </TouchableOpacity>
          </View>
        ) : sortedCases.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIconWrap}>
              <Text style={s.emptyIcon}>🔍</Text>
            </View>
            <Text style={s.emptyTitle}>No cases here</Text>
            <Text style={s.emptyDesc}>
              No cases match this filter.{"\n"}Tap the filter again to show all cases.
            </Text>
          </View>
        ) : (
          /* Case cards */
          sortedCases.map((c) => {
            const progress = getCaseProgress(c.status, c.id);
            const qCount = quoteCounts[c.id] || 0;

            return (
              <TouchableOpacity
                key={c.id}
                style={s.caseCard}
                onPress={() => handleCasePress(c)}
                activeOpacity={0.7}
              >
                {/* Status banner */}
                <View style={[s.statusBanner, { backgroundColor: progress.bg }]}>
                  <Text style={s.statusBannerEmoji}>{progress.emoji}</Text>
                  <Text style={[s.statusBannerText, { color: progress.color }]}>{progress.label}</Text>
                </View>

                {/* Top row */}
                <View style={s.caseTop}>
                  <View style={s.caseIconWrap}>
                    <Text style={s.caseIconText}>{getCaseEmoji(c.treatments)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.caseTitle}>Case #{c.id}</Text>
                    <Text style={s.caseMeta}>{c.date} · {c.country}</Text>
                  </View>
                  {qCount > 0 && c.status !== "booked" && (
                    <View style={s.quoteCount}>
                      <Text style={s.quoteCountText}>{qCount} quote{qCount > 1 ? "s" : ""}</Text>
                    </View>
                  )}
                  {c.status === "booked" && (() => {
                    const bk = bookings.find((b) => b.caseId === c.id);
                    return bk && bk.status !== "cancelled" && bk.status !== "treatment_done" && bk.status !== "payment_complete" && bk.status !== "departure_set" ? (
                      <TouchableOpacity
                        style={s.manageBtn}
                        onPress={(e) => { e.stopPropagation(); setManageBooking(bk); }}
                        activeOpacity={0.6}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={s.manageBtnText}>⋯</Text>
                      </TouchableOpacity>
                    ) : null;
                  })()}
                </View>

                {/* Treatment tags */}
                <View style={s.tagRow}>
                  {c.treatments.slice(0, 3).map((t) => (
                    <View key={t.name} style={s.tag}>
                      <Text style={s.tagText}>{t.name}</Text>
                      <Text style={s.tagQty}>×{t.qty}</Text>
                    </View>
                  ))}
                  {c.treatments.length > 3 && (
                    <View style={[s.tag, { backgroundColor: "rgba(100,116,139,0.08)" }]}>
                      <Text style={[s.tagText, { color: T.slate }]}>+{c.treatments.length - 3}</Text>
                    </View>
                  )}
                </View>

                {/* Step progress bar for booked cases */}
                {progress.isBooking && progress.step > 0 && (
                  <View style={s.stepProgressWrap}>
                    {BOOKING_STEPS.slice(0, -1).map((st, i) => {
                      const stepNum = i + 1;
                      const isCompleted = stepNum < progress.step;
                      const isCurrent = stepNum === progress.step;
                      return (
                        <React.Fragment key={st.key}>
                          <View style={[
                            s.stepDot,
                            isCompleted && s.stepDotCompleted,
                            isCurrent && s.stepDotCurrent,
                          ]} />
                          {i < BOOKING_STEPS.length - 2 && (
                            <View style={[s.stepLine, isCompleted && s.stepLineCompleted]} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </View>
                )}

                {/* Next action */}
                <View style={s.progressSection}>
                  <View style={s.nextRow}>
                    <Text style={s.nextLabel}>Next:</Text>
                    <Text style={s.nextAction}>{progress.next}</Text>
                    <View style={s.nextArrowCircle}>
                      <View style={s.chevron} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}


        {/* Logout */}
        <TouchableOpacity
          style={s.logoutBtn}
          onPress={() => {
            Alert.alert(
              "Log Out",
              "Are you sure you want to log out?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Log Out",
                  style: "destructive",
                  onPress: async () => {
                    await store.clearCurrentUser();
                    router.replace("/auth/role-select" as any);
                  },
                },
              ],
            );
          }}
          activeOpacity={0.7}
        >
          <Text style={s.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 70 }} />
      </ScrollView>

      {/* ── Manage Booking Modal ── */}
      <Modal visible={!!manageBooking} transparent animationType="fade" onRequestClose={() => setManageBooking(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setManageBooking(null)}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Manage Booking</Text>

            <TouchableOpacity
              style={s.modalOption}
              activeOpacity={0.7}
              onPress={() => {
                if (!manageBooking) return;
                const bk = manageBooking;

                const goReschedule = () => {
                  setManageBooking(null);
                  const visitsJson = JSON.stringify(
                    (bk.visitDates || []).map((v) => ({
                      visit: v.visit, description: v.description,
                      gapMonths: v.gapMonths, gapDays: v.gapDays,
                      paymentAmount: v.paymentAmount, paymentPercent: v.paymentPercent,
                    }))
                  );
                  router.push({
                    pathname: "/patient/visit-schedule" as any,
                    params: {
                      mode: "reschedule", bookingId: bk.id,
                      caseId: bk.caseId, quoteId: bk.quoteId || "",
                      totalPrice: String(bk.totalPrice),
                      dentistName: bk.dentistName, clinicName: bk.clinicName,
                      visitsJson, amount: "", duration: "",
                    },
                  });
                };

                // Check if first visit is within 7 days
                const firstDate = bk.visitDates?.[0]?.date;
                if (firstDate) {
                  const diff = Math.ceil((new Date(firstDate).getTime() - Date.now()) / 86400000);
                  if (diff <= 7) {
                    Alert.alert(
                      "Visit is coming up soon",
                      diff <= 0
                        ? "Your visit date has already passed. Rescheduling may not be possible."
                        : `Your first visit is only ${diff} day${diff === 1 ? "" : "s"} away. The clinic may not be able to accommodate a schedule change on short notice.`,
                      [
                        { text: "Cancel", style: "cancel", onPress: () => setManageBooking(null) },
                        { text: "Reschedule Anyway", onPress: goReschedule },
                      ]
                    );
                    return;
                  }
                }
                goReschedule();
              }}
            >
              <Text style={s.modalOptionIcon}>📅</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.modalOptionLabel}>Reschedule my booking</Text>
                <Text style={s.modalOptionDesc}>Change your visit dates & times</Text>
              </View>
              <View style={s.modalChevron} />
            </TouchableOpacity>

            <View style={s.modalDivider} />

            <TouchableOpacity
              style={s.modalOption}
              activeOpacity={0.7}
              onPress={() => {
                if (!manageBooking) return;
                const id = manageBooking.id;
                setManageBooking(null);
                router.push(`/patient/cancel-booking?bookingId=${id}` as any);
              }}
            >
              <Text style={s.modalOptionIcon}>✕</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.modalOptionLabel, { color: "#b91c1c" }]}>Cancel my booking</Text>
                <Text style={s.modalOptionDesc}>Cancel and request a refund</Text>
              </View>
              <View style={[s.modalChevron, { borderColor: "#b91c1c" }]} />
            </TouchableOpacity>

            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setManageBooking(null)} activeOpacity={0.8}>
              <Text style={s.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  /* Header */
  header: {
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8,
  },
  headerTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 22,
  },
  profileRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  avatarImg: {
    width: 44, height: 44, borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  avatarText: {
    fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.9)",
  },
  greeting: {
    fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: "500",
  },
  userName: {
    fontSize: 20, fontWeight: "700", color: T.white, marginTop: 1,
  },
  headerActions: {
    flexDirection: "row", alignItems: "center", gap: 2,
  },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  menuOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99,
  },
  menuDropdown: {
    position: "absolute", top: 110, right: 16, zIndex: 100,
    backgroundColor: "#fff", borderRadius: 12, minWidth: 180,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  menuItem: { paddingVertical: 14, paddingHorizontal: 16 },
  menuItemText: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  menuDivider: { height: 1, backgroundColor: "#e2e8f0", marginHorizontal: 12 },
  notifDot: {
    position: "absolute", top: 6, right: 6,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: "#ef4444", borderWidth: 1.5, borderColor: "rgba(74,0,128,0.8)",
  },

  /* Stats */
  statsToggleWrapper: {
    overflow: "hidden",
  },
  statsToggleBar: {
    backgroundColor: "transparent",
    alignItems: "center", paddingTop: 4, paddingBottom: 2,
  },
  statsClip: {},
  statsRow: {
    flexDirection: "row", gap: 8,
  },
  statsToggleBtn: {
    width: 24, height: 14, borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  statsToggleIcon: {
    fontSize: 8, color: "rgba(255,255,255,0.7)",
  },
  statCard: {
    flex: 1, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 6,
    borderWidth: 1.5, borderColor: "transparent",
  },
  statCardActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "rgba(255,255,255,0.4)",
  },
  statNum: {
    fontSize: 22, fontWeight: "800", color: T.white,
  },
  statNumActive: {
    color: T.white,
  },
  statLabel: {
    fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 2,
    fontWeight: "500", letterSpacing: 0.2,
  },
  statLabelActive: {
    color: "rgba(255,255,255,0.9)", fontWeight: "600",
  },

  /* Content */
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },

  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingTop: 22, paddingBottom: 14,
  },
  sectionTitle: {
    fontSize: 17, fontWeight: "700", color: T.navy,
  },
  newCaseBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: T.tealLight, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  newCasePlus: { fontSize: 16, fontWeight: "600", color: T.teal },
  newCaseText: { fontSize: 13, fontWeight: "600", color: T.teal },

  /* Empty state */
  emptyCard: {
    backgroundColor: T.white, borderRadius: 20, padding: 36,
    alignItems: "center", borderWidth: 1, borderColor: T.border,
    borderStyle: "dashed",
  },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: T.bg, alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  emptyIcon: { fontSize: 28 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: T.navy, marginBottom: 6 },
  emptyDesc: {
    fontSize: 13, color: T.slate, textAlign: "center",
    lineHeight: 20, marginBottom: 22,
  },
  createBtn: {
    backgroundColor: T.teal, borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  createBtnText: { color: T.white, fontSize: 14, fontWeight: "600" },

  /* Case card */
  caseCard: {
    backgroundColor: T.white, borderRadius: 18, overflow: "hidden",
    borderWidth: 1, borderColor: T.border, marginBottom: 12,
    shadowColor: "#0f172a", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
  },
  statusBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  statusBannerEmoji: { fontSize: 16 },
  statusBannerText: { fontSize: 14, fontWeight: "800" },
  caseTop: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingTop: 14,
  },
  caseIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: T.tealLight, alignItems: "center", justifyContent: "center",
  },
  caseIconText: { fontSize: 20 },
  caseTitle: { fontSize: 15, fontWeight: "700", color: T.navy },
  caseMeta: { fontSize: 12, color: T.slateLight, marginTop: 2 },
  /* Tags */
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 16, marginTop: 12 },
  tag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: T.bg, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  tagText: { fontSize: 12, fontWeight: "500", color: T.navyMid },
  tagQty: { fontSize: 11, fontWeight: "600", color: T.slateLight },

  /* Quote count (moved to top row) */
  quoteCount: {
    backgroundColor: "#fef9c3", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  quoteCountText: { fontSize: 12, fontWeight: "600", color: "#a16207" },

  /* Progress section */
  stepProgressWrap: {
    flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 16,
  },
  stepDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "#e2e8f0", borderWidth: 1.5, borderColor: "#e2e8f0",
  },
  stepDotCompleted: {
    backgroundColor: "#4A0080", borderColor: "#4A0080",
  },
  stepDotCurrent: {
    backgroundColor: "#fff", borderColor: "#4A0080", borderWidth: 2, width: 12, height: 12, borderRadius: 6,
  },
  stepLine: {
    flex: 1, height: 2, backgroundColor: "#e2e8f0",
  },
  stepLineCompleted: {
    backgroundColor: "#4A0080",
  },
  progressSection: {
    backgroundColor: T.bg, padding: 12, marginTop: 12, gap: 10,
  },
  statusRow: {
    flexDirection: "row", alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  statusEmoji: { fontSize: 13 },
  statusText: { fontSize: 12, fontWeight: "700" },
  nextRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 2,
  },
  nextLabel: {
    fontSize: 11, fontWeight: "600", color: T.slateLight,
  },
  nextAction: {
    fontSize: 12, fontWeight: "600", color: T.navy, flex: 1,
  },
  nextArrowCircle: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(74,0,128,0.15)",
    alignItems: "center", justifyContent: "center",
    marginLeft: 2,
  },
  chevron: {
    width: 7, height: 7,
    borderTopWidth: 2, borderRightWidth: 2,
    borderColor: T.teal,
    transform: [{ rotate: "45deg" }],
    marginLeft: -1,
  },

  /* Logout */
  logoutBtn: {
    alignSelf: "center", marginTop: 28,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: T.border,
  },
  logoutText: { fontSize: 13, fontWeight: "500", color: T.slate },

  /* ── Manage booking button ── */
  manageBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(74,0,128,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  manageBtnText: { fontSize: 18, fontWeight: "900", color: T.teal, marginTop: -2 },

  /* ── Bottom Bar ── */
  /* ── Manage Booking Modal ── */
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#d1d5db", alignSelf: "center", marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17, fontWeight: "800", color: T.navy,
    marginBottom: 18,
  },
  modalOption: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, gap: 14,
  },
  modalOptionIcon: { fontSize: 20, width: 32, textAlign: "center" },
  modalOptionLabel: { fontSize: 15, fontWeight: "700", color: T.teal },
  modalOptionDesc: { fontSize: 12, color: T.slate, marginTop: 1 },
  modalDivider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 2 },
  modalChevron: {
    width: 7, height: 7,
    borderTopWidth: 1.8, borderRightWidth: 1.8,
    borderColor: T.teal, transform: [{ rotate: "45deg" }],
  },
  modalCloseBtn: {
    alignItems: "center", paddingVertical: 14, marginTop: 14,
    backgroundColor: "#f8fafc", borderRadius: 14,
    borderWidth: 1, borderColor: T.border,
  },
  modalCloseBtnText: { fontSize: 14, fontWeight: "600", color: T.slate },
});
