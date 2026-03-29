import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
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
import { store } from "../../lib/store";

import { PatientTheme, SharedColors } from "../../constants/theme";

/* ─── types ─── */
type HealthAnswers = {
  bloodThinners: boolean | null;
  drugAllergies: boolean | null;
  pregnantNursing: boolean | null;
  diabetes: boolean | null;
};

type TreatmentDraft = {
  selected?: Record<string, number>;
  custom?: { name: string; qty: number }[];
};

type ConcernDraft = {
  text?: string;
  photoUri?: string;
};

/* ─── component ─── */
export default function PatientReviewScreen() {
  const params = useLocalSearchParams<{ caseMode?: string }>();
  const caseMode = params.caseMode || "specific";
  const isProposal = caseMode === "proposal";

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [caseId, setCaseId] = useState("");

  /* data summaries */
  const [patientName, setPatientName] = useState("");
  const [patientCountry, setPatientCountry] = useState("");
  const [treatmentList, setTreatmentList] = useState<{ name: string; qty: number }[]>([]);
  const [concernText, setConcernText] = useState("");
  const [concernPhoto, setConcernPhoto] = useState("");
  const [filesCount, setFilesCount] = useState(0);

  /* quick health screen */
  const [healthAnswers, setHealthAnswers] = useState<HealthAnswers>({
    bloodThinners: null,
    drugAllergies: null,
    pregnantNursing: null,
    diabetes: null,
  });
  const [healthDetailMap, setHealthDetailMap] = useState<Record<string, string>>({});

  /* derived: show diabetes question only for specific mode with implant */
  const hasImplant = treatmentList.some((t) =>
    t.name.toLowerCase().includes("implant")
  );
  const showDiabetes = !isProposal && hasImplant;

  /* derived: any "Yes" answer */
  const anyYes =
    healthAnswers.bloodThinners === true ||
    healthAnswers.drugAllergies === true ||
    healthAnswers.pregnantNursing === true ||
    (showDiabetes && healthAnswers.diabetes === true);

  /* derived: all health questions answered */
  const allHealthAnswered =
    healthAnswers.bloodThinners !== null &&
    healthAnswers.drugAllergies !== null &&
    healthAnswers.pregnantNursing !== null &&
    (!showDiabetes || healthAnswers.diabetes !== null);

  /* derived: can submit */
  const canSubmit =
    allHealthAnswered &&
    (isProposal ? concernText.length >= 20 : treatmentList.length > 0);

  /* derived: section completion */
  const infoComplete = !!patientName && !!patientCountry;
  const treatmentComplete = isProposal ? concernText.length >= 20 : treatmentList.length > 0;
  const healthComplete = allHealthAnswered;

  /* load data on mount */
  useEffect(() => {
    (async () => {
      // profile
      try {
        const profile = await store.getPatientProfile();
        if (profile?.fullName) setPatientName(profile.fullName);
        if (profile?.countryName) setPatientCountry(profile.countryName);
        else if (profile?.country) setPatientCountry(profile.country);
      } catch (e) { console.warn("Draft read error:", e); }

      // pre-populate Quick Health from existing medical data
      try {
        const medical = await store.getPatientMedical();
        if (medical) {
          const hasBloodThinners = medical.medications?.some((m: string) =>
            m.toLowerCase().includes("blood thinner") || m.toLowerCase().includes("warfarin")
          ) || false;
          const hasAllergies = medical.allergies?.some((a: string) => a !== "None") || false;
          if (hasBloodThinners) setHealthAnswers(prev => ({...prev, bloodThinners: true}));
          if (hasAllergies) setHealthAnswers(prev => ({...prev, drugAllergies: true}));
        }
      } catch (e) { console.warn("Medical read error:", e); }

      // treatments (specific mode)
      if (!isProposal) {
        try {
          const raw = await AsyncStorage.getItem("CASE_DRAFT_TREATMENTS");
          if (raw) {
            const draft: TreatmentDraft = JSON.parse(raw);
            const list: { name: string; qty: number }[] = [];
            if (draft.selected) {
              for (const [name, qty] of Object.entries(draft.selected)) {
                list.push({ name, qty: qty as number });
              }
            }
            if (draft.custom) {
              for (const c of draft.custom) list.push({ name: c.name, qty: c.qty });
            }
            setTreatmentList(list);
          }
        } catch (e) { console.warn("Draft read error:", e); }
      }

      // concern (proposal mode)
      if (isProposal) {
        try {
          const raw = await AsyncStorage.getItem("CASE_DRAFT_CONCERN");
          if (raw) {
            const concern: ConcernDraft = JSON.parse(raw);
            if (concern.text) setConcernText(concern.text);
            if (concern.photoUri) setConcernPhoto(concern.photoUri);
          }
        } catch (e) { console.warn("Draft read error:", e); }
      }

      // files (concern photo is already synced to PATIENT_FILES by concern-describe)
      try {
        const files = await store.getPatientFiles();
        if (files) {
          const count =
            (files.xrays?.length || 0) +
            (files.treatmentPlans?.length || 0) +
            (files.photos?.length || 0);
          setFilesCount(count);
        }
      } catch (e) { console.warn("Draft read error:", e); }
    })();
  }, [isProposal]);

  /* refresh volatile data when screen regains focus (e.g. after Edit) */
  useFocusEffect(
    useCallback(() => {
      (async () => {
        // refresh profile
        try {
          const profile = await store.getPatientProfile();
          if (profile?.fullName) setPatientName(profile.fullName);
          if (profile?.countryName) setPatientCountry(profile.countryName);
          else if (profile?.country) setPatientCountry(profile.country);
        } catch (e) { console.warn("Focus refresh error:", e); }

        // refresh treatments (specific mode)
        if (!isProposal) {
          try {
            const raw = await AsyncStorage.getItem("CASE_DRAFT_TREATMENTS");
            if (raw) {
              const draft: TreatmentDraft = JSON.parse(raw);
              const list: { name: string; qty: number }[] = [];
              if (draft.selected) {
                for (const [name, qty] of Object.entries(draft.selected)) {
                  list.push({ name, qty: qty as number });
                }
              }
              if (draft.custom) {
                for (const c of draft.custom) list.push({ name: c.name, qty: c.qty });
              }
              setTreatmentList(list);
            } else {
              setTreatmentList([]);
            }
          } catch (e) { console.warn("Focus refresh error:", e); }
        }

        // refresh files count
        try {
          const files = await store.getPatientFiles();
          let count = 0;
          if (files) {
            count =
              (files.xrays?.length || 0) +
              (files.treatmentPlans?.length || 0) +
              (files.photos?.length || 0);
          }
          setFilesCount(count);
        } catch (e) { console.warn("Focus refresh error:", e); }
      })();
    }, [isProposal])
  );

  /* ─── submit ─── */
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const profile = await store.getPatientProfile();

      let finalTreatments: { name: string; qty: number }[] = [];
      let finalConcern = "";
      let finalConcernPhoto = "";

      if (!isProposal) {
        const draft = await AsyncStorage.getItem("CASE_DRAFT_TREATMENTS");
        if (draft) {
          const parsed: TreatmentDraft = JSON.parse(draft);
          const list: { name: string; qty: number }[] = [];
          if (parsed.selected) {
            for (const [name, qty] of Object.entries(parsed.selected)) {
              list.push({ name, qty: qty as number });
            }
          }
          if (parsed.custom) {
            for (const c of parsed.custom) list.push({ name: c.name, qty: c.qty });
          }
          finalTreatments = list;
        }
        if (finalTreatments.length === 0) {
          Alert.alert("No treatments", "Please go back and select at least one treatment.");
          setLoading(false);
          return;
        }
      } else {
        const draft = await AsyncStorage.getItem("CASE_DRAFT_CONCERN");
        if (draft) {
          const parsed: ConcernDraft = JSON.parse(draft);
          finalConcern = parsed.text || "";
          finalConcernPhoto = parsed.photoUri || "";
        }
      }

      // Load actual file counts
      let finalFilesCount = { xrays: 0, treatmentPlans: 0, photos: 0 };
      try {
        const f = await store.getPatientFiles();
        if (f) {
          finalFilesCount = {
            xrays: f.xrays?.length || 0,
            treatmentPlans: f.treatmentPlans?.length || 0,
            photos: f.photos?.length || 0,
          };
        }
      } catch (e) { console.warn("Draft read error:", e); }

      const newCase = await store.createCase({
        patientName: profile?.fullName || "",
        country: profile?.countryName || profile?.country || "",
        birthDate: profile?.birthDate || "",
        caseMode: caseMode as "specific" | "proposal",
        treatments: finalTreatments,
        concernDescription: finalConcern,
        concernPhoto: finalConcernPhoto,
        medicalNotes: "",
        dentalIssues: [],
        quickHealth: {
          bloodThinners: healthAnswers.bloodThinners!,
          drugAllergies: healthAnswers.drugAllergies!,
          pregnantNursing: healthAnswers.pregnantNursing!,
          ...(showDiabetes && { diabetesImplant: healthAnswers.diabetes! }),
          ...(anyYes && Object.values(healthDetailMap).some(v => v.trim()) && {
            details: Object.entries(healthDetailMap)
              .filter(([_, v]) => v.trim())
              .map(([key, val]) => `${key}: ${val.trim()}`)
              .join('; '),
          }),
        },
        filesCount: finalFilesCount,
      });

      // Sync Quick Health answers back to medical profile
      try {
        const currentMedical = await store.getPatientMedical() || {};
        await store.savePatientMedical({
          ...currentMedical,
          quickHealthSynced: true,
          bloodThinners: healthAnswers.bloodThinners,
          drugAllergies: healthAnswers.drugAllergies,
          pregnantNursing: healthAnswers.pregnantNursing,
        });
      } catch (e) { console.warn("Medical sync error:", e); }

      await AsyncStorage.multiRemove(["CASE_DRAFT_TREATMENTS", "CASE_DRAFT_CONCERN"]);
      setCaseId(newCase.id);
      setSubmitted(true);
    } catch (err) {
      console.log("Error creating case:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ─── submitted success screen ─── */
  if (submitted) {
    return (
      <View style={s.submittedWrap}>
        <Text style={{ fontSize: 80, marginBottom: 20 }}>🎉</Text>
        <Text style={s.submittedTitle}>Case Submitted!</Text>
        <Text style={s.submittedDesc}>
          Case #{caseId} has been sent to Korean dentists.{"\n"}You'll receive
          quotes within 24 hours.
        </Text>
        <View style={s.stepsBox}>
          {[
            { done: true, text: "Case submitted to dentists" },
            { done: false, text: "Dentists review your case" },
            { done: false, text: "Receive personalized quotes" },
          ].map((step, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={s.stepLine} />}
              <View style={s.stepRow}>
                <View style={[s.stepDot, !step.done && s.stepDotGray]}>
                  <Text style={step.done ? s.stepDotText : s.stepDotTextGray}>
                    {step.done ? "✓" : i + 1}
                  </Text>
                </View>
                <Text style={step.done ? s.stepTextDone : s.stepTextPending}>
                  {step.text}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>
        <TouchableOpacity
          style={s.dashBtn}
          onPress={() => router.replace("/patient/dashboard" as any)}
          activeOpacity={0.85}
        >
          <Text style={s.dashBtnText}>Go to Dashboard →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ─── helper: yes/no toggle ─── */
  const YesNo = ({
    label,
    value,
    onPress,
  }: {
    label: string;
    value: boolean | null;
    onPress: (v: boolean) => void;
  }) => (
    <View style={s.healthRow}>
      <Text style={s.healthLabel}>{label}</Text>
      <View style={s.toggleRow}>
        <TouchableOpacity
          style={[s.toggleBtn, value === true && s.toggleBtnYes]}
          onPress={() => onPress(true)}
          activeOpacity={0.7}
        >
          <Text style={[s.toggleText, value === true && s.toggleTextActive]}>
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, value === false && s.toggleBtnNo]}
          onPress={() => onPress(false)}
          activeOpacity={0.7}
        >
          <Text style={[s.toggleText, value === false && s.toggleTextActive]}>
            No
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /* ─── main UI ─── */
  return (
    <View style={s.container}>
      <LinearGradient colors={[...PatientTheme.gradient]} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.back()}
          >
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.title}>Review & Submit</Text>
            <Text style={s.subtitle}>
              Check your information before submitting
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Quick Safety Check ── */}
        <View style={[s.healthCard, healthComplete ? s.sectionComplete : s.sectionIncomplete]}>
          <View style={s.cardHeader}>
            {healthComplete && <Text style={s.checkIcon}>✓</Text>}
            <Text style={s.healthTitle}>Quick Safety Check</Text>
          </View>
          <Text style={s.healthSubtitle}>
            Required before submitting your case. Additional questions may appear based on your selected treatments.
          </Text>

          <YesNo
            label="Are you currently taking blood thinners?"
            value={healthAnswers.bloodThinners}
            onPress={(v) =>
              setHealthAnswers((prev) => ({ ...prev, bloodThinners: v }))
            }
          />
          {healthAnswers.bloodThinners === true && (
            <TextInput
              style={s.inlineDetailInput}
              value={healthDetailMap["Blood thinners"] || ""}
              onChangeText={(t) => setHealthDetailMap((prev) => ({ ...prev, "Blood thinners": t }))}
              placeholder="Which blood thinners? e.g., Warfarin, Aspirin"
              placeholderTextColor={SharedColors.slateLight}
            />
          )}

          <YesNo
            label="Do you have any drug allergies?"
            value={healthAnswers.drugAllergies}
            onPress={(v) =>
              setHealthAnswers((prev) => ({ ...prev, drugAllergies: v }))
            }
          />
          {healthAnswers.drugAllergies === true && (
            <TextInput
              style={s.inlineDetailInput}
              value={healthDetailMap["Drug allergies"] || ""}
              onChangeText={(t) => setHealthDetailMap((prev) => ({ ...prev, "Drug allergies": t }))}
              placeholder="Which drugs? e.g., Penicillin, Ibuprofen"
              placeholderTextColor={SharedColors.slateLight}
            />
          )}

          <YesNo
            label="Are you pregnant or nursing?"
            value={healthAnswers.pregnantNursing}
            onPress={(v) =>
              setHealthAnswers((prev) => ({ ...prev, pregnantNursing: v }))
            }
          />

          {showDiabetes && (
            <>
              <YesNo
                label="Do you have diabetes?"
                value={healthAnswers.diabetes}
                onPress={(v) =>
                  setHealthAnswers((prev) => ({ ...prev, diabetes: v }))
                }
              />
              {healthAnswers.diabetes === true && (
                <TextInput
                  style={s.inlineDetailInput}
                  value={healthDetailMap["Diabetes"] || ""}
                  onChangeText={(t) => setHealthDetailMap((prev) => ({ ...prev, "Diabetes": t }))}
                  placeholder="Type 1 or Type 2? Any medications?"
                  placeholderTextColor={SharedColors.slateLight}
                />
              )}
            </>
          )}
        </View>

        {/* ── Your Info card ── */}
        <View style={[s.card, infoComplete ? s.sectionComplete : s.sectionIncomplete]}>
          <View style={s.cardHeader}>
            {infoComplete && <Text style={s.checkIcon}>✓</Text>}
            <Text style={s.cardIcon}>📋</Text>
            <Text style={s.cardTitle}>Your Info</Text>
            <TouchableOpacity
              onPress={() => router.push("/patient/patient-info?from=review" as any)}
            >
              <Text style={s.edit}>Edit</Text>
            </TouchableOpacity>
          </View>
          {patientName || patientCountry ? (
            <View style={s.cardBody}>
              {patientName ? (
                <Text style={s.summaryText}>{patientName}</Text>
              ) : null}
              {patientCountry ? (
                <Text style={s.summarySubtext}>{patientCountry}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={s.emptyText}>No profile info yet</Text>
          )}
        </View>

        {/* ── Selected Treatments card (specific mode) ── */}
        {!isProposal && (
          <View style={[s.card, treatmentComplete ? s.sectionComplete : s.sectionIncomplete]}>
            <View style={s.cardHeader}>
              {treatmentComplete && <Text style={s.checkIcon}>✓</Text>}
              <Text style={s.cardIcon}>✨</Text>
              <Text style={s.cardTitle}>Selected Treatments</Text>
              <TouchableOpacity
                onPress={() =>
                  router.push("/patient/treatment-select?from=review" as any)
                }
              >
                <Text style={s.edit}>Edit</Text>
              </TouchableOpacity>
            </View>
            {treatmentList.length > 0 ? (
              <View style={s.cardBody}>
                {treatmentList.map((t, i) => (
                  <View key={i} style={s.treatmentRow}>
                    <View style={s.treatmentDot} />
                    <Text style={s.treatmentName}>{t.name}</Text>
                    <Text style={s.treatmentQty}>x{t.qty}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={s.emptyText}>No treatments selected</Text>
            )}
          </View>
        )}

        {/* ── Your Concern card (proposal mode) ── */}
        {isProposal && (
          <View style={[s.card, treatmentComplete ? s.sectionComplete : s.sectionIncomplete]}>
            <View style={s.cardHeader}>
              {treatmentComplete && <Text style={s.checkIcon}>✓</Text>}
              <Text style={s.cardIcon}>💬</Text>
              <Text style={s.cardTitle}>Your Concern</Text>
              <TouchableOpacity
                onPress={() =>
                  router.push("/patient/concern-describe?from=review" as any)
                }
              >
                <Text style={s.edit}>Edit</Text>
              </TouchableOpacity>
            </View>
            {concernText ? (
              <View style={s.cardBody}>
                <Text style={s.summaryText} numberOfLines={4}>
                  {concernText}
                </Text>
                {concernPhoto ? (
                  <Image
                    source={{ uri: concernPhoto }}
                    style={s.concernThumb}
                  />
                ) : null}
              </View>
            ) : (
              <Text style={s.emptyText}>No concern described yet</Text>
            )}
          </View>
        )}

        {/* ── Uploaded Files card (optional) ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardIcon}>📁</Text>
            <Text style={s.cardTitle}>Uploaded Files</Text>
            <TouchableOpacity
              onPress={() => router.push("/patient/upload?from=review" as any)}
            >
              <Text style={s.edit}>{filesCount > 0 ? "Edit" : "Add"}</Text>
            </TouchableOpacity>
          </View>
          {filesCount > 0 ? (
            <Text style={s.summarySubtext}>
              {filesCount} file{filesCount !== 1 ? "s" : ""} uploaded
            </Text>
          ) : (
            <Text style={s.optionalText}>
              No files yet — you can add later
            </Text>
          )}
        </View>
      </ScrollView>

      {/* ── Bottom submit bar ── */}
      <View style={s.bottom}>
        <TouchableOpacity
          style={[s.submitBtn, (!canSubmit || loading) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={SharedColors.white} size="small" />
          ) : (
            <Text style={s.submitBtnText}>Submit Case →</Text>
          )}
        </TouchableOpacity>
        {!allHealthAnswered && (
          <Text style={s.hintText}>
            Answer all health questions to continue
          </Text>
        )}
      </View>
    </View>
  );
}

/* ─── styles ─── */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 24,
    color: SharedColors.white,
    fontWeight: "600",
    marginTop: -2,
  },
  title: { fontSize: 18, fontWeight: "700", color: SharedColors.white },
  subtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  content: { padding: 20, gap: 12, paddingBottom: 60 },

  /* cards */
  card: {
    backgroundColor: SharedColors.white,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: SharedColors.border,
  },
  sectionComplete: { borderLeftWidth: 4, borderLeftColor: SharedColors.green, backgroundColor: "rgba(22,163,74,0.04)" },
  sectionIncomplete: { borderLeftWidth: 2, borderLeftColor: SharedColors.border, borderStyle: "dashed" as any },
  checkIcon: { fontSize: 14, color: SharedColors.green, fontWeight: "700" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIcon: { fontSize: 20 },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: SharedColors.navy,
  },
  edit: { fontSize: 13, fontWeight: "600", color: PatientTheme.primaryMid },
  cardBody: { marginLeft: 30, gap: 4 },
  summaryText: { fontSize: 14, color: SharedColors.navy, lineHeight: 20 },
  summarySubtext: { fontSize: 13, color: SharedColors.slate },
  emptyText: { fontSize: 13, color: SharedColors.slateLight, marginLeft: 30 },
  optionalText: {
    fontSize: 13,
    color: SharedColors.slate,
    marginLeft: 30,
    fontStyle: "italic",
  },

  /* treatment rows */
  treatmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  treatmentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PatientTheme.primary,
  },
  treatmentName: { flex: 1, fontSize: 13, color: SharedColors.navy },
  treatmentQty: {
    fontSize: 13,
    fontWeight: "600",
    color: PatientTheme.primaryMid,
  },

  /* concern thumbnail */
  concernThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: SharedColors.border,
  },

  /* health screen */
  healthCard: {
    backgroundColor: SharedColors.white,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: PatientTheme.primaryBorder,
  },
  healthTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: SharedColors.navy,
  },
  healthSubtitle: {
    fontSize: 12,
    color: SharedColors.slate,
    marginTop: -8,
  },
  healthRow: { gap: 8 },
  healthLabel: { fontSize: 14, color: SharedColors.navy, lineHeight: 20 },
  toggleRow: { flexDirection: "row", gap: 10 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SharedColors.border,
    alignItems: "center",
    backgroundColor: SharedColors.bg,
  },
  toggleBtnYes: {
    borderColor: SharedColors.coral,
    backgroundColor: SharedColors.coralLight,
  },
  toggleBtnNo: {
    borderColor: SharedColors.green,
    backgroundColor: SharedColors.greenLight,
  },
  toggleText: { fontSize: 14, fontWeight: "600", color: SharedColors.slate },
  toggleTextActive: { color: SharedColors.navy },
  inlineDetailInput: {
    borderWidth: 1,
    borderColor: SharedColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: SharedColors.navy,
    backgroundColor: SharedColors.bg,
    marginTop: -6,
  },
  detailsWrap: { gap: 6 },
  detailsLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: SharedColors.navy,
  },
  detailsInput: {
    borderWidth: 1,
    borderColor: SharedColors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: SharedColors.navy,
    minHeight: 72,
    backgroundColor: SharedColors.bg,
  },

  /* bottom */
  bottom: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: SharedColors.border,
    backgroundColor: SharedColors.white,
    gap: 8,
  },
  submitBtn: {
    backgroundColor: PatientTheme.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    minHeight: 52,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: {
    color: SharedColors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  hintText: {
    fontSize: 12,
    color: SharedColors.slateLight,
    textAlign: "center",
  },

  /* submitted screen */
  submittedWrap: {
    flex: 1,
    backgroundColor: SharedColors.bg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  submittedTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: SharedColors.navy,
    marginBottom: 12,
  },
  submittedDesc: {
    fontSize: 14,
    color: SharedColors.slate,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  stepsBox: {
    width: "100%",
    backgroundColor: SharedColors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: SharedColors.border,
  },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: SharedColors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotGray: { backgroundColor: SharedColors.border },
  stepDotText: { color: SharedColors.white, fontSize: 14, fontWeight: "700" },
  stepDotTextGray: {
    color: SharedColors.slateLight,
    fontSize: 13,
    fontWeight: "600",
  },
  stepTextDone: { fontSize: 14, fontWeight: "600", color: SharedColors.green },
  stepTextPending: { fontSize: 14, color: SharedColors.slate },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: SharedColors.border,
    marginLeft: 14,
  },
  dashBtn: {
    width: "100%",
    backgroundColor: PatientTheme.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  dashBtnText: {
    color: SharedColors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
