import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert, Image, Modal, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { TreatmentWarranty, store } from "../../lib/store";
import {
  WARRANTY_CONFIG, warrantyLabel,
  findAftercarePartners, AFTERCARE_SERVICES,
  AftercarePartner,
} from "../../constants/warranty";

const T = {
  purple: "#4A0080", purpleMid: "#5C10A0", purpleLight: "#f0e6f6",
  navy: "#0f172a", slate: "#64748b", slateLight: "#94a3b8",
  border: "#e2e8f0", bg: "#f8fafc", white: "#ffffff",
  green: "#16a34a", greenLight: "#dcfce7",
  coral: "#e05a3a", coralLight: "#fef2ee",
  amber: "#d97706", amberLight: "#fef3c7",
  blue: "#2563eb", blueLight: "#dbeafe",
};

export default function WarrantyDetailScreen() {
  const { warrantyId } = useLocalSearchParams<{ warrantyId: string }>();
  const [warranty, setWarranty] = useState<TreatmentWarranty | null>(null);
  const [partners, setPartners] = useState<AftercarePartner[]>([]);

  // Claim form
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimDesc, setClaimDesc] = useState("");
  const [claimPhotos, setClaimPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [warrantyId]);

  const loadData = async () => {
    if (!warrantyId) return;
    const w = await store.getWarranty(warrantyId);
    setWarranty(w);
    if (w) {
      const p = findAftercarePartners(w.treatmentName);
      setPartners(p);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const daysRemaining = () => {
    if (!warranty) return 0;
    const diff = new Date(warranty.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const progressPercent = () => {
    if (!warranty) return 0;
    const total = new Date(warranty.expiresAt).getTime() - new Date(warranty.treatmentDate).getTime();
    const elapsed = Date.now() - new Date(warranty.treatmentDate).getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const handlePickPhoto = async () => {
    if (claimPhotos.length >= 5) {
      Alert.alert("Maximum 5 photos");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setClaimPhotos([...claimPhotos, result.assets[0].uri]);
    }
  };

  const handleSubmitClaim = async () => {
    if (!warranty || !claimDesc.trim()) return;
    setSubmitting(true);
    await store.submitWarrantyClaim(warranty.id, {
      description: claimDesc.trim(),
      photos: claimPhotos,
    });
    setSubmitting(false);
    setShowClaimModal(false);
    setClaimDesc("");
    setClaimPhotos([]);
    loadData();
    Alert.alert("Claim Submitted", "We'll review your claim within 1-3 business days.");
  };

  if (!warranty) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: T.slate }}>Loading...</Text>
      </View>
    );
  }

  const config = WARRANTY_CONFIG[warranty.treatmentName];
  const isActive = warranty.status === "active";
  const days = daysRemaining();
  const progress = progressPercent();

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient colors={["#3D0070", "#2F0058", "#220040"]} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{warranty.treatmentName}</Text>
          <Text style={s.headerSub}>{warrantyLabel(warranty.warrantyMonths)}</Text>
        </View>
        <Text style={s.headerIcon}>🛡️</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={s.statusCard}>
          <View style={s.statusRow}>
            <View>
              <Text style={s.statusLabel}>Status</Text>
              <Text style={[s.statusValue, {
                color: isActive ? T.green : warranty.status === "claimed" ? T.amber : T.slate,
              }]}>
                {warranty.status === "active" ? "🟢 Active" :
                  warranty.status === "claimed" ? "📋 Claim In Progress" :
                    warranty.status === "expired" ? "⏰ Expired" : "❌ Voided"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.statusLabel}>Days Remaining</Text>
              <Text style={[s.daysNumber, days <= 90 && { color: T.amber }]}>{days}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={s.progressLabels}>
            <Text style={s.progressDate}>{formatDate(warranty.treatmentDate)}</Text>
            <Text style={s.progressDate}>{formatDate(warranty.expiresAt)}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Warranty Details</Text>
          <View style={s.detailCard}>
            <DetailRow label="Treatment" value={`${warranty.treatmentName} ×${warranty.treatmentQty}`} />
            <DetailRow label="Clinic" value={warranty.clinicName} />
            <DetailRow label="Dentist" value={warranty.dentistName} />
            <DetailRow label="Treatment Date" value={formatDate(warranty.treatmentDate)} />
            <DetailRow label="Warranty Expires" value={formatDate(warranty.expiresAt)} />
          </View>
        </View>

        {/* Coverage */}
        {config && config.coverage.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>What's Covered</Text>
            <View style={s.coverageCard}>
              {config.coverage.map((item, i) => (
                <View key={i} style={s.coverageItem}>
                  <Text style={s.coverageCheck}>✅</Text>
                  <Text style={s.coverageText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Exclusions */}
        {config && config.exclusions.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Not Covered</Text>
            <View style={s.coverageCard}>
              {config.exclusions.map((item, i) => (
                <View key={i} style={s.coverageItem}>
                  <Text style={s.coverageCheck}>❌</Text>
                  <Text style={s.coverageText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* US Aftercare Network */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🇺🇸 US Aftercare Network</Text>
          <View style={s.aftercareInfo}>
            <Text style={s.aftercareDesc}>
              Need a check-up or have concerns after returning home? Visit any of our US partner clinics for aftercare — included with your DentaRoute warranty.
            </Text>

            <Text style={s.aftercareSubtitle}>Included Aftercare Services</Text>
            {AFTERCARE_SERVICES.map((svc, i) => (
              <View key={i} style={s.serviceItem}>
                <Text style={s.serviceCheck}>•</Text>
                <Text style={s.serviceText}>{svc}</Text>
              </View>
            ))}
          </View>

          {/* Partner Clinics */}
          {partners.length > 0 && (
            <>
              <Text style={s.partnersTitle}>
                Partner Clinics ({partners.length})
              </Text>
              {partners.map((p) => (
                <View key={p.id} style={s.partnerCard}>
                  <View style={s.partnerHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.partnerName}>{p.clinicName}</Text>
                      <Text style={s.partnerLocation}>
                        {p.city}, {p.state} {p.zipCode}
                      </Text>
                    </View>
                    <View style={s.partnerRating}>
                      <Text style={s.partnerStar}>⭐</Text>
                      <Text style={s.partnerRatingText}>{p.rating}</Text>
                    </View>
                  </View>
                  <Text style={s.partnerAddress}>{p.address}</Text>
                  <Text style={s.partnerPhone}>{p.phone}</Text>
                  <View style={s.partnerTags}>
                    {p.languages.map((lang) => (
                      <View key={lang} style={s.langTag}>
                        <Text style={s.langTagText}>{lang}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Claims History */}
        {warranty.claims.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Claim History</Text>
            {warranty.claims.map((claim) => (
              <View key={claim.id} style={s.claimCard}>
                <View style={s.claimHeader}>
                  <Text style={s.claimStatus}>
                    {claim.status === "submitted" ? "📤 Submitted" :
                      claim.status === "reviewing" ? "🔍 Under Review" :
                        claim.status === "approved" ? "✅ Approved" : "❌ Denied"}
                  </Text>
                  <Text style={s.claimDate}>{formatDate(claim.submittedAt)}</Text>
                </View>
                <Text style={s.claimDesc}>{claim.description}</Text>
                {claim.photos.length > 0 && (
                  <View style={s.claimPhotos}>
                    {claim.photos.map((uri, i) => (
                      <Image key={i} source={{ uri }} style={s.claimPhoto} />
                    ))}
                  </View>
                )}
                {claim.resolution && (
                  <View style={s.resolutionBox}>
                    <Text style={s.resolutionLabel}>Resolution</Text>
                    <Text style={s.resolutionText}>{claim.resolution}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* File Claim Button */}
        {isActive && (
          <TouchableOpacity style={s.claimBtn} onPress={() => setShowClaimModal(true)}>
            <Text style={s.claimBtnText}>File a Warranty Claim</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Claim Modal */}
      <Modal visible={showClaimModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>File Warranty Claim</Text>
              <TouchableOpacity onPress={() => setShowClaimModal(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={s.modalLabel}>Describe the Issue</Text>
              <TextInput
                style={s.modalInput}
                placeholder="What happened? Describe your symptoms or issue..."
                placeholderTextColor={T.slateLight}
                multiline
                numberOfLines={5}
                value={claimDesc}
                onChangeText={setClaimDesc}
                textAlignVertical="top"
              />

              <Text style={s.modalLabel}>Photos (optional, up to 5)</Text>
              <View style={s.photoRow}>
                {claimPhotos.map((uri, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setClaimPhotos(claimPhotos.filter((_, idx) => idx !== i))}
                  >
                    <Image source={{ uri }} style={s.photoThumb} />
                    <View style={s.photoRemove}>
                      <Text style={s.photoRemoveText}>✕</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {claimPhotos.length < 5 && (
                  <TouchableOpacity style={s.addPhotoBtn} onPress={handlePickPhoto}>
                    <Text style={s.addPhotoBtnText}>+</Text>
                    <Text style={s.addPhotoBtnLabel}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={s.modalNote}>
                <Text style={s.modalNoteText}>
                  Our team will review your claim within 1-3 business days. You may also visit a US partner clinic for immediate assessment.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[s.submitBtn, (!claimDesc.trim() || submitting) && s.submitBtnDisabled]}
              onPress={handleSubmitClaim}
              disabled={!claimDesc.trim() || submitting}
            >
              <Text style={s.submitBtnText}>
                {submitting ? "Submitting..." : "Submit Claim"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  headerIcon: { fontSize: 28 },

  content: { padding: 16 },

  // Status Card
  statusCard: {
    backgroundColor: T.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: T.border, marginBottom: 16,
  },
  statusRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  statusLabel: { fontSize: 11, color: T.slate, fontWeight: "600", marginBottom: 4 },
  statusValue: { fontSize: 15, fontWeight: "700" },
  daysNumber: { fontSize: 28, fontWeight: "800", color: T.green },
  progressTrack: {
    height: 6, borderRadius: 3, backgroundColor: "#e2e8f0", overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: T.purple, borderRadius: 3 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  progressDate: { fontSize: 10, color: T.slateLight },

  // Section
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: T.navy, marginBottom: 10 },

  // Detail card
  detailCard: {
    backgroundColor: T.white, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: T.border, gap: 8,
  },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { fontSize: 13, color: T.slate },
  detailValue: { fontSize: 13, fontWeight: "600", color: T.navy },

  // Coverage
  coverageCard: {
    backgroundColor: T.white, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: T.border, gap: 8,
  },
  coverageItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  coverageCheck: { fontSize: 13, marginTop: 1 },
  coverageText: { flex: 1, fontSize: 13, color: T.navy, lineHeight: 18 },

  // Aftercare
  aftercareInfo: {
    backgroundColor: "#f0f7ff", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#dbeafe", marginBottom: 12,
  },
  aftercareDesc: { fontSize: 13, color: "#1e40af", lineHeight: 20, marginBottom: 14 },
  aftercareSubtitle: { fontSize: 13, fontWeight: "700", color: "#1d4ed8", marginBottom: 8 },
  serviceItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 },
  serviceCheck: { fontSize: 14, color: "#3b82f6", marginTop: 1 },
  serviceText: { flex: 1, fontSize: 12, color: "#1e40af", lineHeight: 17 },

  partnersTitle: { fontSize: 14, fontWeight: "700", color: T.navy, marginBottom: 8, marginTop: 4 },
  partnerCard: {
    backgroundColor: T.white, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: T.border, marginBottom: 10,
  },
  partnerHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  partnerName: { fontSize: 14, fontWeight: "700", color: T.navy },
  partnerLocation: { fontSize: 12, color: T.slate, marginTop: 2 },
  partnerRating: { flexDirection: "row", alignItems: "center", gap: 4 },
  partnerStar: { fontSize: 12 },
  partnerRatingText: { fontSize: 13, fontWeight: "700", color: T.navy },
  partnerAddress: { fontSize: 12, color: T.slate, marginBottom: 2 },
  partnerPhone: { fontSize: 12, color: T.blue, fontWeight: "600", marginBottom: 8 },
  partnerTags: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  langTag: {
    backgroundColor: "#f1f5f9", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  langTagText: { fontSize: 11, color: T.slate, fontWeight: "600" },

  // Claims
  claimCard: {
    backgroundColor: T.white, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: T.border, marginBottom: 10,
  },
  claimHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  claimStatus: { fontSize: 13, fontWeight: "700" },
  claimDate: { fontSize: 12, color: T.slate },
  claimDesc: { fontSize: 13, color: T.navy, lineHeight: 18, marginBottom: 8 },
  claimPhotos: { flexDirection: "row", gap: 8, marginBottom: 8 },
  claimPhoto: { width: 56, height: 56, borderRadius: 8 },
  resolutionBox: {
    backgroundColor: T.greenLight, borderRadius: 8, padding: 10, marginTop: 4,
  },
  resolutionLabel: { fontSize: 11, fontWeight: "700", color: T.green, marginBottom: 4 },
  resolutionText: { fontSize: 13, color: "#15803d", lineHeight: 18 },

  // Claim Button
  claimBtn: {
    backgroundColor: T.coral, borderRadius: 14, paddingVertical: 16,
    alignItems: "center", marginTop: 8,
  },
  claimBtnText: { fontSize: 15, fontWeight: "700", color: T.white },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: T.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "85%", paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: T.navy },
  modalClose: { fontSize: 20, color: T.slate, padding: 4 },
  modalBody: { padding: 20 },
  modalLabel: { fontSize: 14, fontWeight: "600", color: T.navy, marginBottom: 8 },
  modalInput: {
    borderWidth: 1, borderColor: T.border, borderRadius: 12,
    padding: 14, fontSize: 14, color: T.navy,
    minHeight: 120, marginBottom: 20, backgroundColor: T.bg,
  },
  photoRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: 16 },
  photoThumb: { width: 70, height: 70, borderRadius: 10 },
  photoRemove: {
    position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11,
    backgroundColor: T.coral, alignItems: "center", justifyContent: "center",
  },
  photoRemoveText: { color: T.white, fontSize: 12, fontWeight: "700" },
  addPhotoBtn: {
    width: 70, height: 70, borderRadius: 10, borderWidth: 2,
    borderColor: T.border, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  addPhotoBtnText: { fontSize: 24, color: T.slateLight },
  addPhotoBtnLabel: { fontSize: 10, color: T.slateLight },
  modalNote: {
    backgroundColor: T.purpleLight, borderRadius: 10, padding: 12, marginBottom: 8,
  },
  modalNoteText: { fontSize: 12, color: T.purple, lineHeight: 18 },
  submitBtn: {
    backgroundColor: T.purple, borderRadius: 14, paddingVertical: 16,
    alignItems: "center", marginHorizontal: 20,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 15, fontWeight: "700", color: T.white },
});
