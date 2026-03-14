import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setTabAnimation } from "../lib/tabDirection";

export type TabName = "Home" | "Alerts" | "Chat" | "Profile";

interface PatientTabBarProps {
  currentTab: TabName;
  unreadCount?: number;
}

const TABS: { icon: string; label: TabName; route: string; hasBadge?: boolean }[] = [
  { icon: "🏠", label: "Home", route: "/patient/dashboard" },
  { icon: "🔔", label: "Alerts", route: "/patient/alerts", hasBadge: true },
  { icon: "💬", label: "Chat", route: "/patient/chat-list", hasBadge: true },
  { icon: "👤", label: "Profile", route: "/patient/profile" },
];

export function PatientTabBar({ currentTab, unreadCount = 0 }: PatientTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.bar, { paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={["rgba(74,0,128,0.06)", "transparent", "rgba(74,0,128,0.06)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.barTopLine}
      />
      <View style={s.barInner}>
        {TABS.map((item, i) => {
          const isActive = item.label === currentTab;
          return (
            <TouchableOpacity
              key={i}
              style={s.barTab}
              onPress={() => {
                if (item.label === currentTab) {
                  // Already on this tab, do nothing
                } else {
                  const currentIndex = TABS.findIndex((t) => t.label === currentTab);
                  setTabAnimation(i > currentIndex ? "slide_from_right" : "slide_from_left");
                  router.replace(item.route as any);
                }
              }}
              activeOpacity={0.5}
            >
              <View style={[s.barTabIconWrap, isActive && s.barTabIconWrapActive]}>
                <Text style={s.barTabIcon}>{item.icon}</Text>
                {item.hasBadge && unreadCount > 0 && (
                  <View style={s.barDot} />
                )}
              </View>
              <Text style={[s.barTabLabel, isActive && s.barTabLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 12 },
      android: { elevation: 12 },
    }),
  },
  barTopLine: { height: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  barInner: {
    flexDirection: "row", justifyContent: "space-evenly",
    alignItems: "center", paddingVertical: 10,
  },
  barTab: {
    alignItems: "center", justifyContent: "center",
    width: 60, height: 52,
  },
  barTabIconWrap: {
    width: 40, height: 34, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(74,0,128,0.05)",
  },
  barTabIconWrapActive: {
    backgroundColor: "rgba(74,0,128,0.15)",
  },
  barTabIcon: { fontSize: 20 },
  barTabLabel: {
    fontSize: 10, fontWeight: "600", color: "#94a3b8", marginTop: 3,
  },
  barTabLabelActive: {
    color: "#4A0080",
  },
  barDot: {
    position: "absolute", top: 1, right: 1,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#ef4444", borderWidth: 1.5, borderColor: "#fff",
  },
});
