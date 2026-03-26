import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { Review, store } from "../../lib/store";

import { PatientTheme, SharedColors } from "../../constants/theme";
const Stars = ({ rating, size = 14 }: { rating: number; size?: number }) => (
  <Text style={{ fontSize: size }}>
    {"⭐".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
  </Text>
);

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 60) return "1 month ago";
  return `${Math.floor(days / 30)} months ago`;
};

export default function DentistReviewsScreen() {
  const { dentistName, clinicName, rating, reviewCount } = useLocalSearchParams<{
    dentistName: string; clinicName: string; rating: string; reviewCount: string;
  }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const all = await store.getReviewsForDentist(dentistName || "");
      setReviews(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    };
    load();
  }, [dentistName]);

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : parseFloat(rating || "0");

  const avgTreatment = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.treatmentRating, 0) / reviews.length : 0;
  const avgClinic = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.clinicRating, 0) / reviews.length : 0;
  const avgComm = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.communicationRating, 0) / reviews.length : 0;

  const ratingDist = [5, 4, 3, 2, 1].map((n) => ({
    stars: n,
    count: reviews.filter((r) => Math.round(r.rating) === n).length,
  }));

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Reviews</Text>
        <Text style={s.subtitle}>{dentistName} · {clinicName}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={PatientTheme.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Summary card */}
          <View style={s.summaryCard}>
            <View style={s.summaryLeft}>
              <Text style={s.summaryRating}>{avgRating.toFixed(1)}</Text>
              <Stars rating={avgRating} size={18} />
              <Text style={s.summaryCount}>{reviews.length || reviewCount} review{reviews.length !== 1 ? "s" : ""}</Text>
            </View>
            <View style={s.summaryRight}>
              {ratingDist.map((d) => (
                <View key={d.stars} style={s.distRow}>
                  <Text style={s.distLabel}>{d.stars}</Text>
                  <View style={s.distBar}>
                    <View style={[s.distFill, { width: `${reviews.length > 0 ? (d.count / reviews.length) * 100 : 0}%` }]} />
                  </View>
                  <Text style={s.distCount}>{d.count}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Category averages */}
          {reviews.length > 0 && (
            <View style={s.catCard}>
              <View style={s.catRow}>
                <Text style={s.catLabel}>🦷 Treatment</Text>
                <Text style={s.catScore}>{avgTreatment.toFixed(1)}</Text>
              </View>
              <View style={s.catRow}>
                <Text style={s.catLabel}>🏥 Clinic</Text>
                <Text style={s.catScore}>{avgClinic.toFixed(1)}</Text>
              </View>
              <View style={s.catRow}>
                <Text style={s.catLabel}>💬 Communication</Text>
                <Text style={s.catScore}>{avgComm.toFixed(1)}</Text>
              </View>
            </View>
          )}

          {/* Reviews list */}
          {reviews.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>📝</Text>
              <Text style={s.emptyTitle}>No reviews yet</Text>
              <Text style={s.emptyDesc}>Be the first to review this dentist!</Text>
            </View>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={s.reviewCard}>
                <View style={s.reviewTop}>
                  <View style={s.reviewAvatar}>
                    <Text style={s.reviewAvatarText}>{r.patientName[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.reviewName}>{r.patientName}</Text>
                    <Text style={s.reviewDate}>{timeAgo(r.createdAt)}</Text>
                  </View>
                  <Stars rating={r.rating} size={14} />
                </View>
                <Text style={s.reviewTitle}>{r.title}</Text>
                <Text style={s.reviewComment}>{r.comment}</Text>
                {r.treatments.length > 0 && (
                  <View style={s.reviewTags}>
                    {r.treatments.slice(0, 3).map((t, i) => (
                      <View key={i} style={s.reviewTag}>
                        <Text style={s.reviewTagText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {/* Mini category ratings */}
                <View style={s.miniRatings}>
                  <Text style={s.miniRating}>🦷 {r.treatmentRating}</Text>
                  <Text style={s.miniRating}>🏥 {r.clinicRating}</Text>
                  <Text style={s.miniRating}>💬 {r.communicationRating}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: {
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 18,
    borderBottomWidth: 1, borderBottomColor: SharedColors.border, backgroundColor: SharedColors.white,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.05)", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  backArrow: { fontSize: 24, color: SharedColors.navy, fontWeight: "600", marginTop: -2 },
  title: { fontSize: 22, fontWeight: "700", color: SharedColors.navy, marginBottom: 4 },
  subtitle: { fontSize: 13, color: SharedColors.slate },

  content: { padding: 20, gap: 14, paddingBottom: 60 },

  // Summary
  summaryCard: {
    flexDirection: "row", backgroundColor: SharedColors.white, borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: SharedColors.border, gap: 20,
  },
  summaryLeft: { alignItems: "center", justifyContent: "center", gap: 4 },
  summaryRating: { fontSize: 40, fontWeight: "800", color: SharedColors.navy },
  summaryCount: { fontSize: 12, color: SharedColors.slate },
  summaryRight: { flex: 1, gap: 5, justifyContent: "center" },
  distRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  distLabel: { fontSize: 12, color: SharedColors.slate, width: 12, textAlign: "right" },
  distBar: { flex: 1, height: 6, backgroundColor: "#f1f5f9", borderRadius: 3, overflow: "hidden" },
  distFill: { height: "100%", backgroundColor: SharedColors.amber, borderRadius: 3 },
  distCount: { fontSize: 11, color: SharedColors.slateLight, width: 18 },

  // Categories
  catCard: {
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: SharedColors.border, gap: 10,
  },
  catRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  catLabel: { fontSize: 13, color: SharedColors.navy },
  catScore: { fontSize: 14, fontWeight: "700", color: PatientTheme.primary },

  // Empty
  emptyCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 32,
    borderWidth: 1, borderColor: SharedColors.border, alignItems: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: SharedColors.navy },
  emptyDesc: { fontSize: 13, color: SharedColors.slate, marginTop: 4 },

  // Review card
  reviewCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: SharedColors.border, gap: 10,
  },
  reviewTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: PatientTheme.primaryLight, alignItems: "center", justifyContent: "center",
  },
  reviewAvatarText: { color: PatientTheme.primary, fontSize: 14, fontWeight: "700" },
  reviewName: { fontSize: 13, fontWeight: "600", color: SharedColors.navy },
  reviewDate: { fontSize: 11, color: SharedColors.slateLight },
  reviewTitle: { fontSize: 15, fontWeight: "700", color: SharedColors.navy },
  reviewComment: { fontSize: 13, color: SharedColors.slate, lineHeight: 19 },
  reviewTags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  reviewTag: {
    backgroundColor: PatientTheme.primaryLight, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  reviewTagText: { fontSize: 11, fontWeight: "600", color: PatientTheme.primary },
  miniRatings: { flexDirection: "row", gap: 16 },
  miniRating: { fontSize: 12, color: SharedColors.slateLight },
});
