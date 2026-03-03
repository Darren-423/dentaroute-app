import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { store, SupportInquiry } from "../../lib/store";

const T = {
  teal: "#4A0080", tealMid: "#5C10A0", tealLight: "#f0e6f6",
  navy: "#0f172a", slate: "#64748b", slateLight: "#94a3b8",
  border: "#e2e8f0", bg: "#f8fafc", white: "#fff",
  green: "#16a34a", greenLight: "#f0fdf4",
  amber: "#f59e0b", amberLight: "#fffbeb",
  red: "#ef4444",
};

const FAQ_DATA = [
  {
    category: "booking",
    question: "How do I cancel or reschedule my appointment?",
    answer: "You can cancel up to 7 days before your visit for a full refund. Within 3-7 days, you'll receive a 50% refund. To reschedule, contact your dentist through the chat feature or submit an inquiry below.",
  },
  {
    category: "payment",
    question: "Is my deposit refundable?",
    answer: "Yes, your 10% deposit is fully refundable if you cancel more than 7 days before your scheduled visit. The deposit secures your appointment and is applied to your first visit payment.",
  },
  {
    category: "travel",
    question: "Do I need a visa to visit South Korea for dental treatment?",
    answer: "Most US passport holders can enter South Korea visa-free for up to 90 days under the K-ETA (Korea Electronic Travel Authorization) program. We recommend applying for K-ETA at least 72 hours before departure.",
  },
  {
    category: "payment",
    question: "How does payment work?",
    answer: "Payment is split into two parts: a 10% deposit paid through the app to confirm your booking, and the remaining 90% paid directly at the clinic. We accept all major credit cards. Paying through DentaRoute saves you an additional 5%.",
  },
  {
    category: "treatment",
    question: "Are the dentists really US-licensed?",
    answer: "Yes, all dentists on DentaRoute hold valid US dental licenses and practice in South Korea. They are fluent in English and trained in American dental standards. You can view their credentials on their profile page.",
  },
  {
    category: "treatment",
    question: "What if I need follow-up care after returning to the US?",
    answer: "Your DentaRoute dentist will provide detailed treatment records and aftercare instructions. Many of our dentists also offer virtual follow-up consultations. For in-person follow-ups, we can recommend partner dentists in your area.",
  },
  {
    category: "travel",
    question: "Does DentaRoute help with travel arrangements?",
    answer: "We provide hotel recommendations near your clinic and can arrange airport pickup. Some clinics also offer accommodation packages. Your dentist will share all the details after booking.",
  },
  {
    category: "technical",
    question: "I'm having trouble with the app. What should I do?",
    answer: "Try closing and reopening the app first. If the issue persists, submit an inquiry below with details about what you're experiencing. Include screenshots if possible. Our support team typically responds within 24 hours.",
  },
];

const INQUIRY_CATEGORIES = [
  { value: "booking", label: "📅 Booking" },
  { value: "payment", label: "💳 Payment" },
  { value: "treatment", label: "🦷 Treatment" },
  { value: "travel", label: "✈️ Travel" },
  { value: "technical", label: "🔧 Technical" },
  { value: "other", label: "💬 Other" },
];

export default function HelpCenterScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [inquiries, setInquiries] = useState<SupportInquiry[]>([]);
  const [errors, setErrors] = useState<{ category?: string; subject?: string; message?: string }>({});

  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const profile = await store.getPatientProfile();
        if (profile?.email) setEmail(profile.email);
        const inqs = await store.getInquiries();
        setInquiries(inqs);
      };
      load();
    }, [])
  );

  const filteredFaq = FAQ_DATA.filter((f) =>
    f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validate = () => {
    const errs: typeof errors = {};
    if (!category) errs.category = "Please select a category";
    if (!subject.trim()) errs.subject = "Please enter a subject";
    if (!message.trim()) errs.message = "Please describe your issue";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    await store.submitInquiry({
      category: category as SupportInquiry["category"],
      subject: subject.trim(),
      message: message.trim(),
      email: email.trim(),
    });
    setSubmitting(false);
    setSubmitted(true);
    setSubject("");
    setMessage("");
    setCategory("");
    setErrors({});

    setTimeout(() => setSubmitted(false), 3000);

    const inqs = await store.getInquiries();
    setInquiries(inqs);
  };

  return (
    <View style={s.container}>
      <LinearGradient
        colors={["#3D0070", "#2F0058", "#220040"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Help & Support</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Subtitle */}
          <Text style={s.subtitle}>How can we help you?</Text>

          {/* Search */}
          <View style={s.searchWrap}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Search FAQ..."
              placeholderTextColor={T.slateLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
                <Text style={s.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* FAQ Section */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>❓ Frequently Asked Questions</Text>
            <View style={s.faqCard}>
              {filteredFaq.length === 0 ? (
                <View style={s.emptyFaq}>
                  <Text style={s.emptyFaqIcon}>🔍</Text>
                  <Text style={s.emptyFaqText}>No results for "{searchQuery}"</Text>
                  <Text style={s.emptyFaqHint}>Try different keywords or submit an inquiry below</Text>
                </View>
              ) : (
                filteredFaq.map((faq, idx) => {
                  const isLast = idx === filteredFaq.length - 1;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[s.faqItem, !isLast && s.faqItemBorder]}
                      onPress={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                      activeOpacity={0.7}
                    >
                      <View style={s.faqHeader}>
                        <Text style={s.faqQuestion}>{faq.question}</Text>
                        <Text style={s.faqChevron}>{expandedFaq === idx ? "▾" : "▸"}</Text>
                      </View>
                      {expandedFaq === idx && (
                        <Text style={s.faqAnswer}>{faq.answer}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>

          {/* Contact Form */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>💬 Still need help?</Text>

            {submitted ? (
              <View style={s.successCard}>
                <Text style={s.successIcon}>✅</Text>
                <Text style={s.successTitle}>Inquiry Submitted!</Text>
                <Text style={s.successDesc}>
                  We'll respond within 24 hours.{"\n"}
                  Check your notifications for updates.
                </Text>
              </View>
            ) : (
              <View style={s.formCard}>
                {/* Category chips */}
                <Text style={s.formLabel}>Category</Text>
                <View style={s.categoryGrid}>
                  {INQUIRY_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        s.categoryChip,
                        category === cat.value && { borderColor: T.teal, backgroundColor: T.tealLight },
                      ]}
                      onPress={() => { setCategory(cat.value); setErrors((e) => ({ ...e, category: undefined })); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        s.categoryChipText,
                        category === cat.value && { color: T.teal, fontWeight: "700" },
                      ]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.category && <Text style={s.errorText}>{errors.category}</Text>}

                {/* Subject */}
                <Text style={s.formLabel}>Subject</Text>
                <TextInput
                  style={[s.formInput, errors.subject && s.formInputError]}
                  placeholder="Brief summary of your issue"
                  placeholderTextColor={T.slateLight}
                  value={subject}
                  onChangeText={(t) => { setSubject(t); setErrors((e) => ({ ...e, subject: undefined })); }}
                  maxLength={100}
                  returnKeyType="next"
                />
                {errors.subject && <Text style={s.errorText}>{errors.subject}</Text>}

                {/* Message */}
                <Text style={s.formLabel}>Message</Text>
                <TextInput
                  style={[s.formInput, s.formTextArea, errors.message && s.formInputError]}
                  placeholder="Describe your issue in detail..."
                  placeholderTextColor={T.slateLight}
                  value={message}
                  onChangeText={(t) => { setMessage(t); setErrors((e) => ({ ...e, message: undefined })); }}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <View style={s.charCountRow}>
                  {errors.message ? (
                    <Text style={s.errorText}>{errors.message}</Text>
                  ) : <View />}
                  <Text style={s.charCount}>{message.length}/1000</Text>
                </View>

                {/* Email */}
                <Text style={s.formLabel}>Email</Text>
                <TextInput
                  style={s.formInput}
                  placeholder="your@email.com"
                  placeholderTextColor={T.slateLight}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                />

                {/* Submit */}
                <TouchableOpacity
                  style={[s.submitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color={T.white} size="small" />
                  ) : (
                    <Text style={s.submitBtnText}>Submit Inquiry →</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Past Inquiries */}
          {inquiries.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>📋 My Inquiries</Text>
              {inquiries.map((inq) => (
                <View key={inq.id} style={s.inquiryCard}>
                  <View style={s.inquiryHeader}>
                    <Text style={s.inquirySubject} numberOfLines={1}>{inq.subject}</Text>
                    <View style={[
                      s.statusBadge,
                      inq.status === "resolved" && { backgroundColor: T.greenLight },
                      inq.status === "in_review" && { backgroundColor: T.amberLight },
                    ]}>
                      <Text style={[
                        s.statusText,
                        inq.status === "resolved" && { color: T.green },
                        inq.status === "in_review" && { color: T.amber },
                      ]}>
                        {inq.status === "submitted" ? "Submitted" :
                         inq.status === "in_review" ? "In Review" : "Resolved"}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.inquiryDate}>
                    {new Date(inq.createdAt).toLocaleDateString(undefined, {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </Text>
                  {inq.response && (
                    <View style={s.responseBox}>
                      <Text style={s.responseLabel}>Response:</Text>
                      <Text style={s.responseText}>{inq.response}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  // Header
  header: {
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: T.white },

  // Content
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  subtitle: { fontSize: 15, color: T.slate, marginBottom: -4 },

  // Search
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: T.white, borderRadius: 12,
    borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 14, paddingVertical: Platform.OS === "ios" ? 12 : 4,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: T.navy },
  clearBtn: { fontSize: 14, color: T.slateLight, padding: 4 },

  // Section
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: T.navy },

  // FAQ
  faqCard: {
    backgroundColor: T.white, borderRadius: 16,
    borderWidth: 1, borderColor: T.border,
    overflow: "hidden",
  },
  faqItem: { paddingHorizontal: 16, paddingVertical: 14 },
  faqItemBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
  faqHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", gap: 12,
  },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: "600", color: T.navy },
  faqChevron: { fontSize: 14, color: T.slateLight },
  faqAnswer: {
    fontSize: 13, color: T.slate, lineHeight: 20,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: T.border,
  },

  // Empty FAQ
  emptyFaq: { alignItems: "center", paddingVertical: 28, gap: 6 },
  emptyFaqIcon: { fontSize: 24 },
  emptyFaqText: { fontSize: 14, fontWeight: "600", color: T.navy },
  emptyFaqHint: { fontSize: 12, color: T.slateLight },

  // Form
  formCard: {
    backgroundColor: T.white, borderRadius: 16,
    borderWidth: 1, borderColor: T.border,
    padding: 16, gap: 12,
  },
  formLabel: { fontSize: 13, fontWeight: "600", color: T.navy, marginTop: 2 },
  formInput: {
    backgroundColor: T.bg, borderRadius: 12,
    borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 14, paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 14, color: T.navy,
  },
  formInputError: { borderColor: T.red },
  formTextArea: { minHeight: 100, textAlignVertical: "top" },
  charCountRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginTop: -6,
  },
  charCount: { fontSize: 11, color: T.slateLight },
  errorText: { fontSize: 12, color: T.red, marginTop: -4 },

  // Categories
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5, borderColor: T.border,
    backgroundColor: T.white,
  },
  categoryChipText: { fontSize: 13, color: T.slate },

  // Submit
  submitBtn: {
    backgroundColor: T.teal, borderRadius: 14,
    paddingVertical: 15, alignItems: "center", marginTop: 4,
  },
  submitBtnText: { color: T.white, fontSize: 15, fontWeight: "700" },

  // Success
  successCard: {
    backgroundColor: T.greenLight, borderRadius: 16,
    borderWidth: 1, borderColor: "#bbf7d0",
    padding: 28, alignItems: "center", gap: 8,
  },
  successIcon: { fontSize: 32 },
  successTitle: { fontSize: 17, fontWeight: "700", color: T.green },
  successDesc: { fontSize: 13, color: T.slate, textAlign: "center", lineHeight: 20 },

  // Inquiries
  inquiryCard: {
    backgroundColor: T.white, borderRadius: 14,
    borderWidth: 1, borderColor: T.border,
    padding: 14, gap: 6,
  },
  inquiryHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", gap: 10,
  },
  inquirySubject: { flex: 1, fontSize: 14, fontWeight: "600", color: T.navy },
  statusBadge: {
    backgroundColor: T.tealLight, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontWeight: "600", color: T.teal },
  inquiryDate: { fontSize: 12, color: T.slateLight },

  // Response
  responseBox: {
    backgroundColor: T.bg, borderRadius: 10,
    padding: 12, marginTop: 4, gap: 4,
  },
  responseLabel: { fontSize: 11, fontWeight: "700", color: T.navy },
  responseText: { fontSize: 13, color: T.slate, lineHeight: 19 },
});
