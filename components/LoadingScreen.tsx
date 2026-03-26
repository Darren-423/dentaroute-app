import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SharedColors } from "../constants/theme";

interface Props {
  message?: string;
}

/** Full-screen loading spinner for async data fetches. */
export function LoadingScreen({ message }: Props) {
  return (
    <View style={s.container}>
      <ActivityIndicator size="large" color="#4A0080" />
      {message && <Text style={s.text}>{message}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SharedColors.bg,
  },
  text: {
    marginTop: 14,
    fontSize: 14,
    color: SharedColors.slate,
  },
});
