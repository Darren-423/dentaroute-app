import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from "react-native";
import { store } from "../../lib/store";

import { PatientTheme, SharedColors } from "../../constants/theme";
type SubOption = { id: string; label: string; desc: string };
type Treatment = {
  id: string; name: string; price: string; icon: string; desc: string;
  duration: string; durationColor: string;
  subOptions?: SubOption[];
};

const treatments: Treatment[] = [
  {
    id: "implant", name: "Implant", price: "$1,000–1,500", icon: "🦷",
    desc: "Replace missing teeth with permanent implants",
    duration: "⏳ Approx. 3 months minimum", durationColor: "#d97706",
    subOptions: [
      { id: "implant_whole", label: "Whole Implant (Root + Crown)", desc: "Complete implant with titanium post and crown" },
      { id: "implant_root", label: "Root (Titanium Post) Only", desc: "Implant fixture placed into the jawbone" },
      { id: "implant_crown", label: "Crown Only", desc: "Crown placed on existing implant post" },
    ],
  },
  { id: "veneer", name: "Veneers", price: "$800–1,200", icon: "✨", desc: "Porcelain or composite shells for a perfect smile", duration: "⏳ Approx. 1 week", durationColor: PatientTheme.primary },
  { id: "smile_makeover", name: "Smile Makeover", price: "$2,000–5,000", icon: "😁", desc: "Full smile transformation — veneers, whitening, contouring & more", duration: "⏳ Approx. 1–2 weeks", durationColor: PatientTheme.primary },
  { id: "filling", name: "Fillings", price: "$80–200", icon: "🪥", desc: "Repair cavities and minor tooth damage", duration: "⏳ Approx. 1 week", durationColor: PatientTheme.primary },
  { id: "crown", name: "Crowns", price: "$300–600", icon: "👑", desc: "Cap damaged or weakened teeth with custom crowns", duration: "⏳ Approx. 1 week", durationColor: PatientTheme.primary },
  { id: "rootcanal", name: "Root Canals", price: "$200–400", icon: "🏥", desc: "Save infected teeth from extraction", duration: "⏳ Approx. 1 week", durationColor: PatientTheme.primary },
  { id: "gum", name: "Gum Treatment", price: "$200–800", icon: "🩺", desc: "Periodontal treatment, gum contouring & grafting", duration: "⏳ Approx. 1 week", durationColor: PatientTheme.primary },
  { id: "invisalign", name: "Invisalign", price: "$2,500–5,000", icon: "🔗", desc: "Clear aligners for straighter teeth without braces", duration: "⏳ Approx. 3 months minimum", durationColor: "#d97706" },
  { id: "sleep_appliance", name: "Oral Sleep Appliance", price: "$500–1,500", icon: "😴", desc: "Custom-fitted device for sleep apnea & snoring", duration: "⏳ Approx. 1–2 weeks", durationColor: PatientTheme.primary },
  { id: "tongue_tie", name: "Tongue Tie Surgery", price: "$300–800", icon: "✂️", desc: "Frenectomy to release restricted tongue movement", duration: "⏳ Approx. 1 week", durationColor: PatientTheme.primary },
  { id: "wisdom_teeth", name: "Wisdom Teeth Extractions", price: "$200–600", icon: "🦷", desc: "Removal of impacted or problematic wisdom teeth", duration: "⏳ Approx. 1 week", durationColor: PatientTheme.primary },
];

export default function PatientTreatmentSelectScreen() {
  const { from, mode } = useLocalSearchParams<{ from?: string; mode?: string }>();
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [implantSubs, setImplantSubs] = useState<Record<string, number>>({});
  const [implantExpanded, setImplantExpanded] = useState(false);
  const [customTreatments, setCustomTreatments] = useState<{ name: string; qty: number }[]>([]);
  const [newTreatment, setNewTreatment] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const [loading, setLoading] = useState(false);

  const implantSubTotal = Object.values(implantSubs).reduce((s, v) => s + v, 0);
  const hasImplant = implantSubTotal > 0;
  const totalSelected = Object.keys(selected).length + (hasImplant ? 1 : 0) + customTreatments.length;

  const toggle = (id: string) => {
    if (id === "implant") { setImplantExpanded(!implantExpanded); return; }
    if (selected[id]) {
      const u = { ...selected }; delete u[id]; setSelected(u);
    } else {
      setSelected({ ...selected, [id]: 1 });
    }
  };

  const changeQty = (id: string, delta: number) => {
    const cur = selected[id] || 1;
    const nq = cur + delta;
    if (nq < 1) { const u = { ...selected }; delete u[id]; setSelected(u); }
    else if (nq > 20) return;
    else setSelected({ ...selected, [id]: nq });
  };

  const changeImplantSubQty = (subId: string, delta: number) => {
    const cur = implantSubs[subId] || 0;
    const nq = cur + delta;
    if (nq < 0 || nq > 20) return;
    const u = { ...implantSubs };
    if (nq === 0) delete u[subId]; else u[subId] = nq;
    setImplantSubs(u);
  };

  const addCustomTreatment = () => {
    const trimmed = newTreatment.trim();
    if (!trimmed || customTreatments.find((t) => t.name === trimmed)) { setNewTreatment(""); return; }
    setCustomTreatments([...customTreatments, { name: trimmed, qty: 1 }]);
    setNewTreatment("");
  };

  const changeCustomQty = (i: number, delta: number) => {
    const u = [...customTreatments];
    const nq = u[i].qty + delta;
    if (nq < 1) u.splice(i, 1); else if (nq > 20) return; else u[i] = { ...u[i], qty: nq };
    setCustomTreatments(u);
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      const selectedWithNames: Record<string, number> = {};
      const implantT = treatments.find((t) => t.id === "implant");
      for (const [subId, qty] of Object.entries(implantSubs)) {
        const sub = implantT?.subOptions?.find((s) => s.id === subId);
        selectedWithNames[sub ? `Implant: ${sub.label}` : subId] = qty;
      }
      for (const [id, qty] of Object.entries(selected)) {
        const t = treatments.find((tr) => tr.id === id);
        selectedWithNames[t ? t.name : id] = qty;
      }
      await store.savePatientTreatments({ selected: selectedWithNames, custom: customTreatments });
    } catch (err) { console.log("Save error:", err); }
    setLoading(false);
    if (from === "review") { router.back(); return; }
    router.push("/patient/upload?mode=specific" as any);
  };

  const QtyStepper = ({ qty, onMinus, onPlus }: { qty: number; onMinus: () => void; onPlus: () => void }) => (
    <View style={st.qtyRow}>
      <TouchableOpacity style={st.qtyBtn} onPress={onMinus} activeOpacity={0.6}><Text style={st.qtyBtnText}>−</Text></TouchableOpacity>
      <View style={st.qtyDisplay}><Text style={st.qtyText}>{qty}</Text></View>
      <TouchableOpacity style={st.qtyBtn} onPress={onPlus} activeOpacity={0.6}><Text style={st.qtyBtnText}>+</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={st.container}>
      <LinearGradient colors={[...PatientTheme.gradient]} style={st.header}>
        <View style={st.headerRow}>
          <TouchableOpacity style={st.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={st.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.title}>Select Treatment</Text>
            <Text style={st.subtitle}>What do you need? (Select all that apply)</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {treatments.map((t) => {
          const isImplant = t.id === "implant";
          const isSelected = isImplant ? hasImplant : !!selected[t.id];
          const isExpanded = isImplant && (implantExpanded || hasImplant);

          return (
            <View key={t.id}>
              <TouchableOpacity
                style={[st.treatmentCard, isSelected && st.treatmentCardSelected, isExpanded && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}
                onPress={() => toggle(t.id)} activeOpacity={0.7}
              >
                <Text style={st.treatmentIcon}>{t.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[st.treatmentName, isSelected && st.treatmentNameSelected]}>{t.name}</Text>
                  <Text style={st.treatmentDesc}>{t.desc}</Text>
                  <View style={st.metaRow}>
                    <Text style={[st.treatmentPrice, isSelected && st.treatmentPriceSelected]}>{t.price} / each</Text>
                  </View>
                  <View style={[st.durationBadge, { backgroundColor: t.durationColor + "15" }]}>
                    <Text style={[st.durationText, { color: t.durationColor }]}>{t.duration}</Text>
                  </View>
                </View>
                {isSelected && !isImplant && <View style={st.checkCircle}><Text style={st.checkMark}>✓</Text></View>}
                {isImplant && <Text style={{ fontSize: 14, color: SharedColors.slateLight }}>{isExpanded ? "▲" : "▼"}</Text>}
              </TouchableOpacity>

              {/* Implant sub-options */}
              {isImplant && isExpanded && (
                <View style={st.subSection}>
                  <Text style={st.subTitle}>Choose implant type(s):</Text>
                  {t.subOptions!.map((sub) => {
                    const subQty = implantSubs[sub.id] || 0;
                    const isSubSel = subQty > 0;
                    return (
                      <View key={sub.id} style={[st.subCard, isSubSel && st.subCardSelected]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[st.subLabel, isSubSel && { color: PatientTheme.primary }]}>{sub.label}</Text>
                          <Text style={st.subDesc}>{sub.desc}</Text>
                        </View>
                        <View style={st.subQtyRow}>
                          <TouchableOpacity style={[st.subQtyBtn, subQty === 0 && { opacity: 0.3 }]} onPress={() => changeImplantSubQty(sub.id, -1)} disabled={subQty === 0}>
                            <Text style={st.subQtyBtnText}>−</Text>
                          </TouchableOpacity>
                          <View style={[st.subQtyDisplay, isSubSel && { borderColor: PatientTheme.primary }]}>
                            <Text style={[st.subQtyText, isSubSel && { color: PatientTheme.primary }]}>{subQty}</Text>
                          </View>
                          <TouchableOpacity style={st.subQtyBtn} onPress={() => changeImplantSubQty(sub.id, 1)}>
                            <Text style={st.subQtyBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                  {hasImplant && (
                    <View style={st.implantSummary}>
                      <Text style={st.implantSummaryText}>🦷 {implantSubTotal} implant item{implantSubTotal > 1 ? "s" : ""} selected</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Regular qty */}
              {!isImplant && isSelected && (
                <View style={st.qtySection}>
                  <Text style={st.qtyLabel}>How many?</Text>
                  <QtyStepper qty={selected[t.id]} onMinus={() => changeQty(t.id, -1)} onPlus={() => changeQty(t.id, 1)} />
                </View>
              )}
            </View>
          );
        })}

        {/* Custom */}
        {customTreatments.length > 0 && (
          <View style={st.customSection}>
            <Text style={st.customLabel}>OTHER TREATMENTS</Text>
            {customTreatments.map((item, index) => (
              <View key={item.name}>
                <View style={[st.treatmentCard, st.treatmentCardSelected, { paddingVertical: 14, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
                  <Text style={st.treatmentIcon}>📝</Text>
                  <Text style={[st.treatmentName, st.treatmentNameSelected, { flex: 1 }]}>{item.name}</Text>
                  <TouchableOpacity onPress={() => { const u = [...customTreatments]; u.splice(index, 1); setCustomTreatments(u); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={st.removeText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={st.qtySection}>
                  <Text style={st.qtyLabel}>How many?</Text>
                  <QtyStepper qty={item.qty} onMinus={() => changeCustomQty(index, -1)} onPlus={() => changeCustomQty(index, 1)} />
                </View>
              </View>
            ))}
          </View>
        )}

        {showAddInput ? (
          <View style={st.addInputRow}>
            <TextInput style={st.addInput} placeholder="Type a treatment..." placeholderTextColor={SharedColors.slateLight} value={newTreatment} onChangeText={setNewTreatment} onSubmitEditing={addCustomTreatment} returnKeyType="done" autoFocus />
            <TouchableOpacity style={[st.addConfirmBtn, !newTreatment.trim() && { opacity: 0.4 }]} onPress={addCustomTreatment} disabled={!newTreatment.trim()}><Text style={st.addConfirmText}>Add</Text></TouchableOpacity>
            <TouchableOpacity style={st.addCancelBtn} onPress={() => { setShowAddInput(false); setNewTreatment(""); }}><Text style={st.addCancelText}>✕</Text></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={st.addBtn} onPress={() => setShowAddInput(true)} activeOpacity={0.7}>
            <Text style={st.addBtnPlus}>+</Text><Text style={st.addBtnText}>Add other treatment</Text>
          </TouchableOpacity>
        )}

        <View style={st.noteBox}><Text style={st.noteText}>💡 Prices shown are typical ranges in Korea — much lower than US prices. Final quotes will come from dentists after reviewing your case.</Text></View>
      </ScrollView>

      <View style={st.bottomBar}>
        <TouchableOpacity style={[st.nextBtn, totalSelected === 0 && st.nextBtnDisabled]} onPress={handleNext} disabled={totalSelected === 0 || loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color={SharedColors.white} size="small" /> : <Text style={st.nextBtnText}>Review & Submit ({totalSelected} selected) →</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 24, color: SharedColors.white, fontWeight: "600", marginTop: -2 },
  title: { fontSize: 18, fontWeight: "700", color: SharedColors.white },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  content: { padding: 20, gap: 12, paddingBottom: 60 },

  treatmentCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 2, borderColor: SharedColors.border, backgroundColor: SharedColors.white, gap: 14 },
  treatmentCardSelected: { borderColor: PatientTheme.primaryMid, backgroundColor: PatientTheme.primaryLight },
  treatmentIcon: { fontSize: 32 },
  treatmentName: { fontSize: 15, fontWeight: "600", color: SharedColors.navy },
  treatmentNameSelected: { color: PatientTheme.primary },
  treatmentDesc: { fontSize: 12, color: SharedColors.slate, marginTop: 2 },
  treatmentPrice: { fontSize: 13, fontWeight: "700", color: SharedColors.slateLight },
  treatmentPriceSelected: { color: PatientTheme.primary },
  checkCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: PatientTheme.primary, alignItems: "center", justifyContent: "center" },
  checkMark: { color: SharedColors.white, fontSize: 16, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" },
  durationBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4, alignSelf: "flex-start" },
  durationText: { fontSize: 10, fontWeight: "600" },

  qtySection: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#dff0ee", borderWidth: 2, borderTopWidth: 0, borderColor: PatientTheme.primaryMid, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, paddingHorizontal: 16, paddingVertical: 10 },
  qtyLabel: { fontSize: 13, fontWeight: "600", color: PatientTheme.primary },
  qtyRow: { flexDirection: "row", alignItems: "center" },
  qtyBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: SharedColors.white, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: PatientTheme.primaryMid },
  qtyBtnText: { fontSize: 20, fontWeight: "600", color: PatientTheme.primary, lineHeight: 22 },
  qtyDisplay: { minWidth: 44, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: SharedColors.white, borderRadius: 10, marginHorizontal: 6, borderWidth: 1.5, borderColor: SharedColors.border },
  qtyText: { fontSize: 16, fontWeight: "700", color: SharedColors.navy },

  subSection: { backgroundColor: "#dff0ee", borderWidth: 2, borderTopWidth: 0, borderColor: PatientTheme.primaryMid, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, padding: 14, gap: 8 },
  subTitle: { fontSize: 12, fontWeight: "700", color: PatientTheme.primary, marginBottom: 2 },
  subCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: SharedColors.white, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: SharedColors.border },
  subCardSelected: { borderColor: PatientTheme.primary, backgroundColor: PatientTheme.primaryLight },
  subLabel: { fontSize: 14, fontWeight: "600", color: SharedColors.navy },
  subDesc: { fontSize: 11, color: SharedColors.slate, marginTop: 2 },
  subQtyRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  subQtyBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: SharedColors.white, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: PatientTheme.primaryMid },
  subQtyBtnText: { fontSize: 18, fontWeight: "600", color: PatientTheme.primary },
  subQtyDisplay: { minWidth: 36, height: 32, alignItems: "center", justifyContent: "center", backgroundColor: SharedColors.white, borderRadius: 8, marginHorizontal: 2, borderWidth: 1.5, borderColor: SharedColors.border },
  subQtyText: { fontSize: 15, fontWeight: "700", color: SharedColors.navy },
  implantSummary: { backgroundColor: "rgba(74,0,128,0.1)", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, alignSelf: "flex-start" },
  implantSummaryText: { fontSize: 12, fontWeight: "600", color: PatientTheme.primary },

  customSection: { gap: 8 },
  customLabel: { fontSize: 11, fontWeight: "600", color: SharedColors.slate, letterSpacing: 0.8, marginTop: 4 },
  removeText: { fontSize: 16, color: PatientTheme.primary, fontWeight: "600" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1.5, borderColor: SharedColors.border, borderRadius: 20, borderStyle: "dashed", alignSelf: "flex-start" },
  addBtnPlus: { fontSize: 18, color: PatientTheme.primaryMid, fontWeight: "600" },
  addBtnText: { fontSize: 13, color: SharedColors.slate },
  addInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  addInput: { flex: 1, borderWidth: 1.5, borderColor: PatientTheme.primaryMid, backgroundColor: SharedColors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: SharedColors.navy },
  addConfirmBtn: { backgroundColor: PatientTheme.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  addConfirmText: { color: SharedColors.white, fontSize: 13, fontWeight: "600" },
  addCancelBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  addCancelText: { color: SharedColors.slate, fontSize: 14, fontWeight: "600" },
  noteBox: { backgroundColor: PatientTheme.primaryLight, borderRadius: 12, padding: 14 },
  noteText: { fontSize: 12, color: "#0f5c53", lineHeight: 18 },
  bottomBar: { paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 56, borderTopWidth: 1, borderTopColor: SharedColors.border, backgroundColor: SharedColors.white },
  nextBtn: { backgroundColor: PatientTheme.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center", minHeight: 52 },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: SharedColors.white, fontSize: 15, fontWeight: "600" },
});
