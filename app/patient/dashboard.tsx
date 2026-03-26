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
import { resetNavigationHistory } from "../../lib/navigationHistory";
import { Booking, PatientCase, store } from "../../lib/store";

import { PatientTheme, SharedColors } from "../../constants/theme";
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
  const [deleteCaseId, setDeleteCaseId] = useState<string | null>(null);
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
    const raw = await store.getCases();
    const c = raw.filter((x) => !x.hidden);
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
    { key: "payment_complete", label: "Paid", next: "Continue", emoji: "✅" },
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
          bg: SharedColors.redLight, color: SharedColors.red,
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
          bg: PatientTheme.primaryLight, color: PatientTheme.primary,
          isBooking: true,
        };
      }
      return { label: "Booked", next: "Input flight info for pickup service", emoji: "📖", step: 0, total: BOOKING_STEPS.length, bg: PatientTheme.primaryLight, color: PatientTheme.primary, isBooking: true };
    }
    if (status === "pending") {
      return { label: "Awaiting Quotes", next: "Dentists are reviewing your case", emoji: "⏳", step: 1, total: 3, bg: SharedColors.amberLight, color: SharedColors.amber, isBooking: false };
    }
    if (status === "quotes_received") {
      return { label: "Quotes Ready", next: "Review & accept a quote", emoji: "📋", step: 2, total: 3, bg: SharedColors.yellowLight, color: SharedColors.yellow, isBooking: false };
    }
    return { label: "Submitted", next: "Waiting for processing", emoji: "📄", step: 0, total: 3, bg: SharedColors.bg, color: SharedColors.slate, isBooking: false };
  };

  const handleCasePress = (c: PatientCase) => {
    if (c.status === "booked") {
      const bk = bookings.find((b) => b.caseId === c.id);
      // TODO(server): flight_submitted should go to case-hub once date/time validation is implemented
      if (bk?.status === "confirmed") {
        router.push(`/patient/case-hub?bookingId=${bk.id}&caseId=${c.id}` as any);
        return;
      }
      if (bk?.status === "flight_submitted") {
        router.push(`/patient/hotel-arrived?bookingId=${bk.id}` as any);
        return;
      } else if (bk?.status === "arrived_korea") {
        router.push(`/patient/clinic-checkin?bookingId=${bk.id}` as any);
        return;
      } else if (bk?.status === "checked_in_clinic") {
        router.push(`/patient/clinic-checkin?bookingId=${bk.id}` as any);
        return;
      } else if (bk?.status === "treatment_done") {
        router.push(`/patient/visit-checkout?bookingId=${bk.id}` as any);
        return;
      } else if (bk?.status === "between_visits") {
        router.push(`/patient/stay-or-return?bookingId=${bk.id}` as any);
        return;
      } else if (bk?.status === "returning_home") {
        router.push(`/patient/departure-pickup?bookingId=${bk.id}` as any);
        return;
      } else if (bk?.status === "payment_complete") {
        if (bk.dropOffUnlocked) {
          router.push(`/patient/departure-pickup?bookingId=${bk.id}` as any);
        } else {
          router.push(`/patient/write-review?bookingId=${bk.id}` as any);
        }
        return;
      } else if (bk?.status === "departure_set") {
        router.push(`/patient/write-review?bookingId=${bk.id}` as any);
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
        colors={[...PatientTheme.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerTop}>
          <TouchableOpacity
            style={s.profileRow}
            onPress={() => router.push("/patient/profile" as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="View profile"
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
              onPress={() => router.push("/dev-menu" as any)}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Feather name="settings" size={18} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.headerIconBtn}
              onPress={() => router.push("/patient/alerts" as any)}
              accessibilityRole="button"
              accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            >
              <Feather name="bell" size={18} color="rgba(255,255,255,0.85)" />
              {unreadCount > 0 && (
                <View style={s.notifDot} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.headerIconBtn}
              onPress={() => setMenuOpen(!menuOpen)}
              accessibilityRole="button"
              accessibilityLabel="More options"
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
            accessibilityRole="button"
            accessibilityLabel="Create new case"
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
              accessibilityRole="button"
              accessibilityLabel="Create first case"
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
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Case ${c.id}, ${progress.label}, ${c.treatments.map(t => t.name).join(", ")}`}
              >
                {/* Status strip + badge */}
                <View style={[s.statusStrip, { backgroundColor: progress.color }]} />
                <View style={s.cardInner}>
                  <View style={s.statusRow2}>
                    <View style={[s.statusPill, { backgroundColor: progress.bg }]}>
                      <Text style={s.statusPillEmoji}>{progress.emoji}</Text>
                      <Text style={[s.statusPillText, { color: progress.color }]}>{progress.label}</Text>
                    </View>
                    {qCount > 0 && c.status !== "booked" && (
                      <View style={s.quoteCount}>
                        <Text style={s.quoteCountText}>{qCount} quote{qCount > 1 ? "s" : ""}</Text>
                      </View>
                    )}
                    {c.status === "booked" && (() => {
                      const bk = bookings.find((b) => b.caseId === c.id);
                      if (bk?.status === "cancelled") {
                        return (
                          <TouchableOpacity
                            style={s.manageBtn}
                            onPress={(e) => { e.stopPropagation(); setDeleteCaseId(c.id); }}
                            activeOpacity={0.6}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={s.manageBtnText}>⋯</Text>
                          </TouchableOpacity>
                        );
                      }
                      return bk && bk.status !== "treatment_done" && bk.status !== "payment_complete" && bk.status !== "departure_set" ? (
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

                  {/* Case info */}
                  <View style={s.caseTop}>
                    <View style={s.caseIconWrap}>
                      <Text style={s.caseIconText}>{getCaseEmoji(c.treatments)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.caseTitle}>Case #{c.id}</Text>
                      <Text style={s.caseMeta}>{c.date} · {c.country}</Text>
                    </View>
                  </View>

                  {/* Treatment tags */}
                  <View style={s.tagRow}>
                    {c.treatments.slice(0, 3).map((t) => (
                      <View key={t.name} style={s.tag}>
                        <Text style={s.tagText}>{t.name}</Text>
                        <Text style={s.tagQty}>x{t.qty}</Text>
                      </View>
                    ))}
                    {c.treatments.length > 3 && (
                      <View style={[s.tag, s.tagMore]}>
                        <Text style={s.tagMoreText}>+{c.treatments.length - 3}</Text>
                      </View>
                    )}
                  </View>

                  {/* Step progress bar for booked cases */}
                  {progress.isBooking && progress.step > 0 && (
                    <View style={s.stepProgressWrap}>
                      <View style={s.stepTrack}>
                        <View style={[s.stepFill, { width: `${((progress.step - 1) / (BOOKING_STEPS.length - 2)) * 100}%`, backgroundColor: progress.color }]} />
                      </View>
                      <Text style={[s.stepText, { color: progress.color }]}>{progress.step}/{BOOKING_STEPS.length - 1}</Text>
                    </View>
                  )}

                  {/* Next action */}
                  <View style={s.nextSection}>
                    <Text style={s.nextLabel}>Next:</Text>
                    <Text style={s.nextAction}>{progress.next}</Text>
                    <Text style={s.nextArrow}>›</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}


        {/* Logout */}
        <TouchableOpacity
          style={s.logoutBtn}
          accessibilityRole="button"
          accessibilityLabel="Log out"
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
                    resetNavigationHistory("/auth/role-select");
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
                  "This cancelled booking will be removed from your dashboard.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: async () => {
                      await store.updateCase(caseId!, { hidden: true } as any);
                      loadData();
                    }},
                  ],
                );
              }}
            >
              <Text style={s.modalOptionIcon}>🗑️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.modalOptionLabel, { color: "#b91c1c" }]}>Delete this card</Text>
                <Text style={s.modalOptionDesc}>Remove this cancelled booking from your dashboard</Text>
              </View>
              <View style={[s.modalChevron, { borderColor: "#b91c1c" }]} />
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
    fontSize: 20, fontWeight: "700", color: SharedColors.white, marginTop: 1,
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
    backgroundColor: SharedColors.white, borderRadius: 12, minWidth: 180,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  menuItem: { paddingVertical: 14, paddingHorizontal: 16 },
  menuItemText: { fontSize: 15, fontWeight: "600", color: SharedColors.navy },
  menuDivider: { height: 1, backgroundColor: SharedColors.border, marginHorizontal: 12 },
  notifDot: {
    position: "absolute", top: 6, right: 6,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: SharedColors.red, borderWidth: 1.5, borderColor: "rgba(74,0,128,0.8)",
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
    fontSize: 22, fontWeight: "800", color: SharedColors.white,
  },
  statNumActive: {
    color: SharedColors.white,
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
    fontSize: 17, fontWeight: "700", color: SharedColors.navy,
  },
  newCaseBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: PatientTheme.primaryLight, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  newCasePlus: { fontSize: 16, fontWeight: "600", color: PatientTheme.primary },
  newCaseText: { fontSize: 13, fontWeight: "600", color: PatientTheme.primary },

  /* Empty state */
  emptyCard: {
    backgroundColor: SharedColors.white, borderRadius: 20, padding: 36,
    alignItems: "center", borderWidth: 1, borderColor: SharedColors.border,
    borderStyle: "dashed",
  },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: SharedColors.bg, alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  emptyIcon: { fontSize: 28 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: SharedColors.navy, marginBottom: 6 },
  emptyDesc: {
    fontSize: 13, color: SharedColors.slate, textAlign: "center",
    lineHeight: 20, marginBottom: 22,
  },
  createBtn: {
    backgroundColor: PatientTheme.primary, borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  createBtnText: { color: SharedColors.white, fontSize: 14, fontWeight: "600" },

  /* Case card — Clean Floating */
  caseCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1.5, borderColor: PatientTheme.primaryBorder,
    shadowColor: "#1e0a3c", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 14, elevation: 4,
  },
  statusStrip: {
    height: 4, width: "100%",
  },
  cardInner: {
    padding: 16,
  },
  statusRow2: {
    flexDirection: "row", alignItems: "center", marginBottom: 14,
  },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  statusPillEmoji: { fontSize: 14 },
  statusPillText: { fontSize: 13, fontWeight: "700" },
  caseTop: {
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  caseIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "#f1ecf7",
    alignItems: "center", justifyContent: "center",
  },
  caseIconText: { fontSize: 19 },
  caseTitle: { fontSize: 15, fontWeight: "700", color: SharedColors.navy },
  caseMeta: { fontSize: 12, color: SharedColors.slateLight, marginTop: 2 },
  /* Tags */
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 },
  tag: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#f4f1f8", borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  tagText: { fontSize: 12, fontWeight: "500", color: "#3d2060" },
  tagQty: { fontSize: 11, fontWeight: "600", color: SharedColors.slateLight },
  tagMore: { backgroundColor: "#f0edf4" },
  tagMoreText: { fontSize: 12, fontWeight: "500", color: SharedColors.slate },

  /* Quote count */
  quoteCount: {
    backgroundColor: SharedColors.yellowLight, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4, marginLeft: "auto",
  },
  quoteCountText: { fontSize: 12, fontWeight: "700", color: "#92400e" },

  /* Progress bar (single track) */
  stepProgressWrap: {
    flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14,
  },
  stepTrack: {
    flex: 1, height: 5, backgroundColor: "#ede9f3", borderRadius: 3, overflow: "hidden",
  },
  stepFill: {
    height: "100%", borderRadius: 3,
  },
  stepText: {
    fontSize: 11, fontWeight: "700",
  },

  /* Next action */
  nextSection: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: "#e8e2f0",
  },
  nextLabel: {
    fontSize: 11, fontWeight: "600", color: SharedColors.slateLight,
  },
  nextAction: {
    fontSize: 13, fontWeight: "600", color: SharedColors.navy, flex: 1,
  },
  nextArrow: {
    fontSize: 22, fontWeight: "300", color: SharedColors.slateLight, marginTop: -1,
  },

  /* Logout */
  logoutBtn: {
    alignSelf: "center", marginTop: 28,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: SharedColors.border,
  },
  logoutText: { fontSize: 13, fontWeight: "500", color: SharedColors.slate },

  /* ── Manage booking button ── */
  manageBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#f4f1f8",
    alignItems: "center", justifyContent: "center",
    marginLeft: "auto",
  },
  manageBtnText: { fontSize: 18, fontWeight: "900", color: PatientTheme.primary, marginTop: -2 },

  /* ── Bottom Bar ── */
  /* ── Manage Booking Modal ── */
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: SharedColors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#d1d5db", alignSelf: "center", marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17, fontWeight: "800", color: SharedColors.navy,
    marginBottom: 18,
  },
  modalOption: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, gap: 14,
  },
  modalOptionIcon: { fontSize: 20, width: 32, textAlign: "center" },
  modalOptionLabel: { fontSize: 15, fontWeight: "700", color: PatientTheme.primary },
  modalOptionDesc: { fontSize: 12, color: SharedColors.slate, marginTop: 1 },
  modalDivider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 2 },
  modalChevron: {
    width: 7, height: 7,
    borderTopWidth: 1.8, borderRightWidth: 1.8,
    borderColor: PatientTheme.primary, transform: [{ rotate: "45deg" }],
  },
  modalCloseBtn: {
    alignItems: "center", paddingVertical: 14, marginTop: 14,
    backgroundColor: SharedColors.bg, borderRadius: 14,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  modalCloseBtnText: { fontSize: 14, fontWeight: "600", color: SharedColors.slate },
});
