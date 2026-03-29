import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { store } from "../../lib/store";

import { PatientTheme, SharedColors } from "../../constants/theme";
type FileItem = { uri: string; name: string; size?: string };

type CategoryKey = "xrays" | "treatmentPlans" | "photos";

const CATEGORIES: { key: CategoryKey; title: string; icon: string; desc: string; hint: string }[] = [
  {
    key: "xrays",
    title: "X-Rays",
    icon: "🦷",
    desc: "Panoramic, periapical, or CBCT scans",
    hint: "Helps dentists assess bone & tooth structure",
  },
  {
    key: "treatmentPlans",
    title: "Treatment Plans",
    icon: "📋",
    desc: "Previous quotes, treatment records, or reports",
    hint: "Helps dentists understand your dental history",
  },
  {
    key: "photos",
    title: "Photos",
    icon: "📷",
    desc: "Photos of teeth, gums, or problem areas",
    hint: "Clear, well-lit photos help get accurate quotes",
  },
];

export default function PatientUploadScreen() {
  const { from, mode, caseId } = useLocalSearchParams<{ from?: string; mode?: string; caseId?: string }>();
  const isProposal = mode === "proposal";
  const [files, setFiles] = useState<Record<CategoryKey, FileItem[]>>({
    xrays: [],
    treatmentPlans: [],
    photos: [],
  });
  const [concernText, setConcernText] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const totalFiles = files.xrays.length + files.treatmentPlans.length + files.photos.length;

  const pickFromCamera = async () => {
    if (!activeCategory) return;
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
      const asset = result.assets[0];
      const newFile: FileItem = {
        uri: asset.uri,
        name: asset.fileName || `${activeCategory}_${Date.now()}.jpg`,
        size: asset.fileSize ? `${(asset.fileSize / 1024 / 1024).toFixed(1)} MB` : undefined,
      };
      setFiles({ ...files, [activeCategory]: [...files[activeCategory], newFile] });
    }
    setActiveCategory(null);
  };

  const pickFromGallery = async () => {
    if (!activeCategory) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newFiles: FileItem[] = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || `${activeCategory}_${Date.now()}.jpg`,
        size: asset.fileSize ? `${(asset.fileSize / 1024 / 1024).toFixed(1)} MB` : undefined,
      }));
      setFiles({ ...files, [activeCategory]: [...files[activeCategory], ...newFiles] });
    }
    setActiveCategory(null);
  };

  const removeFile = (category: CategoryKey, index: number) => {
    const updated = [...files[category]];
    updated.splice(index, 1);
    setFiles({ ...files, [category]: updated });
  };

  const handleNext = async () => {
    setLoading(true);
    // Save file URIs to store so doctor can see them
    await store.savePatientFiles({
      xrays: files.xrays.map((f) => f.uri),
      treatmentPlans: files.treatmentPlans.map((f) => f.uri),
      photos: files.photos.map((f) => f.uri),
    });
    setLoading(false);
    if (from === "checklist" && caseId) {
      await store.syncCaseEnrichment(caseId);
      router.replace("/patient/dashboard" as any);
      return;
    }
    if (from === "review" || mode === "standalone") {
      router.back();
      return;
    }
    if (isProposal) {
      // Path B: skip treatment-select, go straight to review
      router.push("/patient/review?caseMode=proposal&concern=" + encodeURIComponent(concernText) as any);
    } else if (mode === "specific") {
      // Path A: came from treatment-select
      router.push("/patient/review?caseMode=specific" as any);
    } else {
      router.push("/patient/review" as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[...PatientTheme.gradient]} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>{isProposal ? "Upload Your Dental Photos" : "Upload Files"}</Text>
            <Text style={styles.subtitle}>{isProposal ? "Dentists will review and suggest a plan" : "X-rays, treatment plans, or photos"}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                  <View style={{ backgroundColor: "#f1f5f9", borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: SharedColors.border }}><Text style={{ fontSize: 11, color: SharedColors.slate, lineHeight: 16 }}>Uploaded files are shared with dentists for quoting purposes only, not for diagnosis. Concourse does not verify the accuracy of uploaded files.</Text></View>

          {/* Recommendation Banner */}
        <View style={styles.recBanner}>
          <Text style={styles.recBannerIcon}>📸</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.recBannerTitle}>HIGHLY RECOMMENDED</Text>
            <Text style={styles.recBannerText}>
              Upload as many clear photos and X-rays as possible. The more files you provide, the more accurate your diagnosis and quotes will be.
            </Text>
          </View>
        </View>

        {CATEGORIES.map((cat) => (
          <View key={cat.key} style={styles.categoryCard}>
            {/* Category Header */}
            <View style={styles.catHeader}>
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.catTitleRow}>
                  <Text style={styles.catTitle}>{cat.title}</Text>
                  {files[cat.key].length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{files[cat.key].length}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.catDesc}>{cat.desc}</Text>
              </View>
            </View>

            {/* Uploaded Files */}
            {files[cat.key].length > 0 && (
              <View style={styles.filesList}>
                {files[cat.key].map((file, index) => (
                  <View key={index} style={styles.fileCard}>
                    <Image source={{ uri: file.uri }} style={styles.fileThumb} resizeMode="cover" />
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                      {file.size && <Text style={styles.fileSize}>{file.size}</Text>}
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeFile(cat.key, index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Upload Button */}
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => setActiveCategory(cat.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.uploadBtnPlus}>+</Text>
              <Text style={styles.uploadBtnText}>
                {files[cat.key].length === 0 ? `Upload ${cat.title}` : `Add More`}
              </Text>
            </TouchableOpacity>

            {/* Hint */}
            <Text style={styles.catHint}>💡 {cat.hint}</Text>

            {/* Photo Guide — Photos category only */}
            {cat.key === "photos" && (
              <View>
                <TouchableOpacity
                  style={styles.guideToggle}
                  onPress={() => setGuideOpen(!guideOpen)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.guideToggleIcon}>📖</Text>
                  <Text style={styles.guideToggleText}>How to take great dental photos</Text>
                  <Text style={styles.guideToggleArrow}>{guideOpen ? "▲" : "▼"}</Text>
                </TouchableOpacity>

                {guideOpen && (
                  <View style={styles.guideContent}>
                    <View style={styles.guideTip}>
                      <Text style={styles.guideTipNum}>1</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.guideTipTitle}>Front teeth (smile)</Text>
                        <Text style={styles.guideTipDesc}>Pull lips back to show all front teeth. Bite down naturally.</Text>
                      </View>
                    </View>
                    <View style={styles.guideTip}>
                      <Text style={styles.guideTipNum}>2</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.guideTipTitle}>Upper arch</Text>
                        <Text style={styles.guideTipDesc}>Tilt head back, open wide, and photograph the upper teeth from below.</Text>
                      </View>
                    </View>
                    <View style={styles.guideTip}>
                      <Text style={styles.guideTipNum}>3</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.guideTipTitle}>Lower arch</Text>
                        <Text style={styles.guideTipDesc}>Open wide and photograph the lower teeth from above.</Text>
                      </View>
                    </View>
                    <View style={styles.guideTip}>
                      <Text style={styles.guideTipNum}>4</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.guideTipTitle}>Left & right sides</Text>
                        <Text style={styles.guideTipDesc}>Bite down, pull cheek back on each side to show how teeth meet.</Text>
                      </View>
                    </View>
                    <View style={styles.guideTip}>
                      <Text style={styles.guideTipNum}>5</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.guideTipTitle}>Problem areas</Text>
                        <Text style={styles.guideTipDesc}>Zoom in on any specific area of concern (chipped, missing, discolored teeth).</Text>
                      </View>
                    </View>
                    <View style={styles.guideNote}>
                      <Text style={styles.guideNoteText}>Use natural daylight or a bright lamp. Avoid flash directly — it washes out details. A small mirror can help capture hard-to-reach areas.</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}

        {/* Concern Description — Path B only */}
        {isProposal && (
          <View style={styles.concernCard}>
            <Text style={styles.concernTitle}>💬 Describe your concerns</Text>
            <Text style={styles.concernHint}>What's bothering you? Where does it hurt? Any specific goals?</Text>
            <TextInput
              style={styles.concernInput}
              multiline
              numberOfLines={4}
              placeholder="e.g. My front teeth are chipped and discolored. I'd like to explore options for a better smile..."
              placeholderTextColor={SharedColors.slateLight}
              value={concernText}
              onChangeText={setConcernText}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* General Tip */}
        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>📎 Accepted Formats</Text>
          <Text style={styles.tipText}>JPG, PNG up to 10MB per file. Clear, well-lit images get the best results.</Text>
        </View>
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottomBar}>
        {totalFiles > 0 && (
          <Text style={styles.totalText}>{totalFiles} file{totalFiles > 1 ? "s" : ""} ready to upload</Text>
        )}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} disabled={loading} activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color={SharedColors.white} size="small" />
          ) : (
            <Text style={styles.nextBtnText}>{isProposal ? "Next: Review & Submit →" : "Next: Review & Submit →"}</Text>
          )}
        </TouchableOpacity>
        {totalFiles === 0 && (
          <TouchableOpacity onPress={handleNext} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Upload Options Modal ── */}
      <Modal visible={activeCategory !== null} transparent animationType="fade" onRequestClose={() => setActiveCategory(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveCategory(null)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              Upload {CATEGORIES.find((c) => c.key === activeCategory)?.title || "Files"}
            </Text>
            <Text style={styles.modalDesc}>Choose how to add your files</Text>

            <TouchableOpacity style={styles.optionBtn} onPress={pickFromCamera} activeOpacity={0.7}>
              <View style={styles.optionIcon}>
                <Text style={{ fontSize: 28 }}>📷</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Take a Photo</Text>
                <Text style={styles.optionDesc}>Use your camera to capture</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionBtn} onPress={pickFromGallery} activeOpacity={0.7}>
              <View style={styles.optionIcon}>
                <Text style={{ fontSize: 28 }}>🖼️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Choose from Gallery</Text>
                <Text style={styles.optionDesc}>Select saved photos or scans</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setActiveCategory(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },

  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 18,
  },
  headerRow: {
    flexDirection: "row", alignItems: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: SharedColors.white, fontWeight: "600", marginTop: -2 },
  title: { fontSize: 18, fontWeight: "700", color: SharedColors.white },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },

  content: { padding: 20, gap: 16, paddingBottom: 60 },

  // Recommendation Banner
  recBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "#fef3c7", borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: "#fbbf24",
  },
  recBannerIcon: { fontSize: 24, marginTop: 2 },
  recBannerTitle: {
    fontSize: 12, fontWeight: "800", color: "#92400e",
    letterSpacing: 0.8, marginBottom: 4,
  },
  recBannerText: {
    fontSize: 13, color: "#78350f", lineHeight: 19,
  },

  // Category Card
  categoryCard: {
    backgroundColor: SharedColors.white,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: SharedColors.border,
  },
  catHeader: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  catIcon: { fontSize: 28, marginTop: 2 },
  catTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  catTitle: { fontSize: 16, fontWeight: "700", color: SharedColors.navy },
  countBadge: {
    backgroundColor: PatientTheme.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: { fontSize: 12, fontWeight: "700", color: PatientTheme.primary },
  catDesc: { fontSize: 13, color: SharedColors.slate, marginTop: 2 },

  // Files
  filesList: { gap: 8 },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SharedColors.bg,
    borderRadius: 10,
    padding: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: SharedColors.border,
  },
  fileThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: SharedColors.border,
  },
  fileInfo: { flex: 1, gap: 1 },
  fileName: { fontSize: 12, fontWeight: "600", color: SharedColors.navy },
  fileSize: { fontSize: 11, color: SharedColors.slateLight },
  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: SharedColors.coralLight,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: { color: SharedColors.coral, fontSize: 12, fontWeight: "600" },

  // Upload button
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: PatientTheme.primaryMid,
    borderRadius: 12,
    paddingVertical: 11,
    backgroundColor: PatientTheme.primaryLight,
  },
  uploadBtnPlus: { fontSize: 18, color: PatientTheme.primary, fontWeight: "600" },
  uploadBtnText: { fontSize: 14, fontWeight: "600", color: PatientTheme.primary },

  catHint: { fontSize: 11, color: SharedColors.slateLight, lineHeight: 16 },

  // Photo Guide
  guideToggle: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f0fdf4", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "#bbf7d0",
  },
  guideToggleIcon: { fontSize: 16 },
  guideToggleText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#15803d" },
  guideToggleArrow: { fontSize: 10, color: "#15803d" },
  guideContent: { gap: 0, marginTop: 10 },
  guideTip: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  guideTipNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: PatientTheme.primary, color: SharedColors.white,
    fontSize: 12, fontWeight: "700", textAlign: "center", lineHeight: 22,
    overflow: "hidden",
  },
  guideTipTitle: { fontSize: 13, fontWeight: "700", color: SharedColors.navy, marginBottom: 2 },
  guideTipDesc: { fontSize: 12, color: SharedColors.slate, lineHeight: 17 },
  guideNote: {
    backgroundColor: "#fffbeb", borderRadius: 8, padding: 10, marginTop: 10,
    borderWidth: 1, borderColor: "#fde68a",
  },
  guideNoteText: { fontSize: 11, color: "#92400e", lineHeight: 16 },

  // Concern card (Path B)
  concernCard: {
    backgroundColor: SharedColors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: PatientTheme.primaryBorder,
  },
  concernTitle: { fontSize: 15, fontWeight: "600", color: SharedColors.navy, marginBottom: 4 },
  concernHint: { fontSize: 12, color: SharedColors.slate, marginBottom: 10, lineHeight: 17 },
  concernInput: {
    borderWidth: 1,
    borderColor: SharedColors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: SharedColors.navy,
    minHeight: 100,
    backgroundColor: SharedColors.bg,
    lineHeight: 20,
  },

  // Tip box
  tipBox: {
    backgroundColor: PatientTheme.primaryLight,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  tipTitle: { fontSize: 13, fontWeight: "600", color: PatientTheme.primary },
  tipText: { fontSize: 12, color: "#0f5c53", lineHeight: 18 },

  // Bottom
  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: SharedColors.border,
    backgroundColor: SharedColors.white,
    gap: 8,
  },
  totalText: { fontSize: 13, color: PatientTheme.primary, fontWeight: "600", textAlign: "center" },
  nextBtn: {
    backgroundColor: PatientTheme.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    minHeight: 52,
  },
  nextBtnText: { color: SharedColors.white, fontSize: 15, fontWeight: "600" },
  skipBtn: { alignItems: "center", paddingVertical: 8 },
  skipText: { fontSize: 13, color: SharedColors.slateLight },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: SharedColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: SharedColors.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: SharedColors.navy },
  modalDesc: { fontSize: 14, color: SharedColors.slate, marginBottom: 8 },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: SharedColors.bg,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: SharedColors.border,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: PatientTheme.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: { fontSize: 15, fontWeight: "600", color: SharedColors.navy, marginBottom: 2 },
  optionDesc: { fontSize: 12, color: SharedColors.slate },
  cancelBtn: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  cancelText: { fontSize: 15, color: SharedColors.slateLight, fontWeight: "500" },
});
