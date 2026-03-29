import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { PatientTheme, SharedColors } from "../../constants/theme";

export default function TreatmentIntentScreen() {
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={[...PatientTheme.gradient]} style={s.header}>
        <SafeAreaView>
          <View style={s.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={s.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={s.backIcon}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>What brings you in?</Text>
              <Text style={s.headerSub}>Tell us so dentists can help</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Content */}
      <View style={s.body}>
        {/* Option A: I know what I need */}
        <TouchableOpacity
          style={s.card}
          activeOpacity={0.7}
          onPress={() => router.push("/patient/treatment-select?mode=specific" as any)}
          accessibilityRole="button"
          accessibilityLabel="I know what I need. Select specific treatments."
        >
          <View style={s.cardIconWrap}>
            <Text style={s.cardIcon}>🎯</Text>
          </View>
          <View style={s.cardContent}>
            <Text style={s.cardTitle}>I know what I need</Text>
            <Text style={s.cardDesc}>
              Select specific treatments you'd like to get done
            </Text>
          </View>
          <Text style={s.cardArrow}>›</Text>
        </TouchableOpacity>

        {/* Option B: Help me figure it out */}
        <TouchableOpacity
          style={s.card}
          activeOpacity={0.7}
          onPress={() => router.push("/patient/concern-describe" as any)}
          accessibilityRole="button"
          accessibilityLabel="Help me figure it out. Dentists will suggest a plan."
        >
          <View style={s.cardIconWrap}>
            <Text style={s.cardIcon}>🔍</Text>
          </View>
          <View style={s.cardContent}>
            <Text style={s.cardTitle}>Help me figure it out</Text>
            <Text style={s.cardDesc}>
              Dentists will review your photos and suggest a plan
            </Text>
          </View>
          <Text style={s.cardArrow}>›</Text>
        </TouchableOpacity>

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Text style={s.disclaimerIcon}>ℹ️</Text>
          <Text style={s.disclaimerText}>
            Either way, the final treatment plan is confirmed after your
            in-person exam at the clinic.
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: SharedColors.bg },
  header: {
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 8 : 0,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 2 },
  body: { flex: 1, padding: 20, paddingTop: 24 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SharedColors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: PatientTheme.primaryBorder,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: PatientTheme.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cardIcon: { fontSize: 26 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: "700", color: SharedColors.navy, marginBottom: 4 },
  cardDesc: { fontSize: 14, color: SharedColors.slate, lineHeight: 20 },
  cardArrow: { fontSize: 24, color: SharedColors.slateLight, fontWeight: "300", marginLeft: 8 },
  disclaimer: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FCD34D",
    alignItems: "flex-start",
    gap: 8,
  },
  disclaimerIcon: { fontSize: 16, marginTop: 1 },
  disclaimerText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 19 },
});
