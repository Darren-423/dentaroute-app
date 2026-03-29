import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { store, PatientCase } from "../../lib/store";
import { DoctorTheme, SharedColors } from "../../constants/theme";

const formatDateLabel = (dateStr: string) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

type GroupedCases = { label: string; cases: PatientCase[] }[];

const groupByDate = (cases: PatientCase[]): GroupedCases => {
  const map = new Map<string, PatientCase[]>();
  for (const c of cases) {
    const label = formatDateLabel(c.date);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(c);
  }
  return Array.from(map.entries()).map(([label, cases]) => ({ label, cases }));
};

export default function DoctorDeletedCasesScreen() {
  const [groups, setGroups] = useState<GroupedCases>([]);

  useEffect(() => {
    (async () => {
      const cases = await store.getCases();
      const deleted = cases
        .filter((c) => c.hidden)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setGroups(groupByDate(deleted));
    })();
  }, []);

  return (
    <View style={s.container}>
      <LinearGradient colors={[DoctorTheme.primary, DoctorTheme.primaryDark]} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.back}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Deleted Cases</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {groups.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🗑️</Text>
            <Text style={s.emptyTitle}>No deleted cases yet</Text>
            <Text style={s.emptyDesc}>Cases you delete from your dashboard will appear here.</Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.label} style={s.group}>
              <Text style={s.groupLabel}>{group.label}</Text>
              {group.cases.map((c) => {
                const treatments = c.treatments?.map((t) => t.name).join(", ") || "No treatments";
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={s.card}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/doctor/case-detail?caseId=${c.id}` as any)}
                  >
                    <View style={s.cardTop}>
                      <Text style={s.caseId}>Case #{c.id}</Text>
                      <Text style={s.statusPill}>Deleted</Text>
                    </View>
                    <Text style={s.treatments} numberOfLines={1}>{treatments}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { fontSize: 28, color: SharedColors.white, fontWeight: "300" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: SharedColors.white },
  content: { padding: 20 },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: SharedColors.navy, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: SharedColors.slate, textAlign: "center", lineHeight: 20 },
  group: { marginBottom: 20 },
  groupLabel: { fontSize: 13, fontWeight: "700", color: SharedColors.slate, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  card: {
    backgroundColor: SharedColors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: SharedColors.border,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  caseId: { fontSize: 15, fontWeight: "700", color: SharedColors.navy },
  statusPill: { fontSize: 11, fontWeight: "600", color: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: "hidden" },
  treatments: { fontSize: 13, color: SharedColors.slate },
});
