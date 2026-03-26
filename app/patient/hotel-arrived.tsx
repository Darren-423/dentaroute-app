import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Animated, Dimensions, Easing,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { Booking, store } from "../../lib/store";

/* ── Unified palette (matches arrival-info) ── */
const C = {
  purple: "#4A0080",
  purpleSoft: "rgba(74,0,128,0.08)",
  purpleMid: "rgba(74,0,128,0.15)",
  navy: "#0f172a",
  text: "#1e293b",
  sub: "#64748b",
  muted: "#94a3b8",
  faint: "#cbd5e1",
  border: "#e8ecf1",
  bg: "#f6f7f9",
  card: "#ffffff",
};

const { width: SCREEN_W } = Dimensions.get("window");
const SLIDER_PAD = 4;
const THUMB_SZ = 56;
const SLIDE_MAX = SCREEN_W - 40 - THUMB_SZ - SLIDER_PAD * 2;

export default function HotelArrivedScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const slideX = useRef(new Animated.Value(0)).current;
  const confirmingRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;
      const bk = await store.getBooking(bookingId);
      if (bk) {
        setBooking(bk);
        if (bk.status === "arrived_korea") setConfirmed(true);
      }
      setLoading(false);
    };
    load();
  }, [bookingId]);

  useEffect(() => {
    if (confirmed) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [confirmed]);

  const formatDateDisplay = (str: string) => {
    if (!str) return "";
    const [y, m, d] = str.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
  };

  const formatTimeSlot = (slot: string) => {
    if (!slot) return "";
    // Already in AM/PM format (e.g. "9:00 AM") — return as-is
    if (/[APap][Mm]/.test(slot)) return slot;
    if (!slot.includes(":")) return slot;
    const [hStr, mStr] = slot.split(":");
    const h = parseInt(hStr) || 0;
    const m = parseInt(mStr) || 0;
    const ampm = h >= 12 ? "PM" : "AM";
    const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hr}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const handleConfirm = async () => {
    if (!booking) return;
    setConfirming(true);

    const bookings = await store.getBookings();
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx >= 0) {
      bookings[idx] = { ...bookings[idx], status: "arrived_korea" };
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      await AsyncStorage.setItem("dr_bookings", JSON.stringify(bookings));
      setBooking({ ...booking, status: "arrived_korea" });
    }

    await store.addNotification({
      role: "doctor",
      type: "reminder",
      title: "Patient Arrived Safely",
      body: `Your patient has been picked up and safely arrived at their accommodation. They're ready for their upcoming visit!`,
      icon: "🏨",
      route: `/doctor/case-detail?caseId=${booking.caseId}`,
    });

    setConfirming(false);

    // If pickup was requested, navigate to pickup review before showing confirmed state
    if (booking.arrivalInfo?.pickupRequested) {
      router.replace(`/patient/pickup-review?bookingId=${booking.id}` as any);
      return;
    }

    setConfirmed(true);
  };

  /* ── Swipe slider logic ── */
  const handleRef = useRef(handleConfirm);
  handleRef.current = handleConfirm;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !confirmingRef.current,
      onMoveShouldSetPanResponder: (_, g) => !confirmingRef.current && Math.abs(g.dx) > 5,
      onPanResponderMove: (_, g) => {
        if (confirmingRef.current) return;
        slideX.setValue(Math.max(0, Math.min(g.dx, SLIDE_MAX)));
      },
      onPanResponderRelease: (_, g) => {
        if (confirmingRef.current) return;
        if (g.dx >= SLIDE_MAX * 0.75) {
          confirmingRef.current = true;
          Animated.spring(slideX, {
            toValue: SLIDE_MAX,
            useNativeDriver: true,
            bounciness: 0,
          }).start(() => {
            handleRef.current();
          });
        } else {
          Animated.spring(slideX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 5,
          }).start();
        }
      },
    })
  ).current;

  const sliderTextOpacity = slideX.interpolate({
    inputRange: [0, SLIDE_MAX * 0.35],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={C.sub} size="large" />
      </View>
    );
  }

  // ══════ CONFIRMED ══════
  if (confirmed) {
    return (
      <View style={s.container}>
        <LinearGradient colors={["#3D0070", "#2F0058", "#220040"]} style={s.header}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={s.backArrow}>{"<"}</Text>
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <Text style={s.headerTitle}>{(booking?.currentVisit || 1) > 1 ? "Welcome Back!" : "Welcome to Korea!"}</Text>
              <Text style={s.headerSub}>{booking?.clinicName}</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={[s.content, { alignItems: "center" }]} showsVerticalScrollIndicator={false}>
          <View style={s.doneIcon}>
            <Text style={{ fontSize: 48 }}>🇰🇷</Text>
          </View>
          <Text style={s.doneTitle}>{(booking?.currentVisit || 1) > 1 ? "Welcome Back!" : "Welcome to Korea!"}</Text>
          <Text style={s.doneSub}>
            {(booking?.currentVisit || 1) > 1
              ? `Great to see you again! You're here for Visit ${booking?.currentVisit}. Get some rest and we'll see you at the clinic soon.`
              : "Glad you arrived safely! Get some rest and we'll see you at the clinic soon."}
          </Text>

          <View style={s.doneStatusCard}>
            <View style={s.doneStatusDot} />
            <View style={{ flex: 1 }}>
              <Text style={s.doneStatusTitle}>Safely arrived at accommodation</Text>
              <Text style={s.doneStatusSub}>Your dentist has been notified</Text>
            </View>
          </View>

          {/* Next appointment — premium card */}
          {(() => {
            const cvn = booking?.currentVisit || 1;
            const currentVD = booking?.visitDates?.find((v) => v.visit === cvn) || booking?.visitDates?.[0];
            if (!currentVD) return null;

            const [y, mo, dy] = (currentVD.date || "").split("-");
            const monthNames = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
            const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
            const dateObj = new Date(parseInt(y), parseInt(mo) - 1, parseInt(dy));
            const dayName = dayNames[dateObj.getDay()] || "";
            const monthStr = monthNames[parseInt(mo) - 1] || "";
            const dayNum = parseInt(dy) || 0;
            const timeStr = currentVD.confirmedTime ? formatTimeSlot(currentVD.confirmedTime) : "TBD";

            return (
              <View style={s.apptOuter}>
                {/* Glowing border effect */}
                <LinearGradient
                  colors={["#6B21A8", "#4A0080", "#3B0764"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.apptGradientBorder}
                >
                  <View style={s.apptInner}>
                    {/* Top label row */}
                    <View style={s.apptLabelRow}>
                      <View style={s.apptPulse} />
                      <Text style={s.apptLabel}>
                        {cvn > 1 ? `VISIT ${cvn} APPOINTMENT` : "NEXT APPOINTMENT"}
                      </Text>
                    </View>

                    {/* Main content — big date + time */}
                    <View style={s.apptBody}>
                      {/* Left: calendar block */}
                      <View style={s.apptCalBlock}>
                        <Text style={s.apptCalMonth}>{monthStr}</Text>
                        <Text style={s.apptCalDay}>{dayNum}</Text>
                        <Text style={s.apptCalDayName}>{dayName}</Text>
                      </View>

                      {/* Vertical divider */}
                      <View style={s.apptDividerV} />

                      {/* Right: details */}
                      <View style={s.apptDetails}>
                        <View style={s.apptTimeRow}>
                          <Text style={s.apptTimeIcon}>🕐</Text>
                          <Text style={s.apptTimeText}>{timeStr}</Text>
                        </View>
                        <View style={s.apptClinicRow}>
                          <Text style={s.apptClinicIcon}>🏥</Text>
                          <Text style={s.apptClinicName} numberOfLines={2}>{booking?.clinicName}</Text>
                        </View>
                        {currentVD.description ? (
                          <Text style={s.apptDesc} numberOfLines={2}>{currentVD.description}</Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Bottom map hint */}
                    <TouchableOpacity
                      style={s.apptMapHint}
                      onPress={() => router.push(`/patient/clinic-map?bookingId=${booking?.id}` as any)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.apptMapText}>📍 View clinic on map</Text>
                      <Text style={s.apptMapChevron}>›</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            );
          })()}

          {/* What's next */}
          <View style={s.whatsNextCard}>
            <Text style={s.whatsNextTitle}>What's next</Text>
            <View style={s.stepRow}>
              <View style={[s.stepDot, s.stepDotDone]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.stepText, s.stepTextDone]}>Airport pickup</Text>
                <Text style={s.stepSub}>Completed</Text>
              </View>
            </View>
            <View style={s.stepConnector} />
            <View style={s.stepRow}>
              <View style={[s.stepDot, s.stepDotDone]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.stepText, s.stepTextDone]}>Hotel check-in</Text>
                <Text style={s.stepSub}>Completed</Text>
              </View>
            </View>
            <View style={s.stepConnector} />
            <View style={s.stepRow}>
              <View style={[s.stepDot, s.stepDotNext]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.stepText, s.stepTextNext]}>Visit the clinic</Text>
                <Text style={[s.stepSub, { color: C.purple }]}>Tap below when you get there</Text>
              </View>
            </View>
          </View>

          <View style={s.doneActions}>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => router.push(`/patient/clinic-checkin?bookingId=${bookingId}` as any)}
            >
              <Text style={s.primaryBtnText}>Go to Clinic Check-in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.secondaryBtn}
              onPress={() => router.replace("/patient/dashboard" as any)}
            >
              <Text style={s.secondaryBtnText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ══════ MAIN: Waiting for confirmation ══════
  return (
    <View style={s.container}>
      <LinearGradient colors={["#3D0070", "#2F0058", "#220040"]} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.backArrow}>{"<"}</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Arrival Status</Text>
            <Text style={s.headerSub}>{booking?.clinicName}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Flight info recap */}
        {booking?.arrivalInfo && (
          <View style={s.flightCard}>
            <View style={s.flightHeader}>
              <Text style={{ fontSize: 18 }}>✈️</Text>
              <Text style={s.flightTitle}>Your Flight</Text>
              <TouchableOpacity
                style={s.editBtn}
                onPress={() => router.push(`/patient/arrival-info?bookingId=${bookingId}` as any)}
                activeOpacity={0.6}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={s.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={s.flightDivider} />
            <View style={s.flightRow}>
              <Text style={s.flightLabel}>Flight</Text>
              <Text style={s.flightValue}>
                {booking.arrivalInfo.airline ? `${booking.arrivalInfo.airline} ` : ""}{booking.arrivalInfo.flightNumber}
              </Text>
            </View>
            <View style={s.flightRow}>
              <Text style={s.flightLabel}>Date</Text>
              <Text style={s.flightValue}>
                {formatDateDisplay(booking.arrivalInfo.arrivalDate || booking.arrivalInfo.flightDate || "")}
              </Text>
            </View>
            <View style={s.flightRow}>
              <Text style={s.flightLabel}>ETA</Text>
              <Text style={s.flightValue}>{formatTimeSlot(booking.arrivalInfo.arrivalTime)}</Text>
            </View>
            {booking.arrivalInfo.terminal && (
              <View style={s.flightRow}>
                <Text style={s.flightLabel}>Terminal</Text>
                <Text style={s.flightValue}>{booking.arrivalInfo.terminal}</Text>
              </View>
            )}
            <View style={s.flightDivider} />
            <View style={s.flightRow}>
              <Text style={s.flightLabel}>Pickup Service</Text>
              <Text style={[s.flightValue, { color: booking.arrivalInfo.pickupRequested ? "#16a34a" : C.muted }]}>
                {booking.arrivalInfo.pickupRequested ? "Requested ✓" : "Not requested"}
              </Text>
            </View>
            {booking.arrivalInfo.pickupRequested && (
              <View style={s.pickupBanner}>
                <Text style={{ fontSize: 13 }}>🚗</Text>
                <Text style={s.pickupText}>Airport pickup arranged — look for the Concourse sign!</Text>
              </View>
            )}
          </View>
        )}

        {/* Status timeline */}
        <View style={s.timelineCard}>
          <Text style={s.timelineTitle}>Your Journey</Text>
          <View style={s.tlRow}>
            <View style={[s.tlDot, s.tlDotDone]} />
            <View style={{ flex: 1 }}>
              <Text style={[s.tlText, s.tlTextDone]}>Flight info submitted</Text>
            </View>
          </View>
          <View style={s.tlConnector} />
          <View style={s.tlRow}>
            <View style={[s.tlDot, s.tlDotDone]} />
            <View style={{ flex: 1 }}>
              <Text style={[s.tlText, s.tlTextDone]}>Airport pickup arranged</Text>
            </View>
          </View>
          <View style={s.tlConnector} />
          <View style={s.tlRow}>
            <View style={[s.tlDot, s.tlDotCurrent]} />
            <View style={{ flex: 1 }}>
              <Text style={[s.tlText, { fontWeight: "700", color: C.navy }]}>Arriving at accommodation</Text>
              <Text style={s.tlSub}>Swipe below once you've settled in</Text>
            </View>
          </View>
          <View style={s.tlConnector} />
          <View style={s.tlRow}>
            <View style={s.tlDot} />
            <Text style={[s.tlText, { color: C.faint }]}>Clinic visit</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={s.dividerSection}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>After pickup & hotel check-in</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Swipe to confirm slider */}
        <View style={s.sliderOuter}>
          <LinearGradient
            colors={["#0f0520", "#261048", "#180830"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.sliderTrack}
          >
            {/* Breathing glow ring behind thumb */}
            <Animated.View
              pointerEvents="none"
              style={[s.thumbRing, {
                transform: [
                  { translateX: slideX },
                  { scale: pulseAnim.interpolate({ inputRange: [1, 1.04], outputRange: [1, 1.2] }) },
                ],
                opacity: pulseAnim.interpolate({ inputRange: [1, 1.04], outputRange: [0.55, 0] }),
              }]}
            />

            {/* Center label + animated arrow */}
            <Animated.View style={[s.sliderTextWrap, { opacity: sliderTextOpacity }]}>
              <Text style={s.sliderLabel}>Slide to confirm arrival</Text>
              <Animated.View style={{
                opacity: pulseAnim.interpolate({ inputRange: [1, 1.04], outputRange: [0.15, 0.85] }),
                transform: [{ translateX: pulseAnim.interpolate({ inputRange: [1, 1.04], outputRange: [0, 6] }) }],
              }}>
                <Text style={s.sliderArrow}>→</Text>
              </Animated.View>
            </Animated.View>

            {/* Draggable thumb */}
            <Animated.View
              {...panResponder.panHandlers}
              style={[s.sliderThumb, { transform: [{ translateX: slideX }] }]}
            >
              {confirming ? (
                <ActivityIndicator color="#6B21A8" size="small" />
              ) : (
                <Text style={s.sliderThumbIcon}>🏨</Text>
              )}
            </Animated.View>
          </LinearGradient>
        </View>

        <Text style={s.hint}>
          Swipe right after you've been picked up and arrived at your hotel
        </Text>

        {/* Reschedule & Cancel — only before confirming arrival */}
        {booking && !confirmed && (
          <View style={{ gap: 10, marginTop: 8 }}>
            <TouchableOpacity
              style={s.rescheduleLink}
              onPress={() => {
                const goReschedule = () => {
                  const visitsJson = JSON.stringify(
                    (booking.visitDates || []).map((v) => ({
                      visit: v.visit, description: v.description,
                      gapMonths: v.gapMonths, gapDays: v.gapDays,
                      paymentAmount: v.paymentAmount, paymentPercent: v.paymentPercent,
                    }))
                  );
                  router.push({
                    pathname: "/patient/visit-schedule" as any,
                    params: {
                      mode: "reschedule", bookingId: booking.id,
                      caseId: booking.caseId, quoteId: booking.quoteId || "",
                      totalPrice: String(booking.totalPrice),
                      dentistName: booking.dentistName, clinicName: booking.clinicName,
                      visitsJson, amount: "", duration: "",
                    },
                  });
                };
                const firstDate = booking.visitDates?.[0]?.date;
                if (firstDate) {
                  const diff = Math.ceil((new Date(firstDate).getTime() - Date.now()) / 86400000);
                  if (diff <= 7) {
                    Alert.alert(
                      "Visit is coming up soon",
                      diff <= 0
                        ? "Your visit date has already passed. Rescheduling may not be possible."
                        : `Your first visit is only ${diff} day${diff === 1 ? "" : "s"} away. The clinic may not be able to accommodate a schedule change on short notice.`,
                      [{ text: "Cancel", style: "cancel" }, { text: "Reschedule Anyway", onPress: goReschedule }]
                    );
                    return;
                  }
                }
                goReschedule();
              }}
              activeOpacity={0.6}
            >
              <Text style={s.rescheduleLinkText}>Reschedule my booking</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.cancelLink}
              onPress={() => router.push(`/patient/cancel-booking?bookingId=${booking.id}` as any)}
              activeOpacity={0.6}
            >
              <Text style={s.cancelLinkText}>Cancel this booking</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

/* ═══════════════════════════════════════ */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  /* ── Header ── */
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18 },
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
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 },

  /* ── Content ── */
  content: { padding: 20, gap: 16 },

  /* ── Flight card ── */
  flightCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: C.border, gap: 8,
  },
  flightHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  flightTitle: { fontSize: 15, fontWeight: "700", color: C.navy, flex: 1 },
  flightBadge: {
    backgroundColor: C.purpleSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  flightBadgeText: { fontSize: 11, fontWeight: "600", color: C.purple },
  flightDivider: { height: 1, backgroundColor: C.border },
  flightRow: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: 5,
  },
  flightLabel: { fontSize: 13, color: C.sub },
  flightValue: { fontSize: 13, fontWeight: "600", color: C.navy },
  pickupBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.purpleSoft, borderRadius: 10, padding: 12, marginTop: 4,
    borderWidth: 1, borderColor: C.purpleMid,
  },
  pickupText: { fontSize: 12, color: C.text, flex: 1, lineHeight: 17 },
  editBtn: {
    backgroundColor: C.purpleSoft,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.purpleMid,
  },
  editBtnText: { fontSize: 12, fontWeight: "600", color: C.purple },

  /* ── Timeline ── */
  timelineCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: C.border, gap: 0,
  },
  timelineTitle: { fontSize: 15, fontWeight: "700", color: C.navy, marginBottom: 16 },
  tlRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  tlDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: C.border,
    marginTop: 3, borderWidth: 2, borderColor: C.border,
  },
  tlDotDone: { backgroundColor: C.navy, borderColor: C.navy },
  tlDotCurrent: { backgroundColor: C.card, borderColor: C.purple, borderWidth: 3 },
  tlConnector: { width: 2, height: 20, backgroundColor: C.border, marginLeft: 5 },
  tlText: { fontSize: 13, color: C.sub },
  tlTextDone: { color: C.navy, fontWeight: "500" },
  tlSub: { fontSize: 11, color: C.purple, marginTop: 2 },

  /* ── Divider ── */
  dividerSection: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 12, color: C.muted, fontWeight: "500" },

  /* ── Swipe slider ── */
  sliderOuter: {
    borderRadius: 33,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 12,
  },
  sliderTrack: {
    height: THUMB_SZ + SLIDER_PAD * 2,
    borderRadius: (THUMB_SZ + SLIDER_PAD * 2) / 2,
    justifyContent: "center",
    paddingHorizontal: SLIDER_PAD,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.2)",
    overflow: "visible",
  },
  thumbRing: {
    position: "absolute",
    left: 0,
    top: 0,
    width: THUMB_SZ + SLIDER_PAD * 2,
    height: THUMB_SZ + SLIDER_PAD * 2,
    borderRadius: (THUMB_SZ + SLIDER_PAD * 2) / 2,
    borderWidth: 2,
    borderColor: "rgba(167,139,250,0.6)",
  },
  sliderTextWrap: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingLeft: THUMB_SZ + 4,
  },
  sliderLabel: {
    fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.5,
  },
  sliderArrow: {
    fontSize: 18, color: "rgba(255,255,255,0.85)", fontWeight: "300",
  },
  sliderThumb: {
    width: THUMB_SZ, height: THUMB_SZ,
    borderRadius: THUMB_SZ / 2,
    backgroundColor: "#ffffff",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#a78bfa",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  sliderThumbIcon: { fontSize: 24 },
  hint: {
    fontSize: 12, color: C.muted, textAlign: "center", lineHeight: 17, paddingHorizontal: 16,
  },

  /* ── Done state ── */
  doneIcon: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: C.purpleSoft,
    alignItems: "center", justifyContent: "center", marginTop: 16, marginBottom: 8,
    borderWidth: 2, borderColor: C.purpleMid,
  },
  doneTitle: { fontSize: 26, fontWeight: "800", color: C.navy, marginBottom: 6 },
  doneSub: { fontSize: 14, color: C.sub, textAlign: "center", lineHeight: 22, paddingHorizontal: 20, marginBottom: 8 },
  doneStatusCard: {
    flexDirection: "row", alignItems: "center", gap: 14, width: "100%",
    backgroundColor: C.purpleSoft, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.purpleMid,
  },
  doneStatusDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: C.purple,
  },
  doneStatusTitle: { fontSize: 14, fontWeight: "700", color: C.navy },
  doneStatusSub: { fontSize: 12, color: C.sub, marginTop: 2 },

  /* ── Next appointment (premium) ── */
  apptOuter: { width: "100%" },
  apptGradientBorder: {
    borderRadius: 20, padding: 2,
  },
  apptInner: {
    backgroundColor: "#faf8ff", borderRadius: 18,
    padding: 0, overflow: "hidden",
  },
  apptLabelRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10,
  },
  apptPulse: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#7c3aed",
  },
  apptLabel: {
    fontSize: 11, fontWeight: "800", color: "#6B21A8",
    letterSpacing: 1.2,
  },
  apptBody: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, gap: 0,
  },
  apptCalBlock: {
    width: 72, alignItems: "center", paddingVertical: 6,
  },
  apptCalMonth: {
    fontSize: 11, fontWeight: "800", color: "#7c3aed",
    letterSpacing: 1.5,
  },
  apptCalDay: {
    fontSize: 40, fontWeight: "900", color: "#1e1035",
    lineHeight: 46, marginVertical: -2,
  },
  apptCalDayName: {
    fontSize: 13, fontWeight: "600", color: "#8b5cf6",
  },
  apptDividerV: {
    width: 1, height: 60, backgroundColor: "rgba(139,92,246,0.18)",
    marginHorizontal: 14,
  },
  apptDetails: {
    flex: 1, gap: 6,
  },
  apptTimeRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  apptTimeIcon: { fontSize: 14 },
  apptTimeText: {
    fontSize: 18, fontWeight: "800", color: "#3B0764",
    letterSpacing: -0.3,
  },
  apptClinicRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  apptClinicIcon: { fontSize: 12 },
  apptClinicName: {
    fontSize: 13, fontWeight: "600", color: "#4A0080",
    flex: 1,
  },
  apptDesc: {
    fontSize: 11, color: "#7c3aed", lineHeight: 15,
    marginTop: 2, opacity: 0.7,
  },
  apptMapHint: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, marginTop: 12,
    borderTopWidth: 1, borderTopColor: "rgba(139,92,246,0.12)",
    backgroundColor: "rgba(124,58,237,0.04)", gap: 4,
  },
  apptMapText: { fontSize: 12, fontWeight: "600", color: "#7c3aed" },
  apptMapChevron: { fontSize: 16, color: "#7c3aed", fontWeight: "700" },

  /* ── What's next ── */
  whatsNextCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 20, width: "100%",
    borderWidth: 1, borderColor: C.border,
  },
  whatsNextTitle: { fontSize: 15, fontWeight: "700", color: C.navy, marginBottom: 14 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  stepDot: {
    width: 12, height: 12, borderRadius: 6, marginTop: 3,
    borderWidth: 2, borderColor: C.border, backgroundColor: C.border,
  },
  stepDotDone: { backgroundColor: C.navy, borderColor: C.navy },
  stepDotNext: { backgroundColor: C.card, borderColor: C.purple, borderWidth: 3 },
  stepConnector: { width: 2, height: 14, backgroundColor: C.border, marginLeft: 5 },
  stepText: { fontSize: 13, color: C.sub },
  stepTextDone: { color: C.navy, fontWeight: "500" },
  stepTextNext: { fontWeight: "700", color: C.navy },
  stepSub: { fontSize: 11, color: C.muted, marginTop: 1 },

  /* ── Actions ── */
  doneActions: { gap: 10, width: "100%" },
  primaryBtn: {
    backgroundColor: C.purple, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  primaryBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  secondaryBtn: {
    backgroundColor: C.card, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
    borderWidth: 1, borderColor: C.border,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "600", color: C.navy },

  /* ── Cancel link ── */
  rescheduleLink: {
    alignItems: "center", paddingVertical: 14,
    backgroundColor: "rgba(74,0,128,0.06)", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(74,0,128,0.12)",
  },
  rescheduleLinkText: { fontSize: 13, color: "#4A0080", fontWeight: "600" },
  cancelLink: {
    alignItems: "center", paddingVertical: 14,
    backgroundColor: "#fef2f2", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(185,28,28,0.12)",
  },
  cancelLinkText: { fontSize: 13, color: "#b91c1c", fontWeight: "600" },
});
