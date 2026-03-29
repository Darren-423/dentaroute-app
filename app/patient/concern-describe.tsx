import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { store } from "../../lib/store";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { PatientTheme, SharedColors } from "../../constants/theme";

const MAX_CHARS = 500;
const MIN_CHARS = 10;

export default function ConcernDescribeScreen() {
  const [text, setText] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const charCount = text.length;
  const isValid = charCount >= MIN_CHARS;
  const showPhotoNudge = isValid && !photoUri;

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleNext = async () => {
    if (!isValid) return;
    Keyboard.dismiss();
    setSaving(true);
    await AsyncStorage.setItem(
      "CASE_DRAFT_CONCERN",
      JSON.stringify({ text: text.trim(), photoUri: photoUri || null })
    );
    // Sync concern photo to PATIENT_FILES so it shows in review's file count
    if (photoUri) {
      try {
        const existing = await store.getPatientFiles() || { xrays: [], treatmentPlans: [], photos: [] };
        if (!existing.photos?.includes(photoUri)) {
          await store.savePatientFiles({
            ...existing,
            photos: [...(existing.photos || []), photoUri],
          });
        }
      } catch (e) { console.warn("Photo sync error:", e); }
    }
    setSaving(false);
    router.push("/patient/review?caseMode=proposal" as any);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={[...PatientTheme.gradient]} style={s.header}>
        <SafeAreaView>
          <View style={s.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={s.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={s.backIcon}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>Describe your concern</Text>
              <Text style={s.headerSub}>
                Dentists will use this to suggest treatments
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Body */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Text Input Card */}
          <View style={s.card}>
            <Text style={s.cardLabel}>What's bothering you?</Text>
            <TextInput
              style={s.textInput}
              multiline
              numberOfLines={6}
              maxLength={MAX_CHARS}
              placeholder="What's bothering you? E.g., 'I have a missing front tooth and pain in my lower left molar'"
              placeholderTextColor={SharedColors.slateLight}
              value={text}
              onChangeText={setText}
              textAlignVertical="top"
            />
            <Text
              style={[
                s.charCounter,
                charCount > 0 && charCount < MIN_CHARS && { color: SharedColors.coral },
              ]}
            >
              {charCount} / {MAX_CHARS}
            </Text>
          </View>

          {/* Photo Section */}
          <View style={s.card}>
            <Text style={s.cardLabel}>Add a photo (optional)</Text>

            {photoUri ? (
              <View style={s.photoPreview}>
                <Image
                  source={{ uri: photoUri }}
                  style={s.photoImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={s.photoRemove}
                  onPress={() => setPhotoUri(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={s.photoRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.photoBtnRow}>
                <TouchableOpacity
                  style={s.photoBtn}
                  activeOpacity={0.7}
                  onPress={pickFromCamera}
                >
                  <Text style={s.photoBtnIcon}>📷</Text>
                  <Text style={s.photoBtnText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.photoBtn}
                  activeOpacity={0.7}
                  onPress={pickFromGallery}
                >
                  <Text style={s.photoBtnIcon}>🖼️</Text>
                  <Text style={s.photoBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Photo nudge */}
            {showPhotoNudge && (
              <View style={s.nudge}>
                <Text style={s.nudgeIcon}>💡</Text>
                <Text style={s.nudgeText}>
                  A photo helps dentists give you a more accurate assessment.
                </Text>
              </View>
            )}
          </View>

          {/* Optional X-ray / Records Upload */}
          <View style={s.xrayCard}>
            <View style={s.xrayHeader}>
              <Feather name="file-text" size={18} color={PatientTheme.primary} />
              <Text style={s.xrayTitle}>Have X-rays or dental records?</Text>
              <Text style={s.xrayOptional}>Optional</Text>
            </View>
            <Text style={s.xrayDesc}>
              Adding X-rays helps dentists provide more accurate quotes
            </Text>
            <View style={s.xrayBtnRow}>
              <TouchableOpacity
                style={s.xrayAddBtn}
                activeOpacity={0.7}
                onPress={async () => {
                  if (!isValid) return;
                  Keyboard.dismiss();
                  setSaving(true);
                  await AsyncStorage.setItem(
                    "CASE_DRAFT_CONCERN",
                    JSON.stringify({ text: text.trim(), photoUri: photoUri || null })
                  );
                  if (photoUri) {
                    try {
                      const existing = await store.getPatientFiles() || { xrays: [], treatmentPlans: [], photos: [] };
                      if (!existing.photos?.includes(photoUri)) {
                        await store.savePatientFiles({
                          ...existing,
                          photos: [...(existing.photos || []), photoUri],
                        });
                      }
                    } catch (e) { console.warn("Photo sync error:", e); }
                  }
                  setSaving(false);
                  router.push("/patient/upload?from=concern-describe" as any);
                }}
              >
                <Feather name="upload" size={15} color={PatientTheme.primary} />
                <Text style={s.xrayAddBtnText}>Add Files</Text>
                <Feather name="arrow-right" size={14} color={PatientTheme.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.xraySkipBtn}
                activeOpacity={0.7}
                onPress={handleNext}
                disabled={!isValid || saving}
              >
                <Text style={s.xraySkipBtnText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Bottom CTA */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={[s.nextBtn, !isValid && s.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!isValid || saving}
          activeOpacity={0.85}
        >
          <Text style={[s.nextBtnText, !isValid && s.nextBtnTextDisabled]}>
            Next: Review →
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: SharedColors.bg },

  // Header — matches treatment-intent.tsx
  header: {
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 8 : 0,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  headerSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 2,
  },

  // Body
  scroll: { flex: 1 },
  body: { padding: 20, paddingTop: 24, gap: 16, paddingBottom: 40 },

  // Card — matches treatment-intent card style
  card: {
    backgroundColor: SharedColors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: PatientTheme.primaryBorder,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: SharedColors.navy,
    marginBottom: 12,
  },

  // Text input
  textInput: {
    borderWidth: 1,
    borderColor: SharedColors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: SharedColors.navy,
    minHeight: 130,
    backgroundColor: SharedColors.bg,
    lineHeight: 22,
  },
  charCounter: {
    fontSize: 12,
    color: SharedColors.slateLight,
    textAlign: "right",
    marginTop: 8,
  },

  // Photo buttons
  photoBtnRow: {
    flexDirection: "row",
    gap: 12,
  },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: PatientTheme.primaryMid,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: PatientTheme.primaryLight,
  },
  photoBtnIcon: { fontSize: 20 },
  photoBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: PatientTheme.primary,
  },

  // Photo preview
  photoPreview: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  photoRemove: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemoveText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Photo nudge
  nudge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  nudgeIcon: { fontSize: 16, marginTop: 1 },
  nudgeText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 19 },

  // X-ray upload card
  xrayCard: {
    backgroundColor: SharedColors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8DEF8",
    borderStyle: "dashed",
  },
  xrayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  xrayTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: SharedColors.navy,
    flex: 1,
  },
  xrayOptional: {
    fontSize: 11,
    fontWeight: "500",
    color: SharedColors.slateLight,
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  xrayDesc: {
    fontSize: 13,
    color: SharedColors.navySec ?? "#64748b",
    lineHeight: 18,
    marginBottom: 14,
  },
  xrayBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  xrayAddBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: PatientTheme.primaryMid,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: PatientTheme.primaryLight,
  },
  xrayAddBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: PatientTheme.primary,
  },
  xraySkipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  xraySkipBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: SharedColors.slateLight,
  },

  // Bottom CTA
  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: SharedColors.border,
    backgroundColor: SharedColors.white,
  },
  nextBtn: {
    backgroundColor: PatientTheme.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  nextBtnDisabled: {
    backgroundColor: SharedColors.border,
  },
  nextBtnText: {
    color: SharedColors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  nextBtnTextDisabled: {
    color: SharedColors.slateLight,
  },

});
