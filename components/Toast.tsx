import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { SharedColors } from "../constants/theme";

interface Props {
  message: string;
  type?: "success" | "error" | "info";
  visible: boolean;
  onHide?: () => void;
  duration?: number;
}

/** Auto-dismissing toast notification. */
export function Toast({ message, type = "info", visible, onHide, duration = 3000 }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(duration),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => onHide?.());
    }
  }, [visible]);

  if (!visible) return null;

  const bg = type === "success" ? SharedColors.green
    : type === "error" ? SharedColors.coral
    : SharedColors.navy;

  return (
    <Animated.View style={[s.container, { opacity, backgroundColor: bg }]}>
      <Text style={s.text}>{message}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    color: SharedColors.white,
    textAlign: "center",
  },
});
