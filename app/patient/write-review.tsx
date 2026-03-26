import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from "react-native";
import { Booking, store } from "../../lib/store";

import { PatientTheme, SharedColors } from "../../constants/theme";
const StarRow = ({ rating, onRate, size = 32 }: { rating: number; onRate: (n: number) => void; size?: number }) => (
  <View style={{ flexDirection: "row", gap: 6 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <TouchableOpacity key={n} onPress={() => onRate(n)} activeOpacity={0.6}>
        <Text style={{ fontSize: size }}>{n <= rating ? "⭐" : "☆"}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const RATING_LABELS: Record<number, string> = {
  1: "Poor", 2: "Fair", 3: "Good", 4: "Very Good", 5: "Excellent",
};

export default function WriteReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [overallRating, setOverallRating] = useState(0);
  const [treatmentRating, setTreatmentRating] = useState(0);
  const [clinicRating, setClinicRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (bookingId) {
        const b = await store.getBooking(bookingId);
        setBooking(b);
        if (b) {
          const existing = await store.getReviewForBooking(bookingId);
          if (existing) setAlreadyReviewed(true);
        }
      }
    };
    load();
  }, [bookingId]);

  const isComplete = overallRating > 0 && treatmentRating > 0 && clinicRating > 0 && communicationRating > 0 && title.trim() && comment.trim().length >= 10;

  const handleSubmit = async () => {
    if (!isComplete || !booking) {
      setShowErrors(true);
      return;
    }
    setLoading(true);
    try {
      const profile = await store.getPatientProfile();
      await store.createReview({
        caseId: booking.caseId,
        bookingId: booking.id,
        dentistName: booking.dentistName,
        clinicName: booking.clinicName,
        patientName: profile?.fullName || "Patient",
        rating: overallRating,
        treatmentRating,
        clinicRating,
        communicationRating,
        title,
        comment,
        treatments: booking.visitDates.map((v) => v.description),
      });
      setSubmitted(true);
    } catch {
      Alert.alert("Error", "Failed to submit review.");
    } finally {
      setLoading(false);
    }
  };

  if (!booking) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={PatientTheme.primary} size="large" />
      </View>
    );
  }

  if (alreadyReviewed) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center", padding: 32 }]}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>✅</Text>
        <Text style={s.successTitle}>Already Reviewed</Text>
        <Text style={s.successDesc}>You've already left a review for this booking.</Text>
        <TouchableOpacity style={s.successBtn} onPress={() => router.back()}>
          <Text style={s.successBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center", padding: 32 }]}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>🎉</Text>
        <Text style={s.successTitle}>Thank You!</Text>
        <Text style={s.successDesc}>
          Your review helps other patients find great dental care in Korea.
        </Text>
        <View style={s.successCard}>
          <StarRow rating={overallRating} onRate={() => {}} size={28} />
          <Text style={s.successReviewTitle}>{title}</Text>
          <Text style={s.successReviewComment}>{comment}</Text>
        </View>
        <TouchableOpacity style={s.successBtn} onPress={() => router.replace("/patient/dashboard" as any)}>
          <Text style={s.successBtnText}>Go to Dashboard →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={[...PatientTheme.gradient]} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.title}>Leave a Review</Text>
            <Text style={s.subtitle}>Rate your experience with {booking.clinicName}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
                  <View style={{ backgroundColor: "#f1f5f9", borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: SharedColors.border }}><Text style={{ fontSize: 11, color: SharedColors.slate, lineHeight: 16 }}>Reviews are published publicly. Fraudulent reviews may result in account restrictions. Concourse does not verify the accuracy of reviews.</Text></View>

          {/* Doctor card */}
        <View style={s.doctorCard}>
          <View style={s.doctorAvatar}>
            <Text style={s.doctorAvatarText}>
              {booking.dentistName.split(" ").pop()?.[0] || "D"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.doctorName}>{booking.dentistName}</Text>
            <Text style={s.doctorClinic}>{booking.clinicName}</Text>
          </View>
        </View>

        {/* Overall Rating */}
        <View style={[s.ratingSection, showErrors && overallRating === 0 && s.errorBorder]}>
          <Text style={s.ratingSectionTitle}>Overall Experience</Text>
          <View style={s.ratingRow}>
            <StarRow rating={overallRating} onRate={setOverallRating} size={40} />
            {overallRating > 0 && (
              <Text style={[s.ratingLabel, overallRating >= 4 && { color: SharedColors.green }]}>
                {RATING_LABELS[overallRating]}
              </Text>
            )}
          </View>
          {showErrors && overallRating === 0 && <Text style={s.errorText}>Please select an overall rating</Text>}
        </View>

        {/* Category Ratings */}
        <View style={[s.categoriesCard, showErrors && (treatmentRating === 0 || clinicRating === 0 || communicationRating === 0) && s.errorBorder]}>
          <Text style={s.categoriesTitle}>Rate by Category</Text>

          <View style={s.categoryRow}>
            <View style={s.categoryLeft}>
              <Text style={s.categoryIcon}>🦷</Text>
              <Text style={[s.categoryLabel, showErrors && treatmentRating === 0 && { color: SharedColors.red }]}>Treatment Quality</Text>
            </View>
            <StarRow rating={treatmentRating} onRate={setTreatmentRating} size={24} />
          </View>

          <View style={s.categoryDivider} />

          <View style={s.categoryRow}>
            <View style={s.categoryLeft}>
              <Text style={s.categoryIcon}>🏥</Text>
              <Text style={[s.categoryLabel, showErrors && clinicRating === 0 && { color: SharedColors.red }]}>Clinic & Facilities</Text>
            </View>
            <StarRow rating={clinicRating} onRate={setClinicRating} size={24} />
          </View>

          <View style={s.categoryDivider} />

          <View style={s.categoryRow}>
            <View style={s.categoryLeft}>
              <Text style={s.categoryIcon}>💬</Text>
              <Text style={[s.categoryLabel, showErrors && communicationRating === 0 && { color: SharedColors.red }]}>Communication</Text>
            </View>
            <StarRow rating={communicationRating} onRate={setCommunicationRating} size={24} />
          </View>

          {showErrors && (treatmentRating === 0 || clinicRating === 0 || communicationRating === 0) && (
            <Text style={s.errorText}>Please rate all categories</Text>
          )}
        </View>

        {/* Review Title */}
        <View style={s.field}>
          <Text style={s.fieldLabel}>Review Title</Text>
          <TextInput
            style={[s.input, showErrors && !title.trim() && s.errorBorder]}
            placeholder="Summarize your experience"
            placeholderTextColor={SharedColors.slateLight}
            value={title}
            onChangeText={setTitle}
            maxLength={60}
          />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {showErrors && !title.trim() ? <Text style={s.errorText}>Please enter a title</Text> : <View />}
            <Text style={s.charCount}>{title.length}/60</Text>
          </View>
        </View>

        {/* Comment */}
        <View style={s.field}>
          <Text style={s.fieldLabel}>Your Review</Text>
          <TextInput
            style={[s.input, s.textArea, showErrors && comment.trim().length < 10 && s.errorBorder]}
            placeholder="Share details about your treatment, the clinic, staff, and your overall experience..."
            placeholderTextColor={SharedColors.slateLight}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {showErrors && comment.trim().length < 10
              ? <Text style={s.errorText}>At least 10 characters required ({Math.max(0, 10 - comment.trim().length)} more)</Text>
              : <View />}
            <Text style={s.charCount}>{comment.length}/500</Text>
          </View>
        </View>

        {/* Tips */}
        <View style={s.tipsCard}>
          <Text style={s.tipsTitle}>💡 Tips for a great review</Text>
          <Text style={s.tipsText}>
            Mention specific treatments, how the staff treated you, wait times, and whether you'd recommend this clinic to others.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={[s.submitBtn, !isComplete && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={SharedColors.white} size="small" />
          ) : (
            <Text style={s.submitBtnText}>Submit Review ⭐</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 24, color: SharedColors.white, fontWeight: "600", marginTop: -2 },
  title: { fontSize: 18, fontWeight: "700", color: SharedColors.white },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },

  content: { padding: 20, gap: 16, paddingBottom: 60 },

  // Doctor
  doctorCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  doctorAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: PatientTheme.primary,
    alignItems: "center", justifyContent: "center",
  },
  doctorAvatarText: { color: SharedColors.white, fontSize: 20, fontWeight: "700" },
  doctorName: { fontSize: 16, fontWeight: "700", color: SharedColors.navy },
  doctorClinic: { fontSize: 13, color: SharedColors.slate, marginTop: 2 },

  // Overall rating
  ratingSection: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: SharedColors.border, alignItems: "center", gap: 12,
  },
  ratingSectionTitle: { fontSize: 16, fontWeight: "700", color: SharedColors.navy },
  ratingRow: { alignItems: "center", gap: 8 },
  ratingLabel: { fontSize: 14, fontWeight: "600", color: SharedColors.amber },

  // Categories
  categoriesCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: SharedColors.border, gap: 14,
  },
  categoriesTitle: { fontSize: 14, fontWeight: "700", color: SharedColors.navy, marginBottom: 2 },
  categoryRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  categoryLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  categoryIcon: { fontSize: 18 },
  categoryLabel: { fontSize: 13, fontWeight: "600", color: SharedColors.navy },
  categoryDivider: { height: 1, backgroundColor: SharedColors.border },

  // Fields
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: SharedColors.navy },
  input: {
    backgroundColor: SharedColors.white, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: SharedColors.border,
    fontSize: 14, color: SharedColors.navy,
  },
  textArea: { minHeight: 120 },
  charCount: { fontSize: 11, color: SharedColors.slateLight, textAlign: "right" },

  // Tips
  tipsCard: {
    backgroundColor: SharedColors.amberLight, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.2)",
  },
  tipsTitle: { fontSize: 13, fontWeight: "700", color: "#92400e", marginBottom: 4 },
  tipsText: { fontSize: 12, color: "#78350f", lineHeight: 18 },

  // Errors
  errorBorder: { borderColor: SharedColors.red },
  errorText: { fontSize: 12, color: SharedColors.red, fontWeight: "500", marginTop: 4 },

  // Bottom
  bottomBar: {
    paddingHorizontal: 24, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: SharedColors.border, backgroundColor: SharedColors.white,
  },
  submitBtn: {
    backgroundColor: PatientTheme.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: "center", minHeight: 52,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: SharedColors.white, fontSize: 15, fontWeight: "600" },

  // Success
  successTitle: { fontSize: 24, fontWeight: "700", color: SharedColors.navy, marginBottom: 8 },
  successDesc: { fontSize: 14, color: SharedColors.slate, textAlign: "center", lineHeight: 20 },
  successCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: SharedColors.border, gap: 10,
    width: "100%", marginTop: 24, alignItems: "center",
  },
  successReviewTitle: { fontSize: 15, fontWeight: "700", color: SharedColors.navy },
  successReviewComment: { fontSize: 13, color: SharedColors.slate, textAlign: "center", lineHeight: 18 },
  successBtn: {
    backgroundColor: PatientTheme.primary, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32, marginTop: 24,
  },
  successBtnText: { color: SharedColors.white, fontSize: 15, fontWeight: "600" },
});
