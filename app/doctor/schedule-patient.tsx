import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { store } from "../../lib/store";
import { toCanonicalTreatmentName, toDoctorTreatmentLabel } from "./treatment-terms";

type PlanItem = { treatment: string; qty: number; price: number };
type Slot = { date: string; time: string };
type VisitForm = { id: number; description: string; gapMonths: number; gapWeeks: number; gapDays: number; slots: Slot[] };

const T = {
  bg: "#f8fafc",
  white: "#fff",
  border: "#e2e8f0",
  text: "#0f172a",
  textSec: "#64748b",
  teal: "#0f766e",
  muted: "#94a3b8",
};

export default function DoctorSchedulePatientScreen() {
  const { caseId, planItemsJson, treatmentsDiffer } = useLocalSearchParams<{ caseId: string; planItemsJson: string; treatmentsDiffer?: string }>();
  const planItems: PlanItem[] = useMemo(() => {
    try {
      return JSON.parse(planItemsJson || "[]");
    } catch {
      return [];
    }
  }, [planItemsJson]);

  const [duration, setDuration] = useState({ months: 0, weeks: 0, days: 0 });
  const [treatmentDetails, setTreatmentDetails] = useState("");
  const [message, setMessage] = useState("");
  const [visits, setVisits] = useState<VisitForm[]>([{ id: 1, description: "", gapMonths: 0, gapWeeks: 0, gapDays: 0, slots: [{ date: "", time: "" }, { date: "", time: "" }, { date: "", time: "" }] }]);
  const [loading, setLoading] = useState(false);

  const totalPrice = useMemo(() => planItems.reduce((sum, p) => sum + p.qty * p.price, 0), [planItems]);
  const minVisits = duration.months * 30 + duration.weeks * 7 + duration.days >= 2 ? 2 : 1;

  const adjustVisits = (target: number) => {
    setVisits((prev) => {
      const next = [...prev];
      while (next.length < target) {
        const id = next.length + 1;
        next.push({ id, description: "", gapMonths: 0, gapWeeks: 0, gapDays: 0, slots: [{ date: "", time: "" }, { date: "", time: "" }, { date: "", time: "" }] });
      }
      return next.slice(0, target);
    });
  };

  const updateVisit = (id: number, patch: Partial<VisitForm>) => {
    setVisits((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  const updateSlot = (visitId: number, idx: number, key: "date" | "time", value: string) => {
    setVisits((prev) => prev.map((v) => {
      if (v.id !== visitId) return v;
      const slots = [...v.slots];
      slots[idx] = { ...slots[idx], [key]: value };
      return { ...v, slots };
    }));
  };

  const allVisitsDescribed = visits.length >= minVisits && visits.slice(0, minVisits).every((v) => v.description.trim());
  const allVisitsHaveSlot = visits.slice(0, minVisits).every((v) => v.slots.some((s) => s.date.trim() && s.time.trim()));
  const hasDuration = duration.months + duration.weeks + duration.days > 0;
  const requiresDiffExplain = treatmentsDiffer === "true";
  const canSend = hasDuration && allVisitsDescribed && allVisitsHaveSlot && (!requiresDiffExplain || treatmentDetails.trim().length > 0);

  const onSendQuote = async () => {
    if (!canSend || !caseId) return;
    setLoading(true);
    try {
      const doctor = await store.getDoctorProfile();
      await store.createQuote({
        caseId,
        dentistName: doctor?.fullName || doctor?.name || "Doctor",
        clinicName: doctor?.clinicName || doctor?.clinic || "Clinic",
        location: doctor?.location || "Gangnam, Seoul",
        rating: doctor?.rating || 4.9,
        reviewCount: doctor?.reviewCount || 127,
        totalPrice,
        treatments: planItems.map((p) => ({ name: toCanonicalTreatmentName(p.treatment), qty: p.qty, price: p.price })),
        treatmentDetails,
        duration: [
          duration.months > 0 ? `${duration.months} Month${duration.months > 1 ? "s" : ""}` : "",
          duration.weeks > 0 ? `${duration.weeks} Week${duration.weeks > 1 ? "s" : ""}` : "",
          duration.days > 0 ? `${duration.days} Day${duration.days > 1 ? "s" : ""}` : "",
        ].filter(Boolean).join(" "),
        visits: visits.slice(0, minVisits).map((v) => {
          const slotText = v.slots
            .filter((s) => s.date.trim() && s.time.trim())
            .map((s, i) => `Option ${i + 1}: ${s.date} ${s.time}`)
            .join(" | ");
          return {
            visit: v.id,
            description: slotText ? `${v.description} (Availability: ${slotText})` : v.description,
            gapMonths: v.gapMonths,
            gapDays: v.gapDays + v.gapWeeks * 7,
          };
        }),
        message,
      });

      Alert.alert("Quote Scheduled", "Quote and schedule options sent to patient.", [
        { text: "OK", onPress: () => router.replace(`/doctor/case-detail?caseId=${caseId}` as any) },
      ]);
    } catch {
      Alert.alert("Error", "Failed to send quote. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}><Text style={s.back}>‹</Text></TouchableOpacity>
        <Text style={s.title}>Schedule Patient</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Treatment Plan</Text>
          {planItems.map((p, i) => (
            <Text key={i} style={s.line}>{toDoctorTreatmentLabel(p.treatment)} × {p.qty} · ${(p.qty * p.price).toLocaleString()}</Text>
          ))}
          <Text style={s.total}>Total Quote: ${totalPrice.toLocaleString()}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Estimated Duration</Text>
          <View style={s.row}>
            <TextInput style={s.smallInput} placeholder="Months" keyboardType="number-pad" value={duration.months ? String(duration.months) : ""} onChangeText={(v) => setDuration((d) => ({ ...d, months: Number(v.replace(/[^0-9]/g, "")) || 0 }))} />
            <TextInput style={s.smallInput} placeholder="Weeks" keyboardType="number-pad" value={duration.weeks ? String(duration.weeks) : ""} onChangeText={(v) => setDuration((d) => ({ ...d, weeks: Number(v.replace(/[^0-9]/g, "")) || 0 }))} />
            <TextInput style={s.smallInput} placeholder="Days" keyboardType="number-pad" value={duration.days ? String(duration.days) : ""} onChangeText={(v) => setDuration((d) => ({ ...d, days: Number(v.replace(/[^0-9]/g, "")) || 0 }))} />
          </View>
          <View style={s.row}>
            <Text style={s.meta}>Number of visits</Text>
            <TextInput style={[s.smallInput, { maxWidth: 120 }]} placeholder={String(minVisits)} keyboardType="number-pad" onChangeText={(v) => adjustVisits(Math.max(minVisits, Number(v.replace(/[^0-9]/g, "")) || minVisits))} />
          </View>
        </View>

        {visits.slice(0, Math.max(minVisits, visits.length)).map((v) => (
          <View key={v.id} style={s.card}>
            <Text style={s.cardTitle}>Visit {v.id} details</Text>
            <TextInput style={s.input} placeholder="Describe visit" value={v.description} onChangeText={(val) => updateVisit(v.id, { description: val })} />
            {v.id > 1 && (
              <View style={s.row}>
                <TextInput style={s.smallInput} placeholder="Gap months" keyboardType="number-pad" value={v.gapMonths ? String(v.gapMonths) : ""} onChangeText={(val) => updateVisit(v.id, { gapMonths: Number(val.replace(/[^0-9]/g, "")) || 0 })} />
                <TextInput style={s.smallInput} placeholder="Gap weeks" keyboardType="number-pad" value={v.gapWeeks ? String(v.gapWeeks) : ""} onChangeText={(val) => updateVisit(v.id, { gapWeeks: Number(val.replace(/[^0-9]/g, "")) || 0 })} />
                <TextInput style={s.smallInput} placeholder="Gap days" keyboardType="number-pad" value={v.gapDays ? String(v.gapDays) : ""} onChangeText={(val) => updateVisit(v.id, { gapDays: Number(val.replace(/[^0-9]/g, "")) || 0 })} />
              </View>
            )}
            <Text style={s.meta}>Available date/time options (up to 3)</Text>
            {v.slots.map((slot, i) => (
              <View style={s.row} key={i}>
                <TextInput style={s.smallInput} placeholder={`Option ${i + 1} date (YYYY-MM-DD)`} value={slot.date} onChangeText={(val) => updateSlot(v.id, i, "date", val)} />
                <TextInput style={s.smallInput} placeholder="Time (HH:MM)" value={slot.time} onChangeText={(val) => updateSlot(v.id, i, "time", val)} />
              </View>
            ))}
          </View>
        ))}

        <View style={s.card}>
          <Text style={s.cardTitle}>Message to patient</Text>
          <TextInput style={[s.input, { minHeight: 80 }]} multiline value={message} onChangeText={setMessage} placeholder="Any notes for the patient..." />
          <Text style={s.cardTitle}>Treatment plan description</Text>
          <TextInput style={[s.input, { minHeight: 80 }]} multiline value={treatmentDetails} onChangeText={setTreatmentDetails} placeholder="Describe treatment plan..." />
        </View>
      </ScrollView>
      <View style={s.bottom}>
        <TouchableOpacity style={[s.sendBtn, !canSend && { opacity: 0.4 }]} disabled={!canSend || loading} onPress={onSendQuote}>
          <Text style={s.sendText}>{loading ? "Scheduling..." : "Send Scheduled Quote →"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: T.white, borderBottomWidth: 1, borderBottomColor: T.border },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  back: { fontSize: 24, color: T.text },
  title: { fontSize: 18, fontWeight: "700", color: T.text },
  content: { padding: 16, gap: 12, paddingBottom: 120 },
  card: { backgroundColor: T.white, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, gap: 10 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: T.textSec, letterSpacing: 0.4 },
  line: { fontSize: 13, color: T.text },
  total: { fontSize: 15, fontWeight: "700", color: T.teal, marginTop: 4 },
  row: { flexDirection: "row", gap: 8 },
  input: { borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: T.text, backgroundColor: "#fff" },
  smallInput: { flex: 1, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, color: T.text, backgroundColor: "#fff" },
  meta: { fontSize: 12, color: T.muted },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: T.white, borderTopWidth: 1, borderTopColor: T.border },
  sendBtn: { backgroundColor: T.teal, borderRadius: 12, alignItems: "center", paddingVertical: 14 },
  sendText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
