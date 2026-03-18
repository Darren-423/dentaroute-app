import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View,
} from "react-native";
import { store } from "../../lib/store";

const T = {
  teal: "#0f766e",
  tealLight: "#14b8a6",
  bg: "#f8fafc",
  white: "#fff",
  text: "#0f172a",
  textSec: "#64748b",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  amber: "#f59e0b",
  amberLight: "rgba(245,158,11,0.08)",
};

export default function PatientInfoScreen() {
  const { patientName, caseId } = useLocalSearchParams<{ patientName: string; caseId?: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [medical, setMedical] = useState<any>(null);
  const [dental, setDental] = useState<any>(null);
  const [files, setFiles] = useState<any>(null);
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const p = await store.getPatientProfile();
      setProfile(p);
      const m = await store.getPatientMedical();
      setMedical(m);
      const d = await store.getPatientDental();
      setDental(d);
      const f = await store.getPatientFiles();
      setFiles(f);
      if (caseId) {
        const cases = await store.getCases();
        const c = cases.find((cs) => cs.id === caseId);
        if (c) setCaseData(c);
      }
      const dp = await store.getDoctorProfile();
      if (dp) setDoctorProfile(dp);
      setLoading(false);
    };
    load();
  }, []);

  const initial = (patientName || "P")[0]?.toUpperCase() || "P";

  const formatDate = (str: string) => {
    if (!str) return "—";
    const [y, m, d] = str.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
  };

  const getAge = (birth: string) => {
    if (!birth) return "—";
    const b = new Date(birth);
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
    return `${age} years old`;
  };

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={T.teal} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <LinearGradient colors={["#0f766e", "#134e4a"]} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Patient Profile</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} style={{ backgroundColor: T.bg }}>
        {/* Avatar + Name */}
        <View style={s.profileSection}>
          {profile?.profileImage ? (
            <Image source={{ uri: profile.profileImage }} style={s.avatarImg} />
          ) : (
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initial}</Text>
            </View>
          )}
          <Text style={s.name}>{patientName || profile?.fullName || "Patient"}</Text>
          <Text style={s.sub}>{profile?.country || "—"}</Text>
          {profile?.birthDate && (
            <Text style={s.age}>{getAge(profile.birthDate)} • Born {formatDate(profile.birthDate)}</Text>
          )}
        </View>

        {/* Case context */}
        {caseData && (
          <View style={s.caseCard}>
            <Text style={s.caseLabel}>📋 Case #{caseData.id}</Text>
            <Text style={s.caseTreatments}>
              {caseData.treatments?.map((t: any) => `${toDoctorLabel(t.name)} ×${t.qty}`).join(", ") || "—"}
            </Text>
            <Text style={s.caseSub}>Submitted {formatDate(caseData.date)}</Text>
          </View>
        )}

        {/* Quick info */}
        <View style={s.quickGrid}>
          <View style={[s.quickCard, { borderLeftColor: "#3b82f6" }]}>
            <View style={[s.quickIconCircle, { backgroundColor: "rgba(59,130,246,0.1)" }]}>
              <Text style={s.quickIconText}>🌍</Text>
            </View>
            <View style={s.quickTextCol}>
              <Text style={s.quickLabel}>Country</Text>
              <Text style={s.quickValue}>{profile?.country || "—"}</Text>
            </View>
          </View>
          <View style={[s.quickCard, { borderLeftColor: "#8b5cf6" }]}>
            <View style={[s.quickIconCircle, { backgroundColor: "rgba(139,92,246,0.1)" }]}>
              <Text style={s.quickIconText}>🗣</Text>
            </View>
            <View style={s.quickTextCol}>
              <Text style={s.quickLabel}>Language</Text>
              <Text style={s.quickValue}>{profile?.language || "English"}</Text>
            </View>
          </View>
          <View style={[s.quickCard, { borderLeftColor: T.teal }]}>
            <View style={[s.quickIconCircle, { backgroundColor: "rgba(15,118,110,0.1)" }]}>
              <Text style={s.quickIconText}>📎</Text>
            </View>
            <View style={s.quickTextCol}>
              <Text style={s.quickLabel}>Files</Text>
              <Text style={s.quickValue}>{files ? Object.values(files).reduce((n: number, v: any) => n + (typeof v === "number" ? v : Array.isArray(v) ? v.length : 0), 0) : 0} attached</Text>
            </View>
          </View>
        </View>

        {/* Medical */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>💊 MEDICAL HISTORY</Text>
          <View style={s.card}>
            <InfoRow label="Conditions" value={medical?.conditions?.join(", ") || "None"} />
            <InfoRow label="Allergies" value={medical?.allergies || "None"} />
            <InfoRow label="Medications" value={medical?.medications || "None"} last />
          </View>
        </View>

        {/* Dental */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🦷 DENTAL HISTORY</Text>
          <View style={s.card}>
            <InfoRow label="Current issues" value={dental?.issues?.join(", ") || "—"} />
            <InfoRow label="Past treatments" value={dental?.pastTreatment || "—"} />
            <InfoRow label="Last dental visit" value={dental?.lastVisit || "—"} last />
          </View>
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity
            style={s.actionPrimary}
            onPress={async () => {
              const room = await store.getOrCreateChatRoom(
                caseData?.id || "unknown",
                patientName || profile?.fullName || "Patient",
                doctorProfile?.name || "Doctor",
                doctorProfile?.clinic || "Clinic"
              );
              router.push({
                pathname: "/doctor/chat" as any,
                params: { chatRoomId: room.id, patientName: patientName || profile?.fullName },
              });
            }}
          >
            <Text style={s.actionPrimaryText}>💬 Message Patient</Text>
          </TouchableOpacity>

          {caseId && (
            <TouchableOpacity
              style={s.actionSecondary}
              onPress={() => router.push({
                pathname: "/doctor/case-detail" as any,
                params: { caseId },
              })}
            >
              <Text style={s.actionSecondaryText}>📋 View Case Details</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const InfoRow = ({ label, value, last }: { label: string; value: string; last?: boolean }) => (
  <View style={[iS.row, !last && iS.border]}>
    <Text style={iS.label}>{label}</Text>
    <Text style={iS.value}>{value}</Text>
  </View>
);

const iS = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: T.border },
  label: { fontSize: 13, color: T.textSec },
  value: { fontSize: 13, fontWeight: "600", color: T.text, flex: 1, textAlign: "right" },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: {
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)",
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
  content: { padding: 20, gap: 16, paddingBottom: 40 },

  // Profile
  profileSection: { alignItems: "center", gap: 4 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: T.tealLight,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  avatarImg: {
    width: 80, height: 80, borderRadius: 40, marginBottom: 6,
    borderWidth: 2, borderColor: "rgba(15,118,110,0.2)",
  },
  avatarText: { color: T.white, fontSize: 32, fontWeight: "700" },
  name: { fontSize: 22, fontWeight: "700", color: T.text },
  sub: { fontSize: 13, color: T.textSec },
  age: { fontSize: 12, color: T.textMuted, marginTop: 2 },

  // Case
  caseCard: {
    backgroundColor: T.amberLight, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.15)", gap: 4,
  },
  caseLabel: { fontSize: 13, fontWeight: "700", color: T.amber },
  caseTreatments: { fontSize: 13, color: T.text, fontWeight: "500" },
  caseSub: { fontSize: 11, color: T.textSec },

  // Quick info cards
  quickGrid: { gap: 10 },
  quickCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: T.white, borderRadius: 14,
    padding: 14, paddingLeft: 16,
    borderWidth: 1, borderColor: T.border,
    borderLeftWidth: 3,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  quickIconCircle: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  quickIconText: { fontSize: 20 },
  quickTextCol: { flex: 1 },
  quickLabel: { fontSize: 10, fontWeight: "600", color: T.textMuted, letterSpacing: 0.5, marginBottom: 2 },
  quickValue: { fontSize: 14, fontWeight: "700", color: T.text },

  // Section
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: T.textSec, letterSpacing: 0.5,
  },
  card: {
    backgroundColor: T.white, borderRadius: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: T.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  noData: { color: T.textMuted, fontSize: 13, paddingVertical: 16, textAlign: "center" },

  // Actions
  actions: { gap: 10, marginTop: 4 },
  actionPrimary: {
    backgroundColor: T.tealLight, borderRadius: 14,
    paddingVertical: 15, alignItems: "center",
  },
  actionPrimaryText: { color: T.white, fontSize: 15, fontWeight: "600" },
  actionSecondary: {
    backgroundColor: T.white, borderRadius: 14,
    paddingVertical: 15, alignItems: "center",
    borderWidth: 1, borderColor: T.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  actionSecondaryText: { color: T.text, fontSize: 15, fontWeight: "600" },
});
