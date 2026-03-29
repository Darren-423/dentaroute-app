import AsyncStorage from "@react-native-async-storage/async-storage";
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

import EnrichmentChecklist from "../../components/EnrichmentChecklist";
import { PatientTheme, SharedColors } from "../../constants/theme";


// ── Journey Steps (Feather icons) ──
type JourneyStepDef = {
  key: string;
  label: string;
  summary: (bk: Booking) => string;
  icon: keyof typeof Feather.glyphMap;
  actionLabel?: string;
  actionRoute?: (bk: Booking) => string;
};

const JOURNEY_STEPS: JourneyStepDef[] = [
  {
    key: "confirmed", label: "Trip Details", icon: "navigation",
    summary: (bk) => bk.arrivalInfo
      ? `${bk.arrivalInfo.airline || ""} ${bk.arrivalInfo.flightNumber || ""}`.trim() || "Flight info submitted"
      : "Add flight & hotel info",
    actionLabel: "Add Trip Info",
    actionRoute: (bk) => `/patient/case-hub?bookingId=${bk.id}&caseId=${bk.caseId}`,
  },
  {
    key: "flight_submitted", label: "Hotel Check-in", icon: "home",
    summary: (bk) => bk.arrivalInfo?.hotelName || "Confirm arrival",
    actionLabel: "Confirm Arrival",
    actionRoute: (bk) => `/patient/hotel-arrived?bookingId=${bk.id}`,
  },
  {
    key: "arrived_korea", label: "Clinic Visit", icon: "map-pin",
    summary: (bk) => {
      const v = bk.visitDates?.[0];
      return v ? `${bk.clinicName} · ${v.confirmedTime || v.date}` : bk.clinicName;
    },
    actionLabel: "Check In",
    actionRoute: (bk) => `/patient/clinic-checkin?bookingId=${bk.id}`,
  },
  {
    key: "checked_in_clinic", label: "Treatment", icon: "activity",
    summary: () => "In progress",
  },
  {
    key: "treatment_done", label: "Service Plan", icon: "credit-card",
    summary: (bk) => `$${(bk.totalPrice || 0).toLocaleString()}`,
    actionLabel: "Pay Now",
    actionRoute: (bk) => `/patient/visit-checkout?bookingId=${bk.id}`,
  },
  {
    key: "between_visits", label: "Next Visit", icon: "refresh-cw",
    summary: (bk) => {
      const cur = bk.currentVisit || 1;
      const total = bk.visitDates?.length || 1;
      return total > 1 ? `Visit ${cur}/${total}` : "Stay or return";
    },
    actionLabel: "Continue",
    actionRoute: (bk) => `/patient/stay-or-return?bookingId=${bk.id}`,
  },
  {
    key: "returning_home", label: "Departure", icon: "log-out",
    summary: (bk) => bk.departurePickup ? `Pickup ${bk.departurePickup.pickupTime || "TBD"}` : "Arrange pickup",
    actionLabel: "Arrange Departure",
    actionRoute: (bk) => bk.dropOffUnlocked ? `/patient/departure-pickup?bookingId=${bk.id}` : `/patient/write-review?bookingId=${bk.id}`,
  },
  {
    key: "payment_complete", label: "Review", icon: "star",
    summary: () => "Share your experience",
    actionLabel: "Leave Review",
    actionRoute: (bk) => bk.dropOffUnlocked ? `/patient/departure-pickup?bookingId=${bk.id}` : `/patient/write-review?bookingId=${bk.id}`,
  },
  {
    key: "departure_set", label: "Complete", icon: "check-circle",
    summary: () => "Journey complete!",
    actionLabel: "Leave Review",
    actionRoute: (bk) => `/patient/write-review?bookingId=${bk.id}`,
  },
];

const MANAGE_HIDDEN = ["treatment_done", "payment_complete", "departure_set"];

const getStatusColor = (status: string, bkStatus?: string): string => {
  if (status === "pending") return "#f59e0b";
  if (status === "quotes_received") return "#a16207";
  if (status === "booked" && bkStatus === "cancelled") return "#ef4444";
  if (status === "booked") return "#4A0080";
  return "#64748b";
};

const getStatusLabel = (status: string, bkStatus?: string): string => {
  if (status === "pending") return "AWAITING QUOTES";
  if (status === "quotes_received") return "QUOTES READY";
  if (status === "booked" && bkStatus === "cancelled") return "CANCELLED";
  if (status === "booked") return "BOOKED";
  return "SUBMITTED";
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
  const [manageCaseId, setManageCaseId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [enrichmentNeeded, setEnrichmentNeeded] = useState<Record<string, boolean>>({});
  const [expandedEnrich, setExpandedEnrich] = useState<string | null>(null);
  const [expandedJourney, setExpandedJourney] = useState<string | null>(null);

  // Stats toggle
  const STATS_HEIGHT = 80;
  const [statsOpen, setStatsOpen] = useState(false);
  const statsAnim = useRef(new Animated.Value(-STATS_HEIGHT)).current;
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

    // Check enrichment completion for pending/quotes_received cases
    const [medical, dental, files] = await Promise.all([
      store.getPatientMedical(),
      store.getPatientDental(),
      store.getPatientFiles(),
    ]);
    const hasMedical = !!(medical?.conditions?.length || medical?.medications?.length || medical?.allergies?.length);
    const hasDental = !!(dental?.issues?.length || dental?.lastVisit);
    const hasFiles = !!((files?.xrays?.length || 0) + (files?.treatmentPlans?.length || 0) + (files?.photos?.length || 0));
    const needsEnrichment = !hasMedical || !hasDental || !hasFiles;
    const enrichMap: Record<string, boolean> = {};
    for (const cs of c) {
      if ((cs.status === "pending" || cs.status === "quotes_received") && needsEnrichment) {
        enrichMap[cs.id] = true;
      }
    }
    setEnrichmentNeeded(enrichMap);
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

  const sortedCases = useMemo(() => {
    const getPriority = (c: PatientCase): number => {
      if (c.status === "booked") {
        const bk = bookings.find((b) => b.caseId === c.id);
        if (bk?.status === "cancelled") return -1;
        const stepIdx = JOURNEY_STEPS.findIndex((st) => st.key === bk?.status);
        return stepIdx >= 0 ? 100 + stepIdx : 100;
      }
      if (c.status === "quotes_received") return 10;
      if (c.status === "pending") return 5;
      return 0;
    };
    return [...filteredCases].sort((a, b) => getPriority(b) - getPriority(a));
  }, [filteredCases, bookings]);

  const BOOKING_STEPS_NAV: { key: string; route?: (bk: Booking) => string }[] = [
    { key: "confirmed", route: (bk) => `/patient/case-hub?bookingId=${bk.id}&caseId=${bk.caseId}` },
    { key: "flight_submitted", route: (bk) => `/patient/hotel-arrived?bookingId=${bk.id}` },
    { key: "arrived_korea", route: (bk) => `/patient/clinic-checkin?bookingId=${bk.id}` },
    { key: "checked_in_clinic" },
    { key: "treatment_done", route: (bk) => `/patient/visit-checkout?bookingId=${bk.id}` },
    { key: "between_visits", route: (bk) => `/patient/stay-or-return?bookingId=${bk.id}` },
    { key: "returning_home", route: (bk) => bk.dropOffUnlocked ? `/patient/departure-pickup?bookingId=${bk.id}` : `/patient/write-review?bookingId=${bk.id}` },
    { key: "payment_complete", route: (bk) => bk.dropOffUnlocked ? `/patient/departure-pickup?bookingId=${bk.id}` : `/patient/write-review?bookingId=${bk.id}` },
    { key: "departure_set", route: (bk) => `/patient/write-review?bookingId=${bk.id}` },
  ];

  const handleCasePress = (c: PatientCase) => {
    if (c.status === "booked") {
      const bk = bookings.find((b) => b.caseId === c.id);
      if (!bk || bk.status === "cancelled") {
        router.push(`/patient/quotes?caseId=${c.id}` as any);
        return;
      }
      const currentStep = BOOKING_STEPS_NAV.find(s => s.key === bk.status);
      if (currentStep?.route) {
        router.push(currentStep.route(bk) as any);
      }
      return;
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

      {/* Kebab dropdown menu */}
      {menuOpen && (
        <>
          <TouchableOpacity
            style={s.menuOverlay}
            activeOpacity={1}
            onPress={() => setMenuOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          />
          <View style={s.menuDropdown}>
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuOpen(false); router.push("/patient/help-center" as any); }} accessibilityRole="button" accessibilityLabel="Help Center">
              <Text style={s.menuItemText}>Help Center</Text>
            </TouchableOpacity>
            <View style={s.menuDivider} />
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuOpen(false); router.push("/patient/affiliate-clinics" as any); }} accessibilityRole="button" accessibilityLabel="Affiliate Clinics">
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
            onPress={() => router.push("/patient/treatment-intent" as any)}
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
            <Text style={s.emptyTitle}>Start your dental journey</Text>
            <Text style={s.emptyDesc}>
              Get quotes from top dentists in Korea{"\n"}and save up to 70% on dental care
            </Text>
            <Text style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginBottom: 16 }}>
              500+ patients treated · Average savings: 60%
            </Text>
            <TouchableOpacity
              style={s.createBtn}
              onPress={() => router.push("/patient/treatment-intent" as any)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Find a dentist"
            >
              <Text style={s.createBtnText}>Find a Dentist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/patient/help-center" as any)}
              activeOpacity={0.7}
              style={{ marginTop: 12 }}
              accessibilityRole="button"
              accessibilityLabel="How it works"
            >
              <Text style={{ fontSize: 14, color: "#7C3AED", fontWeight: "600", textAlign: "center" }}>How It Works</Text>
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
          /* Case cards — variant-switched rendering */
          sortedCases.map((c) => {
            const qCount = quoteCounts[c.id] || 0;
            const bookedBk = c.status === "booked" ? bookings.find((b) => b.caseId === c.id) : undefined;
            const isActiveBooking = bookedBk && bookedBk.status !== "cancelled";
            const bkStatus = bookedBk?.status;

            const journeyIdx = isActiveBooking ? JOURNEY_STEPS.findIndex((st) => st.key === bkStatus) : -1;
            const journeyStep = journeyIdx >= 0 ? JOURNEY_STEPS[journeyIdx] : null;
            const isInProgress = bkStatus === "checked_in_clinic";
            const showManage = isActiveBooking && !MANAGE_HIDDEN.includes(bkStatus!);

            const handleJourneyCTA = () => {
              if (journeyStep?.actionRoute && bookedBk) {
                router.push(journeyStep.actionRoute(bookedBk) as any);
              }
            };

            const statusColor = getStatusColor(c.status, bkStatus);
            const statusLabel = getStatusLabel(c.status, bkStatus);
            const treatmentLine = c.treatments.map((t) => `${t.name} x${t.qty}`).join(", ");
            const accessLabel = `Case ${c.id}, ${statusLabel}, ${c.treatments.map(t => t.name).join(", ")}`;

            const dateFormatted = new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const actionLabel = c.status === "quotes_received" ? "Review quotes" : c.status === "pending" ? "Under review" : "View details";

            const CardW = isActiveBooking ? View : TouchableOpacity;
            const baseProps = isActiveBooking
              ? { accessibilityLabel: accessLabel }
              : { onPress: () => handleCasePress(c), activeOpacity: 0.7 as number, accessibilityRole: "button" as const, accessibilityLabel: accessLabel };

              const card = (
                <CardW style={sV1.card} {...baseProps as any}>
                  <View style={sV1.cardInner}>
                    <View style={sV1.topRow}>
                      <Text style={[sV1.status, { color: statusColor }]}>{statusLabel}</Text>
                      {enrichmentNeeded[c.id] && (
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation(); setExpandedEnrich(expandedEnrich === c.id ? null : c.id); }}
                          activeOpacity={0.7}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          accessibilityRole="button"
                          accessibilityLabel="View enrichment checklist"
                        >
                          <View style={sV1.redDot} />
                        </TouchableOpacity>
                      )}
                      <View style={{ flex: 1 }} />
                      <Text style={sV1.date}>{dateFormatted}</Text>
                      {(c.status === "pending" || c.status === "quotes_received") && (
                        <TouchableOpacity
                          style={sV1.manageBtn}
                          onPress={(e) => { e.stopPropagation(); setManageCaseId(c.id); }}
                          activeOpacity={0.6}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          accessibilityRole="button"
                          accessibilityLabel="Manage case"
                        >
                          <Feather name="more-horizontal" size={16} color={SharedColors.slate} />
                        </TouchableOpacity>
                      )}
                      {c.status === "booked" && bookedBk?.status === "cancelled" && (
                        <TouchableOpacity
                          style={sV1.manageBtn}
                          onPress={(e) => { e.stopPropagation(); setDeleteCaseId(c.id); }}
                          activeOpacity={0.6}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          accessibilityRole="button"
                          accessibilityLabel="Delete cancelled case"
                        >
                          <Feather name="more-horizontal" size={16} color={SharedColors.slate} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={sV1.title}>Case #{c.id}</Text>
                    <Text style={sV1.treatments} numberOfLines={1}>{treatmentLine}</Text>
                    <View style={sV1.divider} />
                    {/* Action row — state-specific */}
                    {c.status === "pending" && (
                      c.createdAt && (Date.now() - new Date(c.createdAt).getTime()) > 259200000
                        ? <Text style={[sV1.actionMuted, { fontSize: 12, lineHeight: 17 }]}>No quotes yet — try editing your case or broadening your treatment request.</Text>
                        : <Text style={sV1.actionMuted}>Awaiting quotes</Text>
                    )}
                    {c.status === "quotes_received" && (
                      <Text style={sV1.actionActive}>{qCount} quote{qCount !== 1 ? "s" : ""} · View &gt;</Text>
                    )}
                    {c.status === "booked" && bookedBk?.status === "cancelled" && (
                      <Text style={sV1.actionCancelled}>Cancelled</Text>
                    )}
                    {/* Journey section for booked */}
                    {isActiveBooking && bookedBk && journeyStep && (
                      <View style={sV1.journeySection}>
                        <View style={sV1.dentistRow}>
                          <Text style={sV1.dentistName} numberOfLines={1}>{bookedBk.dentistName}</Text>
                          <Text style={sV1.dentistSep}> · </Text>
                          <Text style={sV1.clinicText} numberOfLines={1}>{bookedBk.clinicName}</Text>
                          <View style={{ flex: 1 }} />
                          {showManage && (
                            <TouchableOpacity
                              style={sV1.manageBtn}
                              onPress={(e) => { e.stopPropagation(); setManageBooking(bookedBk); }}
                              activeOpacity={0.6}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              accessibilityRole="button"
                              accessibilityLabel="Manage booking"
                            >
                              <Feather name="more-horizontal" size={16} color={SharedColors.slate} />
                            </TouchableOpacity>
                          )}
                        </View>
                        {/* Diamond quest progress */}
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={(e) => { e.stopPropagation(); setExpandedJourney(expandedJourney === c.id ? null : c.id); }}
                          style={sV1.questRow}
                          accessibilityRole="button"
                          accessibilityLabel={`Journey progress, ${expandedJourney === c.id ? "collapse" : "expand"}`}
                        >
                          {JOURNEY_STEPS.map((st, idx) => {
                            const isDone = idx < journeyIdx;
                            const isCurrent = idx === journeyIdx;
                            return (
                              <React.Fragment key={st.key}>
                                {idx > 0 && <View style={[sV1.questLine, isDone && sV1.questLineDone, isCurrent && sV1.questLineDone]} />}
                                <View style={[sV1.diamond, isDone && sV1.diamondDone, isCurrent && sV1.diamondCurrent]}>
                                  {isDone && <Feather name="check" size={7} color="#fff" />}
                                  {isCurrent && <View style={sV1.diamondInner} />}
                                </View>
                              </React.Fragment>
                            );
                          })}
                        </TouchableOpacity>

                        {/* Current step info */}
                        <View style={sV1.stepRow}>
                          <View style={sV1.stepIconWrap}>
                            <Feather name={journeyStep.icon} size={17} color={PatientTheme.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={sV1.stepLabel}>{journeyStep.label}</Text>
                            <Text style={sV1.stepSummary} numberOfLines={1}>{journeyStep.summary(bookedBk)}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={(e) => { e.stopPropagation(); setExpandedJourney(expandedJourney === c.id ? null : c.id); }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityRole="button"
                            accessibilityLabel={`${expandedJourney === c.id ? "Collapse" : "Expand"} journey steps`}
                          >
                            <Feather name={expandedJourney === c.id ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" />
                          </TouchableOpacity>
                        </View>

                        {/* Expanded step list */}
                        {expandedJourney === c.id && (
                          <View style={sV1.expandedSteps}>
                            {JOURNEY_STEPS.map((st, idx) => {
                              const isDone = idx < journeyIdx;
                              const isCurrent = idx === journeyIdx;
                              const isFuture = idx > journeyIdx;
                              const isLast = idx === JOURNEY_STEPS.length - 1;
                              return (
                                <View key={st.key} style={sV1.timelineRow}>
                                  <View style={sV1.timelineCol}>
                                    <View style={[sV1.timelineDot, isDone && sV1.timelineDotDone, isCurrent && sV1.timelineDotCurrent, isFuture && sV1.timelineDotFuture]}>
                                      {isDone && <Feather name="check" size={9} color="#fff" />}
                                      {isCurrent && <Feather name={st.icon} size={10} color="#fff" />}
                                    </View>
                                    {!isLast && <View style={[sV1.timelineLine, isDone && sV1.timelineLineDone]} />}
                                  </View>
                                  <View style={[sV1.timelineContent, isFuture && { opacity: 0.35 }]}>
                                    <Text style={[sV1.timelineLabel, isCurrent && { color: PatientTheme.primary, fontWeight: "700" }]}>{st.label}</Text>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        )}
                        {isInProgress ? (
                          <View style={sV1.ctaInProgress}>
                            <View style={sV1.pulseDot} />
                            <Text style={sV1.ctaInProgressText}>Treatment in Progress</Text>
                          </View>
                        ) : journeyStep.actionRoute ? (
                          <TouchableOpacity onPress={handleJourneyCTA} activeOpacity={0.85} style={sV1.ctaButton} accessibilityRole="button" accessibilityLabel={journeyStep.actionLabel || "Continue"}>
                            <Text style={sV1.ctaButtonText}>{journeyStep.actionLabel || "Continue"}</Text>
                            <Feather name="arrow-right" size={15} color="#fff" />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    )}
                    {expandedEnrich === c.id && enrichmentNeeded[c.id] && (
                      <EnrichmentChecklist caseId={c.id} />
                    )}
                  </View>
                </CardW>
              );

            return (
              <React.Fragment key={c.id}>
                {card}
              </React.Fragment>
            );
          })
        )}
        <View style={{ height: 70 }} />
      </ScrollView>

      {/* ── Manage Booking Modal ── */}
      <Modal visible={!!manageBooking} transparent animationType="fade" onRequestClose={() => setManageBooking(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setManageBooking(null)} accessibilityRole="button" accessibilityLabel="Close manage booking modal">
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Manage Booking</Text>

            <TouchableOpacity
              style={s.modalOption}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Reschedule my booking"
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
              accessibilityRole="button"
              accessibilityLabel="Cancel my booking"
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

            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setManageBooking(null)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={s.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Delete Cancelled Case Modal ── */}
      <Modal visible={!!deleteCaseId} transparent animationType="fade" onRequestClose={() => setDeleteCaseId(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setDeleteCaseId(null)} accessibilityRole="button" accessibilityLabel="Close manage case modal">
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Manage Case</Text>

            <TouchableOpacity
              style={s.modalOption}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Delete this card"
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

            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setDeleteCaseId(null)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={s.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Manage Case Modal (pending / quotes_received) ── */}
      <Modal visible={!!manageCaseId} transparent animationType="fade" onRequestClose={() => setManageCaseId(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setManageCaseId(null)}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Manage Case</Text>

            <TouchableOpacity
              style={s.modalOption}
              activeOpacity={0.7}
              onPress={async () => {
                const caseId = manageCaseId;
                setManageCaseId(null);
                const c = cases.find((x) => x.id === caseId);
                if (!c) return;
                const mode = (c as any)?.caseMode === "proposal" ? "proposal" : "specific";

                // 기존 케이스 데이터를 draft에 저장하여 review 페이지에서 로드
                if (mode === "specific" && c.treatments?.length) {
                  const selected: Record<string, number> = {};
                  c.treatments.forEach((t) => { selected[t.name] = t.qty; });
                  await AsyncStorage.setItem("CASE_DRAFT_TREATMENTS", JSON.stringify({ selected }));
                }
                if (mode === "proposal") {
                  await AsyncStorage.setItem("CASE_DRAFT_CONCERN", JSON.stringify({
                    text: (c as any).concernDescription || "",
                    photoUri: (c as any).concernPhoto || "",
                  }));
                }

                router.push(`/patient/review?caseMode=${mode}` as any);
              }}
            >
              <Text style={s.modalOptionIcon}>✏️</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.modalOptionLabel}>Edit my case</Text>
                <Text style={s.modalOptionDesc}>Update your treatment details or photos</Text>
              </View>
              <View style={s.modalChevron} />
            </TouchableOpacity>

            <View style={s.modalDivider} />

            <TouchableOpacity
              style={s.modalOption}
              activeOpacity={0.7}
              onPress={() => {
                const caseId = manageCaseId;
                setManageCaseId(null);
                Alert.alert(
                  "Delete this case?",
                  "This case and any received quotes will be permanently removed.",
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
                <Text style={[s.modalOptionLabel, { color: "#b91c1c" }]}>Delete this case</Text>
                <Text style={s.modalOptionDesc}>Remove this case from your dashboard</Text>
              </View>
              <View style={[s.modalChevron, { borderColor: "#b91c1c" }]} />
            </TouchableOpacity>

            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setManageCaseId(null)} activeOpacity={0.8}>
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
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8,
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

// ── V1: Whisper card styles ──
const sV1 = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 16, ...Platform.select({ ios: { shadowColor: "#1A002E", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8 }, android: { elevation: 1 } }) },
  cardInner: { padding: 24 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
  status: { fontSize: 12, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" as const },
  redDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#ef4444" },
  date: { fontSize: 12, color: "#94a3b8" },
  title: { fontSize: 20, fontWeight: "700", color: "#0f172a", letterSpacing: -0.3, marginBottom: 6 },
  treatments: { fontSize: 14, color: "#64748b", lineHeight: 20, marginBottom: 24 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#e2e8f0", marginBottom: 20 },
  actionMuted: { textAlign: "center" as const, fontSize: 13, fontWeight: "500", color: "#94a3b8" },
  actionActive: { textAlign: "right" as const, fontSize: 14, fontWeight: "600", color: "#4A0080" },
  actionCancelled: { textAlign: "center" as const, fontSize: 13, fontWeight: "500", color: "#ef4444" },
  journeySection: { marginTop: 0 },
  dentistRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  dentistName: { fontSize: 14, fontWeight: "600", color: "#0f172a", flexShrink: 1 },
  dentistSep: { fontSize: 14, color: "#94a3b8" },
  clinicText: { fontSize: 14, color: "#64748b", flexShrink: 1 },
  manageBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#f8f6fb", alignItems: "center", justifyContent: "center" },
  // Diamond quest progress
  questRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, paddingHorizontal: 2 },
  questLine: { flex: 1, height: 2, backgroundColor: "#e2e8f0" },
  questLineDone: { backgroundColor: "#4A0080" },
  diamond: {
    width: 12, height: 12, borderRadius: 2, transform: [{ rotate: "45deg" }],
    backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center",
  },
  diamondDone: {
    backgroundColor: "#4A0080",
    ...Platform.select({ ios: { shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 4 }, android: {} }),
  },
  diamondCurrent: {
    backgroundColor: "#4A0080", width: 16, height: 16, borderRadius: 3,
    ...Platform.select({ ios: { shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6 }, android: { elevation: 3 } }),
  },
  diamondInner: { width: 4, height: 4, borderRadius: 1, backgroundColor: "#fff", transform: [{ rotate: "-45deg" }] },

  // Current step row
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  stepIconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#faf8ff", alignItems: "center", justifyContent: "center" },
  stepLabel: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  stepSummary: { fontSize: 13, color: "#64748b", marginTop: 1 },

  // Expanded step timeline
  expandedSteps: { marginBottom: 16, paddingLeft: 4 },
  timelineRow: { flexDirection: "row", minHeight: 32 },
  timelineCol: { width: 24, alignItems: "center" },
  timelineDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#e2e8f0",
  },
  timelineDotDone: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  timelineDotCurrent: { backgroundColor: "#4A0080", borderColor: "#4A0080" },
  timelineDotFuture: { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" },
  timelineLine: { width: 2, flex: 1, backgroundColor: "#e2e8f0", marginVertical: 1 },
  timelineLineDone: { backgroundColor: "#16a34a" },
  timelineContent: { flex: 1, marginLeft: 10, paddingBottom: 10 },
  timelineLabel: { fontSize: 13, fontWeight: "500", color: "#0f172a" },

  // CTA
  ctaButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4A0080", borderRadius: 14, paddingVertical: 14, gap: 8, minHeight: 50 },
  ctaButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  ctaInProgress: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#faf8ff", borderRadius: 14, paddingVertical: 14, minHeight: 50, gap: 8 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16a34a" },
  ctaInProgressText: { color: "#4A0080", fontSize: 14, fontWeight: "600", opacity: 0.7 },
});
