import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SavedTrip, store } from "../../lib/store";

const T = {
  purple: "#4A0080",
  purpleMid: "#5C10A0",
  purpleLight: "#f0e6f6",
  navy: "#0f172a",
  slate: "#64748b",
  slateLight: "#94a3b8",
  border: "#e2e8f0",
  bg: "#f8fafc",
  white: "#ffffff",
  red: "#ef4444",
  green: "#16a34a",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const EMPTY_TRIP: Omit<SavedTrip, "id" | "createdAt" | "updatedAt"> = {
  airline: "",
  flightNumber: "",
  flightDate: "",
  flightTime: "",
  terminal: "",
  depAirline: "",
  depFlightNumber: "",
  depFlightDate: "",
  depFlightTime: "",
  depTerminal: "",
  hotelName: "",
  hotelAddress: "",
  checkInDate: "",
  checkOutDate: "",
  confirmationNumber: "",
};

// ── Time auto-format helper ──
function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + ":" + digits.slice(2);
}

function isTimeValid(time: string): boolean {
  if (!time || !time.includes(":")) return true; // empty or incomplete = not invalid yet
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr) || 0;
  const m = parseInt(mStr) || 0;
  return h <= 23 && m <= 59;
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ── Mini Calendar Component ──
function MiniCalendar({ value, onSelect, onClose }: { value: string; onSelect: (date: string) => void; onClose: () => void }) {
  const now = new Date();
  const initial = value ? new Date(value + "T00:00:00") : now;
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - firstDayOfWeek + 1;
    cells.push(day >= 1 && day <= daysInMonth ? day : null);
  }

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  return (
    <View style={s.calendarDrop}>
      <View style={s.calMonthRow}>
        <TouchableOpacity onPress={prevMonth} style={s.calArrow}>
          <Text style={s.calArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.calMonthTitle}>{MONTHS[month].slice(0, 3)} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={s.calArrow}>
          <Text style={s.calArrowText}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={s.calWeekdayRow}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={s.calWeekdayCell}>
            <Text style={s.calWeekdayText}>{d}</Text>
          </View>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={s.calWeekRow}>
          {week.map((day, di) => {
            if (day === null) return <View key={di} style={s.calDayCell} />;
            const dateKey = formatDateKey(year, month, day);
            const isSelected = value === dateKey;
            const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
            return (
              <TouchableOpacity
                key={di}
                style={[s.calDayCell, isSelected && s.calDayCellSelected, isToday && !isSelected && s.calDayCellToday]}
                onPress={() => { onSelect(dateKey); onClose(); }}
              >
                <Text style={[s.calDayText, isSelected && s.calDayTextSelected, isToday && !isSelected && s.calDayTextToday]}>
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default function MyTripsScreen() {
  const { editTripId } = useLocalSearchParams<{ editTripId?: string }>();
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTrip, setEditingTrip] = useState<SavedTrip | null>(null);
  const [form, setForm] = useState(EMPTY_TRIP);
  const [showCalendarFor, setShowCalendarFor] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [deepLinkHandled, setDeepLinkHandled] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [])
  );

  const loadTrips = async () => {
    const data = await store.getTrips();
    setTrips(data);

    // Auto-open edit modal if navigated with editTripId
    if (editTripId && editTripId !== deepLinkHandled) {
      const target = data.find((t) => t.id === editTripId);
      if (target) {
        setDeepLinkHandled(editTripId);
        setEditingTrip(target);
        setForm({
          airline: target.airline,
          flightNumber: target.flightNumber,
          flightDate: target.flightDate,
          flightTime: target.flightTime,
          terminal: target.terminal || "",
          depAirline: target.depAirline || "",
          depFlightNumber: target.depFlightNumber || "",
          depFlightDate: target.depFlightDate || "",
          depFlightTime: target.depFlightTime || "",
          depTerminal: target.depTerminal || "",
          hotelName: target.hotelName || "",
          hotelAddress: target.hotelAddress || "",
          checkInDate: target.checkInDate || "",
          checkOutDate: target.checkOutDate || "",
          confirmationNumber: target.confirmationNumber || "",
        });
        setAttempted(false);
        setShowCalendarFor(null);
        setModalVisible(true);
      }
    }
  };

  const openAdd = () => {
    setEditingTrip(null);
    setForm(EMPTY_TRIP);
    setAttempted(false);
    setShowCalendarFor(null);
    setModalVisible(true);
  };

  const openEdit = (trip: SavedTrip) => {
    setEditingTrip(trip);
    setForm({
      airline: trip.airline,
      flightNumber: trip.flightNumber,
      flightDate: trip.flightDate,
      flightTime: trip.flightTime,
      terminal: trip.terminal || "",
      depAirline: trip.depAirline || "",
      depFlightNumber: trip.depFlightNumber || "",
      depFlightDate: trip.depFlightDate || "",
      depFlightTime: trip.depFlightTime || "",
      depTerminal: trip.depTerminal || "",
      hotelName: trip.hotelName || "",
      hotelAddress: trip.hotelAddress || "",
      checkInDate: trip.checkInDate || "",
      checkOutDate: trip.checkOutDate || "",
      confirmationNumber: trip.confirmationNumber || "",
    });
    setAttempted(false);
    setShowCalendarFor(null);
    setModalVisible(true);
  };

  const isFormValid = () => {
    return (
      form.airline.trim() !== "" &&
      form.flightNumber.trim() !== "" &&
      form.flightDate.trim() !== "" &&
      form.flightTime.trim() !== "" &&
      isTimeValid(form.flightTime) &&
      isTimeValid(form.depFlightTime || "")
    );
  };

  const handleSave = async () => {
    setAttempted(true);
    if (!isFormValid()) return;
    const now = new Date().toISOString();
    const trip: SavedTrip = {
      id: editingTrip ? editingTrip.id : "trip_" + Date.now(),
      ...form,
      createdAt: editingTrip ? editingTrip.createdAt : now,
      updatedAt: now,
    };
    await store.saveTrip(trip);
    setModalVisible(false);
    loadTrips();
  };

  const handleDelete = (trip: SavedTrip) => {
    Alert.alert("Delete Trip", "Are you sure you want to delete this trip information?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await store.deleteTrip(trip.id);
          loadTrips();
        },
      },
    ]);
  };

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCalendar = (field: string) => {
    setShowCalendarFor(showCalendarFor === field ? null : field);
  };

  const fieldError = (field: string) => {
    if (!attempted) return false;
    const val = (form as any)[field];
    return !val || val.trim() === "";
  };

  const hasDeparture = (item: SavedTrip) =>
    !!(item.depAirline || item.depFlightNumber || item.depFlightDate || item.depFlightTime);

  const renderTrip = ({ item, index }: { item: SavedTrip; index: number }) => (
    <View style={s.card}>
      {/* 카드 상단 헤더 */}
      <LinearGradient colors={[T.purple, T.purpleMid]} style={s.cardHeader}>
        <Text style={s.cardHeaderText}>Trip #{index + 1}</Text>
        {item.flightDate ? (
          <Text style={s.cardHeaderDate}>{item.flightDate}</Text>
        ) : null}
      </LinearGradient>

      <View style={s.cardBody}>
        {/* Flight Row */}
        <View style={s.flightRow}>
          <View style={s.flightCol}>
            <View style={s.sectionBadge}>
              <Text style={s.sectionBadgeIcon}>🛬</Text>
              <Text style={s.sectionBadgeText}>Arrival</Text>
            </View>
            <Text style={s.infoMain}>{item.airline}</Text>
            <Text style={s.infoSub}>{item.flightNumber}</Text>
            {item.flightDate ? <Text style={s.infoSub}>{item.flightDate}</Text> : null}
            {item.flightTime ? <Text style={s.infoSub}>{item.flightTime}</Text> : null}
            {item.terminal ? <Text style={s.infoSub}>{item.terminal}</Text> : null}
          </View>
          <View style={s.flightDivider} />
          <View style={s.flightCol}>
            <View style={s.sectionBadge}>
              <Text style={s.sectionBadgeIcon}>🛫</Text>
              <Text style={s.sectionBadgeText}>Departure</Text>
            </View>
            {hasDeparture(item) ? (
              <>
                <Text style={s.infoMain}>{item.depAirline || ""}</Text>
                {item.depFlightNumber ? <Text style={s.infoSub}>{item.depFlightNumber}</Text> : null}
                {item.depFlightDate ? <Text style={s.infoSub}>{item.depFlightDate}</Text> : null}
                {item.depFlightTime ? <Text style={s.infoSub}>{item.depFlightTime}</Text> : null}
                {item.depTerminal ? <Text style={s.infoSub}>{item.depTerminal}</Text> : null}
              </>
            ) : (
              <Text style={s.infoPlaceholder}>Not set</Text>
            )}
          </View>
        </View>

        {(item.hotelName || item.hotelAddress) && (
          <View style={s.hotelSection}>
            <View style={s.sectionBadge}>
              <Text style={s.sectionBadgeIcon}>🏨</Text>
              <Text style={s.sectionBadgeText}>Hotel</Text>
            </View>
            {item.hotelName ? <Text style={s.infoMain}>{item.hotelName}</Text> : null}
            {item.hotelAddress ? <Text style={s.infoSub}>{item.hotelAddress}</Text> : null}
            {item.checkInDate ? <Text style={s.infoSub}>Check-in: {item.checkInDate}</Text> : null}
            {item.checkOutDate ? <Text style={s.infoSub}>Check-out: {item.checkOutDate}</Text> : null}
            {item.confirmationNumber ? <Text style={s.infoSub}>Confirmation: {item.confirmationNumber}</Text> : null}
          </View>
        )}

        <View style={s.cardActions}>
          <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}>
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)}>
            <Text style={s.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const timeInvalid = attempted && !isTimeValid(form.flightTime);

  return (
    <View style={s.container}>
      <LinearGradient colors={[T.purple, T.purpleMid]} style={s.header}>
        <View style={s.headerRow}>
          <View style={{ width: 40 }} />
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>My Trips</Text>
            <Text style={s.headerSub}>{trips.length} trip{trips.length !== 1 ? "s" : ""} saved</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={openAdd}>
            <Text style={s.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={renderTrip}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🛬</Text>
            <Text style={s.emptyTitle}>No Trips Saved</Text>
            <Text style={s.emptySub}>Tap + to add your flight and hotel details</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openAdd}>
              <Text style={s.emptyBtnText}>Add Trip</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editingTrip ? "Edit Trip" : "Add Trip"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={s.modalScroll} keyboardShouldPersistTaps="handled">
              {/* ── Arrival Flight (Required) ── */}
              <Text style={s.formSectionLabel}>🛬 Arrival Flight</Text>

              <View style={s.formField}>
                <Text style={s.formLabel}>Airline <Text style={s.req}>*</Text></Text>
                <TextInput
                  style={[s.formInput, fieldError("airline") && s.formInputError]}
                  value={form.airline}
                  onChangeText={(v) => updateField("airline", v)}
                  placeholder="e.g. Korean Air"
                  placeholderTextColor={T.slateLight}
                />
              </View>

              <View style={s.formField}>
                <Text style={s.formLabel}>Flight Number <Text style={s.req}>*</Text></Text>
                <TextInput
                  style={[s.formInput, fieldError("flightNumber") && s.formInputError]}
                  value={form.flightNumber}
                  onChangeText={(v) => updateField("flightNumber", v.toUpperCase())}
                  placeholder="e.g. KE001"
                  placeholderTextColor={T.slateLight}
                  autoCapitalize="characters"
                />
              </View>

              <View style={s.formRow}>
                <View style={[s.formField, { flex: 1, zIndex: showCalendarFor === "flightDate" ? 10 : 1 }]}>
                  <Text style={s.formLabel}>Date <Text style={s.req}>*</Text></Text>
                  <TouchableOpacity
                    style={[s.formInput, s.datePickerBtn, fieldError("flightDate") && s.formInputError]}
                    onPress={() => toggleCalendar("flightDate")}
                  >
                    <Text style={form.flightDate ? s.datePickerText : s.datePickerPlaceholder}>
                      {form.flightDate || "Select date"}
                    </Text>
                    <Text style={s.datePickerIcon}>📅</Text>
                  </TouchableOpacity>
                  {showCalendarFor === "flightDate" && (
                    <MiniCalendar
                      value={form.flightDate}
                      onSelect={(d) => updateField("flightDate", d)}
                      onClose={() => setShowCalendarFor(null)}
                    />
                  )}
                </View>
                <View style={[s.formField, { flex: 1 }]}>
                  <Text style={s.formLabel}>Time <Text style={s.req}>*</Text></Text>
                  <TextInput
                    style={[s.formInput, (fieldError("flightTime") || timeInvalid) && s.formInputError]}
                    value={form.flightTime}
                    onChangeText={(v) => updateField("flightTime", formatTimeInput(v))}
                    placeholder="HH:MM"
                    placeholderTextColor={T.slateLight}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
              </View>

              <View style={s.formField}>
                <Text style={s.formLabel}>Terminal</Text>
                <TextInput
                  style={s.formInput}
                  value={form.terminal}
                  onChangeText={(v) => updateField("terminal", v)}
                  placeholder="e.g. Terminal 1"
                  placeholderTextColor={T.slateLight}
                />
              </View>

              {/* ── Departure Flight (Optional) ── */}
              <Text style={[s.formSectionLabel, { marginTop: 20 }]}>
                🛫 Departure Flight <Text style={s.optionalTag}>(Optional)</Text>
              </Text>

              <View style={s.formField}>
                <Text style={s.formLabel}>Airline</Text>
                <TextInput
                  style={s.formInput}
                  value={form.depAirline}
                  onChangeText={(v) => updateField("depAirline", v)}
                  placeholder="e.g. Korean Air"
                  placeholderTextColor={T.slateLight}
                />
              </View>

              <View style={s.formField}>
                <Text style={s.formLabel}>Flight Number</Text>
                <TextInput
                  style={s.formInput}
                  value={form.depFlightNumber}
                  onChangeText={(v) => updateField("depFlightNumber", v.toUpperCase())}
                  placeholder="e.g. KE002"
                  placeholderTextColor={T.slateLight}
                  autoCapitalize="characters"
                />
              </View>

              <View style={s.formRow}>
                <View style={[s.formField, { flex: 1, zIndex: showCalendarFor === "depFlightDate" ? 10 : 1 }]}>
                  <Text style={s.formLabel}>Date</Text>
                  <TouchableOpacity
                    style={[s.formInput, s.datePickerBtn]}
                    onPress={() => toggleCalendar("depFlightDate")}
                  >
                    <Text style={form.depFlightDate ? s.datePickerText : s.datePickerPlaceholder}>
                      {form.depFlightDate || "Select date"}
                    </Text>
                    <Text style={s.datePickerIcon}>📅</Text>
                  </TouchableOpacity>
                  {showCalendarFor === "depFlightDate" && (
                    <MiniCalendar
                      value={form.depFlightDate || ""}
                      onSelect={(d) => updateField("depFlightDate", d)}
                      onClose={() => setShowCalendarFor(null)}
                    />
                  )}
                </View>
                <View style={[s.formField, { flex: 1 }]}>
                  <Text style={s.formLabel}>Time</Text>
                  <TextInput
                    style={[s.formInput, (attempted && form.depFlightTime && !isTimeValid(form.depFlightTime)) ? s.formInputError : null]}
                    value={form.depFlightTime}
                    onChangeText={(v) => updateField("depFlightTime", formatTimeInput(v))}
                    placeholder="HH:MM"
                    placeholderTextColor={T.slateLight}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
              </View>

              <View style={s.formField}>
                <Text style={s.formLabel}>Terminal</Text>
                <TextInput
                  style={s.formInput}
                  value={form.depTerminal}
                  onChangeText={(v) => updateField("depTerminal", v)}
                  placeholder="e.g. Terminal 2"
                  placeholderTextColor={T.slateLight}
                />
              </View>

              {/* ── Hotel Information (Optional) ── */}
              <Text style={[s.formSectionLabel, { marginTop: 20 }]}>
                🏨 Hotel Information <Text style={s.optionalTag}>(Optional)</Text>
              </Text>

              <View style={s.formField}>
                <Text style={s.formLabel}>Hotel Name</Text>
                <TextInput
                  style={s.formInput}
                  value={form.hotelName}
                  onChangeText={(v) => updateField("hotelName", v)}
                  placeholder="e.g. Lotte Hotel Seoul"
                  placeholderTextColor={T.slateLight}
                />
              </View>

              <View style={s.formField}>
                <Text style={s.formLabel}>Address</Text>
                <TextInput
                  style={s.formInput}
                  value={form.hotelAddress}
                  onChangeText={(v) => updateField("hotelAddress", v)}
                  placeholder="Hotel address"
                  placeholderTextColor={T.slateLight}
                />
              </View>

              <View style={s.formRow}>
                <View style={[s.formField, { flex: 1, zIndex: showCalendarFor === "checkInDate" ? 10 : 1 }]}>
                  <Text style={s.formLabel}>Check-in</Text>
                  <TouchableOpacity
                    style={[s.formInput, s.datePickerBtn]}
                    onPress={() => toggleCalendar("checkInDate")}
                  >
                    <Text style={form.checkInDate ? s.datePickerText : s.datePickerPlaceholder}>
                      {form.checkInDate || "Select date"}
                    </Text>
                    <Text style={s.datePickerIcon}>📅</Text>
                  </TouchableOpacity>
                  {showCalendarFor === "checkInDate" && (
                    <MiniCalendar
                      value={form.checkInDate}
                      onSelect={(d) => updateField("checkInDate", d)}
                      onClose={() => setShowCalendarFor(null)}
                    />
                  )}
                </View>
                <View style={[s.formField, { flex: 1, zIndex: showCalendarFor === "checkOutDate" ? 10 : 1 }]}>
                  <Text style={s.formLabel}>Check-out</Text>
                  <TouchableOpacity
                    style={[s.formInput, s.datePickerBtn]}
                    onPress={() => toggleCalendar("checkOutDate")}
                  >
                    <Text style={form.checkOutDate ? s.datePickerText : s.datePickerPlaceholder}>
                      {form.checkOutDate || "Select date"}
                    </Text>
                    <Text style={s.datePickerIcon}>📅</Text>
                  </TouchableOpacity>
                  {showCalendarFor === "checkOutDate" && (
                    <MiniCalendar
                      value={form.checkOutDate}
                      onSelect={(d) => updateField("checkOutDate", d)}
                      onClose={() => setShowCalendarFor(null)}
                    />
                  )}
                </View>
              </View>

              <View style={s.formField}>
                <Text style={s.formLabel}>Confirmation Number</Text>
                <TextInput
                  style={s.formInput}
                  value={form.confirmationNumber}
                  onChangeText={(v) => updateField("confirmationNumber", v)}
                  placeholder="Booking confirmation #"
                  placeholderTextColor={T.slateLight}
                />
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>

            <TouchableOpacity
              style={[s.saveBtn, !isFormValid() && attempted && s.saveBtnDisabled]}
              onPress={handleSave}
            >
              <Text style={s.saveBtnText}>{editingTrip ? "Update Trip" : "Save Trip"}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: T.white, fontSize: 20, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  addBtnText: { color: T.white, fontSize: 24, fontWeight: "300" },

  list: { padding: 16, paddingBottom: 100 },

  card: {
    backgroundColor: T.white, borderRadius: 16, overflow: "hidden",
    marginBottom: 16, borderWidth: 1, borderColor: T.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  cardHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 12,
  },
  cardHeaderText: { color: T.white, fontSize: 15, fontWeight: "700" },
  cardHeaderDate: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500" },
  cardBody: { padding: 18 },
  flightRow: { flexDirection: "row", marginBottom: 12 },
  flightCol: { flex: 1 },
  flightDivider: { width: 1, backgroundColor: T.border, marginHorizontal: 12 },
  infoPlaceholder: { fontSize: 13, color: T.slateLight, fontStyle: "italic", marginTop: 4 },
  hotelSection: {
    borderTopWidth: 1, borderTopColor: T.border, paddingTop: 14, marginBottom: 12,
    backgroundColor: "#faf5ff", marginHorizontal: -18, paddingHorizontal: 18, paddingBottom: 14,
  },
  sectionBadge: {
    flexDirection: "row", alignItems: "center", backgroundColor: T.purpleLight,
    alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    marginBottom: 8,
  },
  sectionBadgeIcon: { fontSize: 12, marginRight: 4 },
  sectionBadgeText: { fontSize: 12, fontWeight: "700", color: T.purple },
  infoMain: { fontSize: 16, fontWeight: "600", color: T.navy, marginBottom: 2 },
  infoSub: { fontSize: 13, color: T.slate, marginBottom: 1 },

  cardActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  editBtn: {
    flex: 1, backgroundColor: T.purpleLight, borderRadius: 10,
    paddingVertical: 10, alignItems: "center",
  },
  editBtnText: { color: T.purple, fontSize: 14, fontWeight: "600" },
  deleteBtn: {
    flex: 1, backgroundColor: "#fef2f2", borderRadius: 10,
    paddingVertical: 10, alignItems: "center",
  },
  deleteBtnText: { color: T.red, fontSize: 14, fontWeight: "600" },

  empty: { alignItems: "center", paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: T.navy },
  emptySub: { fontSize: 14, color: T.slate, marginTop: 4, textAlign: "center" },
  emptyBtn: {
    marginTop: 20, backgroundColor: T.purple, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyBtnText: { color: T.white, fontSize: 15, fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: T.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "90%", paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: T.navy },
  modalClose: { fontSize: 20, color: T.slate, padding: 4 },
  modalScroll: { paddingHorizontal: 20 },

  formSectionLabel: { fontSize: 15, fontWeight: "700", color: T.navy, marginBottom: 12, marginTop: 8 },
  optionalTag: { fontSize: 12, fontWeight: "400", color: T.slateLight },
  formField: { marginBottom: 14 },
  formLabel: { fontSize: 13, fontWeight: "600", color: T.slate, marginBottom: 6 },
  req: { color: T.red, fontSize: 13 },
  formInput: {
    backgroundColor: T.bg, borderRadius: 10, borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: T.navy,
  },
  formInputError: {
    borderColor: T.red, borderWidth: 1.5, backgroundColor: "#fef2f2",
  },
  formRow: { flexDirection: "row", gap: 12 },

  // Date picker
  datePickerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  datePickerText: { fontSize: 15, color: T.navy },
  datePickerPlaceholder: { fontSize: 15, color: T.slateLight },
  datePickerIcon: { fontSize: 14 },

  // Mini Calendar dropdown
  calendarDrop: {
    position: "absolute", top: 76, left: 0, right: 0,
    backgroundColor: T.white, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: T.border,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
    zIndex: 100,
  },
  calMonthRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 10,
  },
  calArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: T.purpleLight, alignItems: "center", justifyContent: "center" },
  calArrowText: { fontSize: 18, color: T.purple, fontWeight: "600" },
  calMonthTitle: { fontSize: 14, fontWeight: "700", color: T.navy },
  calWeekdayRow: { flexDirection: "row", marginBottom: 4 },
  calWeekdayCell: { flex: 1, alignItems: "center", paddingVertical: 2 },
  calWeekdayText: { fontSize: 10, fontWeight: "600", color: T.slateLight },
  calWeekRow: { flexDirection: "row" },
  calDayCell: { flex: 1, alignItems: "center", paddingVertical: 6, minHeight: 32 },
  calDayCellSelected: { backgroundColor: T.purple, borderRadius: 8 },
  calDayCellToday: { backgroundColor: T.purpleLight, borderRadius: 8 },
  calDayText: { fontSize: 13, fontWeight: "500", color: T.navy },
  calDayTextSelected: { color: T.white, fontWeight: "700" },
  calDayTextToday: { color: T.purple, fontWeight: "700" },

  saveBtn: {
    backgroundColor: T.purple, borderRadius: 14, marginHorizontal: 20,
    paddingVertical: 15, alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: T.white, fontSize: 16, fontWeight: "700" },
});
