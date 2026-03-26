import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View,
} from "react-native";
import { DentistQuote, store } from "../../lib/store";
import { toPatientLabel } from "../../lib/treatmentTerminology";



import { PatientTheme, SharedColors } from "../../constants/theme";
export default function QuoteCompareScreen() {
  const { caseId, quoteIds } = useLocalSearchParams<{ caseId: string; quoteIds: string }>();
  const [quotes, setQuotes] = useState<DentistQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (caseId && quoteIds) {
        const ids = quoteIds.split(",");
        const allQuotes = await store.getQuotesForCase(caseId);
        const selected = ids.map((id) => allQuotes.find((q) => q.id === id)).filter(Boolean) as DentistQuote[];
        setQuotes(selected);
      }
      setLoading(false);
    };
    load();
  }, [caseId, quoteIds]);

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={PatientTheme.primary} size="large" />
      </View>
    );
  }

  // Find best values
  const lowestPrice = Math.min(...quotes.map((q) => q.totalPrice || Infinity));
  const highestRating = Math.max(...quotes.map((q) => q.rating || 0));
  const mostReviews = Math.max(...quotes.map((q) => q.reviewCount || 0));

  const colWidth = quotes.length === 2 ? 160 : 140;

  const rows: { label: string; icon: string; key: string; render: (q: DentistQuote) => { text: string; isBest: boolean } }[] = [
    {
      label: "Total Price", icon: "💰", key: "price",
      render: (q) => ({ text: `$${(q.totalPrice || 0).toLocaleString()}`, isBest: q.totalPrice === lowestPrice }),
    },
    {
      label: "Rating", icon: "⭐", key: "rating",
      render: (q) => ({ text: `${q.rating || "–"}`, isBest: q.rating === highestRating }),
    },
    {
      label: "Reviews", icon: "📝", key: "reviews",
      render: (q) => ({ text: `${q.reviewCount || 0}`, isBest: q.reviewCount === mostReviews }),
    },
    {
      label: "Duration", icon: "📅", key: "duration",
      render: (q) => ({ text: q.duration || "–", isBest: false }),
    },
    {
      label: "Location", icon: "📍", key: "location",
      render: (q) => ({ text: q.location || "–", isBest: false }),
    },
    {
      label: "Visits", icon: "🔄", key: "visits",
      render: (q) => ({ text: q.visits ? `${q.visits.length} visits` : "–", isBest: false }),
    },
    {
      label: "Verified", icon: "🛡️", key: "verified",
      render: (q) => ({ text: q.licenseVerified ? "✓ Verified" : "–", isBest: q.licenseVerified === true }),
    },
  ];

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Compare Quotes</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Horizontal scrollable comparison table */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tableWrap}>
          <View style={s.table}>
            {/* Dentist name header row */}
            <View style={s.tableRow}>
              <View style={s.labelCol}>
                <Text style={s.labelColText}>Dentist</Text>
              </View>
              {quotes.map((q) => (
                <View key={q.id} style={[s.valueCol, { width: colWidth }]}>
                  <View style={s.dentistHeader}>
                    <View style={s.miniAvatar}>
                      <Text style={s.miniAvatarText}>
                        {(q.dentistName || "D").split(" ").pop()?.[0] || "D"}
                      </Text>
                    </View>
                    <Text style={s.dentistName} numberOfLines={2}>{q.dentistName}</Text>
                  </View>
                  <Text style={s.clinicName} numberOfLines={1}>{q.clinicName}</Text>
                </View>
              ))}
            </View>

            {/* Comparison rows */}
            {rows.map((row, ri) => (
              <View key={row.key} style={[s.tableRow, ri % 2 === 0 && s.tableRowAlt]}>
                <View style={s.labelCol}>
                  <Text style={s.labelIcon}>{row.icon}</Text>
                  <Text style={s.labelText}>{row.label}</Text>
                </View>
                {quotes.map((q) => {
                  const { text, isBest } = row.render(q);
                  return (
                    <View key={q.id} style={[s.valueCol, { width: colWidth }]}>
                      <Text style={[s.valueText, isBest && s.valueBest]}>{text}</Text>
                      {isBest && quotes.length > 1 && (
                        <View style={s.bestTag}>
                          <Text style={s.bestTagText}>Best</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}

            {/* Treatment breakdown */}
            <View style={[s.tableRow, s.tableRowAlt]}>
              <View style={s.labelCol}>
                <Text style={s.labelIcon}>🦷</Text>
                <Text style={s.labelText}>Treatments</Text>
              </View>
              {quotes.map((q) => (
                <View key={q.id} style={[s.valueCol, { width: colWidth }]}>
                  {(q.treatments || []).map((t, ti) => (
                    <View key={ti} style={s.treatmentItem}>
                      <Text style={s.treatmentName} numberOfLines={1}>{toPatientLabel(t.name)}</Text>
                      <Text style={s.treatmentPrice}>${t.price.toLocaleString()} × {t.qty}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Action buttons */}
        <View style={s.actions}>
          {quotes.map((q) => (
            <TouchableOpacity
              key={q.id}
              style={s.selectBtn}
              onPress={() => router.push({
                pathname: "/patient/quote-detail" as any,
                params: { quoteId: q.id, caseId },
              })}
            >
              <Text style={s.selectBtnText}>View {q.dentistName.split(" ").pop()} →</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: {
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: SharedColors.border, backgroundColor: SharedColors.white,
    flexDirection: "row", alignItems: "center", gap: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: SharedColors.navy, fontWeight: "600", marginTop: -2 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: SharedColors.navy, flex: 1 },

  tableWrap: { padding: 16 },
  table: { gap: 0 },
  tableRow: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: SharedColors.border,
    minHeight: 52,
  },
  tableRowAlt: { backgroundColor: "rgba(248,250,252,0.6)" },
  labelCol: {
    width: 100, flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 12, paddingHorizontal: 10,
    backgroundColor: SharedColors.white, borderRightWidth: 1, borderRightColor: SharedColors.border,
  },
  labelColText: { fontSize: 13, fontWeight: "700", color: SharedColors.navy },
  labelIcon: { fontSize: 14 },
  labelText: { fontSize: 12, fontWeight: "600", color: SharedColors.slate, flex: 1 },
  valueCol: {
    paddingVertical: 12, paddingHorizontal: 10,
    alignItems: "center", justifyContent: "center",
    borderRightWidth: 1, borderRightColor: SharedColors.border,
  },
  valueText: { fontSize: 14, fontWeight: "600", color: SharedColors.navy, textAlign: "center" },
  valueBest: { color: PatientTheme.primary, fontWeight: "800" },
  bestTag: {
    marginTop: 4, backgroundColor: PatientTheme.primaryLight, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  bestTagText: { fontSize: 9, fontWeight: "700", color: PatientTheme.primary },

  dentistHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  miniAvatar: {
    width: 28, height: 28, borderRadius: 10,
    backgroundColor: PatientTheme.primaryLight, alignItems: "center", justifyContent: "center",
  },
  miniAvatarText: { fontSize: 12, fontWeight: "700", color: PatientTheme.primary },
  dentistName: { fontSize: 12, fontWeight: "700", color: SharedColors.navy, flex: 1 },
  clinicName: { fontSize: 10, color: SharedColors.slate },

  treatmentItem: { marginBottom: 6, alignItems: "center" },
  treatmentName: { fontSize: 10, fontWeight: "600", color: SharedColors.navy, textAlign: "center" },
  treatmentPrice: { fontSize: 10, color: SharedColors.slate },

  actions: { padding: 16, gap: 10 },
  selectBtn: {
    backgroundColor: PatientTheme.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: "center",
  },
  selectBtnText: { color: SharedColors.white, fontSize: 15, fontWeight: "600" },
});
