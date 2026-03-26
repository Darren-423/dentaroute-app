import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SharedColors } from "../constants/theme";

interface Props {
  message: string;
  onRetry?: () => void;
}

/** Inline error banner with optional retry button. */
export function ErrorBanner({ message, onRetry }: Props) {
  return (
    <View style={s.container}>
      <Text style={s.text}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={s.retryBtn} onPress={onRetry} activeOpacity={0.7}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SharedColors.coralLight,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(224,90,58,0.15)",
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: SharedColors.coral,
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: SharedColors.coral,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  retryText: {
    fontSize: 12,
    fontWeight: "700",
    color: SharedColors.white,
  },
});
