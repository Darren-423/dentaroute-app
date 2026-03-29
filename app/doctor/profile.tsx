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
import { getDoctorProfileCache, loadDoctorProfileData } from "../../lib/doctorTabDataCache";
import { resetNavigationHistory } from "../../lib/navigationHistory";
import { store } from "../../lib/store";

import { DoctorTheme, SharedColors } from "../../constants/theme";
export default function DoctorProfileScreen() {
  const initialProfileData = getDoctorProfileCache();
  const [profile, setProfile] = useState<any>(initialProfileData.profile);
  const [stats, setStats] = useState(initialProfileData.stats);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const data = await loadDoctorProfileData();
        setProfile(data.profile);
        setStats(data.stats);
      };
      load();
    }, [])
  );

  const goEdit = () => router.push("/doctor/profile-setup" as any);

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient colors={[DoctorTheme.primary, DoctorTheme.primaryDark]} style={s.header}>
        <Text style={s.headerTitle}>My Profile</Text>
        <Text style={s.headerSubtitle}>Manage your account & clinic info</Text>
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

        {/* Preview as Patient */}
        <TouchableOpacity
          style={s.previewBtn}
          onPress={() => router.push("/doctor/quote-preview" as any)}
          activeOpacity={0.7}
        >
          <Text style={s.previewIcon}>👁</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.previewTitle}>Preview as Patient</Text>
            <Text style={s.previewDesc}>See how patients view your profile in quotes</Text>
          </View>
          <Text style={s.menuArrow}>›</Text>
        </TouchableOpacity>

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

        {/* Clinic Photos */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>CLINIC PHOTOS</Text>
            <TouchableOpacity onPress={goEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          {profile?.clinicPhotos && profile.clinicPhotos.length > 0 ? (
            <TouchableOpacity style={s.photosRow} onPress={goEdit} activeOpacity={0.7}>
              {profile.clinicPhotos.slice(0, 4).map((uri: string, i: number) => (
                <Image key={i} source={{ uri }} style={s.photoThumb} />
              ))}
              {profile.clinicPhotos.length > 4 && (
                <View style={s.photoMore}>
                  <Text style={s.photoMoreText}>+{profile.clinicPhotos.length - 4}</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.photoEmpty} onPress={goEdit} activeOpacity={0.7}>
              <Text style={s.photoEmptyIcon}>📷</Text>
              <View>
                <Text style={s.photoEmptyTitle}>Add Clinic Photos</Text>
                <Text style={s.photoEmptyHint}>Patients see these when reviewing your quotes</Text>
              </View>
              <Text style={s.menuArrow}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info — tappable to edit */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>CLINIC INFORMATION</Text>
            <TouchableOpacity onPress={goEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.card} onPress={goEdit} activeOpacity={0.7}>
            <InfoRow icon="🏥" label="Clinic" value={profile?.clinic || "—"} />
            <InfoRow icon="📍" label="Location" value={profile?.location || "—"} />
            <InfoRow icon="📧" label="Email" value={profile?.email || "—"} />
            <InfoRow icon="📱" label="Phone" value={profile?.phone || "—"} />
            <InfoRow icon="🎓" label="Experience" value={profile?.experience ? `${profile.experience} years` : "—"} />
            <InfoRow icon="📋" label="License" value={profile?.license || "—"} last />
          </TouchableOpacity>
        </View>

        {/* Bio — tappable to edit */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>ABOUT</Text>
            <TouchableOpacity onPress={goEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.card} onPress={goEdit} activeOpacity={0.7}>
            <Text style={s.bioText}>{profile?.bio || "Add a bio to tell patients about yourself..."}</Text>
          </TouchableOpacity>
        </View>

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

        {/* Before/After Photos */}
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
          <TouchableOpacity style={s.menuItem} onPress={goEdit}>
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
                  await store.clearCurrentUser();
                  resetNavigationHistory("/auth/role-select");
                  router.replace("/auth/role-select" as any);
                }},
              ]);
            }}
          >
            <Text style={s.menuIcon}>🚪</Text>
            <Text style={[s.menuText, { color: SharedColors.red }]}>Log Out</Text>
            <Text style={[s.menuArrow, { color: SharedColors.red }]}>›</Text>
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
  rowBorder: { borderBottomWidth: 1, borderBottomColor: SharedColors.border },
  icon: { fontSize: 16, width: 24, textAlign: "center" },
  label: { fontSize: 13, color: SharedColors.navySec, width: 90 },
  value: { flex: 1, fontSize: 13, fontWeight: "600", color: SharedColors.navy, textAlign: "right" },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 18 },
  headerTitle: { fontSize: 28, fontWeight: "700", color: SharedColors.white },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 },

  scrollView: { flex: 1, backgroundColor: SharedColors.bg },
  content: { padding: 20, gap: 20, paddingBottom: 120 },

  // Avatar
  avatarSection: { alignItems: "center", gap: 6 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: DoctorTheme.accentBright,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  avatarText: { color: SharedColors.white, fontSize: 32, fontWeight: "700" },
  name: { fontSize: 22, fontWeight: "700", color: SharedColors.navy },
  clinic: { fontSize: 13, color: SharedColors.navySec },
  specialtyBadge: {
    backgroundColor: "rgba(20,184,166,0.1)", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 5, marginTop: 4,
  },
  specialtyText: { fontSize: 12, fontWeight: "600", color: DoctorTheme.primary },

  // Preview button
  previewBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(15,118,110,0.06)", borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: "rgba(15,118,110,0.15)",
  },
  previewIcon: { fontSize: 22 },
  previewTitle: { fontSize: 14, fontWeight: "700", color: DoctorTheme.primary },
  previewDesc: { fontSize: 11, color: SharedColors.navySec, marginTop: 2 },

  // Stats
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, backgroundColor: SharedColors.white, borderRadius: 14, padding: 16,
    alignItems: "center", borderWidth: 1, borderColor: SharedColors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statNum: { fontSize: 20, fontWeight: "800", color: DoctorTheme.primary },
  statLabel: { fontSize: 11, color: SharedColors.navySec, marginTop: 2 },

  // Section
  section: { gap: 8 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: SharedColors.navySec, letterSpacing: 0.5,
    marginBottom: 2,
  },
  editLink: { fontSize: 13, fontWeight: "600", color: DoctorTheme.primary },
  card: {
    backgroundColor: SharedColors.white, borderRadius: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: SharedColors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  bioText: { color: SharedColors.navySec, fontSize: 13, lineHeight: 20, paddingVertical: 14 },

  // Clinic photos
  photosRow: {
    flexDirection: "row", gap: 8, flexWrap: "wrap",
  },
  photoThumb: {
    width: 72, height: 72, borderRadius: 12, backgroundColor: SharedColors.border,
  },
  photoMore: {
    width: 72, height: 72, borderRadius: 12, backgroundColor: "rgba(15,118,110,0.08)",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(15,118,110,0.15)",
  },
  photoMoreText: { fontSize: 16, fontWeight: "700", color: DoctorTheme.primary },
  photoEmpty: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: SharedColors.border, borderStyle: "dashed",
  },
  photoEmptyIcon: { fontSize: 24 },
  photoEmptyTitle: { fontSize: 14, fontWeight: "600", color: SharedColors.navy },
  photoEmptyHint: { fontSize: 11, color: SharedColors.navyMuted, marginTop: 2 },

  // Verified badge
  verifiedBadge: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: "#2563eb",
    alignItems: "center", justifyContent: "center",
  },
  verifiedIcon: { color: SharedColors.white, fontSize: 13, fontWeight: "700" },

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
  certCheckIcon: { color: SharedColors.white, fontSize: 10, fontWeight: "700" },

  // Before/After link card
  baLinkCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: SharedColors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  baPreviewRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  baPreviewThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: SharedColors.border },
  baPreviewInfo: { flex: 1, gap: 2 },
  baPreviewCount: { fontSize: 14, fontWeight: "600", color: SharedColors.navy },
  baPreviewHint: { fontSize: 11, color: SharedColors.navyMuted },
  baPreviewEmpty: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  baPreviewEmptyIcon: { fontSize: 24 },
  baPreviewEmptyText: { fontSize: 14, fontWeight: "600", color: SharedColors.navy },

  // Menu
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: SharedColors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  menuIcon: { fontSize: 18 },
  menuText: { flex: 1, fontSize: 14, fontWeight: "600", color: SharedColors.navy },
  menuArrow: { fontSize: 20, color: SharedColors.navyMuted },
});
