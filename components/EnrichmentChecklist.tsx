import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PatientTheme, SharedColors } from "../constants/theme";
import { store } from "../lib/store";

type Props = { caseId: string };

type ChecklistItem = {
  key: string;
  label: string;
  icon: string;
  alwaysDone: boolean;
  done: boolean;
  route?: string;
};

export default function EnrichmentChecklist({ caseId }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [medical, dental, files] = await Promise.all([
          store.getPatientMedical(),
          store.getPatientDental(),
          store.getPatientFiles(),
        ]);

        const hasMedical = !!(medical?.conditions?.length || medical?.medications?.length || medical?.allergies?.length);
        const hasDental = !!(dental?.issues?.length || dental?.lastVisit);
        const hasFiles = !!((files?.xrays?.length || 0) + (files?.treatmentPlans?.length || 0) + (files?.photos?.length || 0));

        setItems([
          { key: "info", label: "Basic info", icon: "✓", alwaysDone: true, done: true },
          { key: "treatment", label: "Treatment selected", icon: "✓", alwaysDone: true, done: true },
          { key: "health", label: "Quick health screen", icon: "✓", alwaysDone: true, done: true },
          { key: "medical", label: "Medical history", icon: "🏥", alwaysDone: false, done: hasMedical, route: `/patient/medical-history?from=checklist&caseId=${caseId}` },
          { key: "dental", label: "Dental history", icon: "🦷", alwaysDone: false, done: hasDental, route: `/patient/dental-history?from=checklist&caseId=${caseId}` },
          { key: "files", label: "Upload files (X-rays, photos)", icon: "📁", alwaysDone: false, done: hasFiles, route: `/patient/upload?from=checklist&caseId=${caseId}` },
        ]);
      })();
    }, [caseId])
  );

  if (items.length === 0) return null;

  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const allDone = doneCount === total;

  if (allDone) return null;

  const progress = doneCount / total;

  return (
    <View style={st.container}>
      <View style={st.headerRow}>
        <Text style={st.title}>Strengthen your case</Text>
        <Text style={st.counter}>{doneCount}/{total}</Text>
      </View>
      <Text style={st.subtitle}>Add more info so dentists can give you accurate quotes</Text>

      <View style={st.progressBar}>
        <View style={[st.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={st.list}>
        {items.map((item) => (
          <View key={item.key} style={st.row}>
            <View style={[st.dot, item.done && st.dotDone]}>
              {item.done ? (
                <Text style={st.dotText}>✓</Text>
              ) : (
                <Text style={st.dotIcon}>{item.icon}</Text>
              )}
            </View>
            <Text style={[st.label, item.done && st.labelDone]}>{item.label}</Text>
            {!item.done && item.route && (
              <TouchableOpacity
                style={st.addBtn}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <Text style={st.addBtnText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#fecaca",
    gap: 8,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 15, fontWeight: "700", color: SharedColors.navy },
  counter: { fontSize: 13, fontWeight: "600", color: PatientTheme.primaryMid },
  subtitle: { fontSize: 12, color: SharedColors.slate, marginTop: -4 },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: SharedColors.border,
    marginTop: 4,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: PatientTheme.primary,
  },
  list: { gap: 10, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: SharedColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: SharedColors.green },
  dotText: { color: SharedColors.white, fontSize: 13, fontWeight: "700" },
  dotIcon: { fontSize: 14 },
  label: { flex: 1, fontSize: 13, color: SharedColors.navy },
  labelDone: { color: SharedColors.slate, textDecorationLine: "line-through" },
  addBtn: {
    backgroundColor: PatientTheme.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: PatientTheme.primaryBorder,
  },
  addBtnText: { fontSize: 12, fontWeight: "600", color: PatientTheme.primary },
});
