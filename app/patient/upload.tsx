import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { store } from "../../lib/store";

const T = {
  teal: "#4A0080",
  tealMid: "#5C10A0",
  tealLight: "#f0e6f6",
  navy: "#0f172a",
  slate: "#64748b",
  slateLight: "#94a3b8",
  border: "#e2e8f0",
  bg: "#f8fafc",
  white: "#ffffff",
  coral: "#e05a3a",
};

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
  const { from, mode } = useLocalSearchParams<{ from?: string; mode?: string }>();
  const [files, setFiles] = useState<Record<CategoryKey, FileItem[]>>({
    xrays: [],
    treatmentPlans: [],
    photos: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);

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
    if (from === "review" || mode === "standalone") {
      router.back();
      return;
    }
    router.push("/patient/review" as any);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#3D0070", "#2F0058", "#220040"]} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Upload Files</Text>
            <Text style={styles.subtitle}>X-rays, treatment plans, or photos</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

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
          </View>
        ))}

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
            <ActivityIndicator color={T.white} size="small" />
          ) : (
            <Text style={styles.nextBtnText}>Next: Select Treatment →</Text>
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
  container: { flex: 1, backgroundColor: T.bg },

  header: {
    paddingHorizontal: 20,
    paddingTop: 54,
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
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },
  title: { fontSize: 18, fontWeight: "700", color: "#fff" },
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
    backgroundColor: T.white,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: T.border,
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
  catTitle: { fontSize: 16, fontWeight: "700", color: T.navy },
  countBadge: {
    backgroundColor: T.tealLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: { fontSize: 12, fontWeight: "700", color: T.teal },
  catDesc: { fontSize: 13, color: T.slate, marginTop: 2 },

  // Files
  filesList: { gap: 8 },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.bg,
    borderRadius: 10,
    padding: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  fileThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: T.border,
  },
  fileInfo: { flex: 1, gap: 1 },
  fileName: { fontSize: 12, fontWeight: "600", color: T.navy },
  fileSize: { fontSize: 11, color: T.slateLight },
  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#fef2ee",
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: { color: T.coral, fontSize: 12, fontWeight: "600" },

  // Upload button
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: T.tealMid,
    borderRadius: 12,
    paddingVertical: 11,
    backgroundColor: T.tealLight,
  },
  uploadBtnPlus: { fontSize: 18, color: T.teal, fontWeight: "600" },
  uploadBtnText: { fontSize: 14, fontWeight: "600", color: T.teal },

  catHint: { fontSize: 11, color: T.slateLight, lineHeight: 16 },

  // Tip box
  tipBox: {
    backgroundColor: T.tealLight,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  tipTitle: { fontSize: 13, fontWeight: "600", color: T.teal },
  tipText: { fontSize: 12, color: "#0f5c53", lineHeight: 18 },

  // Bottom
  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: T.border,
    backgroundColor: T.white,
    gap: 8,
  },
  totalText: { fontSize: 13, color: T.teal, fontWeight: "600", textAlign: "center" },
  nextBtn: {
    backgroundColor: T.teal,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    minHeight: 52,
  },
  nextBtnText: { color: T.white, fontSize: 15, fontWeight: "600" },
  skipBtn: { alignItems: "center", paddingVertical: 8 },
  skipText: { fontSize: 13, color: T.slateLight },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: T.white,
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
    backgroundColor: T.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: T.navy },
  modalDesc: { fontSize: 14, color: T.slate, marginBottom: 8 },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: T.bg,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: T.border,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: T.tealLight,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: { fontSize: 15, fontWeight: "600", color: T.navy, marginBottom: 2 },
  optionDesc: { fontSize: 12, color: T.slate },
  cancelBtn: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  cancelText: { fontSize: 15, color: T.slateLight, fontWeight: "500" },
});
