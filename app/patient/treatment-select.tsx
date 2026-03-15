import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { store } from "../../lib/store";

const T = { teal: "#4A0080", tealMid: "#5C10A0", tealLight: "#f0e6f6", navy: "#0f172a", slate: "#64748b", slateLight: "#94a3b8", border: "#e2e8f0", bg: "#f8fafc", white: "#ffffff" };

type SubOption = { id: string; label: string; desc: string };
type Treatment = {
  id: string; name: string; price: string; icon: string; desc: string;
  duration: string; durationColor: string;
  subOptions?: SubOption[];
};

const treatments: Treatment[] = [
  {
    id: "connect", name: "Just connect me to a dentist", price: "—", icon: "🤝",
    desc: "I need advice and a dentist match (no specific treatment yet)",
    duration: "⏳ We’ll match you quickly", durationColor: "#4A0080",
  },
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
  { id: "veneer", name: "Veneers", price: "$800–1,200", icon: "✨", desc: "Porcelain or composite shells for a perfect smile", duration: "⏳ Approx. 1 week", durationColor: "#4A0080" },
  { id: "smile_makeover", name: "Smile Makeover", price: "$2,000–5,000", icon: "😁", desc: "Full smile transformation — veneers, whitening, contouring & more", duration: "⏳ Approx. 1–2 weeks", durationColor: "#4A0080" },
  { id: "filling", name: "Fillings", price: "$80–200", icon: "🪥", desc: "Repair cavities and minor tooth damage", duration: "⏳ Approx. 1 week", durationColor: "#4A0080" },
  { id: "crown", name: "Crowns", price: "$300–600", icon: "👑", desc: "Cap damaged or weakened teeth with custom crowns", duration: "⏳ Approx. 1 week", durationColor: "#4A0080" },
  { id: "rootcanal", name: "Root Canals", price: "$200–400", icon: "🏥", desc: "Save infected teeth from extraction", duration: "⏳ Approx. 1 week", durationColor: "#4A0080" },
  { id: "gum", name: "Gum Treatment", price: "$200–800", icon: "🩺", desc: "Periodontal treatment, gum contouring & grafting", duration: "⏳ Approx. 1 week", durationColor: "#4A0080" },
  { id: "invisalign", name: "Invisalign", price: "$2,500–5,000", icon: "🔗", desc: "Clear aligners for straighter teeth without braces", duration: "⏳ Approx. 3 months minimum", durationColor: "#d97706" },
  { id: "sleep_appliance", name: "Oral Sleep Appliance", price: "$500–1,500", icon: "😴", desc: "Custom-fitted device for sleep apnea & snoring", duration: "⏳ Approx. 1–2 weeks", durationColor: "#4A0080" },
  { id: "tongue_tie", name: "Tongue Tie Surgery", price: "$300–800", icon: "✂️", desc: "Frenectomy to release restricted tongue movement", duration: "⏳ Approx. 1 week", durationColor: "#4A0080" },
  { id: "wisdom_teeth", name: "Wisdom Teeth Extractions", price: "$200–600", icon: "🦷", desc: "Removal of impacted or problematic wisdom teeth", duration: "⏳ Approx. 1 week", durationColor: "#4A0080" },
];

export default function PatientTreatmentSelectScreen() {
  const { mode, from } = useLocalSearchParams<{ mode?: string; from?: string }>();
  const isChooseMode = mode === "choose";

  const [selected, setSelected] = useState<Record<string, number>>({});
  const [implantSubs, setImplantSubs] = useState<Record<string, number>>({});
  const [implantExpanded, setImplantExpanded] = useState(false);
  const [customTreatments, setCustomTreatments] = useState<{ name: string; qty: number }[]>([]);
  const [newTreatment, setNewTreatment] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isChooseMode) {
      // reset any previous selection from the intro screen
      setSelected({});
      setImplantSubs({});
      setCustomTreatments([]);
      setShowAddInput(false);
    }
  }, [isChooseMode]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await store.savePatientTreatments({ selected: {}, custom: [] });
    } catch (err) {
      console.log("Save error:", err);
    }
    setLoading(false);
    if (from === "review") { router.back(); return; }
    router.push("/patient/upload" as any);
  };

  const handleChoose = () => {
    router.push({ pathname: "/patient/treatment-select", params: { mode: "choose" } } as any);
  };

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
    router.push("/patient/upload" as any);
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
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={st.backArrow}>‹</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[st.content, !isChooseMode && st.centerContent]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
{!isChooseMode ? (
          <>
            <TouchableOpacity style={[st.treatmentCard, st.optionCard]} onPress={handleConnect} activeOpacity={0.7}>
              <Text style={st.treatmentIcon}>🤝</Text>
              <View style={{ flex: 1 }}>
                <Text style={[st.treatmentName, st.optionTitle, st.treatmentNameSelected]}>Just connect me to a dentist</Text>
                <Text style={[st.treatmentDesc, st.optionDesc]}>I need advice and a dentist match (no specific treatment yet).</Text>
              </View>
              {loading ? <ActivityIndicator color={T.teal} /> : <Text style={st.optionArrow}>›</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={[st.treatmentCard, st.optionCard]} onPress={handleChoose} activeOpacity={0.7}>
              <Text style={st.treatmentIcon}>✅</Text>
              <View style={{ flex: 1 }}>
                <Text style={[st.treatmentName, st.optionTitle]}>I know what I want</Text>
                <Text style={[st.treatmentDesc, st.optionDesc]}>Choose your treatment(s) and send your case directly to dentists.</Text>
              </View>
              <Text style={st.optionArrow}>›</Text>
            </TouchableOpacity>
          </>
        ) : (
          treatments.filter((t) => t.id !== "connect").map((t) => {
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
                  {isImplant && <Text style={{ fontSize: 14, color: T.slateLight }}>{isExpanded ? "▲" : "▼"}</Text>}
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
                            <Text style={[st.subLabel, isSubSel && { color: T.teal }]}>{sub.label}</Text>
                            <Text style={st.subDesc}>{sub.desc}</Text>
                          </View>
                          <View style={st.subQtyRow}>
                            <TouchableOpacity style={[st.subQtyBtn, subQty === 0 && { opacity: 0.3 }]} onPress={() => changeImplantSubQty(sub.id, -1)} disabled={subQty === 0}>
                              <Text style={st.subQtyBtnText}>−</Text>
                            </TouchableOpacity>
                            <View style={[st.subQtyDisplay, isSubSel && { borderColor: T.teal }]}>
                              <Text style={[st.subQtyText, isSubSel && { color: T.teal }]}>{subQty}</Text>
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
          })
        )}

</ScrollView>

      {isChooseMode && (
        <View style={st.bottomBar}>
          <TouchableOpacity style={[st.nextBtn, totalSelected === 0 && st.nextBtnDisabled]} onPress={handleNext} disabled={totalSelected === 0 || loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={T.white} size="small" /> : <Text style={st.nextBtnText}>Review & Submit ({totalSelected} selected) →</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 20, paddingTop: 36, paddingBottom: 10, flexDirection: "row", alignItems: "center" },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 24, color: "#0f172a", fontWeight: "600", marginTop: -2 },
  content: { padding: 20, gap: 18, paddingBottom: 60 },
  centerContent: { flexGrow: 1, justifyContent: "center" },

  treatmentCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 2, borderColor: T.border, backgroundColor: T.white, gap: 14 },
  treatmentCardSelected: { borderColor: T.tealMid, backgroundColor: T.tealLight },
  optionCard: { paddingVertical: 26, paddingHorizontal: 20, borderRadius: 18, borderWidth: 2, borderColor: T.border, backgroundColor: T.white, marginBottom: 18, minWidth: "88%" },
  treatmentIcon: { fontSize: 32 },
  treatmentName: { fontSize: 15, fontWeight: "600", color: T.navy },
  treatmentNameSelected: { color: T.teal },
  optionTitle: { fontSize: 18 },
  treatmentDesc: { fontSize: 12, color: T.slate, marginTop: 2 },
  optionDesc: { fontSize: 14, color: T.slate, marginTop: 4 },
  optionArrow: { fontSize: 22, color: T.slateLight, marginLeft: 10 },
  treatmentPrice: { fontSize: 13, fontWeight: "700", color: T.slateLight },
  treatmentPriceSelected: { color: T.teal },
  checkCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: T.teal, alignItems: "center", justifyContent: "center" },
  checkMark: { color: T.white, fontSize: 16, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" },
  durationBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4, alignSelf: "flex-start" },
  durationText: { fontSize: 10, fontWeight: "600" },

  qtySection: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#dff0ee", borderWidth: 2, borderTopWidth: 0, borderColor: T.tealMid, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, paddingHorizontal: 16, paddingVertical: 10 },
  qtyLabel: { fontSize: 13, fontWeight: "600", color: T.teal },
  qtyRow: { flexDirection: "row", alignItems: "center" },
  qtyBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: T.white, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: T.tealMid },
  qtyBtnText: { fontSize: 20, fontWeight: "600", color: T.teal, lineHeight: 22 },
  qtyDisplay: { minWidth: 44, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: T.white, borderRadius: 10, marginHorizontal: 6, borderWidth: 1.5, borderColor: T.border },
  qtyText: { fontSize: 16, fontWeight: "700", color: T.navy },

  subSection: { backgroundColor: "#dff0ee", borderWidth: 2, borderTopWidth: 0, borderColor: T.tealMid, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, padding: 14, gap: 8 },
  subTitle: { fontSize: 12, fontWeight: "700", color: T.teal, marginBottom: 2 },
  subCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: T.white, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: T.border },
  subCardSelected: { borderColor: T.teal, backgroundColor: "#f0e6f6" },
  subLabel: { fontSize: 14, fontWeight: "600", color: T.navy },
  subDesc: { fontSize: 11, color: T.slate, marginTop: 2 },
  subQtyRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  subQtyBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: T.white, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: T.tealMid },
  subQtyBtnText: { fontSize: 18, fontWeight: "600", color: T.teal },
  subQtyDisplay: { minWidth: 36, height: 32, alignItems: "center", justifyContent: "center", backgroundColor: T.white, borderRadius: 8, marginHorizontal: 2, borderWidth: 1.5, borderColor: T.border },
  subQtyText: { fontSize: 15, fontWeight: "700", color: T.navy },
  implantSummary: { backgroundColor: "rgba(74,0,128,0.1)", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, alignSelf: "flex-start" },
  implantSummaryText: { fontSize: 12, fontWeight: "600", color: T.teal },

  customSection: { gap: 8 },
  customLabel: { fontSize: 11, fontWeight: "600", color: T.slate, letterSpacing: 0.8, marginTop: 4 },
  removeText: { fontSize: 16, color: T.teal, fontWeight: "600" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1.5, borderColor: T.border, borderRadius: 20, borderStyle: "dashed", alignSelf: "flex-start" },
  addBtnPlus: { fontSize: 18, color: T.tealMid, fontWeight: "600" },
  addBtnText: { fontSize: 13, color: T.slate },
  addInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  addInput: { flex: 1, borderWidth: 1.5, borderColor: T.tealMid, backgroundColor: T.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: T.navy },
  addConfirmBtn: { backgroundColor: T.teal, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  addConfirmText: { color: T.white, fontSize: 13, fontWeight: "600" },
  addCancelBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  addCancelText: { color: T.slate, fontSize: 14, fontWeight: "600" },
  noteBox: { backgroundColor: T.tealLight, borderRadius: 12, padding: 14 },
  noteText: { fontSize: 12, color: "#0f5c53", lineHeight: 18 },
  bottomBar: { paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 56, borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.white },
  nextBtn: { backgroundColor: T.teal, borderRadius: 14, paddingVertical: 15, alignItems: "center", minHeight: 52 },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: T.white, fontSize: 15, fontWeight: "600" },
});
