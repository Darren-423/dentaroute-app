import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { store } from "../../lib/store";

import { PatientTheme, SharedColors } from "../../constants/theme";
const DEFAULT_ISSUES = ["Tooth Pain", "Missing Teeth", "Broken Teeth", "Gum Disease", "Cavities", "Discoloration"];
const visitOptions = ["< 6 months", "6-12 months", "1-2 years", "2+ years", "Never"];

export default function PatientDentalHistoryScreen() {
  const { mode, from } = useLocalSearchParams<{ mode?: string; from?: string }>();
  const isEditMode = mode === "edit";
  const [issues, setIssues] = useState<string[]>([]);
  const [customIssues, setCustomIssues] = useState<string[]>([]);
  const [newIssue, setNewIssue] = useState("");
  const [showIssueInput, setShowIssueInput] = useState(false);
  const [dentistVisit, setDentistVisit] = useState("");
  const [loading, setLoading] = useState(false);

  // 저장된 치과 데이터 불러오기
  useEffect(() => {
    const load = async () => {
      const dental = await store.getPatientDental();
      if (!dental) return;
      // issues (배열)
      if (Array.isArray(dental.issues) && dental.issues.length > 0) {
        const defaults = dental.issues.filter((i: string) => DEFAULT_ISSUES.includes(i));
        const customs = dental.issues.filter((i: string) => !DEFAULT_ISSUES.includes(i));
        setIssues(defaults);
        setCustomIssues(customs);
      }
      // lastVisit
      if (dental.lastVisit) {
        setDentistVisit(dental.lastVisit);
      }
    };
    load();
  }, []);

  const toggleIssue = (issue: string) => {
    const updated = issues.includes(issue)
      ? issues.filter((i) => i !== issue)
      : [...issues, issue];
    setIssues(updated);
  };

  const addCustomIssue = () => {
    const trimmed = newIssue.trim();
    if (!trimmed) return;
    if (customIssues.includes(trimmed) || issues.includes(trimmed) || DEFAULT_ISSUES.includes(trimmed)) {
      setNewIssue("");
      return;
    }
    setCustomIssues([...customIssues, trimmed]);
    setNewIssue("");
  };

  const removeCustomIssue = (issue: string) => {
    setCustomIssues(customIssues.filter((i) => i !== issue));
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      await store.savePatientDental({
        issues: [...issues, ...customIssues],
        lastVisit: dentistVisit,
      });

      if (from === "review") { setLoading(false); router.back(); return; }
      if (isEditMode) {
        const updatedCount = await store.updateCasesForProfile();
        setLoading(false);
        Alert.alert(
          "Profile Updated",
          updatedCount > 0
            ? `Your profile has been saved and ${updatedCount} active case${updatedCount > 1 ? "s have" : " has"} been updated.`
            : "Your profile has been saved.",
          [{ text: "OK", onPress: () => router.replace("/patient/dashboard" as any) }],
        );
        return;
      }
    } catch {}
    setLoading(false);
    router.push("/patient/treatment-select" as any);
  };

  const Tag = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
    <TouchableOpacity style={[styles.tag, selected && styles.tagSelected]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.tagText, selected && styles.tagTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[...PatientTheme.gradient]} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Dental History</Text>
            <Text style={styles.subtitle}>Tell us about your dental health</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressDotDone]} />
          <View style={[styles.progressLine, styles.progressLineDone]} />
          <View style={[styles.progressDot, styles.progressDotDone]} />
          <View style={[styles.progressLine, styles.progressLineDone]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={{ backgroundColor: "#f1f5f9", borderRadius: 8, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: SharedColors.border }}><Text style={{ fontSize: 11, color: SharedColors.slate, lineHeight: 16 }}>Your health information is used solely for treatment quotes and is protected under Korean data protection law (PIPA).</Text></View>

          {/* Dental Issues */}
        <View style={styles.section}>
          <Text style={styles.label}>CURRENT DENTAL ISSUES</Text>
          <Text style={styles.hint}>Select all that apply</Text>
          <View style={styles.tagWrap}>
            {DEFAULT_ISSUES.map((issue) => (
              <Tag
                key={issue}
                label={issue}
                selected={issues.includes(issue)}
                onPress={() => toggleIssue(issue)}
              />
            ))}
          </View>

          {/* Custom Issues */}
          {customIssues.length > 0 && (
            <View style={styles.customTagsWrap}>
              {customIssues.map((issue) => (
                <View key={issue} style={styles.customTag}>
                  <Text style={styles.customTagText}>{issue}</Text>
                  <TouchableOpacity onPress={() => removeCustomIssue(issue)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Text style={styles.customTagRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Add Input */}
          {showIssueInput ? (
            <View style={styles.addInputRow}>
              <TextInput
                style={styles.addInput}
                placeholder="Type a dental issue..."
                placeholderTextColor={SharedColors.slateLight}
                value={newIssue}
                onChangeText={setNewIssue}
                onSubmitEditing={addCustomIssue}
                returnKeyType="done"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.addConfirmBtn, !newIssue.trim() && { opacity: 0.4 }]}
                onPress={addCustomIssue}
                disabled={!newIssue.trim()}
              >
                <Text style={styles.addConfirmText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addCancelBtn} onPress={() => { setShowIssueInput(false); setNewIssue(""); }}>
                <Text style={styles.addCancelText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowIssueInput(true)} activeOpacity={0.7}>
              <Text style={styles.addBtnPlus}>+</Text>
              <Text style={styles.addBtnText}>Add other issue</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Last Visit */}
        <View style={styles.section}>
          <Text style={styles.label}>LAST DENTIST VISIT</Text>
          <View style={styles.tagWrap}>
            {visitOptions.map((v) => (
              <Tag
                key={v}
                label={v}
                selected={dentistVisit === v}
                onPress={() => setDentistVisit(v)}
              />
            ))}
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🦷</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>What happens next?</Text>
            <Text style={styles.infoDesc}>After completing your profile, you'll upload dental photos/X-rays and select treatments. Korean dentists will then send you personalized quotes.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} disabled={loading} activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color={SharedColors.white} size="small" />
          ) : (
            <Text style={styles.nextBtnText}>{isEditMode ? "Save Profile" : "Complete Profile →"}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 24, color: SharedColors.white, fontWeight: "600", marginTop: -2 },
  title: { fontSize: 18, fontWeight: "700", color: SharedColors.white },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  progressRow: { flexDirection: "row", alignItems: "center", marginTop: 14, paddingHorizontal: 20 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)" },
  progressDotActive: { backgroundColor: SharedColors.amber, width: 10, height: 10, borderRadius: 5 },
  progressDotDone: { backgroundColor: "rgba(255,255,255,0.8)" },
  progressLine: { flex: 1, height: 2, backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 6 },
  progressLineDone: { backgroundColor: "rgba(255,255,255,0.5)" },

  content: { padding: 24, gap: 28, paddingBottom: 60 },
  section: { gap: 10 },
  label: { fontSize: 11, fontWeight: "600", color: SharedColors.slate, letterSpacing: 0.8 },
  hint: { fontSize: 12, color: SharedColors.slateLight, marginTop: -4 },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: SharedColors.border,
    backgroundColor: SharedColors.white,
  },
  tagSelected: { borderColor: PatientTheme.primaryMid, backgroundColor: PatientTheme.primaryLight },
  tagText: { fontSize: 13, color: SharedColors.slate, fontWeight: "400" },
  tagTextSelected: { color: PatientTheme.primary, fontWeight: "600" },

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
    borderColor: PatientTheme.primaryMid,
    backgroundColor: PatientTheme.primaryLight,
  },
  customTagText: { fontSize: 13, color: PatientTheme.primary, fontWeight: "600" },
  customTagRemove: { fontSize: 12, color: PatientTheme.primary, fontWeight: "700", padding: 2 },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: SharedColors.border,
    borderRadius: 20,
    borderStyle: "dashed",
    alignSelf: "flex-start",
  },
  addBtnPlus: { fontSize: 18, color: PatientTheme.primaryMid, fontWeight: "600" },
  addBtnText: { fontSize: 13, color: SharedColors.slate },
  addInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  addInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: PatientTheme.primaryMid,
    backgroundColor: SharedColors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: SharedColors.navy,
  },
  addConfirmBtn: {
    backgroundColor: PatientTheme.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  addConfirmText: { color: SharedColors.white, fontSize: 13, fontWeight: "600" },
  addCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  addCancelText: { color: SharedColors.slate, fontSize: 14, fontWeight: "600" },

  infoCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: PatientTheme.primaryLight,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(74,0,128,0.15)",
  },
  infoIcon: { fontSize: 24, marginTop: 2 },
  infoTitle: { fontSize: 14, fontWeight: "600", color: PatientTheme.primary, marginBottom: 4 },
  infoDesc: { fontSize: 12, color: "#0f5c53", lineHeight: 18 },

  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: SharedColors.border,
    backgroundColor: SharedColors.white,
  },
  nextBtn: {
    backgroundColor: PatientTheme.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    minHeight: 52,
  },
  nextBtnText: { color: SharedColors.white, fontSize: 15, fontWeight: "600" },
});
