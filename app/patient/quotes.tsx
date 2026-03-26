import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { DentistQuote, store } from "../../lib/store";
import { formatKRW } from "../../lib/currency";

import { PatientTheme, SharedColors } from "../../constants/theme";
type SortOption = "price" | "reviews" | "stars" | "duration";

const parseDuration = (dur: string): number => {
  if (!dur || dur === "–") return 9999;
  let days = 0;
  const mo = dur.match(/(\d+)\s*month/i);
  const wk = dur.match(/(\d+)\s*week/i);
  const dy = dur.match(/(\d+)\s*day/i);
  if (mo) days += parseInt(mo[1]) * 30;
  if (wk) days += parseInt(wk[1]) * 7;
  if (dy) days += parseInt(dy[1]);
  return days || 9999;
};

export default function PatientQuotesScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const [quotes, setQuotes] = useState<DentistQuote[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("price");
  const [sortAsc, setSortAsc] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      if (caseId) {
        const q = await store.getQuotesForCase(caseId);
        setQuotes(q);
      } else {
        const allQuotes = await store.getQuotesForCase("");
        setQuotes(allQuotes);
      }
    };
    load();
  }, [caseId]);

  const handleSort = (key: SortOption) => {
    if (sortBy === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortBy(key);
      setSortAsc(key === "price" || key === "duration");
    }
  };

  // Dynamic sort
  const sorted = [...quotes].sort((a, b) => {
    let diff = 0;
    if (sortBy === "price") diff = (a.totalPrice || 0) - (b.totalPrice || 0);
    else if (sortBy === "reviews") diff = (a.reviewCount || 0) - (b.reviewCount || 0);
    else if (sortBy === "stars") diff = (a.rating || 0) - (b.rating || 0);
    else if (sortBy === "duration") diff = parseDuration(a.duration || "") - parseDuration(b.duration || "");
    return sortAsc ? diff : -diff;
  });
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const goCompare = () => {
    if (selectedIds.length >= 2) {
      router.push({
        pathname: "/patient/quote-compare" as any,
        params: { caseId, quoteIds: selectedIds.join(",") },
      });
    }
  };

  const lowestPrice = sorted.length > 0
    ? [...quotes].sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0))[0].totalPrice
    : 0;

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient
        colors={[...PatientTheme.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerRow}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.back()}
          >
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.title}>Quotes</Text>
            <Text style={s.subtitle}>
              {quotes.length > 0
                ? `${quotes.length} dentist${quotes.length > 1 ? "s" : ""} responded`
                : "Waiting for responses"}
            </Text>
          </View>
          {quotes.length > 0 ? (
            <TouchableOpacity
              style={s.mapBtn}
              onPress={() => router.push(`/patient/clinic-map?caseId=${caseId}` as any)}
              activeOpacity={0.7}
            >
              <Text style={s.mapBtnText}>Map</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>
      </LinearGradient>

      {/* Sort options + Compare */}
      {quotes.length > 0 && (
        <View style={s.sortWrapper}>
          <View style={s.sortRow}>
            <Text style={s.sortLabel}>Sort by</Text>
            {([
              { key: "price" as SortOption, label: "Price" },
              { key: "reviews" as SortOption, label: "Reviews" },
              { key: "stars" as SortOption, label: "Rating" },
              { key: "duration" as SortOption, label: "Duration" },
            ]).map((opt) => {
              const isActive = sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[s.sortBtn, isActive && s.sortBtnActive]}
                  onPress={() => handleSort(opt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.sortBtnText, isActive && s.sortBtnTextActive]}>
                    {opt.label}
                  </Text>
                  {isActive && (
                    <View style={s.sortArrows}>
                      <View style={[s.sortTriUp, sortAsc && s.sortTriUpActive]} />
                      <View style={[s.sortTriDown, !sortAsc && s.sortTriDownActive]} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: "#f1f5f9", borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: SharedColors.border }}><Text style={{ fontSize: 11, color: SharedColors.slate, lineHeight: 16 }}>Quotes are estimates only. Actual treatment costs may change after in-person examination. Concourse does not guarantee treatment outcomes.</Text></View>

        {quotes.length === 0 ? (
          /* Waiting State */
          <View style={s.waitingCard}>
            <View style={s.waitingIconWrap}>
              <View style={s.waitingIconRing}>
                <Text style={s.waitingIcon}>⏳</Text>
              </View>
            </View>
            <Text style={s.waitingTitle}>Waiting for quotes</Text>
            <Text style={s.waitingDesc}>
              Dentists are reviewing your case.{"\n"}
              Quotes usually arrive within 24 hours.
            </Text>

            <View style={s.timeline}>
              {/* Step 1 - Done */}
              <View style={s.timelineStep}>
                <View style={s.stepDotDone}>
                  <Text style={s.stepDotDoneText}>✓</Text>
                </View>
                <View style={s.stepLine} />
                <View style={s.stepContent}>
                  <Text style={s.stepTitleDone}>Case submitted</Text>
                  <Text style={s.stepSub}>Just now</Text>
                </View>
              </View>

              {/* Step 2 - Active */}
              <View style={s.timelineStep}>
                <View style={s.stepDotActive} />
                <View style={[s.stepLine, { backgroundColor: SharedColors.border }]} />
                <View style={s.stepContent}>
                  <Text style={s.stepTitleActive}>Dentists reviewing</Text>
                  <Text style={s.stepSub}>Usually within 12 hours</Text>
                </View>
              </View>

              {/* Step 3 - Pending */}
              <View style={s.timelineStep}>
                <View style={s.stepDotPending}>
                  <Text style={s.stepDotPendingText}>3</Text>
                </View>
                <View style={s.stepContent}>
                  <Text style={s.stepTitlePending}>Quotes received</Text>
                  <Text style={s.stepSub}>Compare & choose</Text>
                </View>
              </View>
            </View>

            <View style={s.tipBar}>
              <View style={s.tipDot} />
              <Text style={s.tipText}>We'll notify you when quotes arrive</Text>
            </View>
          </View>
        ) : (
          /* Quote Cards */
          <>
            {/* Price range bar */}
            {quotes.length > 1 && (
              <View style={s.rangeBar}>
                <Text style={s.rangeLabel}>Price range</Text>
                <Text style={s.rangeValue}>
                  ${sorted[0].totalPrice?.toLocaleString()} – ${sorted[sorted.length - 1].totalPrice?.toLocaleString()}
                </Text>
              </View>
            )}

            {sorted.map((q: any, index: number) => {
              const isLowest = quotes.length > 1 && q.totalPrice === lowestPrice;
              const isSelected = selectedIds.includes(q.id);

              return (
                <TouchableOpacity
                  key={q.id || index}
                  style={[s.quoteCard, isLowest && s.quoteCardHighlight, compareMode && isSelected && s.quoteCardSelected]}
                  onPress={() => {
                    if (compareMode) {
                      toggleSelect(q.id);
                    } else {
                      router.push({
                        pathname: "/patient/quote-detail" as any,
                        params: { quoteId: q.id, caseId },
                      });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  {/* Best value badge */}
                  {isLowest && !compareMode && (
                    <View style={s.bestBadge}>
                      <Text style={s.bestBadgeText}>Best Value</Text>
                    </View>
                  )}

                  {/* Top: Dentist info + Price */}
                  <View style={s.cardTop}>
                    {compareMode ? (
                      <View style={[s.checkbox, isSelected && s.checkboxActive]}>
                        {isSelected && <Text style={s.checkboxIcon}>✓</Text>}
                      </View>
                    ) : (
                      <View style={[s.rankCircle, isLowest && { backgroundColor: PatientTheme.primary }]}>
                        <Text style={[s.rankText, isLowest && { color: SharedColors.white }]}>{index + 1}</Text>
                      </View>
                    )}
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>
                        {(q.dentistName || "D").split(" ").pop()?.[0] || "D"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.dentistName}>{q.dentistName || "Doctor"}</Text>
                      <Text style={s.clinicName}>{q.clinicName || "Clinic"}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[s.price, isLowest && { color: PatientTheme.primary }]}>
                        ${(q.totalPrice || 0).toLocaleString()}
                      </Text>
                      <Text style={{ fontSize: 10, color: SharedColors.slateLight }}>≈ {formatKRW(q.totalPrice || 0)}</Text>
                    </View>
                  </View>

                  {/* Meta row */}
                  <View style={s.metaRow}>
                    <View style={s.metaItem}>
                      <Text style={s.metaValue}>{q.rating || "4.8"}</Text>
                      <Text style={s.metaLabel}>Rating</Text>
                    </View>
                    <View style={s.metaDivider} />
                    <View style={s.metaItem}>
                      <Text style={s.metaValue}>{q.reviewCount || 0}</Text>
                      <Text style={s.metaLabel}>Reviews</Text>
                    </View>
                    <View style={s.metaDivider} />
                    <View style={s.metaItem}>
                      <Text style={s.metaValue}>{q.treatments?.length || 0}</Text>
                      <Text style={s.metaLabel}>Treatments</Text>
                    </View>
                    <View style={s.metaDivider} />
                    <View style={s.metaItem}>
                      <Text style={s.metaValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{q.duration || "–"}</Text>
                      <Text style={s.metaLabel}>Duration</Text>
                    </View>
                  </View>

                  {/* View button */}
                  <View style={s.cardFooter}>
                    <View style={s.viewBtn}>
                      <Text style={s.viewBtnText}>View Details</Text>
                      <View style={s.viewBtnChevron} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Compare bar — pinned to bottom */}
      {quotes.length >= 2 && (
        <View style={s.compareBar}>
          <TouchableOpacity
            style={[s.compareBtn, compareMode && s.compareBtnActive]}
            onPress={() => { setCompareMode(!compareMode); setSelectedIds([]); }}
          >
            <Text style={[s.compareBtnText, compareMode && s.compareBtnTextActive]}>
              {compareMode ? "Cancel" : "⚖ Compare"}
            </Text>
          </TouchableOpacity>
          {compareMode && selectedIds.length >= 2 && (
            <TouchableOpacity style={s.compareGoBtn} onPress={goCompare}>
              <Text style={s.compareGoBtnText}>Compare {selectedIds.length} →</Text>
            </TouchableOpacity>
          )}
          {compareMode && (
            <Text style={s.compareHint}>Select 2-3 quotes</Text>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },

  /* Header */
  header: {
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18,
  },
  headerRow: {
    flexDirection: "row", alignItems: "center",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: SharedColors.white, fontWeight: "600", marginTop: -2 },
  headerCenter: { flex: 1, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: SharedColors.white },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  mapBtn: {
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14, paddingVertical: 8,
  },
  mapBtnText: { fontSize: 13, fontWeight: "600", color: SharedColors.white },

  /* Sort row */
  sortWrapper: { backgroundColor: SharedColors.bg },
  sortRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: SharedColors.bg,
  },
  sortLabel: {
    fontSize: 12, fontWeight: "600", color: SharedColors.slate, marginRight: 2,
  },
  sortBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 5,
    paddingVertical: 8, borderRadius: 10,
    backgroundColor: SharedColors.white,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  sortBtnActive: {
    backgroundColor: PatientTheme.primary, borderColor: PatientTheme.primary,
  },
  sortBtnText: {
    fontSize: 12, fontWeight: "600", color: SharedColors.slate,
  },
  sortBtnTextActive: {
    color: SharedColors.white,
  },
  sortArrows: {
    gap: 2, alignItems: "center",
  },
  sortTriUp: {
    width: 0, height: 0,
    borderLeftWidth: 3.5, borderRightWidth: 3.5, borderBottomWidth: 4.5,
    borderLeftColor: "transparent", borderRightColor: "transparent",
    borderBottomColor: "rgba(255,255,255,0.3)",
  },
  sortTriUpActive: {
    borderBottomColor: SharedColors.white,
  },
  sortTriDown: {
    width: 0, height: 0,
    borderLeftWidth: 3.5, borderRightWidth: 3.5, borderTopWidth: 4.5,
    borderLeftColor: "transparent", borderRightColor: "transparent",
    borderTopColor: "rgba(255,255,255,0.3)",
  },
  sortTriDownActive: {
    borderTopColor: SharedColors.white,
  },

  /* Compare — bottom bar */
  compareBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: SharedColors.white,
    borderTopWidth: 1, borderTopColor: SharedColors.border,
  },
  compareBtn: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: SharedColors.white, borderWidth: 1, borderColor: SharedColors.border,
  },
  compareBtnActive: {
    backgroundColor: SharedColors.redLight, borderColor: "#fca5a5",
  },
  compareBtnText: { fontSize: 12, fontWeight: "600", color: SharedColors.slate },
  compareBtnTextActive: { color: "#dc2626" },
  compareGoBtn: {
    backgroundColor: PatientTheme.primary, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  compareGoBtnText: { fontSize: 12, fontWeight: "700", color: SharedColors.white },
  compareHint: { fontSize: 11, color: SharedColors.slateLight, marginLeft: "auto" },

  checkbox: {
    width: 26, height: 26, borderRadius: 8,
    borderWidth: 2, borderColor: SharedColors.border,
    backgroundColor: SharedColors.white, alignItems: "center", justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: PatientTheme.primary, borderColor: PatientTheme.primary,
  },
  checkboxIcon: { color: SharedColors.white, fontSize: 14, fontWeight: "700" },
  quoteCardSelected: {
    borderColor: PatientTheme.primary, borderWidth: 2,
  },

  content: { padding: 20, gap: 12, paddingBottom: 40 },

  /* Waiting state */
  waitingCard: {
    backgroundColor: SharedColors.white, borderRadius: 20, padding: 28,
    alignItems: "center", borderWidth: 1, borderColor: SharedColors.border,
  },
  waitingIconWrap: { marginBottom: 20 },
  waitingIconRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: SharedColors.amberLight, borderWidth: 2, borderColor: "rgba(245,158,11,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  waitingIcon: { fontSize: 32 },
  waitingTitle: { fontSize: 19, fontWeight: "700", color: SharedColors.navy, marginBottom: 8 },
  waitingDesc: {
    fontSize: 14, color: SharedColors.slate, textAlign: "center",
    lineHeight: 22, marginBottom: 24,
  },

  /* Timeline */
  timeline: { width: "100%", gap: 0, marginBottom: 20 },
  timelineStep: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  stepDotDone: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: PatientTheme.primary,
    alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  stepDotDoneText: { color: SharedColors.white, fontSize: 13, fontWeight: "700" },
  stepDotActive: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: SharedColors.amberLight, borderWidth: 2.5, borderColor: SharedColors.amber,
    marginTop: 2,
  },
  stepDotPending: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: SharedColors.bg, borderWidth: 2, borderColor: SharedColors.border,
    alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  stepDotPendingText: { fontSize: 12, fontWeight: "600", color: SharedColors.slateLight },
  stepLine: {
    position: "absolute", left: 12.5, top: 32, width: 3, height: 24,
    backgroundColor: PatientTheme.primaryLight, borderRadius: 2,
  },
  stepContent: { flex: 1, paddingBottom: 20 },
  stepTitleDone: { fontSize: 14, fontWeight: "600", color: PatientTheme.primary },
  stepTitleActive: { fontSize: 14, fontWeight: "600", color: SharedColors.amber },
  stepTitlePending: { fontSize: 14, color: SharedColors.slateLight },
  stepSub: { fontSize: 12, color: SharedColors.slateLight, marginTop: 2 },

  tipBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    width: "100%", backgroundColor: PatientTheme.primaryLight, borderRadius: 12,
    padding: 14,
  },
  tipDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: PatientTheme.primary,
  },
  tipText: { fontSize: 13, color: PatientTheme.primary, fontWeight: "500" },

  /* Range bar */
  rangeBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: SharedColors.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  rangeLabel: { fontSize: 12, fontWeight: "500", color: SharedColors.slate },
  rangeValue: { fontSize: 14, fontWeight: "700", color: SharedColors.navy },

  /* Quote card */
  quoteCard: {
    backgroundColor: SharedColors.white, borderRadius: 18, padding: 18,
    gap: 14,
    borderWidth: 1, borderColor: SharedColors.border,
    shadowColor: SharedColors.navy, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
  },
  quoteCardHighlight: {
    borderColor: "rgba(74,0,128,0.25)",
    shadowColor: PatientTheme.primary, shadowOpacity: 0.08,
  },

  bestBadge: {
    alignSelf: "flex-start",
    backgroundColor: PatientTheme.primaryLight, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  bestBadgeText: { fontSize: 11, fontWeight: "700", color: PatientTheme.primary },

  cardTop: {
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  rankCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: SharedColors.bg, alignItems: "center", justifyContent: "center",
  },
  rankText: { fontSize: 12, fontWeight: "700", color: SharedColors.slate },
  avatar: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: PatientTheme.primaryLight, alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "700", color: PatientTheme.primary },
  dentistName: { fontSize: 15, fontWeight: "700", color: SharedColors.navy },
  clinicName: { fontSize: 12, color: SharedColors.slate, marginTop: 1 },
  price: { fontSize: 18, fontWeight: "800", color: SharedColors.navy },

  metaRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: SharedColors.bg, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 8,
  },
  metaItem: { flex: 1, alignItems: "center", paddingHorizontal: 2 },
  metaValue: { fontSize: 13, fontWeight: "700", color: SharedColors.navy, textAlign: "center" },
  metaLabel: { fontSize: 10, color: SharedColors.slateLight, marginTop: 2 },
  metaDivider: { width: 1, height: 24, backgroundColor: SharedColors.border },

  cardFooter: { alignItems: "flex-end" },
  viewBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: PatientTheme.primaryLight, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  viewBtnText: { fontSize: 12, fontWeight: "600", color: PatientTheme.primary },
  viewBtnChevron: {
    width: 6, height: 6,
    borderTopWidth: 1.5, borderRightWidth: 1.5,
    borderColor: PatientTheme.primary,
    transform: [{ rotate: "45deg" }],
  },
});
