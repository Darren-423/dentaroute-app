import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator, Alert,
    Dimensions,
    Image, Modal,
    ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View,
} from "react-native";
import { Booking, DentistQuote, PatientCase, store } from "../../lib/store";
import { toDoctorLabel } from "../../lib/treatmentTerminology";

import { DoctorTheme, SharedColors } from "../../constants/theme";
const TREATMENT_OPTIONS = [
  "Implant: Whole (Root + Crown)",
  "Implant: Root (Titanium Post) Only",
  "Implant: Crown Only",
  "Veneers",
  "Smile Makeover",
  "Fillings",
  "Crowns",
  "Root Canals",
  "Gum Treatment",
  "Invisalign",
  "Oral Sleep Appliance",
  "Tongue Tie Surgery",
  "Wisdom Teeth Extractions",
  "Other",
].map((name) => toDoctorLabel(name));

// Minimum prices (price floor) for specific treatments
const PRICE_FLOORS: Record<string, number> = {
  [toDoctorLabel("Implant: Whole (Root + Crown)")]: 1500,
  [toDoctorLabel("Implant: Root (Titanium Post) Only")]: 1000,
  [toDoctorLabel("Implant: Crown Only")]: 500,
  "Veneers": 800,
};

const getPriceFloor = (treatment: string): number => {
  return PRICE_FLOORS[toDoctorLabel(treatment)] || 0;
};

const VISIT_PRESETS = [
  { label: "Standard Implant", visits: 2, gaps: [{ months: 4, days: 0, reason: "Bone integration" }] },
  { label: "Implant + Bone Graft", visits: 3, gaps: [{ months: 5, days: 0, reason: "Bone integration" }, { months: 4, days: 0, reason: "Bone integration" }] },
  { label: "Veneer Set", visits: 2, gaps: [{ months: 0, days: 10, reason: "Lab processing" }] },
  { label: "Full Mouth", visits: 3, gaps: [{ months: 0, days: 14, reason: "Lab/fabrication" }, { months: 0, days: 10, reason: "Lab/fabrication" }] },
  { label: "Smile Makeover", visits: 2, gaps: [{ months: 0, days: 12, reason: "Lab processing" }] },
  { label: "Invisalign Start", visits: 2, gaps: [{ months: 0, days: 18, reason: "Custom fabrication" }] },
  { label: "Root Canal + Crown", visits: 2, gaps: [{ months: 0, days: 10, reason: "Lab processing" }] },
  { label: "Extraction + Implant", visits: 2, gaps: [{ months: 4, days: 0, reason: "Bone integration" }] },
];

type PlanItem = {
  id: string;
  treatment: string;
  qty: number;
  price: string;
};

export default function DoctorCaseDetailScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const [caseData, setCaseData] = useState<PatientCase | null>(null);

  // Treatment Plan (doctor's own plan)
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [showTreatmentPicker, setShowTreatmentPicker] = useState(false);
  const [searchTreatment, setSearchTreatment] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingQuote, setExistingQuote] = useState<DentistQuote | null>(null);
  const [visitsCount, setVisitsCount] = useState(1);
  const [gapConfigs, setGapConfigs] = useState<{ gapMonths: number; gapDays: number; gapReason: string }[]>([]);
  const [activeReasonPicker, setActiveReasonPicker] = useState<number | null>(null);

  const GAP_REASONS = [
    "Bone Integration Period",
    "Lab Processing Period",
    "Soft Tissue Healing",
    "Pre-surgery Preparation",
    "Post-extraction Healing",
    "Orthodontic Adjustment",
    "Custom Prosthesis Fabrication",
    "Other",
  ];

  // Apply a multi-visit preset (visits + gaps only, not treatments/prices)
  const applyPreset = (preset: typeof VISIT_PRESETS[number]) => {
    setVisitsCount(preset.visits);
    setGapConfigs(preset.gaps.map((g) => ({
      gapMonths: g.months,
      gapDays: g.days,
      gapReason: g.reason,
    })));
  };

  // Patient uploaded files & travel
  const [patientFiles, setPatientFiles] = useState<{
    xrays: string[]; treatmentPlans: string[]; photos: string[];
  }>({ xrays: [], treatmentPlans: [], photos: [] });
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [patientProfileImage, setPatientProfileImage] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  // Smart Collapse state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (caseId) {
          const c = await store.getCase(caseId);
          setCaseData(c);
          const files = await store.getPatientFiles();
          if (files) setPatientFiles(files);
          const profile = await store.getDoctorProfile();
          if (profile) setDoctorProfile(profile);
          const pp = await store.getPatientProfile();
          if (pp?.profileImage) setPatientProfileImage(pp.profileImage);

          // Load booking if case is booked
          if (c?.status === "booked") {
            const bk = await store.getBookingForCase(caseId);
            if (bk) setBooking(bk);
          }

          // Check if doctor already sent a quote for this case
          const quotes = await store.getQuotesForCase(caseId);
          const doctorName = profile?.name || "Doctor";
          const myQuote = quotes.find((q) => q.dentistName === doctorName);
          if (myQuote) {
            setExistingQuote(myQuote);
            setPlanItems(myQuote.treatments.map((t, i) => ({
              id: String(i),
              treatment: toDoctorLabel(t.name),
              qty: t.qty,
              price: String(t.price),
            })));
            const quoteVisits = Array.isArray(myQuote.visits) ? myQuote.visits : [];
            if (quoteVisits.length > 0) {
              setVisitsCount(quoteVisits.length);
              const gaps: { gapMonths: number; gapDays: number; gapReason: string }[] = [];
              for (let i = 0; i < quoteVisits.length - 1; i++) {
                gaps.push({
                  gapMonths: quoteVisits[i]?.gapMonths || 0,
                  gapDays: quoteVisits[i]?.gapDays || 0,
                  gapReason: (quoteVisits[i] as any)?.gapReason || "",
                });
              }
              setGapConfigs(gaps);
            }
            setSubmitted(true);
          }
        }
      };
      load();
    }, [caseId])
  );

  // ── Plan helpers ──
  const addPlanItem = (treatment: string) => {
    const id = Date.now().toString();
    setPlanItems((prev) => [...prev, { id, treatment: toDoctorLabel(treatment), qty: 1, price: "" }]);
    setShowTreatmentPicker(false);
    setSearchTreatment("");
  };

  const removePlanItem = (id: string) => {
    setPlanItems((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePlanItem = (id: string, field: "qty" | "price", value: any) => {
    setPlanItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const totalPrice = planItems.reduce((sum, p) => {
    return sum + Number(p.price || 0) * p.qty;
  }, 0);

  const allPricesFilled = planItems.length > 0 && planItems.every((p) => {
    const price = Number(p.price) || 0;
    const floor = getPriceFloor(p.treatment);
    return price > 0 && price >= floor;
  });

  // ── Check if doctor's plan matches patient's requested treatments ──
  const treatmentsDiffer = (() => {
    if (!caseData?.treatments || caseData.treatments.length === 0) return false;
    if (planItems.length !== caseData.treatments.length) return true;
    const patientSet = caseData.treatments.map((t) => `${toDoctorLabel(t.name)}:${t.qty}`).sort().join(",");
    const doctorSet = planItems.map((p) => `${p.treatment}:${p.qty}`).sort().join(",");
    return patientSet !== doctorSet;
  })();

  const isComplete = allPricesFilled;

  const handleSendQuote = async () => {
    if (!isComplete || !caseData) return;
    setLoading(true);
    try {
      const normalizeSlots = (value: any): { date: string; time: string }[] => {
        if (!Array.isArray(value)) return [];
        return value
          .filter((slot) => slot?.date && slot?.time)
          .map((slot) => ({ date: String(slot.date), time: String(slot.time) }));
      };

      const availabilityByVisit: Record<number, { date: string; time: string }[]> = {};
      const byVisitRaw = Array.isArray(doctorProfile?.availableSlotsByVisit)
        ? doctorProfile.availableSlotsByVisit
        : [];
      for (const item of byVisitRaw) {
        const visitNum = Number(item?.visit);
        if (!visitNum) continue;
        availabilityByVisit[visitNum] = normalizeSlots(item?.availabilitySlots);
      }

      const sharedSlots = normalizeSlots(doctorProfile?.availableSlots);
      const safeVisitsCount = Math.max(1, visitsCount);
      const visits = Array.from({ length: safeVisitsCount }, (_, index) => {
        const visitNum = index + 1;
        const visitSpecific = availabilityByVisit[visitNum] || [];
        const availabilitySlots = visitSpecific.length > 0 ? visitSpecific : sharedSlots;
        const isLast = visitNum === safeVisitsCount;
        const gapIndex = visitNum - 1;
        const gapConfig = gapIndex < gapConfigs.length ? gapConfigs[gapIndex] : { gapMonths: 0, gapDays: 0, gapReason: "" };

        return {
          visit: visitNum,
          description: `Visit ${visitNum}`,
          ...(!isLast && gapConfig.gapMonths > 0 ? { gapMonths: gapConfig.gapMonths } : {}),
          ...(!isLast && gapConfig.gapDays > 0 ? { gapDays: gapConfig.gapDays } : {}),
          ...(!isLast && gapConfig.gapReason ? { gapReason: gapConfig.gapReason } : {}),
          ...(availabilitySlots.length > 0 ? { availabilitySlots } : {}),
        };
      });

      await store.createQuote({
        caseId: caseData.id,
        dentistName: doctorProfile?.fullName || doctorProfile?.name || "Doctor",
        clinicName: doctorProfile?.clinicName || doctorProfile?.clinic || "Clinic",
        location: doctorProfile?.location || "Gangnam, Seoul",
        rating: doctorProfile?.rating || 4.9,
        reviewCount: doctorProfile?.reviewCount || 127,
        totalPrice,
        treatments: planItems.map((p) => ({
          name: p.treatment,
          qty: p.qty,
          price: Number(p.price || 0),
        })),
        treatmentDetails: "",
        duration: visits.length > 1 ? `${visits.length} Visits` : "1 Visit",
        visits,
        message: "",
      });
      setSubmitted(true);
    } catch (err) {
      console.log("Error sending quote:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Quote Sent (only show this screen if case is NOT yet booked) ──
  const isBooked = caseData?.status === "booked";
  if (submitted && !isBooked) {
    const displayPrice = existingQuote ? existingQuote.totalPrice : totalPrice;
    const displayItems = existingQuote
      ? existingQuote.treatments.map((t, i) => ({ id: String(i), treatment: t.name, qty: t.qty, price: String(t.price) }))
      : planItems;
    return (
      <LinearGradient colors={[DoctorTheme.primary, DoctorTheme.primaryDark]} style={s.submittedWrap}>
        <Text style={{ fontSize: 80, marginBottom: 20 }}>✅</Text>
        <Text style={s.submittedTitle}>Quote Sent</Text>
        <Text style={s.submittedDesc}>
          {existingQuote
            ? `You already sent a quote for this case on ${new Date(existingQuote.createdAt).toLocaleDateString()}.`
            : `The patient will see your quote of $${displayPrice.toLocaleString()}\nin their dashboard.`}
        </Text>
        <View style={s.sentSummary}>
          {displayItems.map((p) => (
            <View key={p.id} style={s.sentRow}>
              <Text style={s.sentName}>{p.treatment} × {p.qty}</Text>
              <Text style={s.sentPrice}>${(Number(p.price || 0) * p.qty).toLocaleString()}</Text>
            </View>
          ))}
          <View style={s.sentTotalRow}>
            <Text style={s.sentTotalLabel}>Total</Text>
            <Text style={s.sentTotalPrice}>${displayPrice.toLocaleString()}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={s.backDashBtn}
          onPress={() => router.replace("/doctor/dashboard" as any)}
          activeOpacity={0.85}
        >
          <Text style={s.backDashText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  // ── Parse medical notes for display ──
  const parsedMedical: { label: string; icon: string; items: string[] }[] = [];
  let medicalIsJSON = false;
  if (caseData?.medicalNotes) {
    try {
      const m = JSON.parse(caseData.medicalNotes);
      if (m && typeof m === "object" && !Array.isArray(m)) {
        if (Array.isArray(m.conditions) && m.conditions.length > 0)
          parsedMedical.push({ label: "Conditions", icon: "🩺", items: m.conditions.map(String) });
        if (Array.isArray(m.medications) && m.medications.length > 0)
          parsedMedical.push({ label: "Medications", icon: "💊", items: m.medications.map(String) });
        if (Array.isArray(m.allergies) && m.allergies.length > 0)
          parsedMedical.push({ label: "Allergies", icon: "⚠️", items: m.allergies.map(String) });
        if (parsedMedical.length > 0) medicalIsJSON = true;
      }
    } catch (_e) { /* not JSON */ }
  }

  // ── Filtered treatment options for picker ──
  const filteredOptions = TREATMENT_OPTIONS.filter(
    (t) =>
      t.toLowerCase().includes(searchTreatment.toLowerCase()) &&
      !planItems.some((p) => toDoctorLabel(p.treatment) === t)
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient colors={[DoctorTheme.primary, DoctorTheme.primaryDark]} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Patient Case</Text>
        <View style={s.subtitleRow}>
          {patientProfileImage && (
            <Image source={{ uri: patientProfileImage }} style={s.headerAvatar} />
          )}
          <Text style={s.subtitle}>
            Case #{caseData?.id || "..."} · {caseData?.patientName || "Patient"}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ backgroundColor: "#f1f5f9", borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: SharedColors.border }}><Text style={{ fontSize: 11, color: SharedColors.slate, lineHeight: 16 }}>Do not provide specific diagnoses or treatment plans via chat or quotes. Only provide estimates pending in-person examination.</Text></View>

        {/* ════════════════ SECTION: Patient Info ════════════════ */}
        <TouchableOpacity style={s.sectionHeader} onPress={() => toggleSection("patientInfo")} activeOpacity={0.7}>
          <Text style={s.sectionHeaderText}>{collapsedSections["patientInfo"] ? "▸" : "▾"} Patient Info</Text>
        </TouchableOpacity>

            {/* Basic Info */}
            {!collapsedSections["patientInfo"] && (
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>PATIENT INFO</Text>
              <View style={s.infoRow}>
                <Text style={s.infoRowLabel}>Name</Text>
                <View style={s.nameValueRow}>
                  <Text style={s.infoRowValue}>{caseData?.patientName || "Patient"}</Text>
                  <TouchableOpacity
                    style={s.viewProfileBtn}
                    onPress={() => router.push({
                      pathname: "/doctor/patient-info" as any,
                      params: { patientName: caseData?.patientName, caseId: caseData?.id },
                    })}
                    activeOpacity={0.7}
                  >
                    <Text style={s.viewProfileText}>View Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoRowLabel}>Country</Text>
                <Text style={s.infoRowValue}>🌍 {caseData?.country || "—"}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoRowLabel}>Submitted</Text>
                <Text style={s.infoRowValue}>{caseData?.date || "—"}</Text>
              </View>
              {caseData?.birthDate && (
                <View style={s.infoRow}>
                  <Text style={s.infoRowLabel}>Birth Date</Text>
                  <Text style={s.infoRowValue}>{caseData.birthDate}</Text>
                </View>
              )}
            </View>
            )}

            {/* Dental Issues */}
            {caseData?.dentalIssues && caseData.dentalIssues.length > 0 && (
              <View style={s.infoCard}>
                <TouchableOpacity onPress={() => toggleSection("dentalIssues")} activeOpacity={0.7}>
                  <Text style={s.infoLabel}>{collapsedSections["dentalIssues"] ? "▸" : "▾"} DENTAL ISSUES</Text>
                </TouchableOpacity>
                {!collapsedSections["dentalIssues"] && (
                <View style={s.issueTagWrap}>
                  {caseData.dentalIssues.map((issue) => (
                    <View key={issue} style={s.issueTag}>
                      <Text style={s.issueTagText}>{issue}</Text>
                    </View>
                  ))}
                </View>
                )}
              </View>
            )}

            {/* Medical Notes */}
            {medicalIsJSON && parsedMedical.length > 0 && (
              <View style={s.infoCard}>
                <Text style={s.infoLabel}>MEDICAL HISTORY</Text>
                <View style={s.medicalGrid}>
                  {parsedMedical.map((sec) => {
                    const isAllergy = sec.label === "Allergies";
                    const isMed = sec.label === "Medications";
                    return (
                      <View
                        key={sec.label}
                        style={[
                          s.medicalBlock,
                          isAllergy ? s.medicalBlockAllergy : isMed ? s.medicalBlockMed : s.medicalBlockCondition,
                        ]}
                      >
                        <Text style={[
                          s.medicalBlockLabel,
                          isAllergy ? s.medicalBlockLabelAllergy : isMed ? s.medicalBlockLabelMed : s.medicalBlockLabelCondition,
                        ]}>{sec.icon} {sec.label}</Text>
                        <View style={s.issueTagWrap}>
                          {sec.items.map((item, idx) => (
                            <View key={`${sec.label}-${idx}`} style={[s.issueTag, isAllergy ? s.allergyTag : isMed ? s.medicationTag : undefined]}>
                              <Text style={[s.issueTagText, isAllergy ? s.allergyTagText : isMed ? s.medicationTagText : undefined]}>{item}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
            {!medicalIsJSON && !!caseData?.medicalNotes && (
              <View style={s.infoCard}>
                <Text style={s.infoLabel}>MEDICAL NOTES</Text>
                <Text style={s.infoSub}>{caseData.medicalNotes}</Text>
              </View>
            )}

            {/* ── Patient Uploaded Files ── */}
            {(() => {
              const hasFileURIs = patientFiles.xrays.length > 0 || patientFiles.treatmentPlans.length > 0 || patientFiles.photos.length > 0;
              const totalFileCount = hasFileURIs
                ? patientFiles.xrays.length + patientFiles.treatmentPlans.length + patientFiles.photos.length
                : (() => {
                    const fc = caseData?.filesCount;
                    if (!fc) return 0;
                    return typeof fc === "object"
                      ? Object.values(fc).reduce((a: number, b: number) => a + b, 0)
                      : typeof fc === "number" ? fc : 0;
                  })();

              if (totalFileCount <= 0 && !hasFileURIs) return null;

              return (
                <>
                  {/* Files section header — always shows count badge */}
                  <TouchableOpacity onPress={() => toggleSection("files")} activeOpacity={0.7} style={s.infoCard}>
                    <Text style={s.infoLabel}>{collapsedSections["files"] ? "▸" : "▾"} Files & X-rays ({totalFileCount})</Text>
                  </TouchableOpacity>

                  {!collapsedSections["files"] && (
                  <>
                  {!hasFileURIs ? (
                    <View style={s.infoCard}>
                      <Text style={s.infoSub}>📎 {totalFileCount} file(s) attached</Text>
                    </View>
                  ) : (
                    <>
                      {/* Save All Button */}
                      <TouchableOpacity
                        style={s.saveAllBtn}
                        onPress={async () => {
                          try {
                            const { status } = await MediaLibrary.requestPermissionsAsync();
                            if (status !== "granted") {
                              Alert.alert("Permission needed", "Please allow photo library access.");
                              return;
                            }
                            const allUris = [
                              ...patientFiles.xrays,
                              ...patientFiles.treatmentPlans,
                              ...patientFiles.photos,
                            ];
                            let saved = 0;
                            for (const uri of allUris) {
                              try {
                                await MediaLibrary.saveToLibraryAsync(uri);
                                saved++;
                              } catch {}
                            }
                            Alert.alert("✅ Done", `${saved} image(s) saved to your photo library.`);
                          } catch {
                            Alert.alert("Error", "Failed to save images.");
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={s.saveAllBtnText}>
                          💾 Save All Photos ({totalFileCount})
                        </Text>
                      </TouchableOpacity>

                      {patientFiles.xrays.length > 0 && (
                        <View style={s.filesCard}>
                          <View style={s.filesHeader}>
                            <Text style={s.filesIcon}>🦷</Text>
                            <Text style={s.filesTitle}>X-RAYS</Text>
                            <View style={s.filesCountBadge}>
                              <Text style={s.filesCountText}>{patientFiles.xrays.length}</Text>
                            </View>
                          </View>
                          <View style={s.filesGrid}>
                            {patientFiles.xrays.map((uri, i) => (
                              <TouchableOpacity key={`xray-${i}`} style={s.fileThumbWrap} onPress={() => setViewerImage(uri)} activeOpacity={0.8}>
                                <Image source={{ uri }} style={s.fileThumb} />
                                <View style={s.fileThumbOverlay}><Text style={s.fileThumbOverlayText}>🔍</Text></View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}

                      {patientFiles.treatmentPlans.length > 0 && (
                        <View style={s.filesCard}>
                          <View style={s.filesHeader}>
                            <Text style={s.filesIcon}>📋</Text>
                            <Text style={s.filesTitle}>TREATMENT PLANS</Text>
                            <View style={s.filesCountBadge}>
                              <Text style={s.filesCountText}>{patientFiles.treatmentPlans.length}</Text>
                            </View>
                          </View>
                          <View style={s.filesGrid}>
                            {patientFiles.treatmentPlans.map((uri, i) => (
                              <TouchableOpacity key={`plan-${i}`} style={s.fileThumbWrap} onPress={() => setViewerImage(uri)} activeOpacity={0.8}>
                                <Image source={{ uri }} style={s.fileThumb} />
                                <View style={s.fileThumbOverlay}><Text style={s.fileThumbOverlayText}>🔍</Text></View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}

                      {patientFiles.photos.length > 0 && (
                        <View style={s.filesCard}>
                          <View style={s.filesHeader}>
                            <Text style={s.filesIcon}>📷</Text>
                            <Text style={s.filesTitle}>PATIENT PHOTOS</Text>
                            <View style={s.filesCountBadge}>
                              <Text style={s.filesCountText}>{patientFiles.photos.length}</Text>
                            </View>
                          </View>
                          <View style={s.filesGrid}>
                            {patientFiles.photos.map((uri, i) => (
                              <TouchableOpacity key={`photo-${i}`} style={s.fileThumbWrap} onPress={() => setViewerImage(uri)} activeOpacity={0.8}>
                                <Image source={{ uri }} style={s.fileThumb} />
                                <View style={s.fileThumbOverlay}><Text style={s.fileThumbOverlayText}>🔍</Text></View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </>
                  )}
                  </>
                  )}
                </>
              );
            })()}

        {/* Image Viewer Modal */}
        <Modal visible={!!viewerImage} transparent animationType="fade">
          <View style={s.viewerBackdrop}>
            <View style={s.viewerTopBar}>
              <TouchableOpacity style={s.viewerClose} onPress={() => setViewerImage(null)}>
                <Text style={s.viewerCloseText}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.viewerSaveBtn}
                onPress={async () => {
                  if (!viewerImage) return;
                  try {
                    const { status } = await MediaLibrary.requestPermissionsAsync();
                    if (status !== "granted") {
                      Alert.alert("Permission needed", "Please allow photo library access to save images.");
                      return;
                    }
                    await MediaLibrary.saveToLibraryAsync(viewerImage);
                    Alert.alert("✅ Saved", "Image saved to your photo library.");
                  } catch (e) {
                    Alert.alert("Error", "Failed to save image.");
                  }
                }}
              >
                <Text style={s.viewerSaveBtnText}>💾 Save</Text>
              </TouchableOpacity>
            </View>
            {viewerImage && (
              <Image source={{ uri: viewerImage }} style={s.viewerImage} resizeMode="contain" />
            )}
          </View>
        </Modal>

        {/* ════════════════ CANCELLED BANNER ════════════════ */}
        {booking?.status === "cancelled" && (
          <View style={s.cancelledBanner}>
            <Text style={s.cancelledIcon}>❌</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.cancelledTitle}>Booking Cancelled</Text>
              <Text style={s.cancelledDesc}>
                This booking was cancelled by the patient.
                {booking.cancelReason ? `\nReason: ${booking.cancelReason}` : ""}
                {booking.refundAmount !== undefined ? `\nRefund: $${booking.refundAmount}` : ""}
              </Text>
            </View>
          </View>
        )}

        {/* ════════════════ SECTION: Booking Details (if booked) ════════════════ */}
        {booking && (
          <>
            <View style={s.sectionDivider} />
            <View style={s.sectionHeader}>
              <Text style={s.sectionHeaderText}>Booking Details</Text>
            </View>

            {/* Treatment Plan & Price */}
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>TREATMENT PLAN</Text>
              {(booking.treatments || []).map((t, i) => (
                <View key={i} style={s.bookingTreatmentRow}>
                  <Text style={s.bookingTreatmentName}>🦷 {toDoctorLabel(t.name)} × {t.qty}</Text>
                  <Text style={s.bookingTreatmentPrice}>${(t.price * t.qty).toLocaleString()}</Text>
                </View>
              ))}
              <View style={s.bookingDivider} />
              <View style={s.bookingTreatmentRow}>
                <Text style={s.bookingTotalLabel}>Total</Text>
                <Text style={s.bookingTotalPrice}>${booking.totalPrice.toLocaleString()}</Text>
              </View>
              <View style={s.bookingTreatmentRow}>
                <Text style={s.bookingDepositLabel}>Service Plan</Text>
                <Text style={s.bookingDepositPrice}>{booking.serviceTier?.charAt(0).toUpperCase()}{booking.serviceTier?.slice(1)} — ${booking.serviceFee}</Text>
              </View>
            </View>

            {/* Scheduled Visits */}
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>SCHEDULED VISITS</Text>
              {booking.visitDates.map((v, i) => (
                <View key={i} style={s.bookingVisitRow}>
                  <View style={s.bookingVisitBadge}>
                    <Text style={s.bookingVisitBadgeText}>Visit {v.visit}</Text>
                  </View>
                  <View style={s.bookingVisitInfo}>
                    <Text style={s.bookingVisitDesc}>{v.description}</Text>
                    {v.date ? (
                      <Text style={s.bookingVisitDate}>
                        📅 {v.date}{v.confirmedTime ? ` · ${v.confirmedTime}` : ""}
                      </Text>
                    ) : (
                      <Text style={s.bookingVisitPending}>Date not set</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ════════════════ SECTION: Your Quote (doctor's suggested plan) ════════════════ */}
        {isBooked && existingQuote && (
          <>
            <View style={s.sectionDivider} />
            <View style={s.sectionHeader}>
              <Text style={s.sectionHeaderText}>Your Quote</Text>
            </View>

            <View style={s.infoCard}>
              <Text style={s.infoLabel}>SUGGESTED TREATMENT PLAN</Text>
              {existingQuote.treatments.map((t, i) => (
                <View key={i} style={s.bookingTreatmentRow}>
                  <Text style={s.bookingTreatmentName}>🦷 {toDoctorLabel(t.name)} × {t.qty}</Text>
                  <Text style={s.bookingTreatmentPrice}>${(t.price * t.qty).toLocaleString()}</Text>
                </View>
              ))}
              <View style={s.bookingDivider} />
              <View style={s.bookingTreatmentRow}>
                <Text style={s.bookingTotalLabel}>Total Quote</Text>
                <Text style={s.bookingTotalPrice}>${existingQuote.totalPrice.toLocaleString()}</Text>
              </View>
              {existingQuote.treatmentDetails ? (
                <>
                  <View style={s.bookingDivider} />
                  <Text style={s.quoteDetailLabel}>DESCRIPTION</Text>
                  <Text style={s.quoteDetailText}>{existingQuote.treatmentDetails}</Text>
                </>
              ) : null}
              {existingQuote.message ? (
                <>
                  <View style={s.bookingDivider} />
                  <Text style={s.quoteDetailLabel}>MESSAGE TO PATIENT</Text>
                  <Text style={s.quoteDetailText}>{existingQuote.message}</Text>
                </>
              ) : null}
            </View>

            {existingQuote.visits && existingQuote.visits.length > 0 && (
              <View style={s.infoCard}>
                <Text style={s.infoLabel}>PROPOSED VISIT PLAN</Text>
                <Text style={s.quoteDuration}>⏱ Duration: {existingQuote.duration}</Text>
                {existingQuote.visits.map((v, i) => (
                  <View key={i} style={s.bookingVisitRow}>
                    <View style={s.bookingVisitBadge}>
                      <Text style={s.bookingVisitBadgeText}>Visit {v.visit}</Text>
                    </View>
                    <View style={s.bookingVisitInfo}>
                      <Text style={s.bookingVisitDesc}>{v.description}</Text>
                      {(v.gapMonths || v.gapDays) ? (
                        <Text style={s.quoteGapText}>
                          ⏳ {[
                            v.gapMonths ? `${v.gapMonths} month${v.gapMonths > 1 ? "s" : ""}` : "",
                            v.gapDays ? `${v.gapDays} day${v.gapDays > 1 ? "s" : ""}` : "",
                          ].filter(Boolean).join(" ")} waiting period{(v as any).gapReason ? ` — ${(v as any).gapReason}` : ""}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ════════════════ SECTION: Requested Treatments ════════════════ */}
        <View style={s.sectionDivider} />
        <View style={s.sectionHeader}>
          <Text style={s.sectionHeaderText}>Requested Treatments</Text>
        </View>

            <View style={s.sectionNote}>
              <Text style={s.sectionNoteIcon}>💡</Text>
              <Text style={s.sectionNoteText}>
                These are treatments the patient thinks they need. Your professional treatment plan may differ.
              </Text>
            </View>

            {caseData?.treatments && caseData.treatments.length > 0 ? (
              caseData.treatments.map((t, i) => (
                <View key={i} style={s.requestedCard}>
                  <View style={s.requestedLeft}>
                    <Text style={s.requestedName}>🦷 {toDoctorLabel(t.name)}</Text>
                  </View>
                  <View style={s.requestedQtyBadge}>
                    <Text style={s.requestedQtyText}>× {t.qty}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={s.emptyState}>
                <Text style={s.emptyEmoji}>📋</Text>
                <Text style={s.emptyTitle}>No treatments requested</Text>
                <Text style={s.emptyDesc}>The patient didn't specify treatments</Text>
              </View>
            )}

            {/* Quick copy to plan */}
            {!isBooked && caseData?.treatments && caseData.treatments.length > 0 && planItems.length === 0 && (
              <TouchableOpacity
                style={s.copyToPlanBtn}
                onPress={() => {
                  const items: PlanItem[] = caseData.treatments.map((t, i) => ({
                    id: `copy-${Date.now()}-${i}`,
                    treatment: toDoctorLabel(t.name),
                    qty: t.qty,
                    price: "",
                  }));
                  setPlanItems(items);
                }}
                activeOpacity={0.7}
              >
                <Text style={s.copyToPlanText}>📋 Copy to Treatment Plan & Set Prices ↓</Text>
              </TouchableOpacity>
            )}

        {/* ════════════════ SECTION: Treatment Plan (quote form — hidden when booked) ════════════════ */}
        {!isBooked && (<>
        <View style={s.sectionDivider} />
        <View style={s.sectionHeader}>
          <Text style={s.sectionHeaderText}>Treatment Plan</Text>
        </View>

            {/* Plan Items */}
            {planItems.map((item) => {
              const unitPrice = Number(item.price || 0);
              const lineTotal = unitPrice * item.qty;
              return (
                <View key={item.id} style={s.planCard}>
                  {/* Treatment Name + Remove */}
                  <View style={s.planCardHeader}>
                    <Text style={s.planTreatmentName}>🦷 {item.treatment}</Text>
                    <TouchableOpacity
                      onPress={() => removePlanItem(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={s.planRemoveBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Qty + Price Row */}
                  <View style={s.planInputRow}>
                    {/* Quantity */}
                    <View style={s.planQtyWrap}>
                      <Text style={s.planInputLabel}>QTY</Text>
                      <View style={s.qtyControl}>
                        <TouchableOpacity
                          style={s.qtyBtn}
                          onPress={() => updatePlanItem(item.id, "qty", Math.max(1, item.qty - 1))}
                        >
                          <Text style={s.qtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={s.qtyValue}>{item.qty}</Text>
                        <TouchableOpacity
                          style={s.qtyBtn}
                          onPress={() => updatePlanItem(item.id, "qty", item.qty + 1)}
                        >
                          <Text style={s.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Price */}
                    <View style={s.planPriceWrap}>
                      <Text style={s.planInputLabel}>PRICE (per unit)</Text>
                      <View style={s.priceInputWrap}>
                        <Text style={s.dollarSign}>$</Text>
                        <TextInput
                          style={s.priceInput}
                          placeholder="0"
                          placeholderTextColor={SharedColors.slateLight}
                          value={item.price}
                          onChangeText={(v) =>
                            updatePlanItem(item.id, "price", v.replace(/[^0-9]/g, ""))
                          }
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>
                  </View>

                  {/* Price floor warning */}
                  {getPriceFloor(item.treatment) > 0 && Number(item.price) > 0 && Number(item.price) < getPriceFloor(item.treatment) && (
                    <View style={{ backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 8, padding: 8, marginTop: 6, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" }}>
                      <Text style={{ fontSize: 11, color: "#dc2626", fontWeight: "600" }}>
                        ⚠️ Minimum price for {item.treatment} is ${getPriceFloor(item.treatment).toLocaleString()}
                      </Text>
                    </View>
                  )}
                  {getPriceFloor(item.treatment) > 0 && Number(item.price) === 0 && (
                    <View style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: 10, color: SharedColors.navyMuted }}>
                        Min. ${getPriceFloor(item.treatment).toLocaleString()} per unit
                      </Text>
                    </View>
                  )}

                  {/* Line Total */}
                  {unitPrice > 0 && (
                    <View style={s.planLineTotalRow}>
                      <Text style={s.planLineTotalLabel}>
                        ${unitPrice.toLocaleString()} × {item.qty}
                      </Text>
                      <Text style={s.planLineTotalValue}>
                        ${lineTotal.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Add Treatment Button / Picker */}
            {showTreatmentPicker ? (
              <View style={s.pickerWrap}>
                <View style={s.pickerHeader}>
                  <Text style={s.pickerTitle}>Select Treatment</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowTreatmentPicker(false);
                      setSearchTreatment("");
                    }}
                  >
                    <Text style={s.pickerClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={s.pickerSearch}
                  placeholder="Search treatments..."
                  placeholderTextColor={SharedColors.slateLight}
                  value={searchTreatment}
                  onChangeText={setSearchTreatment}
                  autoFocus
                />
                <ScrollView style={s.pickerList} nestedScrollEnabled>
                  {filteredOptions.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={s.pickerOption}
                      onPress={() => addPlanItem(t)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.pickerOptionText}>🦷 {t}</Text>
                      <Text style={s.pickerOptionAdd}>+</Text>
                    </TouchableOpacity>
                  ))}
                  {filteredOptions.length === 0 && (
                    <View style={s.pickerEmpty}>
                      <Text style={s.pickerEmptyText}>
                        {searchTreatment.trim()
                          ? "No matching treatment"
                          : "All treatments added"}
                      </Text>
                      {searchTreatment.trim() && (
                        <TouchableOpacity
                          style={s.pickerCustomBtn}
                          onPress={() => addPlanItem(searchTreatment.trim())}
                        >
                          <Text style={s.pickerCustomText}>
                            + Add "{searchTreatment.trim()}" as custom
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </ScrollView>
              </View>
            ) : (
              <TouchableOpacity
                style={s.addTreatmentBtn}
                onPress={() => setShowTreatmentPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={s.addTreatmentPlus}>+</Text>
                <Text style={s.addTreatmentText}>Add Treatment</Text>
              </TouchableOpacity>
            )}

            {/* Visit settings */}
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>VISIT SETTINGS</Text>

              {/* Preset chips */}
              <View style={s.presetRow}>
                {VISIT_PRESETS.slice(0, 3).map((preset) => (
                  <TouchableOpacity
                    key={preset.label}
                    style={s.presetChip}
                    onPress={() => applyPreset(preset)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.presetChipText}>{preset.label}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={s.presetChip}
                  onPress={() => {
                    const remaining = VISIT_PRESETS.slice(3);
                    Alert.alert(
                      "More Presets",
                      "Select a visit preset:",
                      [
                        ...remaining.map((preset) => ({
                          text: `${preset.label} (${preset.visits} visits)`,
                          onPress: () => applyPreset(preset),
                        })),
                        { text: "Cancel", style: "cancel" as const },
                      ]
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={s.presetChipText}>More ▾</Text>
                </TouchableOpacity>
              </View>

              <View style={s.visitsCountCard}>
                <TouchableOpacity
                  style={s.visitsStepBtn}
                  onPress={() => {
                    const newCount = Math.max(1, visitsCount - 1);
                    setVisitsCount(newCount);
                    // Remove last gap if decreasing
                    if (newCount < visitsCount && gapConfigs.length > 0) {
                      setGapConfigs((prev) => prev.slice(0, -1));
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={s.visitsStepText}>−</Text>
                </TouchableOpacity>

                <View style={s.visitsValueCenter}>
                  <Text style={s.visitsValueNum}>{visitsCount}</Text>
                  <Text style={s.visitsValueLabel}>visits</Text>
                </View>

                <TouchableOpacity
                  style={s.visitsStepBtn}
                  onPress={() => {
                    const newCount = Math.min(10, visitsCount + 1);
                    setVisitsCount(newCount);
                    // Add new gap if increasing
                    if (newCount > visitsCount) {
                      setGapConfigs((prev) => [...prev, { gapMonths: 0, gapDays: 0, gapReason: "" }]);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={s.visitsStepText}>+</Text>
                </TouchableOpacity>
              </View>

              {visitsCount > 1 && (
                <View style={s.gapCard}>
                  <Text style={s.gapTitle}>Waiting period between visits</Text>
                  <Text style={s.gapHint}>Set the waiting period and reason for each gap.</Text>

                  <View style={s.gapInputCol}>
                    {Array.from({ length: visitsCount - 1 }).map((_, gapIndex) => {
                      const visitANum = gapIndex + 1;
                      const visitBNum = gapIndex + 2;
                      const gap = gapConfigs[gapIndex] || { gapMonths: 0, gapDays: 0, gapReason: "" };

                      return (
                        <View key={`gap-${gapIndex}`} style={s.gapBlockWrap}>
                          <Text style={s.gapBlockTitle}>Visit {visitANum} → Visit {visitBNum}</Text>

                          {/* Reason dropdown */}
                          <View style={s.gapReasonRow}>
                            <Text style={s.gapUnitLabel}>Reason</Text>
                            <TouchableOpacity
                              style={s.gapReasonBtn}
                              onPress={() => setActiveReasonPicker(activeReasonPicker === gapIndex ? null : gapIndex)}
                              activeOpacity={0.7}
                            >
                              <Text style={[s.gapReasonBtnText, !gap.gapReason && { color: SharedColors.slateLight }]}>
                                {gap.gapReason || "Select reason"}
                              </Text>
                              <Text style={s.gapReasonArrow}>{activeReasonPicker === gapIndex ? "▲" : "▼"}</Text>
                            </TouchableOpacity>
                          </View>
                          {activeReasonPicker === gapIndex && (
                            <View style={s.gapReasonDropdown}>
                              {GAP_REASONS.map((reason) => (
                                <TouchableOpacity
                                  key={reason}
                                  style={[s.gapReasonOption, gap.gapReason === reason && s.gapReasonOptionActive]}
                                  onPress={() => {
                                    const newGaps = [...gapConfigs];
                                    newGaps[gapIndex] = { ...gap, gapReason: reason };
                                    setGapConfigs(newGaps);
                                    setActiveReasonPicker(null);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[s.gapReasonOptionText, gap.gapReason === reason && s.gapReasonOptionTextActive]}>
                                    {reason}
                                  </Text>
                                  {gap.gapReason === reason && <Text style={s.gapReasonCheck}>✓</Text>}
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}

                          <View style={s.gapInputGroupRow}>
                            <Text style={s.gapUnitLabel}>Months</Text>
                            <View style={s.gapControlsRow}>
                              <TouchableOpacity
                                style={s.gapStepBtn}
                                onPress={() => {
                                  const newGaps = [...gapConfigs];
                                  newGaps[gapIndex] = { ...gap, gapMonths: Math.max(0, gap.gapMonths - 1) };
                                  setGapConfigs(newGaps);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={s.gapStepText}>−</Text>
                              </TouchableOpacity>
                              <View style={s.gapValueBox}>
                                <Text style={s.infoRowValue}>{gap.gapMonths}</Text>
                              </View>
                              <TouchableOpacity
                                style={s.gapStepBtn}
                                onPress={() => {
                                  const newGaps = [...gapConfigs];
                                  newGaps[gapIndex] = { ...gap, gapMonths: Math.min(12, gap.gapMonths + 1) };
                                  setGapConfigs(newGaps);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={s.gapStepText}>+</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          <View style={[s.gapInputGroupRow, { borderBottomWidth: 0 }]}>
                            <Text style={s.gapUnitLabel}>Days</Text>
                            <View style={s.gapControlsRow}>
                              <TouchableOpacity
                                style={s.gapStepBtn}
                                onPress={() => {
                                  const newGaps = [...gapConfigs];
                                  newGaps[gapIndex] = { ...gap, gapDays: Math.max(0, gap.gapDays - 1) };
                                  setGapConfigs(newGaps);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={s.gapStepText}>−</Text>
                              </TouchableOpacity>
                              <View style={s.gapValueBox}>
                                <Text style={s.infoRowValue}>{gap.gapDays}</Text>
                              </View>
                              <TouchableOpacity
                                style={s.gapStepBtn}
                                onPress={() => {
                                  const newGaps = [...gapConfigs];
                                  newGaps[gapIndex] = { ...gap, gapDays: Math.min(90, gap.gapDays + 1) };
                                  setGapConfigs(newGaps);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={s.gapStepText}>+</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* Total */}
            {planItems.length > 0 && (
              <View style={s.totalCard}>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Total Quote</Text>
                  <Text style={s.totalPrice}>${totalPrice.toLocaleString()}</Text>
                </View>
                {totalPrice > 0 && (
                  <Text style={s.depositNote}>
                    Patient deposit (10%): ${Math.round(totalPrice * 0.10).toLocaleString()}
                  </Text>
                )}
              </View>
            )}

        </>)}
      </ScrollView>

      {/* Bottom — Send Quote or Pass */}
      {!isBooked && (
        <View style={s.bottom}>
          {planItems.length > 0 ? (
            <TouchableOpacity
              style={[s.sendBtn, !isComplete && s.sendBtnDisabled]}
              onPress={handleSendQuote}
              disabled={!isComplete || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={SharedColors.white} size="small" />
              ) : (
                <Text style={s.sendBtnText}>
                  Send Quote{totalPrice > 0 ? ` · $${totalPrice.toLocaleString()}` : ""} →
                </Text>
              )}
            </TouchableOpacity>
          ) : !existingQuote ? (
            <TouchableOpacity
              style={{ backgroundColor: "#f1f5f9", borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" }}
              onPress={() => {
                Alert.alert("Pass on this case?", "This case will be hidden from your dashboard. You can undo this from your profile.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Not Interested", style: "destructive", onPress: async () => {
                    await store.passCase(caseData!.id);
                    router.replace("/doctor/dashboard" as any);
                  }},
                ]);
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#94a3b8" }}>Not Interested</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: {
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  backArrow: { fontSize: 24, color: SharedColors.white, fontWeight: "600", marginTop: -2 },
  title: { fontSize: 24, fontWeight: "700", color: SharedColors.white, marginBottom: 4 },
  subtitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerAvatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)" },

  // Section Headers
  sectionHeader: {
    paddingVertical: 10, marginBottom: 4,
    borderBottomWidth: 1, borderBottomColor: SharedColors.border,
  },
  sectionHeaderText: {
    fontSize: 16, fontWeight: "700", color: DoctorTheme.primary, letterSpacing: 0.3,
  },
  sectionDivider: {
    height: 1, backgroundColor: SharedColors.border, marginVertical: 10,
  },

  content: { padding: 24, gap: 14, paddingBottom: 60, backgroundColor: SharedColors.bg },

  // ── Patient Info Tab ──
  infoCard: {
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 16,
    gap: 10, borderWidth: 1, borderColor: SharedColors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  infoLabel: {
    fontSize: 11, fontWeight: "600", color: SharedColors.navyMuted,
    letterSpacing: 0.8, marginBottom: 2,
  },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  infoRowLabel: { fontSize: 13, color: SharedColors.navySec },
  infoRowValue: { fontSize: 13, fontWeight: "600", color: SharedColors.navy },
  nameValueRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  viewProfileBtn: {
    backgroundColor: "rgba(15,118,110,0.08)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  viewProfileText: { fontSize: 11, fontWeight: "600", color: DoctorTheme.primary },
  infoSub: { fontSize: 13, color: SharedColors.navySec, lineHeight: 20 },

  // ── Files Grid ──
  filesCard: {
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 16, gap: 12,
    borderWidth: 1, borderColor: SharedColors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  filesHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  filesIcon: { fontSize: 16 },
  filesTitle: {
    flex: 1, fontSize: 12, fontWeight: "700", color: SharedColors.navySec,
    letterSpacing: 0.5,
  },
  filesCountBadge: {
    backgroundColor: DoctorTheme.accentBright, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  filesCountText: { fontSize: 11, fontWeight: "700", color: SharedColors.white },
  filesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fileThumbWrap: {
    width: 90, height: 90, borderRadius: 10, overflow: "hidden",
    borderWidth: 1, borderColor: SharedColors.border,
  },
  fileThumb: { width: "100%", height: "100%", backgroundColor: "#f1f5f9" },
  fileThumbOverlay: {
    position: "absolute", bottom: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.5)", borderTopLeftRadius: 8,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  fileThumbOverlayText: { fontSize: 12 },

  // ── Image Viewer Modal ──
  viewerBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center", alignItems: "center",
  },
  viewerTopBar: {
    position: "absolute", top: 50, left: 20, right: 20, zIndex: 10,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  viewerClose: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  viewerCloseText: { color: SharedColors.white, fontSize: 18, fontWeight: "600" },
  viewerSaveBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: DoctorTheme.accentBright, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  viewerSaveBtnText: { color: SharedColors.white, fontSize: 14, fontWeight: "600" },
  viewerImage: {
    width: Dimensions.get("window").width - 32,
    height: Dimensions.get("window").height * 0.7,
  },
  saveAllBtn: {
    backgroundColor: DoctorTheme.accentBright, borderRadius: 12,
    paddingVertical: 14, alignItems: "center",
  },
  saveAllBtnText: { color: SharedColors.white, fontSize: 14, fontWeight: "700" },

  // ── Visit Presets ──
  presetRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 4,
  },
  presetChip: {
    borderWidth: 1.5, borderColor: DoctorTheme.primary, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: SharedColors.white,
  },
  presetChipText: {
    fontSize: 12, fontWeight: "600", color: DoctorTheme.primary,
  },

  // ── Duration Stepper ──
  // Number of visits stepper
  visitsCountCard: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: SharedColors.white, borderRadius: 14,
    borderWidth: 1, borderColor: SharedColors.border,
    paddingVertical: 10, paddingHorizontal: 16, marginTop: 8,
  },
  visitsStepBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: SharedColors.border,
  },
  visitsStepText: { color: DoctorTheme.primary, fontSize: 22, fontWeight: "600" },
  visitsValueCenter: {
    alignItems: "center", justifyContent: "center", gap: 2,
  },
  visitsValueNum: {
    color: SharedColors.navy, fontSize: 32, fontWeight: "800", lineHeight: 36,
  },
  visitsValueLabel: {
    color: SharedColors.navyMuted, fontSize: 12, fontWeight: "600",
    letterSpacing: 0.8, textTransform: "lowercase",
  },
  durationStepText: { color: DoctorTheme.primary, fontSize: 22, fontWeight: "600" },
  // Duration triple fields (months/weeks/days) — vertical stack
  durationTripleCol: {
    flexDirection: "column", gap: 0, marginTop: 6,
    backgroundColor: SharedColors.white, borderRadius: 12,
    borderWidth: 1, borderColor: SharedColors.border,
    overflow: "hidden",
  },
  durationFieldRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: SharedColors.border,
  },
  durationFieldLabelInline: {
    fontSize: 14, fontWeight: "600",
    color: SharedColors.navySec,
  },
  durationControlsRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  durationSmallBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: SharedColors.border,
  },
  durationSmallValueBox: {
    width: 48, height: 34, alignItems: "center", justifyContent: "center",
    backgroundColor: SharedColors.bg, borderRadius: 10,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  durationSmallInput: {
    color: SharedColors.navy, fontSize: 17, fontWeight: "800",
    textAlign: "center", width: "100%", padding: 0,
  },

  // ── Visits ──
  labelHint: { fontSize: 11, color: SharedColors.navyMuted, marginTop: 2 },
  visitCard: {
    backgroundColor: SharedColors.white, borderRadius: 12,
    borderWidth: 1, borderColor: SharedColors.border,
    padding: 14, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  visitHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  visitBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: DoctorTheme.accentBright, alignItems: "center", justifyContent: "center",
  },
  visitBadgeText: { color: SharedColors.white, fontSize: 13, fontWeight: "800" },
  visitTitle: { color: SharedColors.navy, fontSize: 14, fontWeight: "700" },
  visitInput: {
    backgroundColor: SharedColors.bg, borderRadius: 10,
    borderWidth: 1, borderColor: SharedColors.border,
    padding: 12, color: SharedColors.navy, fontSize: 13, minHeight: 44,
    textAlignVertical: "top",
  },

  // ── Gap between visits ──
  gapSection: { alignItems: "center", marginVertical: 4 },
  gapLine: { width: 2, height: 8, backgroundColor: SharedColors.border },
  gapCard: {
    backgroundColor: "rgba(217,119,6,0.06)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(217,119,6,0.25)",
    padding: 14, width: "100%",
  },
  gapTitle: { fontSize: 13, fontWeight: "700", color: "#d97706" },
  gapHint: { fontSize: 11, color: SharedColors.navyMuted, marginTop: 2, marginBottom: 10 },
  gapInputCol: {
    flexDirection: "column", gap: 0,
    backgroundColor: SharedColors.white, borderRadius: 10,
    borderWidth: 1, borderColor: SharedColors.border,
    overflow: "hidden",
  },
  gapInputGroupRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: SharedColors.border,
  },
  gapUnitLabel: { fontSize: 13, fontWeight: "600", color: SharedColors.navySec },
  gapControlsRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  gapStepBtn: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: "#f1f5f9",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: SharedColors.border,
  },
  gapStepText: { fontSize: 16, fontWeight: "600", color: "#d97706" },
  gapValueBox: {
    minWidth: 36, height: 30, alignItems: "center", justifyContent: "center",
    backgroundColor: SharedColors.bg, borderRadius: 8,
    borderWidth: 1, borderColor: SharedColors.border, paddingHorizontal: 6,
  },
  gapValue: { fontSize: 15, fontWeight: "700", color: SharedColors.navy },
  // gapUnit removed — replaced by gapUnitLabel
  gapSummary: {
    fontSize: 11, color: "#d97706", fontWeight: "500", marginTop: 8,
    fontStyle: "italic",
  },

  // Per-gap blocks (for individual gap config)
  gapBlockWrap: {
    backgroundColor: "#fefce8", borderRadius: 10,
    borderWidth: 1, borderColor: "rgba(217,119,6,0.2)",
    paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 10,
  },
  gapBlockTitle: {
    fontSize: 12, fontWeight: "700", color: "#b45309",
    marginBottom: 10,
  },
  gapReasonRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: "rgba(217,119,6,0.15)",
  },
  gapReasonBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: SharedColors.white, borderRadius: 8,
    borderWidth: 1, borderColor: SharedColors.border,
    paddingHorizontal: 10, paddingVertical: 7, flex: 1, marginLeft: 10,
  },
  gapReasonBtnText: { flex: 1, fontSize: 12, fontWeight: "500", color: SharedColors.navy },
  gapReasonArrow: { fontSize: 9, color: SharedColors.slate },
  gapReasonDropdown: {
    backgroundColor: SharedColors.white, borderRadius: 8,
    borderWidth: 1, borderColor: SharedColors.border,
    marginBottom: 10, overflow: "hidden",
  },
  gapReasonOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  gapReasonOptionActive: { backgroundColor: "rgba(217,119,6,0.08)" },
  gapReasonOptionText: { fontSize: 12, color: SharedColors.navy },
  gapReasonOptionTextActive: { fontWeight: "600", color: "#b45309" },
  gapReasonCheck: { fontSize: 13, color: "#d97706", fontWeight: "700" },

  issueTagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  issueTag: {
    backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.2)",
  },
  issueTagText: { fontSize: 12, color: "#d97706", fontWeight: "500" },
  medicalGrid: { gap: 10 },
  medicalBlock: {
    borderRadius: 10, padding: 12, borderLeftWidth: 3,
  },
  medicalBlockCondition: {
    backgroundColor: "rgba(245,158,11,0.05)", borderLeftColor: SharedColors.amber,
  },
  medicalBlockMed: {
    backgroundColor: "rgba(59,130,246,0.05)", borderLeftColor: "#3b82f6",
  },
  medicalBlockAllergy: {
    backgroundColor: "rgba(220,38,38,0.04)", borderLeftColor: "#dc2626",
  },
  medicalBlockLabel: {
    fontSize: 11, fontWeight: "700", letterSpacing: 0.3, marginBottom: 8,
  },
  medicalBlockLabelCondition: { color: "#b45309" },
  medicalBlockLabelMed: { color: "#2563eb" },
  medicalBlockLabelAllergy: { color: "#dc2626" },
  allergyTag: {
    backgroundColor: "rgba(220,38,38,0.06)", borderColor: "rgba(220,38,38,0.18)",
  },
  allergyTagText: { color: "#dc2626" },
  medicationTag: {
    backgroundColor: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.18)",
  },
  medicationTagText: { color: "#2563eb" },

  // ── Requested Tab ──
  sectionNote: {
    flexDirection: "row", gap: 10, backgroundColor: "rgba(59,130,246,0.06)",
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "rgba(59,130,246,0.12)",
    alignItems: "flex-start",
  },
  sectionNoteIcon: { fontSize: 18, marginTop: 1 },
  sectionNoteText: { flex: 1, fontSize: 13, color: SharedColors.navySec, lineHeight: 20 },

  requestedCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    backgroundColor: SharedColors.white, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: SharedColors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  requestedLeft: { flex: 1, paddingRight: 10 },
  requestedName: { fontSize: 14, fontWeight: "600", color: SharedColors.navy, flexShrink: 1, lineHeight: 20 },
  requestedQtyBadge: {
    backgroundColor: "#f1f5f9", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  requestedQtyText: { fontSize: 13, fontWeight: "600", color: SharedColors.navySec },

  copyToPlanBtn: {
    backgroundColor: "rgba(15,118,110,0.08)", borderRadius: 12, padding: 16,
    alignItems: "center", borderWidth: 1, borderColor: "rgba(15,118,110,0.2)",
    marginTop: 4,
  },
  copyToPlanText: { fontSize: 14, fontWeight: "600", color: DoctorTheme.primary },

  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: SharedColors.navySec, marginBottom: 4 },
  emptyDesc: { fontSize: 13, color: SharedColors.navyMuted },

  // ── Treatment Plan Tab ──
  planCard: {
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 16,
    gap: 12, borderWidth: 1, borderColor: SharedColors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  planCardHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
  },
  planTreatmentName: {
    fontSize: 15,
    fontWeight: "700",
    color: SharedColors.navy,
    flex: 1,
    flexShrink: 1,
    paddingRight: 12,
    lineHeight: 21,
  },
  planRemoveBtn: {
    fontSize: 14, color: SharedColors.navyMuted, fontWeight: "700",
    padding: 4, marginTop: 1,
  },

  planInputRow: { flexDirection: "row", gap: 12 },
  planQtyWrap: { gap: 6 },
  planPriceWrap: { flex: 1, gap: 6 },
  planInputLabel: {
    fontSize: 10, fontWeight: "600", color: SharedColors.navySec,
    letterSpacing: 0.5,
  },

  qtyControl: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f1f5f9", borderRadius: 10,
    borderWidth: 1.5, borderColor: SharedColors.border,
  },
  qtyBtn: {
    width: 36, height: 40, alignItems: "center", justifyContent: "center",
  },
  qtyBtnText: { fontSize: 18, fontWeight: "600", color: DoctorTheme.primary },
  qtyValue: {
    fontSize: 16, fontWeight: "700", color: SharedColors.navy,
    minWidth: 28, textAlign: "center",
  },

  priceInputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: SharedColors.bg, borderRadius: 10,
    borderWidth: 1.5, borderColor: SharedColors.border,
    paddingHorizontal: 12,
  },
  dollarSign: { fontSize: 16, fontWeight: "700", color: DoctorTheme.primary, marginRight: 4 },
  priceInput: {
    flex: 1, fontSize: 16, fontWeight: "700", color: SharedColors.navy,
    paddingVertical: 8,
  },

  planLineTotalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderTopWidth: 1, borderTopColor: SharedColors.border, paddingTop: 8,
  },
  planLineTotalLabel: { fontSize: 12, color: SharedColors.navyMuted },
  planLineTotalValue: { fontSize: 14, fontWeight: "700", color: DoctorTheme.primary },

  // Add treatment
  addTreatmentBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14,
    borderWidth: 1.5, borderColor: SharedColors.border,
    borderRadius: 14, borderStyle: "dashed",
    backgroundColor: SharedColors.white,
  },
  addTreatmentPlus: { fontSize: 20, color: DoctorTheme.primary, fontWeight: "600" },
  addTreatmentText: { fontSize: 14, color: SharedColors.navySec, fontWeight: "500" },

  // Treatment Picker
  pickerWrap: {
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 16,
    gap: 10, borderWidth: 1, borderColor: "rgba(15,118,110,0.2)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  pickerHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  pickerTitle: { fontSize: 14, fontWeight: "700", color: SharedColors.navy },
  pickerClose: { fontSize: 16, color: SharedColors.navyMuted, fontWeight: "700", padding: 4 },
  pickerSearch: {
    borderWidth: 1.5, borderColor: SharedColors.border,
    backgroundColor: SharedColors.bg, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: SharedColors.navy,
  },
  pickerList: { maxHeight: 220 },
  pickerOption: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: SharedColors.border,
  },
  pickerOptionText: {
    fontSize: 14,
    color: SharedColors.navy,
    flex: 1,
    flexShrink: 1,
    paddingRight: 10,
    lineHeight: 20,
  },
  pickerOptionAdd: { fontSize: 20, color: DoctorTheme.primary, fontWeight: "700", marginTop: -1 },
  pickerEmpty: { alignItems: "center", paddingVertical: 20, gap: 10 },
  pickerEmptyText: { fontSize: 13, color: SharedColors.navyMuted },
  pickerCustomBtn: {
    backgroundColor: "rgba(15,118,110,0.08)", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  pickerCustomText: { fontSize: 13, color: DoctorTheme.primary, fontWeight: "600" },

  // Total
  totalCard: {
    backgroundColor: "rgba(15,118,110,0.06)", borderRadius: 14, padding: 18,
    gap: 8, borderWidth: 1, borderColor: "rgba(15,118,110,0.15)",
  },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  totalLabel: { fontSize: 16, fontWeight: "700", color: SharedColors.navy },
  totalPrice: { fontSize: 24, fontWeight: "700", color: DoctorTheme.primary },
  depositNote: { fontSize: 12, color: SharedColors.navyMuted, textAlign: "right" },

  // Details section
  detailsSection: {
    backgroundColor: SharedColors.white, borderRadius: 16, padding: 20,
    gap: 16, borderWidth: 1, borderColor: SharedColors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  detailsSectionTitle: { fontSize: 13, fontWeight: "700", color: DoctorTheme.primary, letterSpacing: 0.5 },
  differWarning: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.2)",
  },
  differWarningIcon: { fontSize: 16, marginTop: 1 },
  differWarningText: { flex: 1, fontSize: 12, color: "#d97706", lineHeight: 18 },
  inputRequired: { borderColor: SharedColors.amber, borderWidth: 1.5 },
  field: { gap: 8 },
  label: {
    fontSize: 11, fontWeight: "600", color: SharedColors.navySec, letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1.5, borderColor: SharedColors.border,
    backgroundColor: SharedColors.bg, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, color: SharedColors.navy, minHeight: 48,
  },

  // Bottom
  bottom: {
    paddingHorizontal: 24, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: SharedColors.border,
    backgroundColor: SharedColors.white,
  },
  sendBtn: {
    backgroundColor: DoctorTheme.primary, borderRadius: 14, paddingVertical: 15,
    alignItems: "center", minHeight: 52,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: SharedColors.white, fontSize: 15, fontWeight: "600" },

  // Submitted
  submittedWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28 },
  submittedTitle: { fontSize: 28, fontWeight: "700", color: SharedColors.white, marginBottom: 12 },
  submittedDesc: {
    fontSize: 14, color: "rgba(255,255,255,0.6)", textAlign: "center",
    lineHeight: 22, marginBottom: 24,
  },
  sentSummary: {
    width: "100%", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 14,
    padding: 16, gap: 8, borderWidth: 1, borderColor: SharedColors.border, marginBottom: 24,
  },
  sentRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  sentName: { fontSize: 13, color: "rgba(255,255,255,0.6)", flex: 1, marginRight: 12 },
  sentPrice: { fontSize: 13, fontWeight: "600", color: SharedColors.white, flexShrink: 0 },
  sentTotalRow: {
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)",
    paddingTop: 8, marginTop: 4,
  },
  sentTotalLabel: { fontSize: 14, fontWeight: "700", color: SharedColors.white },
  sentTotalPrice: { fontSize: 18, fontWeight: "700", color: DoctorTheme.accentBright },
  backDashBtn: {
    width: "100%", backgroundColor: SharedColors.white, borderRadius: 14,
    paddingVertical: 15, alignItems: "center",
  },
  backDashText: { color: DoctorTheme.primary, fontSize: 16, fontWeight: "700" },

  // ── Booking Details ──
  bookingTreatmentRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingVertical: 6,
  },
  bookingTreatmentName: { fontSize: 13, color: SharedColors.navy, flex: 1, flexShrink: 1, lineHeight: 19, paddingRight: 10 },
  bookingTreatmentPrice: { fontSize: 13, fontWeight: "600", color: SharedColors.navy },
  bookingDivider: { height: 1, backgroundColor: SharedColors.border, marginVertical: 6 },
  bookingTotalLabel: { fontSize: 14, fontWeight: "700", color: SharedColors.navy },
  bookingTotalPrice: { fontSize: 16, fontWeight: "800", color: DoctorTheme.primary },
  bookingDepositLabel: { fontSize: 13, color: SharedColors.green, fontWeight: "600" },
  bookingDepositPrice: { fontSize: 13, fontWeight: "700", color: SharedColors.green },
  bookingVisitRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: SharedColors.border,
  },
  bookingVisitBadge: {
    backgroundColor: "rgba(15,118,110,0.1)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  bookingVisitBadgeText: { fontSize: 11, fontWeight: "700", color: DoctorTheme.primary },
  bookingVisitInfo: { flex: 1, gap: 2 },
  bookingVisitDesc: { fontSize: 13, color: SharedColors.navy },
  bookingVisitDate: { fontSize: 12, color: SharedColors.navySec },
  bookingVisitPending: { fontSize: 12, color: SharedColors.amber, fontStyle: "italic" },

  // ── Doctor Quote Details ──
  quoteDetailLabel: { fontSize: 10, fontWeight: "600", color: SharedColors.navyMuted, letterSpacing: 0.6, marginTop: 2 },
  quoteDetailText: { fontSize: 13, color: SharedColors.navySec, lineHeight: 20 },
  quoteDuration: { fontSize: 13, fontWeight: "600", color: DoctorTheme.primary, marginBottom: 4 },
  quoteGapText: { fontSize: 11, color: SharedColors.amber, fontStyle: "italic" },

  // ── Cancelled Banner ──
  cancelledBanner: {
    flexDirection: "row", gap: 14,
    backgroundColor: "#fef2f2", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
    marginHorizontal: 20, marginTop: 12,
  },
  cancelledIcon: { fontSize: 24, marginTop: 2 },
  cancelledTitle: { fontSize: 15, fontWeight: "700", color: SharedColors.red, marginBottom: 4 },
  cancelledDesc: { fontSize: 12, color: "#b91c1c", lineHeight: 18 },
});
