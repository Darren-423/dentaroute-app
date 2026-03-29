import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { resetNavigationHistory } from "../../lib/navigationHistory";
import { store } from "../../lib/store";

import { DoctorTheme, SharedColors } from "../../constants/theme";
const DEFAULT_SPECIALTIES = [
  "General",
  "Implants",
  "Cosmetic",
  "Orthodontics",
  "Pediatric",
  "Endodontics",
  "Periodontics",
  "Prosthodontics",
  "Oral Surgery",
];
const EXPERIENCE_OPTIONS = [
  "1-3 years",
  "3-5 years",
  "5-10 years",
  "10-15 years",
  "15-20 years",
  "20+ years",
];

const WIZARD_STEPS = [
  { num: 1, label: "Personal" },
  { num: 2, label: "Clinic" },
  { num: 3, label: "Credentials" },
  { num: 4, label: "Review" },
];

export default function DoctorProfileSetupScreen() {
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    clinicName: "",
    location: "",
    email: "",
    phone: "",
    specialties: [] as string[],
    yearsExperience: "",
    bio: "",
    website: "",
  });

  // Clinic photos
  const [clinicPhotos, setClinicPhotos] = useState<string[]>([]);

  // Custom specialties
  const [customSpecialties, setCustomSpecialties] = useState<string[]>([]);
  const [newSpecialty, setNewSpecialty] = useState("");
  const [showSpecialtyInput, setShowSpecialtyInput] = useState(false);

  const [loading, setLoading] = useState(false);

  // Load existing profile data on mount
  useEffect(() => {
    (async () => {
      try {
        const profile = await store.getDoctorProfile();
        if (profile) {
          const specArr = profile.specialty ? profile.specialty.split(", ").filter(Boolean) : [];
          const defaultSpecs = specArr.filter((s: string) => DEFAULT_SPECIALTIES.includes(s));
          const customSpecs = specArr.filter((s: string) => !DEFAULT_SPECIALTIES.includes(s));
          setFormData({
            clinicName: profile.clinicName || profile.clinic || "",
            location: profile.location || "",
            email: profile.email || "",
            phone: profile.phone || "",
            specialties: defaultSpecs,
            yearsExperience: profile.experience ? String(profile.experience) : "",
            bio: profile.bio || "",
            website: profile.website || "",
          });
          setCustomSpecialties(customSpecs);
          if (profile.clinicPhotos && profile.clinicPhotos.length > 0) {
            setClinicPhotos(profile.clinicPhotos);
          }
        }
      } catch (e) {
        console.log("Error loading profile:", e);
      }
    })();
  }, []);

  const isComplete =
    formData.clinicName.trim() &&
    formData.location.trim() &&
    (formData.specialties.length > 0 || customSpecialties.length > 0) &&
    formData.yearsExperience;

  const toggleSpecialty = (s: string) => {
    const updated = formData.specialties.includes(s)
      ? formData.specialties.filter((x) => x !== s)
      : [...formData.specialties, s];
    setFormData({ ...formData, specialties: updated });
  };

  const addCustomSpecialty = () => {
    const trimmed = newSpecialty.trim();
    if (!trimmed) return;
    if (
      customSpecialties.includes(trimmed) ||
      formData.specialties.includes(trimmed) ||
      DEFAULT_SPECIALTIES.includes(trimmed)
    ) {
      setNewSpecialty("");
      return;
    }
    setCustomSpecialties([...customSpecialties, trimmed]);
    setNewSpecialty("");
  };

  const removeCustomSpecialty = (item: string) => {
    setCustomSpecialties(customSpecialties.filter((s) => s !== item));
  };

  // ── Photo Picker ──
  const pickPhoto = async () => {
    if (clinicPhotos.length >= 6) {
      Alert.alert("Maximum Photos", "You can upload up to 6 clinic photos.");
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library to upload clinic photos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 6 - clinicPhotos.length,
      quality: 0.7,
    });

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map((a) => a.uri);
      setClinicPhotos((prev) => [...prev, ...newUris].slice(0, 6));
    }
  };

  const takePhoto = async () => {
    if (clinicPhotos.length >= 6) {
      Alert.alert("Maximum Photos", "You can upload up to 6 clinic photos.");
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow camera access to take clinic photos."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });

    if (!result.canceled && result.assets) {
      setClinicPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 6));
    }
  };

  const removePhoto = (index: number) => {
    setClinicPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const showPhotoOptions = () => {
    Alert.alert("Add Clinic Photo", "Choose how to add a photo", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickPhoto },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleComplete = async () => {
    if (!isComplete) return;
    setLoading(true);
    try {
      const allSpecialties = [...formData.specialties, ...customSpecialties];
      const currentUser = await store.getCurrentUser();
      const doctorName = currentUser?.name || "Doctor";
      await store.saveDoctorProfile({
        fullName: doctorName,
        name: doctorName,
        clinicName: formData.clinicName,
        clinic: formData.clinicName,
        location: formData.location,
        specialty: allSpecialties.join(", ") || "General",
        experience: parseInt(formData.yearsExperience) || 0,
        bio: formData.bio,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        license: "",
        rating: 4.9,
        reviewCount: 0,
        clinicPhotos: clinicPhotos,
      });
    } catch (e) {
      console.log("Error saving profile:", e);
    }
    setLoading(false);
    resetNavigationHistory("/doctor/dashboard");
    router.replace("/doctor/dashboard" as any);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[DoctorTheme.primary, DoctorTheme.primaryDark]} style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{formData.clinicName ? "Edit Profile" : "Setup Profile"}</Text>
        <Text style={styles.subtitle}>{formData.clinicName ? "Update your practice info" : "Tell patients about your practice"}</Text>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
      >
        {/* ── Step Progress Indicator ── */}
        <View style={styles.progressRow}>
          {WIZARD_STEPS.map((s, i) => (
            <React.Fragment key={s.num}>
              {i > 0 && (
                <View style={[styles.progressLine, step > s.num - 1 ? styles.progressLineActive : null]} />
              )}
              <View style={styles.progressStep}>
                <View
                  style={[
                    styles.progressDot,
                    step === s.num && styles.progressDotActive,
                    step > s.num && styles.progressDotDone,
                  ]}
                >
                  {step > s.num ? (
                    <Text style={styles.progressCheckmark}>{"✓"}</Text>
                  ) : (
                    <Text
                      style={[
                        styles.progressDotNum,
                        step === s.num && styles.progressDotNumActive,
                      ]}
                    >
                      {s.num}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.progressLabel,
                    step === s.num && styles.progressLabelActive,
                  ]}
                >
                  {s.label}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ══════════ STEP 1: Personal ══════════ */}
        {step === 1 && (
          <>
            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. clinic@example.com"
                placeholderTextColor={SharedColors.slateLight}
                value={formData.email}
                onChangeText={(v) => setFormData({ ...formData, email: v })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PHONE NUMBER</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. +82-2-1234-5678"
                placeholderTextColor={SharedColors.slateLight}
                value={formData.phone}
                onChangeText={(v) => setFormData({ ...formData, phone: v })}
                keyboardType="phone-pad"
              />
            </View>

            {/* Bio */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>BIO (OPTIONAL)</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
                placeholder="Tell patients about yourself and your practice..."
                placeholderTextColor={SharedColors.slateLight}
                value={formData.bio}
                onChangeText={(v) => setFormData({ ...formData, bio: v })}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Website */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>WEBSITE (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. https://www.mydentalclinic.com"
                placeholderTextColor={SharedColors.slateLight}
                value={formData.website}
                onChangeText={(v) => setFormData({ ...formData, website: v })}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </>
        )}

        {/* ══════════ STEP 2: Clinic ══════════ */}
        {step === 2 && (
          <>
            {/* Clinic Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CLINIC NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Seoul Dental Clinic"
                placeholderTextColor={SharedColors.slateLight}
                value={formData.clinicName}
                onChangeText={(v) => setFormData({ ...formData, clinicName: v })}
              />
            </View>

            {/* Location */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>LOCATION</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Gangnam, Seoul"
                placeholderTextColor={SharedColors.slateLight}
                value={formData.location}
                onChangeText={(v) => setFormData({ ...formData, location: v })}
              />
            </View>

            {/* Specialties */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>SPECIALTIES</Text>
              <Text style={styles.hint}>Select all that apply</Text>
              <View style={styles.tagWrap}>
                {DEFAULT_SPECIALTIES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.tag,
                      formData.specialties.includes(s) && styles.tagSelected,
                    ]}
                    onPress={() => toggleSpecialty(s)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        formData.specialties.includes(s) && styles.tagTextSelected,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom specialties */}
              {customSpecialties.length > 0 && (
                <View style={styles.customTagsWrap}>
                  {customSpecialties.map((s) => (
                    <View key={s} style={styles.customTag}>
                      <Text style={styles.customTagText}>{s}</Text>
                      <TouchableOpacity
                        onPress={() => removeCustomSpecialty(s)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Text style={styles.customTagRemove}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Add custom */}
              {showSpecialtyInput ? (
                <View style={styles.addInputRow}>
                  <TextInput
                    style={styles.addInput}
                    placeholder="Type a specialty..."
                    placeholderTextColor={SharedColors.slateLight}
                    value={newSpecialty}
                    onChangeText={setNewSpecialty}
                    onSubmitEditing={addCustomSpecialty}
                    returnKeyType="done"
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[
                      styles.addConfirmBtn,
                      !newSpecialty.trim() && { opacity: 0.4 },
                    ]}
                    onPress={addCustomSpecialty}
                    disabled={!newSpecialty.trim()}
                  >
                    <Text style={styles.addConfirmText}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addCancelBtn}
                    onPress={() => {
                      setShowSpecialtyInput(false);
                      setNewSpecialty("");
                    }}
                  >
                    <Text style={styles.addCancelText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => setShowSpecialtyInput(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addBtnPlus}>+</Text>
                  <Text style={styles.addBtnText}>Add other specialty</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Years of Experience */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>YEARS OF EXPERIENCE</Text>
              <View style={styles.tagWrap}>
                {EXPERIENCE_OPTIONS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[
                      styles.tag,
                      formData.yearsExperience === e && styles.tagSelected,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, yearsExperience: e })
                    }
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        formData.yearsExperience === e && styles.tagTextSelected,
                      ]}
                    >
                      {e}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {/* ══════════ STEP 3: Credentials ══════════ */}
        {step === 3 && (
          <>
            {/* Clinic Photos */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CLINIC PHOTOS</Text>
              <Text style={styles.hint}>
                Show patients your clinic (up to 6 photos)
              </Text>

              {/* Photo Grid */}
              <View style={styles.photoGrid}>
                {clinicPhotos.map((uri, index) => (
                  <View key={index} style={styles.photoItem}>
                    <Image source={{ uri }} style={styles.photoImage} />
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      onPress={() => removePhoto(index)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={styles.photoRemoveText}>✕</Text>
                    </TouchableOpacity>
                    {index === 0 && (
                      <View style={styles.photoCoverBadge}>
                        <Text style={styles.photoCoverText}>Cover</Text>
                      </View>
                    )}
                  </View>
                ))}

                {/* Add Photo Button */}
                {clinicPhotos.length < 6 && (
                  <TouchableOpacity
                    style={styles.photoAddBtn}
                    onPress={showPhotoOptions}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.photoAddIcon}>📷</Text>
                    <Text style={styles.photoAddText}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>

              {clinicPhotos.length > 0 && (
                <Text style={styles.photoCount}>
                  {clinicPhotos.length}/6 photos added
                </Text>
              )}
            </View>

            {/* License Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>🪪</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Your license is being verified</Text>
                <Text style={styles.infoDesc}>
                  This usually takes 24-48 hours. You can set up your profile in the
                  meantime.
                </Text>
              </View>
            </View>
          </>
        )}

        {/* ══════════ STEP 4: Review ══════════ */}
        {step === 4 && (
          <>
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Personal Info</Text>
              <View style={styles.reviewCard}>
                {formData.email ? (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Email</Text>
                    <Text style={styles.reviewValue}>{formData.email}</Text>
                  </View>
                ) : null}
                {formData.phone ? (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Phone</Text>
                    <Text style={styles.reviewValue}>{formData.phone}</Text>
                  </View>
                ) : null}
                {formData.bio ? (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Bio</Text>
                    <Text style={[styles.reviewValue, { flex: 1 }]} numberOfLines={3}>{formData.bio}</Text>
                  </View>
                ) : null}
                {formData.website ? (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Website</Text>
                    <Text style={styles.reviewValue}>{formData.website}</Text>
                  </View>
                ) : null}
                {!formData.email && !formData.phone && !formData.bio && !formData.website && (
                  <Text style={styles.reviewEmpty}>No personal info added yet</Text>
                )}
              </View>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Clinic Details</Text>
              <View style={styles.reviewCard}>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Clinic</Text>
                  <Text style={styles.reviewValue}>{formData.clinicName || "Not set"}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Location</Text>
                  <Text style={styles.reviewValue}>{formData.location || "Not set"}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Specialties</Text>
                  <Text style={[styles.reviewValue, { flex: 1 }]}>
                    {[...formData.specialties, ...customSpecialties].join(", ") || "None selected"}
                  </Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Experience</Text>
                  <Text style={styles.reviewValue}>{formData.yearsExperience || "Not set"}</Text>
                </View>
              </View>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Credentials</Text>
              <View style={styles.reviewCard}>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Photos</Text>
                  <Text style={styles.reviewValue}>
                    {clinicPhotos.length > 0 ? `${clinicPhotos.length} photo${clinicPhotos.length > 1 ? "s" : ""} uploaded` : "No photos"}
                  </Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>License</Text>
                  <Text style={styles.reviewValue}>Pending verification</Text>
                </View>
              </View>
            </View>

            {!isComplete && (
              <View style={[styles.infoBox, { borderColor: SharedColors.orange, backgroundColor: "#fffbeb" }]}>
                <Text style={styles.infoIcon}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>Required fields missing</Text>
                  <Text style={styles.infoDesc}>
                    Please fill in clinic name, location, at least one specialty, and experience to publish.
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Bottom bar — step-aware navigation ── */}
      <View style={styles.bottomBar}>
        {step === 1 && (
          <TouchableOpacity
            style={[styles.completeBtn, { flex: 1 }]}
            onPress={() => setStep(2)}
            activeOpacity={0.85}
          >
            <Text style={styles.completeBtnText}>{"Next  \u2192"}</Text>
          </TouchableOpacity>
        )}

        {(step === 2 || step === 3) && (
          <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
            <TouchableOpacity
              style={styles.backStepBtn}
              onPress={() => setStep(step - 1)}
            >
              <Text style={styles.backStepBtnText}>{"\u2190  Back"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.completeBtn, { flex: 1 }]}
              onPress={() => setStep(step + 1)}
              activeOpacity={0.85}
            >
              <Text style={styles.completeBtnText}>{"Next  \u2192"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 4 && (
          <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
            <TouchableOpacity
              style={styles.backStepBtn}
              onPress={() => setStep(3)}
            >
              <Text style={styles.backStepBtnText}>{"\u2190  Back"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.completeBtn, { flex: 1 }, !isComplete && styles.completeBtnDisabled]}
              onPress={handleComplete}
              disabled={!isComplete || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={SharedColors.white} size="small" />
              ) : (
                <Text style={styles.completeBtnText}>Publish Profile</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },

  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  backArrow: { fontSize: 24, color: SharedColors.white, fontWeight: "600", marginTop: -2 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: SharedColors.white,
    marginBottom: 4,
  },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)" },

  scrollView: { flex: 1, backgroundColor: SharedColors.bg },
  content: { padding: 24, gap: 22, paddingBottom: 60 },

  fieldGroup: { gap: 10 },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: SharedColors.navySec,
    letterSpacing: 0.8,
  },
  hint: { fontSize: 12, color: SharedColors.navyMuted, marginTop: -4 },

  input: {
    borderWidth: 1.5,
    borderColor: SharedColors.border,
    backgroundColor: SharedColors.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: SharedColors.navy,
    minHeight: 48,
  },

  // Tags
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: SharedColors.border,
    backgroundColor: "transparent",
  },
  tagSelected: {
    borderColor: DoctorTheme.accentBright,
    backgroundColor: DoctorTheme.accentBright,
  },
  tagText: {
    fontSize: 13,
    color: SharedColors.navySec,
    fontWeight: "400",
  },
  tagTextSelected: { color: SharedColors.white, fontWeight: "600" },

  // Custom tags
  customTagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  customTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: DoctorTheme.accentBright,
    backgroundColor: DoctorTheme.accentBright,
  },
  customTagText: { fontSize: 13, color: SharedColors.white, fontWeight: "600" },
  customTagRemove: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "700",
    padding: 2,
  },

  // Add
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: SharedColors.border,
    borderRadius: 20,
    borderStyle: "dashed",
    alignSelf: "flex-start",
  },
  addBtnPlus: { fontSize: 18, color: DoctorTheme.accentBright, fontWeight: "600" },
  addBtnText: { fontSize: 13, color: SharedColors.navySec },
  addInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  addInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: DoctorTheme.accentBright,
    backgroundColor: SharedColors.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: SharedColors.navy,
  },
  addConfirmBtn: {
    backgroundColor: DoctorTheme.accentBright,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  addConfirmText: { color: SharedColors.white, fontSize: 13, fontWeight: "600" },
  addCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  addCancelText: {
    color: SharedColors.navySec,
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Photo Styles ──
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: SharedColors.border,
  },
  photoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  photoRemoveBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemoveText: {
    color: SharedColors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  photoCoverBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(13,122,110,0.85)",
    paddingVertical: 3,
    alignItems: "center",
  },
  photoCoverText: {
    color: SharedColors.white,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  photoAddBtn: {
    width: 100,
    height: 100,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: SharedColors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: SharedColors.white,
  },
  photoAddIcon: { fontSize: 24 },
  photoAddText: {
    fontSize: 11,
    color: SharedColors.navySec,
    fontWeight: "500",
  },
  photoCount: {
    fontSize: 12,
    color: SharedColors.navyMuted,
    marginTop: 2,
  },

  // Info
  infoBox: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: SharedColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: SharedColors.border,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoIcon: { fontSize: 24, marginTop: 2 },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: SharedColors.navy,
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 12,
    color: SharedColors.navySec,
    lineHeight: 18,
  },

  // Bottom
  bottomBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: SharedColors.border,
    backgroundColor: SharedColors.white,
  },
  completeBtn: {
    backgroundColor: DoctorTheme.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    minHeight: 52,
  },
  completeBtnDisabled: { opacity: 0.4 },
  completeBtnText: { color: SharedColors.white, fontSize: 15, fontWeight: "600" },

  /* ── Progress Indicator ── */
  progressRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 8, paddingHorizontal: 4, gap: 0,
  },
  progressStep: { alignItems: "center", gap: 6, width: 72 },
  progressDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: SharedColors.white, borderWidth: 2, borderColor: SharedColors.border,
    alignItems: "center", justifyContent: "center",
  },
  progressDotActive: {
    borderColor: DoctorTheme.primary, backgroundColor: DoctorTheme.primary,
  },
  progressDotDone: {
    borderColor: DoctorTheme.primary, backgroundColor: DoctorTheme.accentSoft,
  },
  progressDotNum: {
    fontSize: 13, fontWeight: "700", color: SharedColors.slate,
  },
  progressDotNumActive: {
    color: SharedColors.white,
  },
  progressCheckmark: {
    fontSize: 14, fontWeight: "800", color: DoctorTheme.primary,
  },
  progressLabel: {
    fontSize: 11, fontWeight: "500", color: SharedColors.slate, textAlign: "center",
  },
  progressLabelActive: {
    fontWeight: "700", color: DoctorTheme.primary,
  },
  progressLine: {
    flex: 1, height: 2, backgroundColor: SharedColors.border,
    marginBottom: 22,
  },
  progressLineActive: {
    backgroundColor: DoctorTheme.primary,
  },

  /* ── Step Navigation Buttons ── */
  backStepBtn: {
    borderRadius: 14, borderWidth: 1.5, borderColor: SharedColors.border,
    paddingHorizontal: 20, paddingVertical: 15,
    alignItems: "center", justifyContent: "center",
    backgroundColor: SharedColors.white,
  },
  backStepBtnText: {
    fontSize: 15, fontWeight: "600", color: SharedColors.navy,
  },

  /* ── Review Step ── */
  reviewSection: { gap: 8 },
  reviewSectionTitle: {
    fontSize: 13, fontWeight: "700", color: SharedColors.navy,
    letterSpacing: 0.3,
  },
  reviewCard: {
    backgroundColor: SharedColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: SharedColors.border,
    gap: 12,
  },
  reviewRow: {
    flexDirection: "row", gap: 12,
  },
  reviewLabel: {
    fontSize: 13, fontWeight: "600", color: SharedColors.navySec, width: 90,
  },
  reviewValue: {
    fontSize: 13, color: SharedColors.navy, fontWeight: "400",
  },
  reviewEmpty: {
    fontSize: 13, color: SharedColors.navyMuted, fontStyle: "italic",
  },
});
