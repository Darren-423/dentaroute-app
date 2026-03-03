import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { Booking, store } from "../../lib/store";

const T = {
  teal: "#4A0080", tealMid: "#5C10A0", tealLight: "#f0e6f6",
  navy: "#0f172a", slate: "#64748b", slateLight: "#94a3b8",
  border: "#e2e8f0", bg: "#f8fafc", white: "#fff",
  amber: "#f59e0b", amberLight: "#fffbeb",
};

export default function StayOrReturnScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;
      const bk = await store.getBooking(bookingId);
      if (bk) setBooking(bk);
      setLoading(false);
    };
    load();
  }, [bookingId]);

  const formatDateDisplay = (str: string) => {
    if (!str) return "";
    const [y, m, d] = str.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
  };

  const currentVisitNum = booking?.currentVisit || 1;
  const totalVisits = booking?.visitDates?.length || 1;
  const completedVisit = currentVisitNum - 1; // just completed
  const nextVisitData = booking?.visitDates?.find((v) => v.visit === currentVisitNum);
  const prevVisitData = booking?.visitDates?.find((v) => v.visit === completedVisit);

  // Calculate gap between visits
  const gapMonths = prevVisitData?.gapMonths || 0;
  const gapDays = prevVisitData?.gapDays || 0;
  const hasLongGap = gapMonths >= 1;

  const gapText = (() => {
    if (gapMonths > 0 && gapDays > 0) return `${gapMonths} month${gapMonths > 1 ? "s" : ""} and ${gapDays} day${gapDays > 1 ? "s" : ""}`;
    if (gapMonths > 0) return `${gapMonths} month${gapMonths > 1 ? "s" : ""}`;
    if (gapDays > 0) return `${gapDays} day${gapDays > 1 ? "s" : ""}`;
    return "a few days";
  })();

  const handleStay = async () => {
    if (!booking || saving) return;
    setSaving(true);
    await store.updateBooking(booking.id, { status: "arrived_korea" });
    setSaving(false);
    router.replace(`/patient/clinic-checkin?bookingId=${booking.id}` as any);
  };

  const handleReturn = async () => {
    if (!booking || saving) return;
    setSaving(true);
    await store.updateBooking(booking.id, { status: "returning_home" });
    setSaving(false);
    router.replace(`/patient/departure-pickup?bookingId=${booking.id}` as any);
  };

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={T.teal} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient
        colors={["#3D0070", "#2F0058", "#220040"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Between Visits</Text>
            <Text style={s.headerSub}>Visit {completedVisit} of {totalVisits} complete</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Completed badge */}
        <View style={s.completedCard}>
          <Text style={{ fontSize: 36 }}>🎉</Text>
          <Text style={s.completedTitle}>Visit {completedVisit} Complete!</Text>
          <Text style={s.completedSub}>
            Great job! You've completed {completedVisit} of {totalVisits} visits.
          </Text>
        </View>

        {/* Next visit info */}
        {nextVisitData && (
          <View style={s.nextVisitCard}>
            <Text style={s.nextVisitLabel}>NEXT VISIT</Text>
            <Text style={s.nextVisitTitle}>📅 Visit {currentVisitNum}: {nextVisitData.description || `Visit ${currentVisitNum}`}</Text>
            <Text style={s.nextVisitDate}>{formatDateDisplay(nextVisitData.date)}{nextVisitData.confirmedTime ? ` at ${nextVisitData.confirmedTime}` : ""}</Text>

            <View style={s.gapBanner}>
              <Text style={{ fontSize: 14 }}>⏳</Text>
              <Text style={s.gapText}>Your next visit is in <Text style={{ fontWeight: "800" }}>{gapText}</Text></Text>
            </View>
          </View>
        )}

        {/* Question */}
        <View style={s.questionSection}>
          <Text style={s.questionEmoji}>🇰🇷</Text>
          <Text style={s.questionTitle}>Will you stay in Korea?</Text>
          <Text style={s.questionSub}>
            {hasLongGap
              ? `Since your next visit is ${gapText} away, you may want to return home and come back later.`
              : `Your next visit is coming up soon. You can stay in Korea or return home if needed.`}
          </Text>
        </View>

        {/* Choice buttons */}
        <TouchableOpacity
          style={s.stayBtn}
          onPress={handleStay}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 24 }}>🇰🇷</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.stayBtnTitle}>Yes, I'll Stay in Korea</Text>
            <Text style={s.stayBtnSub}>Proceed to clinic check-in for Visit {currentVisitNum}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.returnBtn}
          onPress={handleReturn}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 24 }}>✈️</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.returnBtnTitle}>No, I'll Return Home</Text>
            <Text style={s.returnBtnSub}>Book departure & return later for Visit {currentVisitNum}</Text>
          </View>
        </TouchableOpacity>

        {hasLongGap && (
          <Text style={s.hint}>
            💡 With a {gapText} gap, most patients return home and come back closer to their next appointment.
          </Text>
        )}

        {/* Remaining visits summary */}
        <View style={s.remainingCard}>
          <Text style={s.remainingTitle}>Remaining Visits</Text>
          {booking?.visitDates?.filter((v) => v.visit >= currentVisitNum).map((v) => (
            <View key={v.visit} style={s.remainingRow}>
              <View style={s.remainingDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.remainingLabel}>Visit {v.visit}</Text>
                <Text style={s.remainingDesc}>{v.description || `Visit ${v.visit}`}</Text>
                <Text style={s.remainingDate}>{formatDateDisplay(v.date)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  content: { padding: 20, gap: 16 },

  // Completed
  completedCard: {
    alignItems: "center", paddingVertical: 24,
    backgroundColor: T.tealLight, borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(74,0,128,0.08)",
  },
  completedTitle: { fontSize: 22, fontWeight: "800", color: T.navy, marginTop: 8 },
  completedSub: { fontSize: 13, color: T.slate, marginTop: 4 },

  // Next visit
  nextVisitCard: {
    backgroundColor: T.white, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: T.border, gap: 6,
  },
  nextVisitLabel: { fontSize: 10, fontWeight: "700", color: T.slateLight, letterSpacing: 0.5 },
  nextVisitTitle: { fontSize: 15, fontWeight: "700", color: T.navy },
  nextVisitDate: { fontSize: 13, fontWeight: "600", color: T.teal },
  gapBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: T.amberLight, borderRadius: 10, padding: 12, marginTop: 8,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.12)",
  },
  gapText: { fontSize: 13, color: T.navy, flex: 1 },

  // Question
  questionSection: { alignItems: "center", paddingVertical: 8 },
  questionEmoji: { fontSize: 40 },
  questionTitle: { fontSize: 20, fontWeight: "800", color: T.navy, marginTop: 8 },
  questionSub: { fontSize: 13, color: T.slate, textAlign: "center", lineHeight: 20, marginTop: 6, paddingHorizontal: 10 },

  // Stay button
  stayBtn: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: T.teal, borderRadius: 16, padding: 20,
    shadowColor: T.teal, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12,
    elevation: 6,
  },
  stayBtnTitle: { fontSize: 16, fontWeight: "700", color: T.white },
  stayBtnSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  // Return button
  returnBtn: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: T.white, borderRadius: 16, padding: 20,
    borderWidth: 1.5, borderColor: T.border,
  },
  returnBtnTitle: { fontSize: 16, fontWeight: "700", color: T.navy },
  returnBtnSub: { fontSize: 12, color: T.slate, marginTop: 2 },

  hint: { fontSize: 12, color: T.amber, textAlign: "center", lineHeight: 18, fontStyle: "italic" },

  // Remaining visits
  remainingCard: {
    backgroundColor: T.white, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: T.border, gap: 12,
  },
  remainingTitle: { fontSize: 14, fontWeight: "700", color: T.navy },
  remainingRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  remainingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.amberLight, borderWidth: 2, borderColor: T.amber, marginTop: 5 },
  remainingLabel: { fontSize: 13, fontWeight: "700", color: T.navy },
  remainingDesc: { fontSize: 11, color: T.slate, marginTop: 1 },
  remainingDate: { fontSize: 11, color: T.teal, fontWeight: "500", marginTop: 1 },
});
