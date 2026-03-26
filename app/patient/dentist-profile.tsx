import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View
} from "react-native";
import { DentistQuote, DoctorProfile, Review, store } from "../../lib/store";

import { PatientTheme, SharedColors } from "../../constants/theme";
export default function DentistProfileScreen() {
  const { dentistName, clinicName, quoteId, caseId } = useLocalSearchParams<{
    dentistName: string; clinicName: string; quoteId?: string; caseId?: string;
  }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [quote, setQuote] = useState<DentistQuote | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [avgResponseTime, setAvgResponseTime] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const r = await store.getReviewsForDentist(dentistName || "");
      setReviews(r);
      if (quoteId && caseId) {
        const quotes = await store.getQuotesForCase(caseId);
        const q = quotes.find((qt) => qt.id === quoteId);
        if (q) setQuote(q);
      }
      // Load doctor profile for certifications & before/after photos
      const dp = await store.getDoctorProfile();
      if (dp) {
        setDoctorProfile(dp);
      }
      // Load average response time
      const rt = await store.getAverageResponseTime(dentistName || "");
      setAvgResponseTime(rt);
      setLoading(false);
    };
    load();
  }, [dentistName]);

  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  // Certification data: prefer quote data (available for all dentists), fallback to doctor profile
  const licenseVerified = quote?.licenseVerified ?? doctorProfile?.licenseVerified ?? false;
  const certifications = quote?.certifications ?? doctorProfile?.certifications ?? [];
  const beforeAfterPhotos = doctorProfile?.beforeAfterPhotos ?? [];
  const screenW = Dimensions.get("window").width;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : quote?.rating?.toFixed(1) || "4.8";
  const reviewCount = reviews.length || quote?.reviewCount || 0;

  const initial = (dentistName || "D").split(" ").pop()?.[0] || "D";

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={PatientTheme.primary} size="large" />
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
                  <View style={{ backgroundColor: "#f1f5f9", borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: SharedColors.border }}><Text style={{ fontSize: 11, color: SharedColors.slate, lineHeight: 16 }}>Dentist profiles are self-reported. Concourse performs basic credential checks but does not guarantee the accuracy of all qualifications.</Text></View>

          {/* Avatar + Name */}
        <View style={s.profileSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <View style={s.nameRow}>
            <Text style={s.name}>{dentistName}</Text>
            {licenseVerified && (
              <View style={s.verifiedBadge}>
                <Text style={s.verifiedIcon}>✓</Text>
              </View>
            )}
          </View>
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
          <View style={s.statCard}>
            <Text style={s.statIcon}>⏱</Text>
            <Text style={s.statNum}>
              {avgResponseTime !== null
                ? avgResponseTime < 60
                  ? `${avgResponseTime}m`
                  : `${Math.round(avgResponseTime / 60)}h`
                : "—"}
            </Text>
            <Text style={s.statLabel}>Avg. Response</Text>
          </View>
        </View>

        {/* Certifications */}
        {certifications.length > 0 && (
          <View style={s.certSection}>
            <Text style={s.certTitle}>Certifications</Text>
            <View style={s.certList}>
              {certifications.map((cert, i) => (
                <View key={i} style={s.certCard}>
                  <Text style={s.certIcon}>🛡️</Text>
                  <Text style={s.certText}>{cert}</Text>
                  {cert === "License Verified" && licenseVerified && (
                    <View style={s.certCheck}>
                      <Text style={s.certCheckIcon}>✓</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

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

        {/* Before & After Gallery */}
        {beforeAfterPhotos.length > 0 && (
          <View style={s.gallerySection}>
            <Text style={s.galleryTitle}>Before & After</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.galleryScroll}>
              {beforeAfterPhotos.map((photo, i) => (
                <TouchableOpacity key={i} style={s.galleryCard} onPress={() => setGalleryIndex(i)} activeOpacity={0.85}>
                  <View style={s.galleryImages}>
                    <View style={s.galleryImgWrap}>
                      <Image source={{ uri: photo.before }} style={s.galleryImg} />
                      <View style={s.galleryLabel}><Text style={s.galleryLabelText}>Before</Text></View>
                    </View>
                    <View style={s.galleryArrow}><Text style={s.galleryArrowText}>→</Text></View>
                    <View style={s.galleryImgWrap}>
                      <Image source={{ uri: photo.after }} style={s.galleryImg} />
                      <View style={[s.galleryLabel, s.galleryLabelAfter]}><Text style={s.galleryLabelText}>After</Text></View>
                    </View>
                  </View>
                  <Text style={s.galleryTreatment}>{photo.treatment}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Before/After Fullscreen Modal */}
        {galleryIndex !== null && beforeAfterPhotos[galleryIndex] && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setGalleryIndex(null)}>
            <View style={s.modalOverlay}>
              <TouchableOpacity style={s.modalClose} onPress={() => setGalleryIndex(null)}>
                <Text style={s.modalCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={s.modalTreatment}>{beforeAfterPhotos[galleryIndex].treatment}</Text>
              <ScrollView
                horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.modalScroll}
              >
                <View style={[s.modalPage, { width: screenW }]}>
                  <Text style={s.modalLabel}>Before</Text>
                  <Image source={{ uri: beforeAfterPhotos[galleryIndex].before }} style={s.modalImg} resizeMode="contain" />
                </View>
                <View style={[s.modalPage, { width: screenW }]}>
                  <Text style={[s.modalLabel, { color: SharedColors.green }]}>After</Text>
                  <Image source={{ uri: beforeAfterPhotos[galleryIndex].after }} style={s.modalImg} resizeMode="contain" />
                </View>
              </ScrollView>
              <View style={s.modalNav}>
                {galleryIndex > 0 && (
                  <TouchableOpacity style={s.modalNavBtn} onPress={() => setGalleryIndex(galleryIndex - 1)}>
                    <Text style={s.modalNavBtnText}>‹ Prev</Text>
                  </TouchableOpacity>
                )}
                <Text style={s.modalNavCount}>{galleryIndex + 1} / {beforeAfterPhotos.length}</Text>
                {galleryIndex < beforeAfterPhotos.length - 1 && (
                  <TouchableOpacity style={s.modalNavBtn} onPress={() => setGalleryIndex(galleryIndex + 1)}>
                    <Text style={s.modalNavBtnText}>Next ›</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Modal>
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
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: {
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: SharedColors.border, backgroundColor: SharedColors.white,
    flexDirection: "row", alignItems: "center", gap: 16,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.05)", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 24, color: SharedColors.navy, fontWeight: "600", marginTop: -2 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: SharedColors.navy },

  content: { padding: 20, gap: 16, paddingBottom: 40 },

  // Profile
  profileSection: { alignItems: "center", gap: 6 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  verifiedBadge: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: SharedColors.blue,
    alignItems: "center", justifyContent: "center",
  },
  verifiedIcon: { color: SharedColors.white, fontSize: 13, fontWeight: "700" },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: PatientTheme.primary,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  avatarText: { color: SharedColors.white, fontSize: 36, fontWeight: "700" },
  name: { fontSize: 24, fontWeight: "700", color: SharedColors.navy },
  clinic: { fontSize: 14, color: SharedColors.slate },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  ratingNum: { fontSize: 16, fontWeight: "700", color: SharedColors.navy },
  ratingCount: { fontSize: 13, color: SharedColors.slateLight },
  ratingArrow: { fontSize: 12, color: PatientTheme.primary, fontWeight: "600", marginLeft: 4 },

  // Stats
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, backgroundColor: SharedColors.white, borderRadius: 14, padding: 14,
    alignItems: "center", borderWidth: 1, borderColor: SharedColors.border,
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statNum: { fontSize: 20, fontWeight: "800", color: PatientTheme.primary },
  statLabel: { fontSize: 11, color: SharedColors.slate, marginTop: 2 },

  // Certifications
  certSection: { gap: 10 },
  certTitle: { fontSize: 15, fontWeight: "700", color: SharedColors.navy },
  certList: { gap: 8 },
  certCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#eff6ff", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#bfdbfe",
  },
  certIcon: { fontSize: 18 },
  certText: { fontSize: 13, fontWeight: "600", color: "#1e40af", flex: 1 },
  certCheck: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: SharedColors.blue,
    alignItems: "center", justifyContent: "center",
  },
  certCheckIcon: { color: SharedColors.white, fontSize: 10, fontWeight: "700" },

  // Info
  infoCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: SharedColors.border, gap: 12,
  },
  infoCardTitle: { fontSize: 15, fontWeight: "700", color: SharedColors.navy },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoIcon: { fontSize: 16 },
  infoText: { fontSize: 13, color: SharedColors.slate, flex: 1 },

  // Before/After Gallery
  gallerySection: { gap: 10 },
  galleryTitle: { fontSize: 15, fontWeight: "700", color: SharedColors.navy },
  galleryScroll: { gap: 12 },
  galleryCard: {
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: SharedColors.border, width: 260,
  },
  galleryImages: { flexDirection: "row", alignItems: "center", gap: 6 },
  galleryImgWrap: { flex: 1, position: "relative" },
  galleryImg: { width: "100%", height: 100, borderRadius: 10, backgroundColor: SharedColors.border },
  galleryLabel: {
    position: "absolute", top: 6, left: 6,
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  galleryLabelAfter: { backgroundColor: "rgba(22,163,74,0.8)" },
  galleryLabelText: { fontSize: 9, fontWeight: "700", color: SharedColors.white },
  galleryArrow: { paddingHorizontal: 2 },
  galleryArrowText: { fontSize: 16, color: SharedColors.slateLight, fontWeight: "700" },
  galleryTreatment: { fontSize: 12, fontWeight: "600", color: SharedColors.navy, marginTop: 8, textAlign: "center" },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center", alignItems: "center",
  },
  modalClose: {
    position: "absolute", top: 56, right: 20, zIndex: 10,
    width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  modalCloseText: { color: SharedColors.white, fontSize: 18, fontWeight: "600" },
  modalTreatment: { color: SharedColors.white, fontSize: 16, fontWeight: "700", marginBottom: 16 },
  modalScroll: {},
  modalPage: { alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  modalLabel: { color: SharedColors.white, fontSize: 14, fontWeight: "700", marginBottom: 10 },
  modalImg: { width: "100%", height: 300, borderRadius: 16 },
  modalNav: {
    flexDirection: "row", alignItems: "center", gap: 20, marginTop: 20,
  },
  modalNavBtn: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  modalNavBtnText: { color: SharedColors.white, fontSize: 14, fontWeight: "600" },
  modalNavCount: { color: "rgba(255,255,255,0.6)", fontSize: 13 },

  // Reviews
  reviewsSection: { gap: 10 },
  reviewsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewsTitle: { fontSize: 15, fontWeight: "700", color: SharedColors.navy },
  reviewsSeeAll: { fontSize: 13, color: PatientTheme.primary, fontWeight: "600" },
  noReviews: {
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 24,
    borderWidth: 1, borderColor: SharedColors.border, alignItems: "center",
  },
  noReviewsText: { fontSize: 13, color: SharedColors.slateLight },
  reviewCard: {
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: SharedColors.border, gap: 8,
  },
  reviewTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: PatientTheme.primaryLight, alignItems: "center", justifyContent: "center",
  },
  reviewAvatarText: { color: PatientTheme.primary, fontSize: 13, fontWeight: "700" },
  reviewName: { fontSize: 13, fontWeight: "600", color: SharedColors.navy },
  reviewTitle: { fontSize: 14, fontWeight: "700", color: SharedColors.navy },
  reviewComment: { fontSize: 12, color: SharedColors.slate, lineHeight: 17 },

  // Actions
  actions: { gap: 10 },
  actionPrimary: {
    backgroundColor: PatientTheme.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: "center",
  },
  actionPrimaryText: { color: SharedColors.white, fontSize: 15, fontWeight: "600" },
  actionSecondary: {
    backgroundColor: SharedColors.white, borderRadius: 14,
    paddingVertical: 15, alignItems: "center",
    borderWidth: 1, borderColor: SharedColors.border,
  },
  actionSecondaryText: { color: SharedColors.navy, fontSize: 15, fontWeight: "600" },
});
