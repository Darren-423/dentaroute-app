import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { store } from "../../lib/store";

import { DoctorTheme, SharedColors } from "../../constants/theme";
interface BAPhoto {
  before: string;
  after: string;
  treatment: string;
}

export default function BeforeAfterScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<BAPhoto[]>([]);

  // Photo flow states
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [sourceStep, setSourceStep] = useState<"before" | "after">("before");
  const [pendingBefore, setPendingBefore] = useState<string | null>(null);
  const [treatmentName, setTreatmentName] = useState("");
  // Inline editing state (no modal for treatment name)
  const [pendingPhotos, setPendingPhotos] = useState<{ before: string; after: string } | null>(null);

  // Refs to avoid stale closures in setTimeout
  const sourceStepRef = useRef(sourceStep);
  sourceStepRef.current = sourceStep;
  const pendingBeforeRef = useRef(pendingBefore);
  pendingBeforeRef.current = pendingBefore;

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const p = await store.getDoctorProfile();
        setProfile(p);
        setPhotos(p?.beforeAfterPhotos || []);
      };
      load();
    }, [])
  );

  // Pick image from camera or library
  const pickImage = async (source: "camera" | "library"): Promise<string | null> => {
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Camera access is needed to take photos.");
        return null;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
      if (result.canceled) return null;
      return result.assets[0].uri;
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
      if (result.canceled) return null;
      return result.assets[0].uri;
    }
  };

  // Handle source selection
  const handleSourceSelect = (source: "camera" | "library") => {
    setShowSourceModal(false);
    setTimeout(async () => {
      const uri = await pickImage(source);
      if (!uri) return;

      if (sourceStepRef.current === "before") {
        setPendingBefore(uri);
        Alert.alert("Next Step", "Now select the AFTER photo", [
          { text: "Cancel", style: "cancel", onPress: () => setPendingBefore(null) },
          { text: "Continue", onPress: () => { setSourceStep("after"); setShowSourceModal(true); } },
        ]);
      } else {
        // Both photos selected → show inline treatment name input
        setPendingPhotos({ before: pendingBeforeRef.current!, after: uri });
        setPendingBefore(null);
        setTreatmentName("");
      }
    }, 600);
  };

  // Save new BA photo
  const handleSave = async () => {
    if (!pendingPhotos || !treatmentName.trim()) return;
    const p = profile || await store.getDoctorProfile() || {};
    const newPhoto: BAPhoto = { before: pendingPhotos.before, after: pendingPhotos.after, treatment: treatmentName.trim() };
    const updatedPhotos = [...photos, newPhoto];
    const updatedProfile = { ...p, beforeAfterPhotos: updatedPhotos };
    await store.saveDoctorProfile(updatedProfile);
    setProfile(updatedProfile);
    setPhotos(updatedPhotos);
    setPendingPhotos(null);
    setTreatmentName("");
  };

  // Cancel pending
  const handleCancelPending = () => {
    setPendingPhotos(null);
    setTreatmentName("");
  };

  // Remove a BA photo
  const handleRemove = (index: number) => {
    Alert.alert("Remove Photo", "Are you sure you want to remove this before/after photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive", onPress: async () => {
          const updatedPhotos = photos.filter((_, i) => i !== index);
          const updatedProfile = { ...profile, beforeAfterPhotos: updatedPhotos };
          await store.saveDoctorProfile(updatedProfile);
          setProfile(updatedProfile);
          setPhotos(updatedPhotos);
        },
      },
    ]);
  };

  // Start add flow
  const startAddFlow = () => {
    if (pendingPhotos) return; // already in progress
    setSourceStep("before");
    Alert.alert("Add Photos", "First, select the BEFORE photo", [
      { text: "Cancel", style: "cancel" },
      { text: "Continue", onPress: () => { setSourceStep("before"); setShowSourceModal(true); } },
    ]);
  };

  return (
    <View style={s.container}>
      {/* Source Selection Modal */}
      <Modal visible={showSourceModal} transparent animationType="fade" onRequestClose={() => setShowSourceModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowSourceModal(false)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>
              {sourceStep === "before" ? "Select BEFORE Photo" : "Select AFTER Photo"}
            </Text>
            <TouchableOpacity style={s.modalBtn} onPress={() => handleSourceSelect("camera")}>
              <Text style={s.modalBtnIcon}>📷</Text>
              <Text style={s.modalBtnText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalBtn} onPress={() => handleSourceSelect("library")}>
              <Text style={s.modalBtnIcon}>🖼</Text>
              <Text style={s.modalBtnText}>Choose from Library</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.modalBtn, s.modalBtnCancel]} onPress={() => setShowSourceModal(false)}>
              <Text style={s.modalBtnCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Header */}
      <LinearGradient colors={[DoctorTheme.primary, DoctorTheme.primaryDark]} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Before & After Photos</Text>
          <Text style={s.headerSubtitle}>{photos.length} photo{photos.length !== 1 ? " sets" : " set"}</Text>
        </View>
      </LinearGradient>

      {/* Content */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>

          {/* Inline Treatment Name Input — shown after both photos selected */}
          {pendingPhotos && (
            <View style={s.pendingCard}>
              <Text style={s.pendingTitle}>New Before & After</Text>
              <View style={s.pendingImages}>
                <View style={s.pendingImgWrap}>
                  <Image source={{ uri: pendingPhotos.before }} style={s.pendingImg} />
                  <View style={s.imgLabel}><Text style={s.imgLabelText}>Before</Text></View>
                </View>
                <Text style={s.arrow}>→</Text>
                <View style={s.pendingImgWrap}>
                  <Image source={{ uri: pendingPhotos.after }} style={s.pendingImg} />
                  <View style={[s.imgLabel, s.imgLabelAfter]}><Text style={s.imgLabelText}>After</Text></View>
                </View>
              </View>
              <Text style={s.inputLabel}>Treatment Name</Text>
              <TextInput
                style={s.treatmentInput}
                placeholder="e.g. Dental Implant, Veneers..."
                placeholderTextColor={SharedColors.navyMuted}
                value={treatmentName}
                onChangeText={setTreatmentName}
                autoFocus
              />
              <View style={s.pendingBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={handleCancelPending}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, !treatmentName.trim() && { opacity: 0.4 }]}
                  onPress={handleSave}
                  disabled={!treatmentName.trim()}
                >
                  <Text style={s.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Existing photos */}
          {photos.length === 0 && !pendingPhotos ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📸</Text>
              <Text style={s.emptyTitle}>No photos yet</Text>
              <Text style={s.emptyDesc}>
                Showcase your work by adding{"\n"}before and after treatment photos
              </Text>
            </View>
          ) : (
            photos.map((photo, i) => (
              <View key={i} style={s.card}>
                <View style={s.cardImages}>
                  <View style={s.imgWrap}>
                    <Image source={{ uri: photo.before }} style={s.img} />
                    <View style={s.imgLabel}><Text style={s.imgLabelText}>Before</Text></View>
                  </View>
                  <Text style={s.arrow}>→</Text>
                  <View style={s.imgWrap}>
                    <Image source={{ uri: photo.after }} style={s.img} />
                    <View style={[s.imgLabel, s.imgLabelAfter]}><Text style={s.imgLabelText}>After</Text></View>
                  </View>
                </View>
                <View style={s.cardFooter}>
                  <View style={s.treatmentBadge}>
                    <Text style={s.treatmentBadgeText}>{photo.treatment}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemove(i)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={s.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Add Button — hidden while editing */}
      {!pendingPhotos && (
        <View style={s.addBtnWrap}>
          <TouchableOpacity style={s.addBtn} onPress={startAddFlow} activeOpacity={0.8}>
            <Text style={s.addBtnIcon}>📷</Text>
            <Text style={s.addBtnText}>Add Before/After Photos</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: {
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20,
    flexDirection: "row", alignItems: "center", gap: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: SharedColors.white, fontWeight: "600", marginTop: -2 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: SharedColors.white },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  // Empty state
  empty: { alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: SharedColors.navy, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: SharedColors.navySec, textAlign: "center", lineHeight: 22 },

  // List
  list: { padding: 16, gap: 14 },

  // Pending card (inline treatment name input)
  pendingCard: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: DoctorTheme.primary,
    shadowColor: DoctorTheme.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  pendingTitle: { fontSize: 15, fontWeight: "700", color: DoctorTheme.primary, marginBottom: 12 },
  pendingImages: { flexDirection: "row", alignItems: "center", gap: 8 },
  pendingImgWrap: { flex: 1, position: "relative" as const },
  pendingImg: { width: "100%", height: 100, borderRadius: 12, backgroundColor: SharedColors.border },
  inputLabel: { fontSize: 12, fontWeight: "600", color: SharedColors.navySec, marginTop: 14, marginBottom: 6 },
  treatmentInput: {
    borderWidth: 1.5, borderColor: SharedColors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: SharedColors.navy,
    backgroundColor: SharedColors.bg,
  },
  pendingBtns: { flexDirection: "row", gap: 10, marginTop: 14 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: SharedColors.border, alignItems: "center",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: SharedColors.navySec },
  saveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: DoctorTheme.primary, alignItems: "center",
  },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: SharedColors.white },

  // Card
  card: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: SharedColors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardImages: { flexDirection: "row", alignItems: "center", gap: 8 },
  imgWrap: { flex: 1, position: "relative" as const },
  img: { width: "100%", height: 120, borderRadius: 12, backgroundColor: SharedColors.border },
  imgLabel: {
    position: "absolute" as const, top: 8, left: 8,
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  imgLabelAfter: { backgroundColor: "rgba(22,163,74,0.85)" },
  imgLabelText: { fontSize: 10, fontWeight: "700", color: SharedColors.white },
  arrow: { fontSize: 18, color: SharedColors.navyMuted, fontWeight: "700" },
  cardFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: SharedColors.border,
  },
  treatmentBadge: {
    backgroundColor: "rgba(20,184,166,0.1)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  treatmentBadgeText: { fontSize: 12, fontWeight: "600", color: DoctorTheme.primary },
  removeText: { fontSize: 13, color: SharedColors.red, fontWeight: "600" },

  // Fixed Add Button
  addBtnWrap: {
    position: "absolute" as const, bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingBottom: 34, paddingTop: 12,
    backgroundColor: SharedColors.bg,
    borderTopWidth: 1, borderTopColor: SharedColors.border,
  },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: DoctorTheme.primary, borderRadius: 14, paddingVertical: 16,
    shadowColor: DoctorTheme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  addBtnIcon: { fontSize: 18 },
  addBtnText: { fontSize: 15, fontWeight: "700", color: SharedColors.white },

  // Source Modal (only one modal now — camera/library selection)
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end", alignItems: "center",
  },
  modalSheet: {
    width: "100%", backgroundColor: SharedColors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: SharedColors.navy, textAlign: "center", marginBottom: 16 },
  modalBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 16, paddingHorizontal: 16,
    borderRadius: 12, backgroundColor: "#f1f5f9", marginBottom: 8,
  },
  modalBtnIcon: { fontSize: 20 },
  modalBtnText: { fontSize: 15, fontWeight: "600", color: SharedColors.navy },
  modalBtnCancel: { backgroundColor: "transparent", justifyContent: "center", marginTop: 4 },
  modalBtnCancelText: { fontSize: 15, fontWeight: "600", color: SharedColors.red, textAlign: "center" },
});
