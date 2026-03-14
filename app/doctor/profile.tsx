import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View,
} from "react-native";
import { DoctorProfile as DoctorProfileType, store } from "../../lib/store";
import { authApi } from "../../lib/api";

const T = {
  teal: "#0f766e",
  tealLight: "#14b8a6",
  bg: "#f8fafc",
  white: "#fff",
  text: "#0f172a",
  textSec: "#64748b",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  red: "#ef4444",
};

export default function DoctorProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ cases: 0, quoted: 0, booked: 0, reviews: 0, avgRating: 0 });

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const p = await store.getDoctorProfile();
        setProfile(p);

        const cases = await store.getCases();
        const myReviews = p?.fullName ? await store.getReviewsForDentist(p.fullName) : [];
        const bookings = await store.getBookings();
        const avgR = myReviews.length > 0 ? myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length : 0;
        setStats({
          cases: cases.length,
          quoted: cases.filter((c) => c.status === "quotes_received").length,
          booked: cases.filter((c) => c.status === "booked").length,
          reviews: myReviews.length,
          avgRating: avgR,
        });
      };
      load();
    }, [])
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient colors={["#0f766e", "#134e4a"]} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Profile</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} style={s.scrollView}>
        {/* Avatar + Name */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{profile?.name?.[4] || "K"}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={s.name}>{profile?.name || "Doctor"}</Text>
            {profile?.licenseVerified && (
              <View style={s.verifiedBadge}>
                <Text style={s.verifiedIcon}>✓</Text>
              </View>
            )}
          </View>
          <Text style={s.clinic}>{profile?.clinic || ""}</Text>
          {profile?.specialty && (
            <View style={s.specialtyBadge}>
              <Text style={s.specialtyText}>{profile.specialty}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.cases}</Text>
            <Text style={s.statLabel}>Cases</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.booked}</Text>
            <Text style={s.statLabel}>Booked</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>⭐ {stats.avgRating.toFixed(1)}</Text>
            <Text style={s.statLabel}>{stats.reviews} reviews</Text>
          </View>
        </View>

        {/* Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>CLINIC INFORMATION</Text>
          <View style={s.card}>
            <InfoRow icon="🏥" label="Clinic" value={profile?.clinic || "—"} />
            <InfoRow icon="📍" label="Location" value={profile?.location || "—"} />
            <InfoRow icon="📧" label="Email" value={profile?.email || "—"} />
            <InfoRow icon="📱" label="Phone" value={profile?.phone || "—"} />
            <InfoRow icon="🎓" label="Experience" value={profile?.experience ? `${profile.experience} years` : "—"} />
            <InfoRow icon="📋" label="License" value={profile?.license || "—"} last />
          </View>
        </View>

        {/* Bio */}
        {profile?.bio && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>ABOUT</Text>
            <View style={s.card}>
              <Text style={s.bioText}>{profile.bio}</Text>
            </View>
          </View>
        )}

        {/* Certifications */}
        {profile?.certifications && profile.certifications.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>CERTIFICATIONS</Text>
            <View style={{ gap: 8 }}>
              {profile.certifications.map((cert: string, i: number) => (
                <View key={i} style={s.certCard}>
                  <Text style={s.certIcon}>🛡️</Text>
                  <Text style={s.certText}>{cert}</Text>
                  {cert === "License Verified" && profile.licenseVerified && (
                    <View style={s.certCheck}>
                      <Text style={s.certCheckIcon}>✓</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Before/After Photos — preview + link to dedicated page */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>BEFORE & AFTER PHOTOS</Text>
          <TouchableOpacity
            style={s.baLinkCard}
            onPress={() => router.push("/doctor/before-after" as any)}
            activeOpacity={0.7}
          >
            {profile?.beforeAfterPhotos && profile.beforeAfterPhotos.length > 0 ? (
              <View style={s.baPreviewRow}>
                {profile.beforeAfterPhotos.slice(0, 2).map((photo: any, i: number) => (
                  <Image key={i} source={{ uri: photo.after }} style={s.baPreviewThumb} />
                ))}
                <View style={s.baPreviewInfo}>
                  <Text style={s.baPreviewCount}>📸 {profile.beforeAfterPhotos.length} photo set{profile.beforeAfterPhotos.length !== 1 ? "s" : ""}</Text>
                  <Text style={s.baPreviewHint}>Tap to manage</Text>
                </View>
              </View>
            ) : (
              <View style={s.baPreviewEmpty}>
                <Text style={s.baPreviewEmptyIcon}>📷</Text>
                <View>
                  <Text style={s.baPreviewEmptyText}>Add Before/After Photos</Text>
                  <Text style={s.baPreviewHint}>Showcase your treatment results</Text>
                </View>
              </View>
            )}
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={s.section}>
          <TouchableOpacity style={s.menuItem} onPress={() => router.push("/doctor/chat-list" as any)}>
            <Text style={s.menuIcon}>💬</Text>
            <Text style={s.menuText}>Patient Messages</Text>
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => router.push("/notifications?role=doctor" as any)}>
            <Text style={s.menuIcon}>🔔</Text>
            <Text style={s.menuText}>Notifications</Text>
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => router.push("/doctor/profile-setup" as any)}>
            <Text style={s.menuIcon}>✏️</Text>
            <Text style={s.menuText}>Edit Profile</Text>
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.menuItem, { borderColor: "rgba(239,68,68,0.2)" }]}
            onPress={() => {
              Alert.alert("Log Out", "Are you sure?", [
                { text: "Cancel", style: "cancel" },
                { text: "Log Out", style: "destructive", onPress: async () => {
                  try { await authApi.logout(); } catch {}
                  await store.clearCurrentUser();
                  router.replace("/auth/role-select" as any);
                }},
              ]);
            }}
          >
            <Text style={s.menuIcon}>🚪</Text>
            <Text style={[s.menuText, { color: T.red }]}>Log Out</Text>
            <Text style={[s.menuArrow, { color: T.red }]}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const InfoRow = ({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) => (
  <View style={[iStyles.row, !last && iStyles.rowBorder]}>
    <Text style={iStyles.icon}>{icon}</Text>
    <Text style={iStyles.label}>{label}</Text>
    <Text style={iStyles.value} numberOfLines={1}>{value}</Text>
  </View>
);

const iStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
  icon: { fontSize: 16, width: 24, textAlign: "center" },
  label: { fontSize: 13, color: T.textSec, width: 90 },
  value: { flex: 1, fontSize: 13, fontWeight: "600", color: T.text, textAlign: "right" },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
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

  scrollView: { flex: 1, backgroundColor: T.bg },
  content: { padding: 20, gap: 20, paddingBottom: 40 },

  // Avatar
  avatarSection: { alignItems: "center", gap: 6 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: T.tealLight,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  avatarText: { color: T.white, fontSize: 32, fontWeight: "700" },
  name: { fontSize: 22, fontWeight: "700", color: T.text },
  clinic: { fontSize: 13, color: T.textSec },
  specialtyBadge: {
    backgroundColor: "rgba(20,184,166,0.1)", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 5, marginTop: 4,
  },
  specialtyText: { fontSize: 12, fontWeight: "600", color: T.teal },

  // Stats
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, backgroundColor: T.white, borderRadius: 14, padding: 16,
    alignItems: "center", borderWidth: 1, borderColor: T.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statNum: { fontSize: 20, fontWeight: "800", color: T.teal },
  statLabel: { fontSize: 11, color: T.textSec, marginTop: 2 },

  // Section
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: T.textSec, letterSpacing: 0.5,
    marginBottom: 2,
  },
  card: {
    backgroundColor: T.white, borderRadius: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: T.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  bioText: { color: T.textSec, fontSize: 13, lineHeight: 20, paddingVertical: 14 },

  // Verified badge
  verifiedBadge: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: "#2563eb",
    alignItems: "center", justifyContent: "center",
  },
  verifiedIcon: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Certifications
  certCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#eff6ff", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#bfdbfe",
  },
  certIcon: { fontSize: 18 },
  certText: { fontSize: 13, fontWeight: "600", color: "#1e40af", flex: 1 },
  certCheck: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: "#2563eb",
    alignItems: "center", justifyContent: "center",
  },
  certCheckIcon: { color: "#fff", fontSize: 10, fontWeight: "700" },

  // Before/After link card
  baLinkCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: T.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  baPreviewRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  baPreviewThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: T.border },
  baPreviewInfo: { flex: 1, gap: 2 },
  baPreviewCount: { fontSize: 14, fontWeight: "600", color: T.text },
  baPreviewHint: { fontSize: 11, color: T.textMuted },
  baPreviewEmpty: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  baPreviewEmptyIcon: { fontSize: 24 },
  baPreviewEmptyText: { fontSize: 14, fontWeight: "600", color: T.text },

  // Menu
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: T.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: T.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  menuIcon: { fontSize: 18 },
  menuText: { flex: 1, fontSize: 14, fontWeight: "600", color: T.text },
  menuArrow: { fontSize: 20, color: T.textMuted },
});
