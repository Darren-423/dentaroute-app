import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View
} from "react-native";
import { DentistQuote, Review, store } from "../../lib/store";

const T = {
  teal: "#4A0080", tealMid: "#5C10A0", tealLight: "#f0e6f6",
  navy: "#0f172a", slate: "#64748b", slateLight: "#94a3b8",
  border: "#e2e8f0", bg: "#f8fafc", white: "#fff",
  gold: "#f59e0b",
};

export default function DentistProfileScreen() {
  const { dentistName, clinicName, quoteId, caseId } = useLocalSearchParams<{
    dentistName: string; clinicName: string; quoteId?: string; caseId?: string;
  }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [quote, setQuote] = useState<DentistQuote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const r = await store.getReviewsForDentist(dentistName || "");
      setReviews(r);
      if (quoteId && caseId) {
        const quotes = await store.getQuotesForCase(caseId);
        const q = quotes.find((qt) => qt.id === quoteId);
        if (q) setQuote(q);
      }
      setLoading(false);
    };
    load();
  }, [dentistName]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : quote?.rating?.toFixed(1) || "4.8";
  const reviewCount = reviews.length || quote?.reviewCount || 0;

  const initial = (dentistName || "D").split(" ").pop()?.[0] || "D";

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={T.teal} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Dentist Profile</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Avatar + Name */}
        <View style={s.profileSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <Text style={s.name}>{dentistName}</Text>
          <Text style={s.clinic}>{clinicName}</Text>

          {/* Rating */}
          <TouchableOpacity
            style={s.ratingRow}
            onPress={() => router.push({
              pathname: "/patient/dentist-reviews" as any,
              params: { dentistName, clinicName, rating: avgRating, reviewCount: String(reviewCount) },
            })}
          >
            <Text style={{ fontSize: 18 }}>⭐</Text>
            <Text style={s.ratingNum}>{avgRating}</Text>
            <Text style={s.ratingCount}>({reviewCount} reviews)</Text>
            <Text style={s.ratingArrow}>See all →</Text>
          </TouchableOpacity>
        </View>

        {/* Quick stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statIcon}>⭐</Text>
            <Text style={s.statNum}>{avgRating}</Text>
            <Text style={s.statLabel}>Rating</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statIcon}>📝</Text>
            <Text style={s.statNum}>{reviewCount}</Text>
            <Text style={s.statLabel}>Reviews</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statIcon}>🎓</Text>
            <Text style={s.statNum}>{quote?.rating ? "12+" : "—"}</Text>
            <Text style={s.statLabel}>Years exp.</Text>
          </View>
        </View>

        {/* Clinic info from quote */}
        {quote && (
          <View style={s.infoCard}>
            <Text style={s.infoCardTitle}>Clinic Information</Text>
            <View style={s.infoRow}>
              <Text style={s.infoIcon}>📍</Text>
              <Text style={s.infoText}>{quote.address || quote.location}</Text>
            </View>
            {quote.duration && (
              <View style={s.infoRow}>
                <Text style={s.infoIcon}>📅</Text>
                <Text style={s.infoText}>Typical treatment: {quote.duration}</Text>
              </View>
            )}
            {quote.totalPrice && (
              <View style={s.infoRow}>
                <Text style={s.infoIcon}>💰</Text>
                <Text style={s.infoText}>Quote: ${quote.totalPrice.toLocaleString()}</Text>
              </View>
            )}
          </View>
        )}

        {/* Recent reviews */}
        <View style={s.reviewsSection}>
          <View style={s.reviewsHeader}>
            <Text style={s.reviewsTitle}>Recent Reviews</Text>
            <TouchableOpacity onPress={() => router.push({
              pathname: "/patient/dentist-reviews" as any,
              params: { dentistName, clinicName, rating: avgRating, reviewCount: String(reviewCount) },
            })}>
              <Text style={s.reviewsSeeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {reviews.length === 0 ? (
            <View style={s.noReviews}>
              <Text style={s.noReviewsText}>No reviews yet</Text>
            </View>
          ) : (
            reviews.slice(0, 2).map((r) => (
              <View key={r.id} style={s.reviewCard}>
                <View style={s.reviewTop}>
                  <View style={s.reviewAvatar}>
                    <Text style={s.reviewAvatarText}>{r.patientName[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.reviewName}>{r.patientName}</Text>
                    <Text style={{ fontSize: 12 }}>{"⭐".repeat(r.rating)}</Text>
                  </View>
                </View>
                <Text style={s.reviewTitle}>{r.title}</Text>
                <Text style={s.reviewComment} numberOfLines={2}>{r.comment}</Text>
              </View>
            ))
          )}
        </View>

        {/* Action buttons */}
        <View style={s.actions}>
          {quote && (
            <TouchableOpacity
              style={s.actionPrimary}
              onPress={() => router.push({
                pathname: "/patient/quote-detail" as any,
                params: { quoteId: quote.id, caseId: quote.caseId },
              })}
            >
              <Text style={s.actionPrimaryText}>View Quote Details →</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={s.actionSecondary}
            onPress={() => router.push({
              pathname: "/patient/clinic-map" as any,
              params: { caseId: caseId || quote?.caseId, highlightQuoteId: quoteId || quote?.id },
            })}
          >
            <Text style={s.actionSecondaryText}>🗺 View on Map</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: {
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.white,
    flexDirection: "row", alignItems: "center", gap: 16,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.05)", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 24, color: "#0f172a", fontWeight: "600", marginTop: -2 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: T.navy },

  content: { padding: 20, gap: 16, paddingBottom: 40 },

  // Profile
  profileSection: { alignItems: "center", gap: 6 },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: T.teal,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  avatarText: { color: T.white, fontSize: 36, fontWeight: "700" },
  name: { fontSize: 24, fontWeight: "700", color: T.navy },
  clinic: { fontSize: 14, color: T.slate },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  ratingNum: { fontSize: 16, fontWeight: "700", color: T.navy },
  ratingCount: { fontSize: 13, color: T.slateLight },
  ratingArrow: { fontSize: 12, color: T.teal, fontWeight: "600", marginLeft: 4 },

  // Stats
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, backgroundColor: T.white, borderRadius: 14, padding: 14,
    alignItems: "center", borderWidth: 1, borderColor: T.border,
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statNum: { fontSize: 20, fontWeight: "800", color: T.teal },
  statLabel: { fontSize: 11, color: T.slate, marginTop: 2 },

  // Info
  infoCard: {
    backgroundColor: T.white, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: T.border, gap: 12,
  },
  infoCardTitle: { fontSize: 15, fontWeight: "700", color: T.navy },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoIcon: { fontSize: 16 },
  infoText: { fontSize: 13, color: T.slate, flex: 1 },

  // Reviews
  reviewsSection: { gap: 10 },
  reviewsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewsTitle: { fontSize: 15, fontWeight: "700", color: T.navy },
  reviewsSeeAll: { fontSize: 13, color: T.teal, fontWeight: "600" },
  noReviews: {
    backgroundColor: T.white, borderRadius: 14, padding: 24,
    borderWidth: 1, borderColor: T.border, alignItems: "center",
  },
  noReviewsText: { fontSize: 13, color: T.slateLight },
  reviewCard: {
    backgroundColor: T.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: T.border, gap: 8,
  },
  reviewTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: T.tealLight, alignItems: "center", justifyContent: "center",
  },
  reviewAvatarText: { color: T.teal, fontSize: 13, fontWeight: "700" },
  reviewName: { fontSize: 13, fontWeight: "600", color: T.navy },
  reviewTitle: { fontSize: 14, fontWeight: "700", color: T.navy },
  reviewComment: { fontSize: 12, color: T.slate, lineHeight: 17 },

  // Actions
  actions: { gap: 10 },
  actionPrimary: {
    backgroundColor: T.teal, borderRadius: 14,
    paddingVertical: 15, alignItems: "center",
  },
  actionPrimaryText: { color: T.white, fontSize: 15, fontWeight: "600" },
  actionSecondary: {
    backgroundColor: T.white, borderRadius: 14,
    paddingVertical: 15, alignItems: "center",
    borderWidth: 1, borderColor: T.border,
  },
  actionSecondaryText: { color: T.navy, fontSize: 15, fontWeight: "600" },
});
