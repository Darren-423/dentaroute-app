import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Booking, store } from "../../lib/store";

import { PatientTheme, SharedColors } from "../../constants/theme";
const TAGS = [
  { label: "On time", emoji: "⏰" },
  { label: "Friendly driver", emoji: "😊" },
  { label: "Clean vehicle", emoji: "✨" },
  { label: "Comfortable ride", emoji: "🛋️" },
  { label: "Easy to find", emoji: "📍" },
  { label: "Helpful with luggage", emoji: "🧳" },
];

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

export default function PickupReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  /* ── Animations ── */
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const starAnims = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(0))).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;
      const bk = await store.getBooking(bookingId);
      if (bk) setBooking(bk);
      setLoading(false);
    };
    load();
  }, [bookingId]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    starAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 200 + i * 80,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }).start();
    });
  }, []);

  const toggleTag = (label: string) => {
    setSelectedTags((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
    );
  };

  const handleSubmit = async () => {
    if (!booking || rating === 0) return;
    setSubmitting(true);

    await store.updateBooking(booking.id, {
      pickupReview: {
        rating,
        tags: selectedTags,
        comment: comment.trim() || undefined,
        createdAt: new Date().toISOString(),
      },
    });

    setSubmitting(false);
    setSubmitted(true);

    Animated.timing(checkAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      router.replace(`/patient/hotel-arrived?bookingId=${bookingId}` as any);
    }, 1200);
  };

  const handleSkip = () => {
    router.replace(`/patient/hotel-arrived?bookingId=${bookingId}` as any);
  };

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={SharedColors.slate} size="large" />
      </View>
    );
  }

  /* ── Success overlay ── */
  if (submitted) {
    return (
      <View style={s.container}>
        <LinearGradient colors={[...PatientTheme.gradient]} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Animated.View style={{
            opacity: checkAnim,
            transform: [{ scale: checkAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
          }}>
            <View style={s.successCircle}>
              <Text style={{ fontSize: 48 }}>🎉</Text>
            </View>
            <Text style={s.successTitle}>Thank you!</Text>
            <Text style={s.successSub}>Your feedback helps us improve</Text>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <LinearGradient colors={[...PatientTheme.gradient]} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={handleSkip}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={s.backArrow}>{"<"}</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Rate Pickup Service</Text>
            <Text style={s.headerSub}>{booking?.clinicName}</Text>
          </View>
          <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Hero icon */}
          <View style={s.heroWrap}>
            <View style={s.heroCircle}>
              <Text style={{ fontSize: 44 }}>🚗</Text>
            </View>
            <Text style={s.heroTitle}>How was your pickup?</Text>
            <Text style={s.heroSub}>
              Your driver brought you safely to your hotel.{"\n"}Let us know how it went!
            </Text>
          </View>

          {/* Star rating */}
          <View style={s.ratingCard}>
            <Text style={s.ratingLabel}>Overall Experience</Text>
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= rating;
                return (
                  <Animated.View
                    key={star}
                    style={{
                      opacity: starAnims[star - 1],
                      transform: [{
                        scale: starAnims[star - 1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 1],
                        }),
                      }],
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => setRating(star)}
                      activeOpacity={0.6}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                      <View style={[s.starBtn, filled && s.starBtnFilled]}>
                        <Text style={s.starIcon}>{filled ? "★" : "☆"}</Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
            {rating > 0 && (
              <Text style={s.ratingText}>{STAR_LABELS[rating]}</Text>
            )}
          </View>

          {/* Quick feedback tags */}
          <View style={s.tagsCard}>
            <Text style={s.tagsLabel}>What stood out?</Text>
            <Text style={s.tagsSub}>Select all that apply</Text>
            <View style={s.tagsGrid}>
              {TAGS.map((tag) => {
                const selected = selectedTags.includes(tag.label);
                return (
                  <TouchableOpacity
                    key={tag.label}
                    style={[s.tagPill, selected && s.tagPillSelected]}
                    onPress={() => toggleTag(tag.label)}
                    activeOpacity={0.6}
                  >
                    <Text style={s.tagEmoji}>{tag.emoji}</Text>
                    <Text style={[s.tagLabel, selected && s.tagLabelSelected]}>
                      {tag.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Comment */}
          <View style={s.commentCard}>
            <Text style={s.commentLabel}>Anything else?</Text>
            <TextInput
              style={s.commentInput}
              placeholder="Share your experience... (optional)"
              placeholderTextColor={SharedColors.slateLight}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.submitBtn, rating === 0 && s.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={rating === 0 || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={SharedColors.white} size="small" />
            ) : (
              <Text style={s.submitBtnText}>Submit Review</Text>
            )}
          </TouchableOpacity>

          {rating === 0 && (
            <Text style={s.submitHint}>Tap a star to enable submission</Text>
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },

  /* Header */
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 20, color: SharedColors.white, fontWeight: "600" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: SharedColors.white, letterSpacing: 0.1 },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  skipText: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.6)" },

  content: { padding: 20, gap: 16 },

  /* Hero */
  heroWrap: { alignItems: "center", paddingVertical: 8 },
  heroCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: PatientTheme.accentSoft, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: PatientTheme.primaryMid, marginBottom: 16,
  },
  heroTitle: { fontSize: 22, fontWeight: "800", color: SharedColors.navy, marginBottom: 6 },
  heroSub: {
    fontSize: 14, color: SharedColors.slate, textAlign: "center", lineHeight: 21,
  },

  /* Rating card */
  ratingCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 24,
    alignItems: "center", borderWidth: 1, borderColor: SharedColors.border,
  },
  ratingLabel: { fontSize: 15, fontWeight: "700", color: SharedColors.navy, marginBottom: 18 },
  starsRow: { flexDirection: "row", gap: 10 },
  starBtn: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: SharedColors.bg, alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: SharedColors.border,
  },
  starBtnFilled: {
    backgroundColor: SharedColors.amberLight,
    borderColor: SharedColors.amber,
  },
  starIcon: { fontSize: 26, color: SharedColors.amber },
  ratingText: {
    fontSize: 14, fontWeight: "700", color: PatientTheme.primary, marginTop: 14,
    letterSpacing: 0.3,
  },

  /* Tags */
  tagsCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  tagsLabel: { fontSize: 15, fontWeight: "700", color: SharedColors.navy, marginBottom: 2 },
  tagsSub: { fontSize: 12, color: SharedColors.slateLight, marginBottom: 14 },
  tagsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: SharedColors.bg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1.5, borderColor: SharedColors.border,
  },
  tagPillSelected: {
    backgroundColor: PatientTheme.accentSoft,
    borderColor: PatientTheme.primary,
  },
  tagEmoji: { fontSize: 15 },
  tagLabel: { fontSize: 13, fontWeight: "500", color: SharedColors.slate },
  tagLabelSelected: { color: PatientTheme.primary, fontWeight: "600" },

  /* Comment */
  commentCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  commentLabel: { fontSize: 15, fontWeight: "700", color: SharedColors.navy, marginBottom: 12 },
  commentInput: {
    backgroundColor: SharedColors.bg, borderRadius: 12, padding: 14,
    fontSize: 14, color: SharedColors.text, minHeight: 80,
    borderWidth: 1, borderColor: SharedColors.border, lineHeight: 20,
  },

  /* Submit */
  submitBtn: {
    backgroundColor: PatientTheme.primary, borderRadius: 14,
    paddingVertical: 17, alignItems: "center",
    shadowColor: PatientTheme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnDisabled: {
    backgroundColor: SharedColors.faint,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: SharedColors.white, letterSpacing: 0.2 },
  submitHint: {
    fontSize: 12, color: SharedColors.slateLight, textAlign: "center", marginTop: 6,
  },

  /* Success */
  successCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: 24,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.15)",
  },
  successTitle: {
    fontSize: 28, fontWeight: "800", color: SharedColors.white, textAlign: "center",
  },
  successSub: {
    fontSize: 15, color: "rgba(255,255,255,0.6)", textAlign: "center", marginTop: 6,
  },
});
