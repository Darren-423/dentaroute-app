import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrivalInfo, Booking, store } from "../../lib/store";

/* ── Unified palette ── */
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
  inputBg: "#f8fafc",
};

const AIRLINES = [
  // ── South Korea ──
  "Korean Air", "Asiana Airlines", "Jin Air", "T'way Air", "Jeju Air",
  "Air Busan", "Air Seoul", "Eastar Jet", "Fly Gangwon", "Aero K",
  // ── United States ──
  "Delta Air Lines", "United Airlines", "American Airlines", "Southwest Airlines",
  "JetBlue Airways", "Alaska Airlines", "Spirit Airlines", "Frontier Airlines",
  "Hawaiian Airlines", "Allegiant Air", "Sun Country Airlines", "Breeze Airways",
  "Avelo Airlines",
  // ── Canada ──
  "Air Canada", "WestJet", "Porter Airlines", "Flair Airlines", "Swoop",
  // ── Japan ──
  "Japan Airlines", "ANA (All Nippon Airways)", "Peach Aviation", "Jetstar Japan",
  "Spring Japan", "Skymark Airlines", "StarFlyer", "Solaseed Air", "Air Do",
  "Fuji Dream Airlines",
  // ── China ──
  "Air China", "China Eastern Airlines", "China Southern Airlines",
  "Hainan Airlines", "Xiamen Airlines", "Sichuan Airlines", "Shenzhen Airlines",
  "Juneyao Airlines", "Spring Airlines", "Lucky Air", "China Express Airlines",
  "Tianjin Airlines", "Loong Air", "Beijing Capital Airlines", "Hebei Airlines",
  "Chengdu Airlines", "Ruili Airlines", "Suparna Airlines",
  // ── Hong Kong / Macau ──
  "Cathay Pacific", "HK Express", "Greater Bay Airlines", "Air Macau",
  // ── Taiwan ──
  "China Airlines", "EVA Air", "Starlux Airlines", "Tigerair Taiwan",
  "Mandarin Airlines", "UNI Air",
  // ── Southeast Asia ──
  "Singapore Airlines", "Scoot", "Thai Airways", "Thai AirAsia", "Bangkok Airways",
  "Thai Lion Air", "Nok Air", "Thai VietJet Air",
  "Vietnam Airlines", "VietJet Air", "Bamboo Airways",
  "Philippine Airlines", "Cebu Pacific", "AirAsia Philippines",
  "Malaysia Airlines", "AirAsia", "AirAsia X", "Batik Air Malaysia", "Firefly",
  "Garuda Indonesia", "Batik Air", "Lion Air", "Citilink", "Super Air Jet",
  "Myanmar National Airlines", "Cambodia Angkor Air", "Lao Airlines",
  "Royal Brunei Airlines",
  // ── South Asia ──
  "IndiGo", "Air India", "SpiceJet", "Vistara", "GoFirst", "Akasa Air",
  "Air India Express", "Alliance Air",
  "SriLankan Airlines", "Biman Bangladesh Airlines", "US-Bangla Airlines",
  "Nepal Airlines", "Buddha Air", "Pakistan International Airlines",
  "Serene Air", "airblue",
  // ── Middle East ──
  "Emirates", "Etihad Airways", "Qatar Airways", "Flydubai", "Air Arabia",
  "Wizz Air Abu Dhabi", "Gulf Air", "Oman Air", "Saudia", "Flynas", "Flyadeal",
  "Kuwait Airways", "Jazeera Airways", "Royal Jordanian", "Middle East Airlines",
  "Iraqi Airways", "Iran Air", "Mahan Air", "El Al Israel Airlines",
  "Arkia Israeli Airlines",
  // ── Europe ──
  "Lufthansa", "British Airways", "Air France", "KLM Royal Dutch Airlines",
  "Swiss International Air Lines", "Austrian Airlines", "Brussels Airlines",
  "Scandinavian Airlines (SAS)", "Finnair", "Norwegian Air Shuttle",
  "Iberia", "Vueling", "Air Europa",
  "Aer Lingus", "TAP Air Portugal",
  "ITA Airways", "LOT Polish Airlines", "Czech Airlines",
  "Turkish Airlines", "Pegasus Airlines", "SunExpress",
  "Aeroflot", "S7 Airlines",
  "Icelandair", "Play (Iceland)", "Wizz Air", "Ryanair", "easyJet",
  "Eurowings", "Transavia", "Volotea", "Air Baltic",
  "TAROM", "Bulgaria Air", "Croatia Airlines", "Air Serbia",
  "Aegean Airlines", "Olympic Air", "Air Malta",
  "Luxair", "Air Corsica", "Condor", "TUI fly",
  // ── Africa ──
  "Ethiopian Airlines", "EgyptAir", "Royal Air Maroc", "South African Airways",
  "Kenya Airways", "RwandAir", "Air Mauritius", "Air Seychelles",
  "Tunisair", "Air Algérie", "ASKY Airlines", "Air Côte d'Ivoire",
  "Air Tanzania", "Uganda Airlines", "Air Senegal",
  // ── Oceania ──
  "Qantas", "Virgin Australia", "Jetstar Airways", "Rex Airlines",
  "Air New Zealand", "Fiji Airways", "Air Tahiti Nui", "Air Caledonie",
  // ── Central & South America ──
  "LATAM Airlines", "Avianca", "Aeromexico", "Copa Airlines",
  "Gol Linhas Aéreas", "Azul Brazilian Airlines", "Volaris", "VivaAerobus",
  "Sky Airline", "JetSMART", "Wingo", "Arajet",
  // ── Other ──
  "Other",
];

export default function ArrivalInfoScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [flightNumber, setFlightNumber] = useState("");
  const [airline, setAirline] = useState("");
  const [showAirlines, setShowAirlines] = useState(false);
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [airport, setAirport] = useState("ICN");
  const [terminal, setTerminal] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [notes, setNotes] = useState("");
  const [pickupRequested, setPickupRequested] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;
      const bk = await store.getBooking(bookingId);
      if (bk) {
        setBooking(bk);
        const isReturnVisit = (bk.currentVisit || 1) > 1;
        if (bk.arrivalInfo && !isReturnVisit) {
          setFlightNumber(bk.arrivalInfo.flightNumber);
          setAirline(bk.arrivalInfo.airline || "");
          setArrivalDate(bk.arrivalInfo.arrivalDate);
          setArrivalTime(bk.arrivalInfo.arrivalTime);
          setTerminal(bk.arrivalInfo.terminal || "");
          setPassengers(String(bk.arrivalInfo.passengers || 1));
          setNotes(bk.arrivalInfo.notes || "");
          setPickupRequested(bk.arrivalInfo.pickupRequested);
        } else if (bk.visitDates?.length > 0) {
          const currentVisitNum = bk.currentVisit || 1;
          const currentVD = bk.visitDates.find((v) => v.visit === currentVisitNum);
          if (currentVD?.date) setArrivalDate(currentVD.date);
          if (isReturnVisit && bk.arrivalInfo?.passengers) {
            setPassengers(String(bk.arrivalInfo.passengers));
          }
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

  const isTimeInvalid = (() => {
    if (!arrivalTime || !arrivalTime.includes(":")) return false;
    const [hStr, mStr] = arrivalTime.split(":");
    const h = parseInt(hStr) || 0;
    const m = parseInt(mStr) || 0;
    return h > 23 || m > 59;
  })();

  const isValid = () => flightNumber.length >= 3 && arrivalDate && arrivalTime.length >= 4 && !isTimeInvalid;

  const handleSave = async () => {
    if (!booking || !isValid()) return;
    setSaving(true);

    const arrivalInfo: ArrivalInfo = {
      flightNumber, airline, arrivalDate, arrivalTime,
      terminal, passengers: parseInt(passengers) || 1,
      notes, pickupRequested,
    };

    const updated = { ...booking, arrivalInfo };
    const bookings = await store.getBookings();
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx >= 0) {
      bookings[idx] = updated;
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      await AsyncStorage.setItem("dr_bookings", JSON.stringify(bookings));
    }

    await store.addNotification({
      role: "doctor",
      type: "reminder",
      title: "Patient Arrival Info",
      body: `Your patient has submitted arrival details. Flight ${flightNumber} arriving ${formatDateDisplay(arrivalDate)} at ${arrivalTime}.`,
      icon: "✈️",
      route: `/doctor/case-detail?caseId=${booking.caseId}`,
    });

    const allBookings = await store.getBookings();
    const bIdx = allBookings.findIndex((b) => b.id === booking.id);
    if (bIdx >= 0) {
      allBookings[bIdx] = { ...allBookings[bIdx], arrivalInfo, status: "flight_submitted" as any };
      const AS = (await import("@react-native-async-storage/async-storage")).default;
      await AS.setItem("dr_bookings", JSON.stringify(allBookings));
    }

    setSaving(false);
    setSuccess(true);
  };

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

  const isReturnVisit = (booking?.currentVisit || 1) > 1;

  if (loading) {
    return (
      <View style={[st.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={C.sub} size="large" />
      </View>
    );
  }

  /* ════════════ SUCCESS ════════════ */
  if (success) {
    return (
      <View style={st.container}>
        <LinearGradient colors={["#3D0070", "#2F0058", "#220040"]} style={st.header}>
          <View style={st.headerRow}>
            <View style={{ width: 36 }} />
            <View style={st.headerCenter}>
              <Text style={st.headerTitle}>Submitted</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>

        <View style={st.successWrap}>
          <View style={st.successIcon}>
            <Text style={{ fontSize: 36 }}>✈️</Text>
          </View>
          <Text style={st.successTitle}>Arrival Info Submitted</Text>
          <Text style={st.successDesc}>
            {pickupRequested
              ? "Our team will be at the airport to pick you up. Look for the DentaRoute sign!"
              : "Your arrival details have been shared with your dentist."}
          </Text>

          <View style={st.successCard}>
            {[
              { label: "Flight", value: `${airline ? airline + " " : ""}${flightNumber}` },
              { label: "Date", value: formatDateDisplay(arrivalDate) },
              { label: "ETA", value: formatTimeSlot(arrivalTime) },
              ...(terminal ? [{ label: "Terminal", value: terminal }] : []),
              { label: "Pickup", value: pickupRequested ? "Requested" : "Not needed" },
            ].map((item, i, arr) => (
              <View key={item.label} style={[st.successRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={st.successLabel}>{item.label}</Text>
                <Text style={st.successValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          {pickupRequested && (
            <View style={st.tipCard}>
              <Text style={st.tipTitle}>What to expect</Text>
              <Text style={st.tipText}>1. Our driver will meet you at the arrivals gate</Text>
              <Text style={st.tipText}>2. Look for a sign with your name</Text>
              <Text style={st.tipText}>3. Free ride to your accommodation or clinic</Text>
              <Text style={st.tipText}>4. Confirmation sent 24h before arrival</Text>
            </View>
          )}

          <TouchableOpacity style={st.successBtn} onPress={() => router.replace("/patient/dashboard" as any)}>
            <Text style={st.successBtnText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ════════════ FORM ════════════ */
  return (
    <View style={st.container}>
      {/* ── Gradient header ── */}
      <LinearGradient colors={["#3D0070", "#2F0058", "#220040"]} style={st.header}>
        <View style={st.headerRow}>
          <TouchableOpacity style={st.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={st.backArrow}>{"<"}</Text>
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>{isReturnVisit ? "Return Flight" : "Arrival Details"}</Text>
            <Text style={st.headerSub}>{booking?.clinicName}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>

          {/* ── Info banner ── */}
          <View style={st.banner}>
            <Text style={{ fontSize: 22 }}>✈️</Text>
            <View style={{ flex: 1 }}>
              <Text style={st.bannerTitle}>
                {isReturnVisit ? `Returning for Visit ${booking?.currentVisit}` : "Flying to Korea?"}
              </Text>
              <Text style={st.bannerSub}>
                Enter your flight details for a free airport pickup
              </Text>
            </View>
          </View>

          {/* ── Booking context ── */}
          <View style={st.contextCard}>
            <View style={st.contextRow}>
              <Text style={st.contextLabel}>Doctor</Text>
              <Text style={st.contextVal}>{booking?.dentistName}</Text>
            </View>
            <View style={st.contextDivider} />
            <View style={st.contextRow}>
              <Text style={st.contextLabel}>{isReturnVisit ? `Visit ${booking?.currentVisit}` : "First visit"}</Text>
              <Text style={st.contextVal}>
                {(() => {
                  const cvn = booking?.currentVisit || 1;
                  const vd = booking?.visitDates?.find((v) => v.visit === cvn) || booking?.visitDates?.[0];
                  return vd?.date ? `${formatDateDisplay(vd.date)}${vd.confirmedTime ? ` · ${vd.confirmedTime}` : ""}` : "—";
                })()}
              </Text>
            </View>
          </View>

          {/* ── Flight Number ── */}
          <View style={st.field}>
            <Text style={st.fieldLabel}>Flight Number <Text style={st.req}>*</Text></Text>
            <View style={st.flightInputRow}>
              <Text style={st.flightIcon}>🛫</Text>
              <TextInput
                style={st.flightInput}
                value={flightNumber}
                onChangeText={(t) => setFlightNumber(formatFlightNumber(t))}
                placeholder="e.g. KE001"
                placeholderTextColor={C.faint}
                autoCapitalize="characters"
                maxLength={8}
              />
            </View>
          </View>

          {/* ── Airline ── */}
          <View style={st.field}>
            <Text style={st.fieldLabel}>Airline</Text>
            <TextInput
              style={st.input}
              value={airline}
              onChangeText={(t) => { setAirline(t); setShowAirlines(true); }}
              onFocus={() => setShowAirlines(true)}
              placeholder="e.g. Korean Air"
              placeholderTextColor={C.faint}
            />
            {showAirlines && airline.length > 0 && (() => {
              const q = airline.toLowerCase();
              const starts = AIRLINES.filter((a) =>
                a.toLowerCase().startsWith(q) && a.toLowerCase() !== q
              );
              const contains = AIRLINES.filter((a) =>
                !a.toLowerCase().startsWith(q) && a.toLowerCase().includes(q) && a.toLowerCase() !== q
              );
              const filtered = [...starts, ...contains].slice(0, 8);
              if (filtered.length === 0) return null;
              return (
                <ScrollView style={st.dropList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                  {filtered.map((a) => (
                    <TouchableOpacity
                      key={a}
                      style={st.dropItem}
                      onPress={() => { setAirline(a); setShowAirlines(false); }}
                    >
                      <Text style={st.dropText}>{a}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              );
            })()}
          </View>

          {/* ── Arrival Date ── */}
          <View style={st.field}>
            <Text style={st.fieldLabel}>Arrival Date <Text style={st.req}>*</Text></Text>
            <TextInput
              style={st.input}
              value={arrivalDate}
              onChangeText={(t) => {
                const digits = t.replace(/\D/g, "");
                if (digits.length <= 4) setArrivalDate(digits);
                else if (digits.length <= 6) setArrivalDate(digits.slice(0,4) + "-" + digits.slice(4));
                else setArrivalDate(digits.slice(0,4) + "-" + digits.slice(4,6) + "-" + digits.slice(6,8));
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.faint}
              keyboardType="number-pad"
              maxLength={10}
            />
            {arrivalDate && arrivalDate.length === 10 && (
              <Text style={st.datePreview}>{formatDateDisplay(arrivalDate)}</Text>
            )}
          </View>

          {/* ── Arrival Time ── */}
          <View style={st.field}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={st.fieldLabel}>Estimated Time of Arrival <Text style={st.req}>*</Text></Text>
              {isTimeInvalid && <Text style={st.timeError}>Invalid time (max 23:59)</Text>}
            </View>
            <View style={st.flightInputRow}>
              <Text style={st.flightIcon}>🕐</Text>
              <TextInput
                style={st.flightInput}
                value={arrivalTime}
                onChangeText={(t) => {
                  const digits = t.replace(/\D/g, "");
                  if (digits.length <= 2) setArrivalTime(digits);
                  else setArrivalTime(digits.slice(0, 2) + ":" + digits.slice(2, 4));
                }}
                placeholder="HH:MM (e.g. 14:30)"
                placeholderTextColor={C.faint}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
            {arrivalTime && arrivalTime.includes(":") && arrivalTime.length === 5 && (
              <Text style={st.datePreview}>{formatTimeSlot(arrivalTime)}</Text>
            )}
          </View>

          {/* ── Airport ── */}
          <View style={st.field}>
            <Text style={st.fieldLabel}>Arrival Airport</Text>
            <View style={st.termRow}>
              {[
                { code: "ICN", name: "Incheon (ICN)" },
                { code: "GMP", name: "Gimpo (GMP)" },
                { code: "PUS", name: "Busan (PUS)" },
              ].map((a) => (
                <TouchableOpacity
                  key={a.code}
                  style={[st.termChip, airport === a.code && st.termChipActive]}
                  onPress={() => { setAirport(a.code); if (a.code !== "ICN") setTerminal(""); }}
                >
                  <Text style={[st.termText, airport === a.code && st.termTextActive]}>{a.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Terminal (ICN only) ── */}
          {airport === "ICN" && (
            <View style={st.field}>
              <Text style={st.fieldLabel}>Terminal</Text>
              <View style={st.termRow}>
                {["Terminal 1", "Terminal 2"].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[st.termChip, terminal === t && st.termChipActive]}
                    onPress={() => setTerminal(terminal === t ? "" : t)}
                  >
                    <Text style={[st.termText, terminal === t && st.termTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Passengers ── */}
          <View style={st.field}>
            <Text style={st.fieldLabel}>Number of Passengers</Text>
            <View style={st.stepperRow}>
              <TouchableOpacity
                style={st.stepperBtn}
                onPress={() => setPassengers(String(Math.max(1, parseInt(passengers) - 1)))}
              >
                <Text style={st.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <View style={st.stepperVal}>
                <Text style={st.stepperNum}>{passengers}</Text>
                <Text style={st.stepperLabel}>{parseInt(passengers) === 1 ? "person" : "people"}</Text>
              </View>
              <TouchableOpacity
                style={st.stepperBtn}
                onPress={() => setPassengers(String(Math.min(10, parseInt(passengers) + 1)))}
              >
                <Text style={st.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Pickup toggle ── */}
          <View style={st.field}>
            <Text style={st.fieldLabel}>Airport Pickup Service</Text>
            <View style={st.toggleRow}>
              <TouchableOpacity
                style={[st.toggleOpt, pickupRequested && st.toggleOptActive]}
                onPress={() => setPickupRequested(true)}
              >
                <Text style={{ fontSize: 18 }}>🚗</Text>
                <Text style={[st.toggleLabel, pickupRequested && st.toggleLabelActive]}>
                  Yes, pick me up
                </Text>
                <Text style={[st.toggleSub, pickupRequested && { color: "rgba(74,0,128,0.6)" }]}>
                  Free service
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.toggleOpt, !pickupRequested && st.toggleOptInactive]}
                onPress={() => setPickupRequested(false)}
              >
                <Text style={{ fontSize: 18 }}>🚶</Text>
                <Text style={[st.toggleLabel, !pickupRequested && { color: C.navy }]}>
                  No thanks
                </Text>
                <Text style={st.toggleSub}>
                  I'll arrange my own
                </Text>
              </TouchableOpacity>
            </View>
            {pickupRequested && (
              <View style={st.pickupNote}>
                <Text style={st.pickupNoteText}>
                  Our driver will meet you at the arrivals gate with a sign. Completely free!
                </Text>
              </View>
            )}
          </View>

          {/* ── Notes ── */}
          <View style={st.field}>
            <Text style={st.fieldLabel}>Additional Notes</Text>
            <TextInput
              style={[st.input, { height: 80, textAlignVertical: "top" }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Special requests, wheelchair assistance, heavy luggage, etc."
              placeholderTextColor={C.faint}
              multiline
              maxLength={300}
            />
            <Text style={st.charCount}>{notes.length}/300</Text>
          </View>

          {/* Reschedule & Cancel */}
          {booking && (booking.status === "confirmed" || booking.status === "flight_submitted") && (
            <View style={{ gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                style={st.rescheduleLink}
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
                <Text style={st.rescheduleLinkText}>Reschedule my booking</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={st.cancelLink}
                onPress={() => router.push(`/patient/cancel-booking?bookingId=${booking.id}` as any)}
                activeOpacity={0.6}
              >
                <Text style={st.cancelLinkText}>Cancel this booking</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Bottom bar ── */}
      <View style={st.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={st.bottomFlight}>
            {flightNumber ? `✈️ ${airline ? airline + " " : ""}${flightNumber}` : "Enter flight details"}
          </Text>
          {arrivalDate && arrivalTime && arrivalTime.includes(":") ? (
            <Text style={st.bottomEta}>{formatDateDisplay(arrivalDate)} at {formatTimeSlot(arrivalTime)}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[st.submitBtn, !isValid() && { opacity: 0.35 }]}
          onPress={handleSave}
          disabled={!isValid() || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={st.submitBtnText}>
              {booking?.arrivalInfo ? "Update" : "Submit"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════ */
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  /* ── Header ── */
  header: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 18 },
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

  /* ── Banner ── */
  banner: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.purpleSoft, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.purpleMid,
  },
  bannerTitle: { fontSize: 15, fontWeight: "700", color: C.navy },
  bannerSub: { fontSize: 12, color: C.sub, lineHeight: 17, marginTop: 2 },

  /* ── Booking context ── */
  contextCard: {
    backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: C.border,
  },
  contextRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 13,
  },
  contextDivider: { height: 1, backgroundColor: C.border },
  contextLabel: { fontSize: 13, color: C.sub },
  contextVal: { fontSize: 13, fontWeight: "600", color: C.navy },

  /* ── Fields ── */
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: C.navy },
  req: { color: "#b91c1c" },
  timeError: { fontSize: 11, color: "#dc2626", fontWeight: "600" },
  hint: { fontSize: 11, color: C.muted },
  input: {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.navy,
  },
  charCount: { fontSize: 11, color: C.muted, textAlign: "right" },

  /* Flight input */
  flightInputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14,
  },
  flightIcon: { fontSize: 18, marginRight: 8 },
  flightInput: { flex: 1, fontSize: 18, fontWeight: "700", color: C.navy, paddingVertical: 14, letterSpacing: 1 },
  datePreview: { fontSize: 12, color: C.purple, fontWeight: "500", marginTop: 4 },

  /* Select */
  selectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  selectText: { fontSize: 15, color: C.navy, fontWeight: "500" },
  selectPlaceholder: { fontSize: 15, color: C.faint },
  selectArrow: { fontSize: 10, color: C.muted },

  /* Dropdown */
  dropList: {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    maxHeight: 250, overflow: "hidden",
  },
  dropItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  dropItemActive: { backgroundColor: C.purpleSoft },
  dropText: { fontSize: 14, color: C.navy },
  dropTextActive: { fontWeight: "600", color: C.purple },

  /* Terminal */
  termRow: { flexDirection: "row", gap: 10 },
  termChip: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center",
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
  },
  termChipActive: { borderColor: C.purple, backgroundColor: C.purpleSoft },
  termText: { fontSize: 14, fontWeight: "600", color: C.sub },
  termTextActive: { color: C.purple },

  /* Stepper */
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  stepperBtn: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    alignItems: "center", justifyContent: "center", backgroundColor: C.card,
  },
  stepperBtnText: { fontSize: 22, fontWeight: "600", color: C.navy },
  stepperVal: { alignItems: "center" },
  stepperNum: { fontSize: 28, fontWeight: "800", color: C.navy },
  stepperLabel: { fontSize: 11, color: C.sub },

  /* Toggle */
  toggleRow: { flexDirection: "row", gap: 10 },
  toggleOpt: {
    flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: "center", gap: 5,
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
  },
  toggleOptActive: { borderColor: C.purple, backgroundColor: C.purpleSoft },
  toggleOptInactive: { borderColor: C.border, backgroundColor: C.inputBg },
  toggleLabel: { fontSize: 13, fontWeight: "700", color: C.sub },
  toggleLabelActive: { color: C.purple },
  toggleSub: { fontSize: 10, color: C.muted },
  pickupNote: {
    backgroundColor: C.purpleSoft, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.purpleMid,
  },
  pickupNoteText: { fontSize: 12, color: C.text, lineHeight: 18 },

  /* Bottom bar */
  bottomBar: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.card,
    paddingBottom: 36,
  },
  bottomFlight: { fontSize: 14, fontWeight: "700", color: C.navy },
  bottomEta: { fontSize: 11, color: C.sub, marginTop: 2 },
  submitBtn: {
    backgroundColor: C.purple, borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 15,
  },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  /* Success */
  successWrap: {
    flex: 1, justifyContent: "center", alignItems: "center", padding: 32,
  },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.purpleSoft, alignItems: "center", justifyContent: "center",
    marginBottom: 20, borderWidth: 2, borderColor: C.purpleMid,
  },
  successTitle: { fontSize: 22, fontWeight: "700", color: C.navy, marginBottom: 6 },
  successDesc: { fontSize: 14, color: C.sub, textAlign: "center", lineHeight: 22, marginBottom: 20 },
  successCard: {
    backgroundColor: C.card, borderRadius: 16, width: "100%",
    paddingHorizontal: 20, borderWidth: 1, borderColor: C.border,
  },
  successRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  successLabel: { fontSize: 13, color: C.sub },
  successValue: { fontSize: 14, fontWeight: "600", color: C.navy },
  tipCard: {
    backgroundColor: "rgba(15,23,42,0.03)", borderRadius: 14, padding: 18,
    width: "100%", marginTop: 16,
    borderWidth: 1, borderColor: C.border, gap: 5,
  },
  tipTitle: { fontSize: 14, fontWeight: "700", color: C.navy, marginBottom: 4 },
  tipText: { fontSize: 12, color: C.sub, lineHeight: 18 },
  successBtn: {
    backgroundColor: C.purple, borderRadius: 14, paddingVertical: 16,
    paddingHorizontal: 40, marginTop: 24, width: "100%", alignItems: "center",
  },
  successBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  /* Reschedule link */
  rescheduleLink: {
    alignItems: "center", paddingVertical: 14,
    backgroundColor: "rgba(74,0,128,0.06)", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(74,0,128,0.12)",
  },
  rescheduleLinkText: { fontSize: 13, color: C.purple, fontWeight: "600" },

  /* Cancel link */
  cancelLink: {
    alignItems: "center", paddingVertical: 14,
    backgroundColor: "#fef2f2", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(185,28,28,0.12)",
  },
  cancelLinkText: { fontSize: 13, color: "#b91c1c", fontWeight: "600" },
});
