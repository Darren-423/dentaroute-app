import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Booking, DeparturePickup, store } from "../../lib/store";

const T = {
  teal: "#4A0080", tealMid: "#5C10A0", tealLight: "#f0e6f6",
  navy: "#0f172a", slate: "#64748b", slateLight: "#94a3b8",
  border: "#e2e8f0", bg: "#f8fafc", white: "#fff",
  green: "#10b981", greenLight: "#ecfdf5",
  blue: "#3b82f6", blueLight: "#eff6ff",
  amber: "#f59e0b", amberLight: "#fffbeb",
};

const PICKUP_LOCATIONS = [
  { id: "hotel", icon: "🏨", label: "My Hotel / Accommodation", desc: "We'll pick you up at the lobby" },
  { id: "clinic", icon: "🏥", label: "The Clinic", desc: "Pick up from your last appointment" },
  { id: "other", icon: "📍", label: "Other Location", desc: "Enter a custom address" },
];

export default function DeparturePickupScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Form
  const [pickupType, setPickupType] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [terminal, setTerminal] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [notes, setNotes] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;
      const bk = await store.getBooking(bookingId);
      if (bk) {
        setBooking(bk);
        if (bk.departurePickup) {
          setPickupType(bk.departurePickup.pickupLocation);
          setCustomAddress(bk.departurePickup.pickupAddress);
          setPickupDate(bk.departurePickup.pickupDate);
          setPickupTime(bk.departurePickup.pickupTime);
          setFlightNumber(bk.departurePickup.flightNumber || "");
          setTerminal(bk.departurePickup.terminal || "");
          setPassengers(String(bk.departurePickup.passengers || 1));
          setNotes(bk.departurePickup.notes || "");
          setSuccess(bk.status === "departure_set");
        } else {
          // Pre-fill passengers from arrival info
          if (bk.arrivalInfo?.passengers) setPassengers(String(bk.arrivalInfo.passengers));
        }
      }
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

  const formatFlightNumber = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

  const timeSlots: string[] = [];
  for (let h = 4; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeSlots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }
  }
  const formatTimeSlot = (slot: string) => {
    if (!slot) return "";
    if (/[APap][Mm]/.test(slot)) return slot;
    if (!slot.includes(":")) return slot;
    const [hStr, mStr] = slot.split(":");
    const h = parseInt(hStr) || 0;
    const m = parseInt(mStr) || 0;
    const ampm = h >= 12 ? "PM" : "AM";
    const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hr}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const getPickupAddress = () => {
    if (pickupType === "hotel") return "Hotel / Accommodation lobby";
    if (pickupType === "clinic") return booking?.clinicName || "Clinic";
    return customAddress;
  };

  const isValid = () => {
    if (!pickupType || !pickupDate || !pickupTime) return false;
    if (pickupType === "other" && !customAddress) return false;
    return true;
  };

  const handleSave = async () => {
    if (!booking || !isValid()) return;
    setSaving(true);

    const departure: DeparturePickup = {
      pickupLocation: pickupType,
      pickupAddress: getPickupAddress(),
      pickupDate,
      pickupTime,
      flightNumber: flightNumber || undefined,
      terminal: terminal || undefined,
      passengers: parseInt(passengers) || 1,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
    };

    const bookings = await store.getBookings();
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx >= 0) {
      const totalVisits = bookings[idx].visitDates?.length || 1;
      const currentVisit = bookings[idx].currentVisit || 1;
      const isLastDeparture = currentVisit >= totalVisits;
      // Mid-visit return: loop back to flight info for next visit
      // Final departure: mark as departure_set (complete)
      const nextStatus = isLastDeparture ? "departure_set" : "confirmed";
      bookings[idx] = { ...bookings[idx], departurePickup: departure, status: nextStatus as any };
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      await AsyncStorage.setItem("dr_bookings", JSON.stringify(bookings));
    }

    await store.addNotification({
      role: "doctor",
      type: "reminder",
      title: "🚗 Patient Departure Scheduled",
      body: `Your patient has booked airport pickup for ${formatDateDisplay(pickupDate)} at ${formatTimeSlot(pickupTime)}.${flightNumber ? ` Flight: ${flightNumber}` : ""}`,
      icon: "🚗",
      route: `/doctor/case-detail?caseId=${booking.caseId}`,
    });

    setSaving(false);
    setSuccess(true);
  };

  const handleCancelDropOff = async () => {
    if (!booking || cancelling) return;
    setCancelling(true);

    const bookings = await store.getBookings();
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx >= 0) {
      bookings[idx] = {
        ...bookings[idx],
        departurePickup: undefined as any,
        status: "arrived_korea" as any,
      };
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      await AsyncStorage.setItem("dr_bookings", JSON.stringify(bookings));
    }

    await store.addNotification({
      role: "doctor",
      type: "reminder",
      title: "🇰🇷 Patient Staying in Korea",
      body: `Your patient cancelled their airport drop off and will stay in Korea for Visit ${booking.currentVisit || 1}.`,
      icon: "🇰🇷",
      route: `/doctor/case-detail?caseId=${booking.caseId}`,
    });

    setCancelling(false);
    router.replace(`/patient/clinic-checkin?bookingId=${booking.id}` as any);
  };

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={T.teal} size="large" />
      </View>
    );
  }

  // ══════ SUCCESS ══════
  const totalVisits = booking?.visitDates?.length || 1;
  const currentVisit = booking?.currentVisit || 1;
  const isMidVisitReturn = currentVisit < totalVisits;

  if (success) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center", padding: 32 }]}>
        <View style={s.successIcon}><Text style={{ fontSize: 48 }}>✈️</Text></View>
        <Text style={s.successTitle}>Drop Off Booked!</Text>
        <Text style={s.successSub}>
          {isMidVisitReturn
            ? `We'll pick you up and take you to the airport. See you again for Visit ${currentVisit}!`
            : "We'll pick you up and take you to Incheon Airport. Have a safe flight home!"}
        </Text>

        <View style={s.successCard}>
          <View style={s.successRow}>
            <Text style={s.successLabel}>📍 Pickup</Text>
            <Text style={s.successValue}>{getPickupAddress()}</Text>
          </View>
          <View style={s.successRow}>
            <Text style={s.successLabel}>📅 Date</Text>
            <Text style={s.successValue}>{formatDateDisplay(pickupDate)}</Text>
          </View>
          <View style={s.successRow}>
            <Text style={s.successLabel}>🕐 Time</Text>
            <Text style={s.successValue}>{formatTimeSlot(pickupTime)}</Text>
          </View>
          {flightNumber ? (
            <View style={s.successRow}>
              <Text style={s.successLabel}>✈️ Flight</Text>
              <Text style={s.successValue}>{flightNumber}</Text>
            </View>
          ) : null}
          {terminal ? (
            <View style={[s.successRow, { borderBottomWidth: 0 }]}>
              <Text style={s.successLabel}>🚪 Terminal</Text>
              <Text style={s.successValue}>{terminal}</Text>
            </View>
          ) : null}
        </View>

        {isMidVisitReturn && (
          <View style={s.tipCard}>
            <Text style={s.tipTitle}>🔄 What's Next</Text>
            <Text style={s.tipText}>✈️ Return home safely</Text>
            <Text style={s.tipText}>📅 Visit {currentVisit} is on {booking?.visitDates?.[currentVisit - 1]?.date ? formatDateDisplay(booking.visitDates[currentVisit - 1].date) : "TBD"}</Text>
            <Text style={s.tipText}>📱 Submit your return flight info when ready</Text>
          </View>
        )}

        {!isMidVisitReturn && (
          <View style={s.tipCard}>
            <Text style={s.tipTitle}>📋 Reminders</Text>
            <Text style={s.tipText}>🧳 Pack everything the night before</Text>
            <Text style={s.tipText}>🪪 Keep your passport handy</Text>
            <Text style={s.tipText}>🕐 Our driver will arrive 10 minutes early</Text>
            <Text style={s.tipText}>📱 We'll send a reminder the day before</Text>
          </View>
        )}

        <View style={s.successActions}>
          {isMidVisitReturn ? (
            <TouchableOpacity style={s.reviewBtn} onPress={() => router.replace("/patient/dashboard" as any)}>
              <Text style={s.reviewBtnText}>✈️ Go to Dashboard</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={s.reviewBtn}
              onPress={() => router.push({
                pathname: "/patient/write-review" as any,
                params: { bookingId: booking?.id, dentistName: booking?.dentistName, clinicName: booking?.clinicName },
              })}
            >
              <Text style={s.reviewBtnText}>⭐ Leave a Review</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.dashBtn} onPress={() => router.replace("/patient/dashboard" as any)}>
            <Text style={s.dashBtnText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>

        {/* Cancel drop off */}
        <TouchableOpacity
          style={s.cancelBtn}
          onPress={handleCancelDropOff}
          disabled={cancelling}
          activeOpacity={0.7}
        >
          {cancelling ? (
            <ActivityIndicator color="#ef4444" size="small" />
          ) : (
            <Text style={s.cancelBtnText}>🇰🇷 Cancel Drop Off — I'll Stay in Korea</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // ══════ FORM ══════
  return (
    <View style={s.container}>
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
            <Text style={s.headerTitle}>Airport Drop Off</Text>
            <Text style={s.headerSub}>{isMidVisitReturn ? `Returning home before Visit ${currentVisit}` : "Heading home — safe travels!"}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* Banner */}
          <View style={s.banner}>
            <Text style={{ fontSize: 24 }}>✈️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>Free Airport Drop Off</Text>
              <Text style={s.bannerSub}>We'll drive you to Incheon Airport — just tell us where and when to pick you up.</Text>
            </View>
          </View>

          {/* ── Pickup Location ── */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Pickup Location <Text style={s.req}>*</Text></Text>
            {PICKUP_LOCATIONS.map((loc) => (
              <TouchableOpacity
                key={loc.id}
                style={[s.locOption, pickupType === loc.id && s.locOptionActive]}
                onPress={() => setPickupType(loc.id)}
              >
                <Text style={s.locIcon}>{loc.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.locLabel, pickupType === loc.id && s.locLabelActive]}>{loc.label}</Text>
                  <Text style={s.locDesc}>{loc.desc}</Text>
                </View>
                <View style={[s.radio, pickupType === loc.id && s.radioActive]}>
                  {pickupType === loc.id && <View style={s.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}

            {pickupType === "other" && (
              <TextInput
                style={s.input}
                value={customAddress}
                onChangeText={setCustomAddress}
                placeholder="Enter full address..."
                placeholderTextColor="#c1c9d4"
              />
            )}
          </View>

          {/* ── Pickup Date ── */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Pickup Date <Text style={s.req}>*</Text></Text>
            <TextInput
              style={s.input}
              value={pickupDate}
              onChangeText={(t) => {
                const digits = t.replace(/\D/g, "");
                if (digits.length <= 4) setPickupDate(digits);
                else if (digits.length <= 6) setPickupDate(digits.slice(0,4) + "-" + digits.slice(4));
                else setPickupDate(digits.slice(0,4) + "-" + digits.slice(4,6) + "-" + digits.slice(6,8));
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#c1c9d4"
              keyboardType="number-pad"
              maxLength={10}
            />
            {pickupDate.length === 10 && (
              <Text style={s.datePreview}>📅 {formatDateDisplay(pickupDate)}</Text>
            )}
          </View>

          {/* ── Pickup Time ── */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Pickup Time <Text style={s.req}>*</Text></Text>
            <TouchableOpacity
              style={s.selectBtn}
              onPress={() => setShowTimePicker(!showTimePicker)}
            >
              <Text style={pickupTime ? s.selectText : s.selectPlaceholder}>
                {pickupTime ? `🕐 ${formatTimeSlot(pickupTime)}` : "Select time..."}
              </Text>
              <Text style={s.selectArrow}>{showTimePicker ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {showTimePicker && (
              <View style={s.timeGrid}>
                {timeSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[s.timeChip, pickupTime === slot && s.timeChipActive]}
                    onPress={() => { setPickupTime(slot); setShowTimePicker(false); }}
                  >
                    <Text style={[s.timeChipText, pickupTime === slot && s.timeChipTextActive]}>
                      {formatTimeSlot(slot)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={s.fieldHint}>💡 We recommend scheduling pickup at least 3 hours before your flight</Text>
          </View>

          {/* ── Departure Flight ── */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Departure Flight (Optional)</Text>
            <View style={s.flightInputRow}>
              <Text style={s.flightIcon}>🛫</Text>
              <TextInput
                style={s.flightInput}
                value={flightNumber}
                onChangeText={(t) => setFlightNumber(formatFlightNumber(t))}
                placeholder="e.g. KE002"
                placeholderTextColor="#c1c9d4"
                autoCapitalize="characters"
                maxLength={8}
              />
            </View>
          </View>

          {/* ── Terminal ── */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Terminal</Text>
            <View style={s.terminalRow}>
              {["Terminal 1", "Terminal 2"].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[s.terminalChip, terminal === t && s.terminalChipActive]}
                  onPress={() => setTerminal(terminal === t ? "" : t)}
                >
                  <Text style={[s.terminalChipText, terminal === t && s.terminalChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Passengers ── */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Passengers</Text>
            <View style={s.stepperRow}>
              <TouchableOpacity style={s.stepperBtn} onPress={() => setPassengers(String(Math.max(1, parseInt(passengers) - 1)))}>
                <Text style={s.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <View style={s.stepperValue}>
                <Text style={s.stepperNum}>{passengers}</Text>
                <Text style={s.stepperLabel}>{parseInt(passengers) === 1 ? "person" : "people"}</Text>
              </View>
              <TouchableOpacity style={s.stepperBtn} onPress={() => setPassengers(String(Math.min(10, parseInt(passengers) + 1)))}>
                <Text style={s.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Notes ── */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Additional Notes</Text>
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: "top" }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Extra luggage, early morning, wheelchair, etc."
              placeholderTextColor="#c1c9d4"
              multiline
              maxLength={300}
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom */}
      <View style={s.bottomBar}>
        <View style={s.bottomInfo}>
          <Text style={s.bottomTitle}>
            {pickupType && pickupTime ? `✈️ ${formatTimeSlot(pickupTime)} drop off` : "Enter drop off details"}
          </Text>
          <Text style={s.bottomSub}>
            {pickupDate ? formatDateDisplay(pickupDate) : ""}
            {pickupType === "hotel" ? " • Hotel" : pickupType === "clinic" ? " • Clinic" : pickupType === "other" ? " • Custom" : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.submitBtn, !isValid() && { opacity: 0.4 }]}
          onPress={handleSave}
          disabled={!isValid() || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.submitBtnText}>Book Drop Off →</Text>
          )}
        </TouchableOpacity>
      </View>
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
  content: { padding: 20, gap: 18 },

  // Banner
  banner: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: T.tealLight, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: "rgba(74,0,128,0.08)",
  },
  bannerTitle: { fontSize: 16, fontWeight: "700", color: T.navy },
  bannerSub: { fontSize: 12, color: T.slate, lineHeight: 17, marginTop: 2 },

  // Fields
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: T.navy },
  req: { color: "#ef4444" },
  fieldHint: { fontSize: 11, color: T.slateLight },
  input: {
    backgroundColor: T.white, borderRadius: 12, borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: T.navy,
  },
  datePreview: { fontSize: 12, color: T.teal, fontWeight: "500" },

  // Location options
  locOption: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: T.white, borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: T.border,
  },
  locOptionActive: { borderColor: T.teal, backgroundColor: T.tealLight },
  locIcon: { fontSize: 24 },
  locLabel: { fontSize: 14, fontWeight: "600", color: T.navy },
  locLabelActive: { color: T.teal },
  locDesc: { fontSize: 11, color: T.slateLight, marginTop: 1 },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: T.border,
    alignItems: "center", justifyContent: "center",
  },
  radioActive: { borderColor: T.teal },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: T.teal },

  // Select
  selectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: T.white, borderRadius: 12, borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  selectText: { fontSize: 15, color: T.navy, fontWeight: "500" },
  selectPlaceholder: { fontSize: 15, color: "#c1c9d4" },
  selectArrow: { fontSize: 10, color: T.slateLight },

  // Time grid
  timeGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 8,
    backgroundColor: T.white, borderRadius: 12, borderWidth: 1, borderColor: T.border,
    padding: 12, maxHeight: 220,
  },
  timeChip: {
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10,
    backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "transparent",
  },
  timeChipActive: { backgroundColor: T.tealLight, borderColor: T.teal },
  timeChipText: { fontSize: 12, color: T.slate, fontWeight: "500" },
  timeChipTextActive: { color: T.teal, fontWeight: "700" },

  // Flight
  flightInputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.white, borderRadius: 12, borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 14,
  },
  flightIcon: { fontSize: 18, marginRight: 8 },
  flightInput: { flex: 1, fontSize: 18, fontWeight: "700", color: T.navy, paddingVertical: 14, letterSpacing: 1 },

  // Terminal
  terminalRow: { flexDirection: "row", gap: 10 },
  terminalChip: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center",
    backgroundColor: T.white, borderWidth: 1.5, borderColor: T.border,
  },
  terminalChipActive: { borderColor: T.teal, backgroundColor: T.tealLight },
  terminalChipText: { fontSize: 14, fontWeight: "600", color: T.slate },
  terminalChipTextActive: { color: T.teal },

  // Stepper
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  stepperBtn: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: T.border,
    alignItems: "center", justifyContent: "center", backgroundColor: T.white,
  },
  stepperBtnText: { fontSize: 22, fontWeight: "600", color: T.teal },
  stepperValue: { alignItems: "center" },
  stepperNum: { fontSize: 28, fontWeight: "800", color: T.navy },
  stepperLabel: { fontSize: 11, color: T.slate },

  // Bottom
  bottomBar: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 56,
    borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.white,
  },
  bottomInfo: { flex: 1 },
  bottomTitle: { fontSize: 14, fontWeight: "700", color: T.navy },
  bottomSub: { fontSize: 11, color: T.slate },
  submitBtn: { backgroundColor: T.teal, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 15 },
  submitBtnText: { color: T.white, fontSize: 15, fontWeight: "700" },

  // Success
  successIcon: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: T.tealLight,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  successTitle: { fontSize: 24, fontWeight: "800", color: T.navy, marginBottom: 8 },
  successSub: { fontSize: 14, color: T.slate, textAlign: "center", lineHeight: 21, marginBottom: 16 },
  successCard: {
    backgroundColor: T.white, borderRadius: 16, width: "100%",
    paddingHorizontal: 20, borderWidth: 1, borderColor: T.border,
  },
  successRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  successLabel: { fontSize: 13, color: T.slate },
  successValue: { fontSize: 13, fontWeight: "600", color: T.navy, flex: 1, textAlign: "right" },
  tipCard: {
    backgroundColor: T.amberLight, borderRadius: 14, padding: 18, width: "100%", marginTop: 12,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.12)", gap: 6,
  },
  tipTitle: { fontSize: 14, fontWeight: "700", color: T.navy, marginBottom: 4 },
  tipText: { fontSize: 12, color: T.slate, lineHeight: 18 },
  successActions: { gap: 10, width: "100%", marginTop: 16 },
  reviewBtn: { backgroundColor: T.teal, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  reviewBtnText: { fontSize: 15, fontWeight: "700", color: T.white },
  dashBtn: {
    backgroundColor: T.white, borderRadius: 14, paddingVertical: 16, alignItems: "center",
    borderWidth: 1, borderColor: T.border,
  },
  dashBtnText: { fontSize: 15, fontWeight: "600", color: T.navy },

  // Cancel drop off
  cancelBtn: {
    width: "100%", marginTop: 20, paddingVertical: 14, alignItems: "center",
    borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(239,68,68,0.2)",
    backgroundColor: "rgba(239,68,68,0.04)",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "600", color: "#ef4444" },
});
