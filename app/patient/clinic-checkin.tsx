import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Animated, Easing,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { Booking, store } from "../../lib/store";

/* ── palette ── */
const C = {
  plum: "#3B0764",
  violet: "#6B21A8",
  lavender: "#8b5cf6",
  lilac: "#c4b5fd",
  cream: "#faf8ff",
  card: "#ffffff",
  navy: "#0f172a",
  text: "#1e293b",
  sub: "#64748b",
  muted: "#94a3b8",
  faint: "#cbd5e1",
  border: "#ede9f4",
  amber: "#f59e0b",
  amberLight: "#fffbeb",
  green: "#16a34a",
  greenSoft: "#dcfce7",
};

export default function ClinicCheckinScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [patientName, setPatientName] = useState("Patient");
  const [pulseAnim] = useState(new Animated.Value(1));
  const [glowAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;
      const bk = await store.getBooking(bookingId);
      if (bk) {
        setBooking(bk);
        if (bk.status === "checked_in_clinic") setCheckedIn(true);
      }
      const user = await store.getCurrentUser();
      if (user?.name) setPatientName(user.name);
      const profile = await store.getPatientProfile();
      if (profile?.fullName) setPatientName(profile.fullName);
      setLoading(false);
    };
    load();
  }, [bookingId]);

  // Pulse + glow animation
  useEffect(() => {
    if (checkedIn) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    glow.start();
    return () => { pulse.stop(); glow.stop(); };
  }, [checkedIn]);

  const fmtDate = (str: string) => {
    if (!str) return "";
    const [y, m, d] = str.split("-");
    const mn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${mn[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
  };

  const fmtTime = (slot: string) => {
    if (!slot) return "TBD";
    if (/[APap][Mm]/.test(slot)) return slot;
    if (!slot.includes(":")) return slot;
    const [hS, mS] = slot.split(":");
    const h = parseInt(hS) || 0;
    const m = parseInt(mS) || 0;
    const ap = h >= 12 ? "PM" : "AM";
    const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hr}:${m.toString().padStart(2, "0")} ${ap}`;
  };

  const handleCheckin = async () => {
    if (!booking) return;
    setConfirming(true);
    const bookings = await store.getBookings();
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx >= 0) {
      bookings[idx] = { ...bookings[idx], status: "checked_in_clinic" };
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      await AsyncStorage.setItem("dr_bookings", JSON.stringify(bookings));
      setBooking({ ...booking, status: "checked_in_clinic" });
    }
    const cvn = booking.currentVisit || 1;
    const tv = booking.visitDates?.length || 1;
    await store.addNotification({
      role: "doctor",
      type: "reminder",
      title: `🏥 Patient Arrived — Visit ${cvn}`,
      body: `Your patient has checked in at ${booking.clinicName} for Visit ${cvn}${tv > 1 ? ` of ${tv}` : ""}.`,
      icon: "🏥",
      route: `/doctor/case-detail?caseId=${booking.caseId}`,
    });
    setConfirming(false);
    setCheckedIn(true);
  };

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={C.violet} size="large" />
      </View>
    );
  }

  const cvn = booking?.currentVisit || 1;
  const totalV = booking?.visitDates?.length || 1;
  const remaining = totalV - cvn;
  const currentVD = booking?.visitDates?.find((v) => v.visit === cvn) || booking?.visitDates?.[0];

  // Parse date parts for the appointment ticket
  const dateParts = (() => {
    if (!currentVD?.date) return null;
    const [y, m, d] = currentVD.date.split("-");
    const dn = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
    const mn = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return { day: parseInt(d), month: mn[parseInt(m) - 1], dayName: dn[dt.getDay()], year: y };
  })();

  /* ══════ CHECKED IN ══════ */
  if (checkedIn) {
    return (
      <View style={s.container}>
        {/* Full-bleed success header — emerald gradient */}
        <LinearGradient colors={["#059669", "#047857", "#065f46"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.doneHeader}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Text style={s.backArrow}>‹</Text>
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <Text style={s.headerTitle}>Checked In</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          {/* Big check circle */}
          <View style={s.doneHeroWrap}>
            <View style={s.doneHeroRing}>
              <View style={s.doneHeroCircle}>
                <Text style={s.doneHeroCheck}>✓</Text>
              </View>
            </View>
            <Text style={s.doneHeroTitle}>You're All Set!</Text>
            <Text style={s.doneHeroSub}>Visit {cvn} · {booking?.clinicName}</Text>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={[s.content, { alignItems: "center", paddingTop: 0 }]} showsVerticalScrollIndicator={false}>

          {/* Info strip — single card, 3 equal columns */}
          <View style={s.doneInfoStrip}>
            <View style={s.doneInfoCol}>
              <Text style={s.doneInfoLabel}>DOCTOR</Text>
              <Text style={s.doneInfoValue} numberOfLines={1}>{booking?.dentistName}</Text>
            </View>
            <View style={s.doneInfoDivider} />
            <View style={s.doneInfoCol}>
              <Text style={s.doneInfoLabel}>TIME</Text>
              <Text style={s.doneInfoValue}>{fmtTime(currentVD?.confirmedTime || "")}</Text>
            </View>
            <View style={s.doneInfoDivider} />
            <View style={s.doneInfoCol}>
              <Text style={s.doneInfoLabel}>VISIT</Text>
              <Text style={s.doneInfoValue}>{cvn} of {totalV}</Text>
            </View>
          </View>

          {/* What's happening */}
          <View style={s.doneWhatCard}>
            <View style={s.doneWhatDotRing}>
              <View style={s.doneWhatDot} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.doneWhatTitle}>Your dentist has been notified</Text>
              <Text style={s.doneWhatSub}>Please have a seat in the waiting area — we'll call you shortly!</Text>
            </View>
          </View>

          {/* Current procedure */}
          {currentVD?.description ? (
            <View style={s.doneProcCard}>
              <Text style={s.doneProcLabel}>TODAY'S PROCEDURE</Text>
              <Text style={s.doneProcText}>{currentVD.description}</Text>
            </View>
          ) : null}

          {/* Visit timeline — multi-visit only */}
          {booking?.visitDates && booking.visitDates.length > 1 && (
            <View style={s.timelineCard}>
              <Text style={s.timelineTitle}>Visit Schedule</Text>
              {booking.visitDates.map((v, i) => {
                const isCur = v.visit === cvn;
                const isPast = v.visit < cvn;
                const isLast = i === booking.visitDates!.length - 1;
                return (
                  <View key={v.visit}>
                    <View style={s.tlRow}>
                      <View style={s.tlDotCol}>
                        <View style={[
                          s.tlDot,
                          isPast && s.tlDotDone,
                          isCur && s.tlDotCurrent,
                        ]}>
                          {isPast && <Text style={{ fontSize: 8, color: "#fff" }}>✓</Text>}
                          {isCur && <Text style={{ fontSize: 8, color: "#fff" }}>✓</Text>}
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={[s.tlLabel, isPast && s.tlLabelDone, isCur && s.tlLabelCur]}>
                            Visit {v.visit}
                          </Text>
                          {isCur && <View style={s.nowBadge}><Text style={s.nowBadgeText}>NOW</Text></View>}
                        </View>
                        <Text style={s.tlDate}>{fmtDate(v.date)} · {fmtTime(v.confirmedTime || "")}</Text>
                        {v.description ? <Text style={s.tlDesc}>{v.description}</Text> : null}
                      </View>
                    </View>
                    {!isLast && <View style={s.tlLine} />}
                  </View>
                );
              })}
              {remaining > 0 && (
                <Text style={s.tlRemaining}>
                  {remaining} visit{remaining > 1 ? "s" : ""} remaining after this one
                </Text>
              )}
            </View>
          )}

          {/* Actions */}
          <View style={s.doneActions}>
            <TouchableOpacity
              style={s.actionPrimary}
              onPress={async () => {
                if (!booking) return;
                const room = await store.getOrCreateChatRoom(
                  booking.caseId, patientName, booking.dentistName, booking.clinicName
                );
                router.push({
                  pathname: "/patient/chat" as any,
                  params: { chatRoomId: room.id, dentistName: booking.dentistName, clinicName: booking.clinicName },
                });
              }}
            >
              <Text style={s.actionPrimaryText}>💬  Message Your Dentist</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionSecondary} onPress={() => router.replace("/patient/dashboard" as any)}>
              <Text style={s.actionSecondaryText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  /* ══════ CHECK-IN (main) ══════ */
  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient colors={["#3D0070", "#2F0058", "#220040"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Visit {cvn} Check-in</Text>
            {totalV > 1 && <Text style={s.headerSub}>Visit {cvn} of {totalV}</Text>}
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Appointment Ticket ── */}
        <View style={s.ticket}>
          <LinearGradient colors={["#4A0080", "#6B21A8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ticketTop}>
            <View style={s.ticketTopRow}>
              <View>
                <Text style={s.ticketLabel}>YOUR APPOINTMENT</Text>
                <Text style={s.ticketClinic} numberOfLines={1}>{booking?.clinicName}</Text>
              </View>
              <View style={s.ticketVisitBadge}>
                <Text style={s.ticketVisitText}>Visit {cvn}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Perforated edge */}
          <View style={s.ticketPerfRow}>
            <View style={s.ticketNotchL} />
            <View style={s.ticketDashes} />
            <View style={s.ticketNotchR} />
          </View>

          {/* Bottom half */}
          <View style={s.ticketBottom}>
            <View style={s.ticketGrid}>
              {/* Date block */}
              <View style={s.ticketDateBlock}>
                {dateParts && (
                  <>
                    <Text style={s.ticketMonth}>{dateParts.month}</Text>
                    <Text style={s.ticketDay}>{dateParts.day}</Text>
                    <Text style={s.ticketDayName}>{dateParts.dayName}</Text>
                  </>
                )}
              </View>

              <View style={s.ticketDivider} />

              {/* Details */}
              <View style={s.ticketDetails}>
                <View style={s.ticketDetailRow}>
                  <Text style={s.ticketDetailLabel}>TIME</Text>
                  <Text style={s.ticketDetailValue}>{fmtTime(currentVD?.confirmedTime || "")}</Text>
                </View>
                <View style={s.ticketDetailRow}>
                  <Text style={s.ticketDetailLabel}>DOCTOR</Text>
                  <Text style={s.ticketDetailValue} numberOfLines={1}>{booking?.dentistName}</Text>
                </View>
                {currentVD?.description ? (
                  <View style={s.ticketDetailRow}>
                    <Text style={s.ticketDetailLabel}>PROCEDURE</Text>
                    <Text style={s.ticketDetailDesc} numberOfLines={2}>{currentVD.description}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Map link */}
            <TouchableOpacity
              style={s.ticketMapBtn}
              onPress={() => router.push({ pathname: "/patient/clinic-map" as any, params: { caseId: booking?.caseId } })}
              activeOpacity={0.7}
            >
              <Text style={s.ticketMapText}>📍 View clinic on map</Text>
              <Text style={s.ticketMapChevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Checklist ── */}
        <View style={s.checklistCard}>
          <Text style={s.checklistTitle}>Before your visit</Text>
          {[
            { icon: "⏰", text: "Arrive 15 minutes early" },
            { icon: "🪪", text: "Bring your passport or ID" },
            { icon: "📋", text: "Have your X-rays ready (if physical copies)" },
            { icon: "💧", text: "Stay hydrated, avoid heavy meals" },
          ].map((tip, i) => (
            <View key={i} style={s.checkRow}>
              <View style={s.checkBox}>
                <Text style={{ fontSize: 13 }}>{tip.icon}</Text>
              </View>
              <Text style={s.checkText}>{tip.text}</Text>
            </View>
          ))}
        </View>

        {/* ── Divider ── */}
        <View style={s.divSection}>
          <View style={s.divLine} />
          <Text style={s.divText}>When you arrive at the clinic</Text>
          <View style={s.divLine} />
        </View>

        {/* ── Check-in Button ── */}
        <View style={{ alignItems: "center" }}>
          {/* Glow ring */}
          <Animated.View style={[s.glowRing, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] }) }]} />

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={s.checkinBtn}
              onPress={handleCheckin}
              disabled={confirming}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#6B21A8", "#4A0080", "#3B0764"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.checkinGrad}
              >
                {confirming ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <>
                    <Text style={s.checkinEmoji}>🏥</Text>
                    <Text style={s.checkinTitle}>I've Arrived!</Text>
                    <Text style={s.checkinSub}>Tap to check in for Visit {cvn}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Text style={s.checkinHint}>
          Your dentist will receive an instant notification
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

/* ═══════════════════════════════════════════════ */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },

  /* Header */
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  content: { padding: 20, gap: 20 },

  /* ── Appointment Ticket ── */
  ticket: { borderRadius: 20, overflow: "hidden" },
  ticketTop: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 },
  ticketTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ticketLabel: { fontSize: 10, fontWeight: "800", color: "rgba(255,255,255,0.55)", letterSpacing: 1.5 },
  ticketClinic: { fontSize: 17, fontWeight: "800", color: "#fff", marginTop: 3 },
  ticketVisitBadge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  ticketVisitText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  ticketPerfRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, marginTop: -1 },
  ticketNotchL: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: C.cream, marginLeft: -8,
  },
  ticketDashes: {
    flex: 1, height: 1,
    borderStyle: "dashed", borderWidth: 1, borderColor: C.border,
  },
  ticketNotchR: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: C.cream, marginRight: -8,
  },

  ticketBottom: { backgroundColor: C.card, paddingBottom: 0 },
  ticketGrid: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 16, gap: 0 },
  ticketDateBlock: { width: 68, alignItems: "center", justifyContent: "center" },
  ticketMonth: { fontSize: 11, fontWeight: "800", color: C.violet, letterSpacing: 1.5 },
  ticketDay: { fontSize: 38, fontWeight: "900", color: C.plum, lineHeight: 44 },
  ticketDayName: { fontSize: 12, fontWeight: "600", color: C.lavender },
  ticketDivider: { width: 1, backgroundColor: C.border, marginHorizontal: 16 },
  ticketDetails: { flex: 1, gap: 10 },
  ticketDetailRow: { gap: 1 },
  ticketDetailLabel: { fontSize: 9, fontWeight: "800", color: C.muted, letterSpacing: 1 },
  ticketDetailValue: { fontSize: 15, fontWeight: "700", color: C.plum },
  ticketDetailDesc: { fontSize: 12, fontWeight: "500", color: C.sub, lineHeight: 16 },
  ticketMapBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, gap: 4,
    borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: "rgba(107,33,168,0.03)",
  },
  ticketMapText: { fontSize: 12, fontWeight: "600", color: C.violet },
  ticketMapChevron: { fontSize: 16, fontWeight: "700", color: C.violet },

  /* ── Checklist ── */
  checklistCard: {
    backgroundColor: C.card, borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: C.border, gap: 12,
  },
  checklistTitle: { fontSize: 15, fontWeight: "800", color: C.navy, marginBottom: 2 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  checkBox: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.cream, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.border,
  },
  checkText: { fontSize: 13, color: C.sub, flex: 1, lineHeight: 18 },

  /* Divider */
  divSection: { flexDirection: "row", alignItems: "center", gap: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: C.border },
  divText: { fontSize: 11, fontWeight: "600", color: C.muted, letterSpacing: 0.3 },

  /* ── Check-in Button ── */
  glowRing: {
    position: "absolute", top: -12, width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.violet,
  },
  checkinBtn: { borderRadius: 100, overflow: "hidden" },
  checkinGrad: {
    width: 196, height: 196, borderRadius: 98,
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  checkinEmoji: { fontSize: 36 },
  checkinTitle: { fontSize: 22, fontWeight: "900", color: "#fff" },
  checkinSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  checkinHint: {
    fontSize: 12, color: C.muted, textAlign: "center", lineHeight: 17,
    paddingHorizontal: 30, marginTop: -4,
  },

  /* ══ Done state ══ */
  doneHeader: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 36 },
  doneHeroWrap: { alignItems: "center", marginTop: 22 },
  doneHeroRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.25)",
  },
  doneHeroCircle: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)",
  },
  doneHeroCheck: { fontSize: 38, color: "#fff", fontWeight: "900" },
  doneHeroTitle: { fontSize: 25, fontWeight: "900", color: "#fff", marginTop: 16 },
  doneHeroSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 5 },

  doneInfoStrip: {
    flexDirection: "row", alignItems: "center", width: "100%", marginTop: 22,
    backgroundColor: C.card, borderRadius: 16, paddingVertical: 18,
    borderWidth: 1, borderColor: "rgba(5,150,105,0.1)",
  },
  doneInfoCol: {
    flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 4,
  },
  doneInfoDivider: {
    width: 1, height: 30, backgroundColor: "rgba(5,150,105,0.12)",
  },
  doneInfoLabel: { fontSize: 9, fontWeight: "800", color: "#94a3b8", letterSpacing: 1 },
  doneInfoValue: { fontSize: 13, fontWeight: "700", color: "#065f46", textAlign: "center" },

  doneWhatCard: {
    flexDirection: "row", alignItems: "center", gap: 14, width: "100%",
    backgroundColor: "#ecfdf5", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "rgba(5,150,105,0.15)",
  },
  doneWhatDotRing: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "rgba(5,150,105,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  doneWhatDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#059669" },
  doneWhatTitle: { fontSize: 14, fontWeight: "700", color: "#047857" },
  doneWhatSub: { fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 17 },

  doneProcCard: {
    width: "100%", backgroundColor: C.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: "rgba(5,150,105,0.1)", gap: 6,
  },
  doneProcLabel: { fontSize: 9, fontWeight: "800", color: "#059669", letterSpacing: 1 },
  doneProcText: { fontSize: 14, fontWeight: "600", color: "#1e293b", lineHeight: 20 },

  /* Timeline */
  timelineCard: {
    backgroundColor: C.card, borderRadius: 18, padding: 20, width: "100%",
    borderWidth: 1, borderColor: "rgba(5,150,105,0.1)", gap: 0,
  },
  timelineTitle: { fontSize: 15, fontWeight: "800", color: "#065f46", marginBottom: 16 },
  tlRow: { flexDirection: "row", gap: 14 },
  tlDotCol: { width: 18, alignItems: "center", paddingTop: 3 },
  tlDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: "#d1d5db", alignItems: "center", justifyContent: "center",
  },
  tlDotDone: { backgroundColor: "#10b981" },
  tlDotCurrent: { backgroundColor: "#059669" },
  tlLine: {
    width: 2, height: 24, backgroundColor: "#e5e7eb",
    marginLeft: 8, marginVertical: 2,
  },
  tlLabel: { fontSize: 13, fontWeight: "700", color: "#374151" },
  tlLabelDone: { color: "#10b981" },
  tlLabelCur: { color: "#059669" },
  tlDate: { fontSize: 12, fontWeight: "500", color: "#047857", marginTop: 2 },
  tlDesc: { fontSize: 11, color: "#64748b", marginTop: 2 },
  nowBadge: {
    backgroundColor: "#059669", borderRadius: 5,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  nowBadgeText: { fontSize: 9, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  tlRemaining: {
    fontSize: 11, color: "#94a3b8", textAlign: "center",
    marginTop: 12, fontStyle: "italic",
  },

  /* Actions */
  doneActions: { gap: 10, width: "100%", marginTop: 4 },
  actionPrimary: {
    backgroundColor: "#059669", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  actionPrimaryText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  actionSecondary: {
    backgroundColor: C.card, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(5,150,105,0.15)",
  },
  actionSecondaryText: { fontSize: 15, fontWeight: "600", color: "#065f46" },
});
