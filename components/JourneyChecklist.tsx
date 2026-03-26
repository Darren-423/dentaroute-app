import { router } from "expo-router";
import React, { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { PatientTheme, SharedColors } from "../constants/theme";
import { Booking } from "../lib/store";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type StepDef = {
  key: string;
  label: string;
  summary: (bk: Booking) => string;
  icon: string;
  route?: (bk: Booking) => string;
  actionLabel?: string;
  actionRoute?: (bk: Booking) => string;
};

const STEPS: StepDef[] = [
  {
    key: "confirmed",
    label: "Trip Details",
    icon: "✈️",
    summary: (bk) => bk.arrivalInfo ? `${bk.arrivalInfo.airline || ""} ${bk.arrivalInfo.flightNumber || ""}`.trim() || "Flight info submitted" : "Add your flight & hotel info",
    route: (bk) => `/patient/case-hub?bookingId=${bk.id}&caseId=${bk.caseId}`,
    actionLabel: "Add Trip Info →",
    actionRoute: (bk) => `/patient/case-hub?bookingId=${bk.id}&caseId=${bk.caseId}`,
  },
  {
    key: "flight_submitted",
    label: "Hotel Check-in",
    icon: "🏨",
    summary: (bk) => bk.arrivalInfo?.hotelName || "Confirm hotel arrival",
    route: (bk) => `/patient/hotel-arrived?bookingId=${bk.id}`,
    actionLabel: "Confirm Arrival →",
    actionRoute: (bk) => `/patient/hotel-arrived?bookingId=${bk.id}`,
  },
  {
    key: "arrived_korea",
    label: "Clinic Visit",
    icon: "🦷",
    summary: (bk) => {
      const v = bk.visitDates?.[0];
      return v ? `${bk.clinicName} · ${v.date}${v.confirmedTime ? " at " + v.confirmedTime : ""}` : bk.clinicName;
    },
    route: (bk) => `/patient/clinic-checkin?bookingId=${bk.id}`,
    actionLabel: "Check in at Clinic →",
    actionRoute: (bk) => `/patient/clinic-checkin?bookingId=${bk.id}`,
  },
  {
    key: "checked_in_clinic",
    label: "Treatment",
    icon: "🩺",
    summary: () => "Treatment in progress",
  },
  {
    key: "treatment_done",
    label: "Payment",
    icon: "💳",
    summary: (bk) => `$${(bk.totalPrice || 0).toLocaleString()} at clinic`,
    route: (bk) => `/patient/visit-checkout?bookingId=${bk.id}`,
    actionLabel: "Confirm Payment →",
    actionRoute: (bk) => `/patient/visit-checkout?bookingId=${bk.id}`,
  },
  {
    key: "between_visits",
    label: "Next Visit",
    icon: "🔄",
    summary: (bk) => {
      const cur = bk.currentVisit || 1;
      const total = bk.visitDates?.length || 1;
      return total > 1 ? `Visit ${cur} of ${total} complete` : "Choose stay or return";
    },
    route: (bk) => `/patient/stay-or-return?bookingId=${bk.id}`,
    actionLabel: "Continue →",
    actionRoute: (bk) => `/patient/stay-or-return?bookingId=${bk.id}`,
  },
  {
    key: "returning_home",
    label: "Departure",
    icon: "🛫",
    summary: (bk) => bk.departurePickup ? `Pickup at ${bk.departurePickup.pickupTime || "TBD"}` : "Book departure pickup",
    route: (bk) => bk.dropOffUnlocked ? `/patient/departure-pickup?bookingId=${bk.id}` : `/patient/write-review?bookingId=${bk.id}`,
    actionLabel: "Arrange Departure →",
    actionRoute: (bk) => bk.dropOffUnlocked ? `/patient/departure-pickup?bookingId=${bk.id}` : `/patient/write-review?bookingId=${bk.id}`,
  },
  {
    key: "payment_complete",
    label: "Review",
    icon: "⭐",
    summary: () => "Share your experience",
    route: (bk) => bk.dropOffUnlocked ? `/patient/departure-pickup?bookingId=${bk.id}` : `/patient/write-review?bookingId=${bk.id}`,
    actionLabel: "Leave Review →",
    actionRoute: (bk) => bk.dropOffUnlocked ? `/patient/departure-pickup?bookingId=${bk.id}` : `/patient/write-review?bookingId=${bk.id}`,
  },
  {
    key: "departure_set",
    label: "Complete",
    icon: "🎉",
    summary: () => "Your journey is complete!",
    route: (bk) => `/patient/write-review?bookingId=${bk.id}`,
    actionLabel: "Leave Review →",
    actionRoute: (bk) => `/patient/write-review?bookingId=${bk.id}`,
  },
];

type Props = {
  booking: Booking;
};

export default function JourneyChecklist({ booking }: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const currentIdx = STEPS.findIndex(s => s.key === booking.status);
  if (currentIdx < 0 || booking.status === "cancelled") return null;

  const toggleExpand = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedKey(prev => prev === key ? null : key);
  };

  return (
    <View style={s.container}>
      <Text style={s.sectionTitle}>Your Journey</Text>
      {STEPS.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFuture = idx > currentIdx;
        const isExpanded = expandedKey === step.key;
        const isLast = idx === STEPS.length - 1;

        return (
          <View key={step.key}>
            <TouchableOpacity
              style={s.stepRow}
              onPress={() => (isDone || isCurrent) && toggleExpand(step.key)}
              activeOpacity={isFuture ? 1 : 0.6}
            >
              {/* Timeline line */}
              <View style={s.timelineCol}>
                <View style={[
                  s.dot,
                  isDone && s.dotDone,
                  isCurrent && s.dotCurrent,
                  isFuture && s.dotFuture,
                ]}>
                  {isDone ? (
                    <Text style={s.dotCheckText}>✓</Text>
                  ) : (
                    <Text style={[s.dotIcon, isFuture && { opacity: 0.4 }]}>{step.icon}</Text>
                  )}
                </View>
                {!isLast && (
                  <View style={[s.line, isDone && s.lineDone, isCurrent && s.lineCurrent]} />
                )}
              </View>

              {/* Content */}
              <View style={[s.stepContent, isFuture && { opacity: 0.4 }]}>
                <Text style={[s.stepLabel, isDone && s.stepLabelDone, isCurrent && s.stepLabelCurrent]}>
                  {step.label}
                </Text>
                <Text style={s.stepSummary} numberOfLines={isExpanded ? 3 : 1}>
                  {step.summary(booking)}
                </Text>
              </View>

              {/* Chevron for expandable items */}
              {(isDone || isCurrent) && (
                <Text style={s.chevron}>{isExpanded ? "▼" : "▶"}</Text>
              )}
            </TouchableOpacity>

            {/* Expanded detail */}
            {isExpanded && (isDone || isCurrent) && (
              <View style={s.expandedBox}>
                {isCurrent && step.actionRoute && (
                  <TouchableOpacity
                    style={s.actionBtn}
                    onPress={() => router.push(step.actionRoute!(booking) as any)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.actionBtnText}>{step.actionLabel || "Continue →"}</Text>
                  </TouchableOpacity>
                )}
                {isDone && step.route && (
                  <TouchableOpacity
                    style={s.detailLink}
                    onPress={() => router.push(step.route!(booking) as any)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.detailLinkText}>View details</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* Chat shortcut */}
      <TouchableOpacity
        style={s.chatBtn}
        onPress={() => router.push("/patient/chat-list" as any)}
        activeOpacity={0.7}
      >
        <Text style={s.chatBtnIcon}>💬</Text>
        <Text style={s.chatBtnText}>Message {booking.dentistName}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: SharedColors.border },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: SharedColors.navy, marginBottom: 12, letterSpacing: 0.3 },

  stepRow: { flexDirection: "row", alignItems: "flex-start", minHeight: 44 },
  timelineCol: { width: 36, alignItems: "center" },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: SharedColors.bg, borderWidth: 2, borderColor: SharedColors.border,
  },
  dotDone: { backgroundColor: SharedColors.green, borderColor: SharedColors.green },
  dotCurrent: { backgroundColor: PatientTheme.primary, borderColor: PatientTheme.primary },
  dotFuture: { backgroundColor: SharedColors.bg, borderColor: SharedColors.border },
  dotCheckText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  dotIcon: { fontSize: 13 },
  line: { width: 2, flex: 1, minHeight: 20, backgroundColor: SharedColors.border, marginVertical: 2 },
  lineDone: { backgroundColor: SharedColors.green },
  lineCurrent: { backgroundColor: SharedColors.border },

  stepContent: { flex: 1, marginLeft: 10, paddingBottom: 16 },
  stepLabel: { fontSize: 14, fontWeight: "600", color: SharedColors.navy },
  stepLabelDone: { color: SharedColors.green },
  stepLabelCurrent: { color: PatientTheme.primary },
  stepSummary: { fontSize: 12, color: SharedColors.slate, marginTop: 2, lineHeight: 17 },

  chevron: { fontSize: 10, color: SharedColors.slateLight, marginTop: 4, marginLeft: 4 },

  expandedBox: {
    marginLeft: 46, marginBottom: 8, paddingLeft: 10,
    borderLeftWidth: 2, borderLeftColor: PatientTheme.primaryLight,
  },
  actionBtn: {
    backgroundColor: PatientTheme.primary, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16, alignSelf: "flex-start",
  },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  detailLink: { paddingVertical: 6 },
  detailLinkText: { fontSize: 12, color: PatientTheme.primary, fontWeight: "600" },

  chatBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginTop: 8, paddingVertical: 10, borderRadius: 10,
    backgroundColor: PatientTheme.primaryLight, borderWidth: 1, borderColor: PatientTheme.primaryBorder,
    gap: 6,
  },
  chatBtnIcon: { fontSize: 16 },
  chatBtnText: { fontSize: 13, fontWeight: "600", color: PatientTheme.primary },
});
