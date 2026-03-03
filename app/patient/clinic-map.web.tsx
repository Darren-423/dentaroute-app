import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ClinicMapScreen() {
  return (
    <View style={s.container}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backArrow}>‹</Text>
      </TouchableOpacity>
      <Text style={s.msg}>Maps are only available on native devices.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  backBtn: { position: "absolute", top: 56, left: 20, width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.05)", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 24, color: "#0f172a", fontWeight: "600", marginTop: -2 },
  msg: { fontSize: 16, color: "#64748b" },
});
