import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Booking, DeparturePickup, store } from "../../lib/store";

import { PatientTheme, SharedColors } from "../../constants/theme";
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
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

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

  /* ── Calendar ── */
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const calCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); };

  const renderCalendar = () => (
    <Modal transparent visible={datePickerVisible} animationType="fade" onRequestClose={() => setDatePickerVisible(false)}>
      <TouchableOpacity style={s.calOverlay} activeOpacity={1} onPress={() => setDatePickerVisible(false)}>
        <TouchableOpacity style={s.calContainer} activeOpacity={1} onPress={() => {}}>
          <View style={s.calHeader}>
            <TouchableOpacity onPress={prevMonth} style={s.calNavBtn}><Text style={s.calNavText}>{"<"}</Text></TouchableOpacity>
            <Text style={s.calMonthYear}>{monthNames[calMonth]} {calYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={s.calNavBtn}><Text style={s.calNavText}>{">"}</Text></TouchableOpacity>
          </View>
          <View style={s.calDayNamesRow}>
            {DAY_NAMES.map((dn) => (<Text key={dn} style={s.calDayName}>{dn}</Text>))}
          </View>
          <View style={s.calGrid}>
            {calCells.map((day, idx) => {
              if (day === null) return <View key={`e-${idx}`} style={s.calCell} />;
              const cellStr = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const isToday = cellStr === todayStr;
              const isSelected = cellStr === pickupDate;
              return (
                <TouchableOpacity key={`d-${day}`} style={s.calCell} onPress={() => { setPickupDate(cellStr); setDatePickerVisible(false); }}>
                  <View style={[s.calDayCircle, isToday && s.calCellToday, isSelected && s.calCellSelected]}>
                    <Text style={[s.calDayText, isToday && s.calDayTextToday, isSelected && s.calDayTextSelected]}>{day}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={s.calCancelBtn} onPress={() => setDatePickerVisible(false)}>
            <Text style={s.calCancelText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

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
        <ActivityIndicator color={PatientTheme.primary} size="large" />
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
          {/* Message driver button */}
          <TouchableOpacity
            style={[s.reviewBtn, { backgroundColor: "#1e88e5" }]}
            onPress={() => Alert.alert("Coming Soon", "Driver messaging will be available soon. Your driver will contact you before pickup.")}
          >
            <Text style={s.reviewBtnText}>💬 Message Your Driver</Text>
          </TouchableOpacity>

          {isMidVisitReturn ? (
            <TouchableOpacity style={s.dashBtn} onPress={() => router.push("/patient/dashboard" as any)}>
              <Text style={s.dashBtnText}>✈️ Go to Dashboard</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={s.reviewBtn}
                onPress={() => router.push({
                  pathname: "/patient/write-review" as any,
                  params: { bookingId: booking?.id, dentistName: booking?.dentistName, clinicName: booking?.clinicName },
                })}
              >
                <Text style={s.reviewBtnText}>⭐ Leave a Review</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.reviewBtn, { backgroundColor: SharedColors.green }]}
                onPress={() => router.replace(`/patient/treatment-complete?bookingId=${booking?.id}` as any)}
              >
                <Text style={s.reviewBtnText}>Complete Journey ✅</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={s.dashBtn} onPress={() => router.push("/patient/dashboard" as any)}>
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
            <ActivityIndicator color={SharedColors.red} size="small" />
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
        colors={[...PatientTheme.gradient]}
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
            <TouchableOpacity style={s.input} onPress={() => {
              if (pickupDate) {
                const [y, m] = pickupDate.split("-");
                setCalYear(parseInt(y)); setCalMonth(parseInt(m) - 1);
              }
              setDatePickerVisible(true);
            }} activeOpacity={0.7}>
              <Text style={pickupDate ? { fontSize: 15, color: SharedColors.navy } : { fontSize: 15, color: "#c1c9d4" }}>
                {pickupDate ? formatDateDisplay(pickupDate) : "Select date"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Pickup Time ── */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Pickup Time <Text style={s.req}>*</Text></Text>
            <View style={s.flightInputRow}>
              <Text style={s.flightIcon}>🕐</Text>
              <TextInput
                style={s.flightInput}
                value={pickupTime}
                onChangeText={(t) => {
                  const digits = t.replace(/\D/g, "");
                  if (digits.length <= 2) setPickupTime(digits);
                  else setPickupTime(digits.slice(0, 2) + ":" + digits.slice(2, 4));
                }}
                placeholder="HH:MM (e.g. 14:30)"
                placeholderTextColor="#c1c9d4"
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
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
            <ActivityIndicator color={SharedColors.white} size="small" />
          ) : (
            <Text style={s.submitBtnText}>Book Drop Off →</Text>
          )}
        </TouchableOpacity>
      </View>
      {renderCalendar()}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: SharedColors.white, fontWeight: "600", marginTop: -2 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: SharedColors.white },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  content: { padding: 20, gap: 18 },

  // Banner
  banner: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: PatientTheme.primaryLight, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: "rgba(74,0,128,0.08)",
  },
  bannerTitle: { fontSize: 16, fontWeight: "700", color: SharedColors.navy },
  bannerSub: { fontSize: 12, color: SharedColors.slate, lineHeight: 17, marginTop: 2 },

  // Fields
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: SharedColors.navy },
  req: { color: SharedColors.red },
  fieldHint: { fontSize: 11, color: SharedColors.slateLight },
  input: {
    backgroundColor: SharedColors.white, borderRadius: 12, borderWidth: 1, borderColor: SharedColors.border,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: SharedColors.navy,
  },
  datePreview: { fontSize: 12, color: PatientTheme.primary, fontWeight: "500" },

  // Location options
  locOption: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: SharedColors.border,
  },
  locOptionActive: { borderColor: PatientTheme.primary, backgroundColor: PatientTheme.primaryLight },
  locIcon: { fontSize: 24 },
  locLabel: { fontSize: 14, fontWeight: "600", color: SharedColors.navy },
  locLabelActive: { color: PatientTheme.primary },
  locDesc: { fontSize: 11, color: SharedColors.slateLight, marginTop: 1 },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: SharedColors.border,
    alignItems: "center", justifyContent: "center",
  },
  radioActive: { borderColor: PatientTheme.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: PatientTheme.primary },

  // Flight
  flightInputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: SharedColors.white, borderRadius: 12, borderWidth: 1, borderColor: SharedColors.border,
    paddingHorizontal: 14,
  },
  flightIcon: { fontSize: 18, marginRight: 8 },
  flightInput: { flex: 1, fontSize: 18, fontWeight: "700", color: SharedColors.navy, paddingVertical: 14, letterSpacing: 1 },

  // Terminal
  terminalRow: { flexDirection: "row", gap: 10 },
  terminalChip: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center",
    backgroundColor: SharedColors.white, borderWidth: 1.5, borderColor: SharedColors.border,
  },
  terminalChipActive: { borderColor: PatientTheme.primary, backgroundColor: PatientTheme.primaryLight },
  terminalChipText: { fontSize: 14, fontWeight: "600", color: SharedColors.slate },
  terminalChipTextActive: { color: PatientTheme.primary },

  // Stepper
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  stepperBtn: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: SharedColors.border,
    alignItems: "center", justifyContent: "center", backgroundColor: SharedColors.white,
  },
  stepperBtnText: { fontSize: 22, fontWeight: "600", color: PatientTheme.primary },
  stepperValue: { alignItems: "center" },
  stepperNum: { fontSize: 28, fontWeight: "800", color: SharedColors.navy },
  stepperLabel: { fontSize: 11, color: SharedColors.slate },

  // Bottom
  bottomBar: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 56,
    borderTopWidth: 1, borderTopColor: SharedColors.border, backgroundColor: SharedColors.white,
  },
  bottomInfo: { flex: 1 },
  bottomTitle: { fontSize: 14, fontWeight: "700", color: SharedColors.navy },
  bottomSub: { fontSize: 11, color: SharedColors.slate },
  submitBtn: { backgroundColor: PatientTheme.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 15 },
  submitBtnText: { color: SharedColors.white, fontSize: 15, fontWeight: "700" },

  // Success
  successIcon: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: PatientTheme.primaryLight,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  successTitle: { fontSize: 24, fontWeight: "800", color: SharedColors.navy, marginBottom: 8 },
  successSub: { fontSize: 14, color: SharedColors.slate, textAlign: "center", lineHeight: 21, marginBottom: 16 },
  successCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, width: "100%",
    paddingHorizontal: 20, borderWidth: 1, borderColor: SharedColors.border,
  },
  successRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  successLabel: { fontSize: 13, color: SharedColors.slate },
  successValue: { fontSize: 13, fontWeight: "600", color: SharedColors.navy, flex: 1, textAlign: "right" },
  tipCard: {
    backgroundColor: SharedColors.amberLight, borderRadius: 14, padding: 18, width: "100%", marginTop: 12,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.12)", gap: 6,
  },
  tipTitle: { fontSize: 14, fontWeight: "700", color: SharedColors.navy, marginBottom: 4 },
  tipText: { fontSize: 12, color: SharedColors.slate, lineHeight: 18 },
  successActions: { gap: 10, width: "100%", marginTop: 16 },
  reviewBtn: { backgroundColor: PatientTheme.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  reviewBtnText: { fontSize: 15, fontWeight: "700", color: SharedColors.white },
  dashBtn: {
    backgroundColor: SharedColors.white, borderRadius: 14, paddingVertical: 16, alignItems: "center",
    borderWidth: 1, borderColor: SharedColors.border,
  },
  dashBtnText: { fontSize: 15, fontWeight: "600", color: SharedColors.navy },

  // Cancel drop off
  cancelBtn: {
    width: "100%", marginTop: 20, paddingVertical: 14, alignItems: "center",
    borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(239,68,68,0.2)",
    backgroundColor: "rgba(239,68,68,0.04)",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "600", color: SharedColors.red },

  // Calendar
  calOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center",
  },
  calContainer: {
    backgroundColor: SharedColors.white, borderRadius: 20, padding: 20, width: "85%",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
  },
  calHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16,
  },
  calNavBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: SharedColors.bg, borderWidth: 1, borderColor: SharedColors.border,
  },
  calNavText: { fontSize: 16, fontWeight: "700", color: SharedColors.navy },
  calMonthYear: { fontSize: 16, fontWeight: "700", color: SharedColors.navy },
  calDayNamesRow: { flexDirection: "row", marginBottom: 8 },
  calDayName: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600", color: SharedColors.slate },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: { width: "14.28%", height: 48, alignItems: "center", justifyContent: "center" },
  calDayCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  calCellToday: { borderWidth: 1.5, borderColor: SharedColors.border },
  calCellSelected: { backgroundColor: PatientTheme.primary },
  calDayText: { fontSize: 14, fontWeight: "500", color: SharedColors.navy, textAlign: "center" },
  calDayTextToday: { fontWeight: "700", color: PatientTheme.primary },
  calDayTextSelected: { fontWeight: "700", color: SharedColors.white },
  calCancelBtn: { alignItems: "center", paddingVertical: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: SharedColors.border },
  calCancelText: { fontSize: 14, fontWeight: "600", color: SharedColors.slate },
});
