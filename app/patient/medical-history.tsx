import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { store } from "../../lib/store";

const T = {
  teal: "#4A0080",
  tealMid: "#5C10A0",
  tealLight: "#f0e6f6",
  navy: "#0f172a",
  slate: "#64748b",
  slateLight: "#94a3b8",
  border: "#e2e8f0",
  bg: "#f8fafc",
  white: "#ffffff",
};

const DEFAULT_CONDITIONS = ["Diabetes", "Heart Disease", "High Blood Pressure", "Pregnancy", "Bleeding Disorder", "None"];
const DEFAULT_MEDICATIONS = ["Blood Thinners", "Insulin", "Blood Pressure Meds", "Painkillers", "Antibiotics", "None"];
const DEFAULT_ALLERGIES = ["Penicillin", "Latex", "Ibuprofen", "Aspirin", "Codeine", "None"];

export default function PatientMedicalHistoryScreen() {
  const { mode, from } = useLocalSearchParams<{ mode?: string; from?: string }>();
  const isEditMode = mode === "edit";
  // Conditions
  const [conditions, setConditions] = useState<string[]>([]);
  const [customConditions, setCustomConditions] = useState<string[]>([]);
  const [newCondition, setNewCondition] = useState("");
  const [showConditionInput, setShowConditionInput] = useState(false);

  // Medications
  const [medications, setMedications] = useState<string[]>([]);
  const [customMedications, setCustomMedications] = useState<string[]>([]);
  const [newMedication, setNewMedication] = useState("");
  const [showMedicationInput, setShowMedicationInput] = useState(false);

  // Allergies
  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergies, setCustomAllergies] = useState<string[]>([]);
  const [newAllergy, setNewAllergy] = useState("");
  const [showAllergyInput, setShowAllergyInput] = useState(false);

  const [loading, setLoading] = useState(false);

  // 저장된 의료 데이터 불러오기
  useEffect(() => {
    const load = async () => {
      const med = await store.getPatientMedical();
      if (!med) return;
      // conditions (배열)
      if (Array.isArray(med.conditions) && med.conditions.length > 0) {
        const defaults = med.conditions.filter((c: string) => DEFAULT_CONDITIONS.includes(c));
        const customs = med.conditions.filter((c: string) => !DEFAULT_CONDITIONS.includes(c));
        setConditions(defaults);
        setCustomConditions(customs);
      }
      // medications (문자열 또는 배열)
      if (med.medications) {
        const arr = Array.isArray(med.medications)
          ? med.medications
          : med.medications.split(",").map((s: string) => s.trim()).filter(Boolean);
        if (arr.length > 0) {
          const defaults = arr.filter((m: string) => DEFAULT_MEDICATIONS.includes(m));
          const customs = arr.filter((m: string) => !DEFAULT_MEDICATIONS.includes(m));
          setMedications(defaults);
          setCustomMedications(customs);
        }
      }
      // allergies (문자열 또는 배열)
      if (med.allergies) {
        const arr = Array.isArray(med.allergies)
          ? med.allergies
          : med.allergies.split(",").map((s: string) => s.trim()).filter(Boolean);
        if (arr.length > 0) {
          const defaults = arr.filter((a: string) => DEFAULT_ALLERGIES.includes(a));
          const customs = arr.filter((a: string) => !DEFAULT_ALLERGIES.includes(a));
          setAllergies(defaults);
          setCustomAllergies(customs);
        }
      }
    };
    load();
  }, []);

  // ── Toggle helpers ──
  const toggleItem = (
    item: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    setCustom: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    if (item === "None") {
      setList(["None"]);
      setCustom([]);
      return;
    }
    const filtered = list.filter((c) => c !== "None");
    const updated = filtered.includes(item)
      ? filtered.filter((c) => c !== item)
      : [...filtered, item];
    setList(updated);
  };

  const addCustomItem = (
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    customList: string[],
    setCustomList: React.Dispatch<React.SetStateAction<string[]>>,
    defaults: string[],
    setInput: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (customList.includes(trimmed) || list.includes(trimmed) || defaults.includes(trimmed)) {
      setInput("");
      return;
    }
    const filteredMain = list.filter((c) => c !== "None");
    setList(filteredMain);
    setCustomList([...customList, trimmed]);
    setInput("");
  };

  const removeCustomItem = (
    item: string,
    customList: string[],
    setCustomList: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setCustomList(customList.filter((c) => c !== item));
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      await store.savePatientMedical({
        conditions: [...conditions, ...customConditions],
        medications: [...medications, ...customMedications],
        allergies: [...allergies, ...customAllergies],
      });
    } catch {}
    setLoading(false);
    if (from === "review") { router.back(); return; }
    router.push(isEditMode ? "/patient/dental-history?mode=edit" as any : "/patient/dental-history" as any);
  };

  // ── Reusable Tag ──
  const Tag = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
    <TouchableOpacity style={[styles.tag, selected && styles.tagSelected]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.tagText, selected && styles.tagTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  // ── Reusable Section ──
  const renderSection = (
    title: string,
    hint: string,
    defaults: string[],
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
    custom: string[],
    setCustom: React.Dispatch<React.SetStateAction<string[]>>,
    newValue: string,
    setNewValue: React.Dispatch<React.SetStateAction<string>>,
    showInput: boolean,
    setShowInput: React.Dispatch<React.SetStateAction<boolean>>,
    addPlaceholder: string,
    addLabel: string,
  ) => (
    <View style={styles.section}>
      <Text style={styles.label}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>

      {/* Default Tags */}
      <View style={styles.tagWrap}>
        {defaults.map((item) => (
          <Tag
            key={item}
            label={item}
            selected={selected.includes(item)}
            onPress={() => toggleItem(item, selected, setSelected, setCustom)}
          />
        ))}
      </View>

      {/* Custom Tags */}
      {custom.length > 0 && (
        <View style={styles.customTagsWrap}>
          {custom.map((item) => (
            <View key={item} style={styles.customTag}>
              <Text style={styles.customTagText}>{item}</Text>
              <TouchableOpacity onPress={() => removeCustomItem(item, custom, setCustom)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={styles.customTagRemove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add Input */}
      {showInput ? (
        <View style={styles.addInputRow}>
          <TextInput
            style={styles.addInput}
            placeholder={addPlaceholder}
            placeholderTextColor={T.slateLight}
            value={newValue}
            onChangeText={setNewValue}
            onSubmitEditing={() => addCustomItem(newValue, selected, setSelected, custom, setCustom, defaults, setNewValue)}
            returnKeyType="done"
            autoFocus
          />
          <TouchableOpacity
            style={[styles.addConfirmBtn, !newValue.trim() && { opacity: 0.4 }]}
            onPress={() => addCustomItem(newValue, selected, setSelected, custom, setCustom, defaults, setNewValue)}
            disabled={!newValue.trim()}
          >
            <Text style={styles.addConfirmText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addCancelBtn} onPress={() => { setShowInput(false); setNewValue(""); }}>
            <Text style={styles.addCancelText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowInput(true)} activeOpacity={0.7}>
          <Text style={styles.addBtnPlus}>+</Text>
          <Text style={styles.addBtnText}>{addLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#3D0070", "#2F0058", "#220040"]} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Medical History</Text>
            <Text style={styles.subtitle}>Help us understand your health</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressDotDone]} />
          <View style={[styles.progressLine, styles.progressLineDone]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Medical Conditions */}
        {renderSection(
          "MEDICAL CONDITIONS", "Select all that apply",
          DEFAULT_CONDITIONS, conditions, setConditions,
          customConditions, setCustomConditions,
          newCondition, setNewCondition,
          showConditionInput, setShowConditionInput,
          "Type a condition...", "Add other condition",
        )}

        {/* Current Medications */}
        {renderSection(
          "CURRENT MEDICATIONS", "Select all that apply",
          DEFAULT_MEDICATIONS, medications, setMedications,
          customMedications, setCustomMedications,
          newMedication, setNewMedication,
          showMedicationInput, setShowMedicationInput,
          "Type a medication...", "Add other medication",
        )}

        {/* Allergies */}
        {renderSection(
          "ALLERGIES", "Select all that apply",
          DEFAULT_ALLERGIES, allergies, setAllergies,
          customAllergies, setCustomAllergies,
          newAllergy, setNewAllergy,
          showAllergyInput, setShowAllergyInput,
          "Type an allergy...", "Add other allergy",
        )}

        <View style={styles.tipBox}>
          <Text style={styles.tipText}>💡 This information helps dentists plan safe treatments for you</Text>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} disabled={loading} activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color={T.white} size="small" />
          ) : (
            <Text style={styles.nextBtnText}>Next: Dental History →</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },
  title: { fontSize: 18, fontWeight: "700", color: "#fff" },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  progressRow: { flexDirection: "row", alignItems: "center", marginTop: 14, paddingHorizontal: 20 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)" },
  progressDotActive: { backgroundColor: "#f59e0b", width: 10, height: 10, borderRadius: 5 },
  progressDotDone: { backgroundColor: "rgba(255,255,255,0.8)" },
  progressLine: { flex: 1, height: 2, backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 6 },
  progressLineDone: { backgroundColor: "rgba(255,255,255,0.5)" },

  content: { padding: 24, gap: 28, paddingBottom: 60 },
  section: { gap: 10 },
  label: { fontSize: 11, fontWeight: "600", color: T.slate, letterSpacing: 0.8 },
  hint: { fontSize: 12, color: T.slateLight, marginTop: -4 },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.white,
  },
  tagSelected: { borderColor: T.tealMid, backgroundColor: T.tealLight },
  tagText: { fontSize: 13, color: T.slate, fontWeight: "400" },
  tagTextSelected: { color: T.teal, fontWeight: "600" },

  // Custom tags
  customTagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  customTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: T.tealMid,
    backgroundColor: T.tealLight,
  },
  customTagText: { fontSize: 13, color: T.teal, fontWeight: "600" },
  customTagRemove: { fontSize: 12, color: T.teal, fontWeight: "700", padding: 2 },

  // Add button & input
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 20,
    borderStyle: "dashed",
    alignSelf: "flex-start",
  },
  addBtnPlus: { fontSize: 18, color: T.tealMid, fontWeight: "600" },
  addBtnText: { fontSize: 13, color: T.slate },
  addInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  addInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: T.tealMid,
    backgroundColor: T.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: T.navy,
  },
  addConfirmBtn: {
    backgroundColor: T.teal,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  addConfirmText: { color: T.white, fontSize: 13, fontWeight: "600" },
  addCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  addCancelText: { color: T.slate, fontSize: 14, fontWeight: "600" },

  tipBox: { backgroundColor: T.tealLight, borderRadius: 10, padding: 12 },
  tipText: { fontSize: 12, color: T.teal, lineHeight: 18 },

  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: T.border,
    backgroundColor: T.white,
  },
  nextBtn: {
    backgroundColor: T.teal,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    minHeight: 52,
  },
  nextBtnText: { color: T.white, fontSize: 15, fontWeight: "600" },
});
