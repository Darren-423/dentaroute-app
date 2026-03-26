import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  text: string;
  variant?: "info" | "warning";
}

/**
 * Reusable legal disclaimer banner.
 * - "info": Subtle grey banner for inline disclaimers
 * - "warning": Amber banner for prominent warnings
 */
export function DisclaimerBanner({ text, variant = "info" }: Props) {
  const isWarning = variant === "warning";
  return (
    <View style={[s.container, isWarning && s.containerWarning]}>
      <Text style={[s.text, isWarning && s.textWarning]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  containerWarning: {
    backgroundColor: "#fffbeb",
    borderColor: "rgba(245,158,11,0.2)",
  },
  text: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 16,
  },
  textWarning: {
    color: "#92400e",
  },
});
