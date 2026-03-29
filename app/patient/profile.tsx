import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActionSheetIOS,
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View,
} from "react-native";
import { resetNavigationHistory } from "../../lib/navigationHistory";
import { store } from "../../lib/store";

import { PatientTheme, SharedColors } from "../../constants/theme";
export default function PatientProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [medical, setMedical] = useState<any>(null);
  const [dental, setDental] = useState<any>(null);
  const [stats, setStats] = useState({ cases: 0, bookings: 0, reviews: 0 });
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const p = await store.getPatientProfile();
        setProfile(p);
        const m = await store.getPatientMedical();
        setMedical(m);
        const d = await store.getPatientDental();
        setDental(d);
        const cases = await store.getCases();
        const bookings = await store.getBookings();
        const reviews = await store.getReviews();
        setStats({ cases: cases.length, bookings: bookings.length, reviews: reviews.length });
      };
      load();
    }, [])
  );

  const initial = profile?.fullName?.[0]?.toUpperCase() || "P";

  const pickImage = async (source: "camera" | "gallery") => {
    let result: ImagePicker.ImagePickerResult;

    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Camera access is needed to take a photo.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Photo library access is needed to choose a photo.");
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    }

    if (!result.canceled && result.assets?.[0]?.uri) {
      const updated = { ...profile, profileImage: result.assets[0].uri };
      await store.savePatientProfile(updated);
      setProfile(updated);
    }
  };

  const handleAvatarPress = () => {
    const options = profile?.profileImage
      ? ["Take Photo", "Choose from Gallery", "Remove Photo", "Cancel"]
      : ["Take Photo", "Choose from Gallery", "Cancel"];

    const cancelIndex = options.length - 1;
    const destructiveIndex = profile?.profileImage ? 2 : undefined;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
        async (idx) => {
          if (idx === 0) pickImage("camera");
          else if (idx === 1) pickImage("gallery");
          else if (idx === 2 && profile?.profileImage) {
            const updated = { ...profile, profileImage: undefined };
            await store.savePatientProfile(updated);
            setProfile(updated);
          }
        }
      );
    } else {
      const alertOptions: any[] = [
        { text: "Take Photo", onPress: () => pickImage("camera") },
        { text: "Choose from Gallery", onPress: () => pickImage("gallery") },
      ];
      if (profile?.profileImage) {
        alertOptions.push({
          text: "Remove Photo",
          style: "destructive",
          onPress: async () => {
            const updated = { ...profile, profileImage: undefined };
            await store.savePatientProfile(updated);
            setProfile(updated);
          },
        });
      }
      alertOptions.push({ text: "Cancel", style: "cancel" });
      Alert.alert("Profile Photo", "Choose an option", alertOptions);
    }
  };

  const formatDate = (str: string) => {
    if (!str) return "—";
    const [y, m, d] = str.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
  };

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[...PatientTheme.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <Text style={s.headerTitle}>My Profile</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Avatar + Name */}
        <View style={s.avatarSection}>
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8}>
            <View style={s.avatarWrap}>
              {profile?.profileImage ? (
                <Image source={{ uri: profile.profileImage }} style={s.avatarImage} />
              ) : (
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{initial}</Text>
                </View>
              )}
              <View style={s.cameraBadge}>
                <Text style={s.cameraIcon}>📷</Text>
              </View>
            </View>
          </TouchableOpacity>
          <Text style={s.name}>{profile?.fullName || "Patient"}</Text>
          <Text style={s.email}>{profile?.email || ""}</Text>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.cases}</Text>
            <Text style={s.statLabel}>Cases</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.bookings}</Text>
            <Text style={s.statLabel}>Bookings</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.reviews}</Text>
            <Text style={s.statLabel}>Reviews</Text>
          </View>
        </View>

        {/* Personal Info */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Personal Information</Text>
            <TouchableOpacity style={s.editBtn} onPress={() => router.push("/patient/edit-profile" as any)}>
              <Text style={s.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={s.card}>
            <InfoRow icon="📧" label="Email" value={profile?.email || "—"} />
            <InfoRow icon="📱" label="Phone" value={profile?.phone || "—"} />
            <InfoRow icon="🌍" label="Country" value={profile?.country || "—"} />
            <InfoRow icon="🎂" label="Birth Date" value={formatDate(profile?.birthDate)} />
            <InfoRow icon="🗣" label="Language" value={profile?.language || "English"} last />
          </View>
        </View>

        {/* Medical Summary */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Medical History</Text>
            <TouchableOpacity style={s.editBtn} onPress={() => router.push("/patient/medical-history?mode=edit" as any)}>
              <Text style={s.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={s.card}>
            <InfoRow icon="💊" label="Conditions" value={medical?.conditions?.join(", ") || "None"} />
            <InfoRow icon="💉" label="Allergies" value={medical?.allergies || "None"} />
            <InfoRow icon="🏥" label="Medications" value={medical?.medications || "None"} last />
          </View>
        </View>

        {/* Dental Summary */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Dental History</Text>
            <TouchableOpacity style={s.editBtn} onPress={() => router.push("/patient/dental-history?mode=edit" as any)}>
              <Text style={s.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={s.card}>
            <InfoRow icon="🦷" label="Issues" value={dental?.issues?.join(", ") || "—"} />
            <InfoRow icon="📅" label="Last Visit" value={dental?.lastVisit || "—"} />
            <InfoRow icon="🔧" label="Past Treatment" value={dental?.pastTreatment || "—"} last />
          </View>
        </View>

        {/* Actions */}
        <View style={s.section}>
          <TouchableOpacity style={s.menuItem} onPress={() => router.push("/patient/chat-list" as any)}>
            <Text style={s.menuIcon}>💬</Text>
            <Text style={s.menuText}>My Messages</Text>
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => router.push("/patient/help-center" as any)}>
            <Text style={s.menuIcon}>❓</Text>
            <Text style={s.menuText}>Help & Support</Text>
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => router.push("/patient/upload?mode=standalone" as any)}>
            <Text style={s.menuIcon}>📁</Text>
            <Text style={s.menuText}>My Files</Text>
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.menuItem, { borderColor: SharedColors.redLight }]}
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
        <View style={{ height: 80 }} />
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
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  icon: { fontSize: 16, width: 24, textAlign: "center" },
  label: { fontSize: 13, color: SharedColors.slate, width: 90 },
  value: { flex: 1, fontSize: 13, fontWeight: "600", color: SharedColors.navy, textAlign: "right" },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: {
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: SharedColors.white },

  content: { padding: 20, gap: 20, paddingBottom: 40 },

  // Avatar
  avatarSection: { alignItems: "center", gap: 6 },
  avatarWrap: {
    position: "relative",
    marginBottom: 4,
  },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: PatientTheme.primary,
    alignItems: "center", justifyContent: "center",
  },
  avatarImage: {
    width: 88, height: 88, borderRadius: 44,
  },
  avatarText: { color: SharedColors.white, fontSize: 32, fontWeight: "700" },
  cameraBadge: {
    position: "absolute", bottom: 0, right: -2,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: SharedColors.white,
    borderWidth: 2, borderColor: SharedColors.bg,
    alignItems: "center", justifyContent: "center",
  },
  cameraIcon: { fontSize: 14 },
  name: { fontSize: 22, fontWeight: "700", color: SharedColors.navy },
  email: { fontSize: 13, color: SharedColors.slate },

  // Stats
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, backgroundColor: SharedColors.white, borderRadius: 14, padding: 16,
    alignItems: "center", borderWidth: 1, borderColor: SharedColors.border,
  },
  statNum: { fontSize: 24, fontWeight: "800", color: PatientTheme.primary },
  statLabel: { fontSize: 11, color: SharedColors.slate, marginTop: 2 },

  // Section
  section: { gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: SharedColors.navy, marginBottom: 2 },
  editBtn: { backgroundColor: PatientTheme.primaryLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  editBtnText: { fontSize: 12, fontWeight: "600", color: PatientTheme.primary },
  card: {
    backgroundColor: SharedColors.white, borderRadius: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: SharedColors.border,
  },

  // Menu items
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  menuIcon: { fontSize: 18 },
  menuText: { flex: 1, fontSize: 14, fontWeight: "600", color: SharedColors.navy },
  menuArrow: { fontSize: 20, color: SharedColors.slateLight },
});
