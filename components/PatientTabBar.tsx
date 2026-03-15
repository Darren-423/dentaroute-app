import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setTabDirection } from "../lib/tabDirection";

export type TabName = "Home" | "Alerts" | "Reservation" | "Chat" | "Profile";

interface PatientTabBarProps {
  currentTab: TabName;
  notifUnread?: number;
  chatUnread?: number;
}

const TABS: { icon: string; label: TabName; route: string; hasBadge?: boolean }[] = [
  { icon: "🏠", label: "Home", route: "/patient/dashboard" },
  { icon: "💬", label: "Chat", route: "/patient/chat-list", hasBadge: true },
  { icon: "📅", label: "Reservation", route: "/patient/reservation" },
  { icon: "🔔", label: "Alerts", route: "/patient/alerts", hasBadge: true },
  { icon: "👤", label: "Profile", route: "/patient/profile" },
];

export function PatientTabBar({ currentTab, notifUnread = 0, chatUnread = 0 }: PatientTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = TABS.findIndex((t) => t.label === currentTab);
  const slideAnim = useRef(new Animated.Value(activeIndex)).current;
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeIndex,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [activeIndex]);

  const tabWidth = barWidth / TABS.length;
  const indicatorWidth = 40;
  const translateX = slideAnim.interpolate({
    inputRange: TABS.map((_, i) => i),
    outputRange: TABS.map((_, i) => i * tabWidth + (tabWidth - indicatorWidth) / 2),
  });

  return (
    <View style={[s.bar, { paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={["rgba(74,0,128,0.06)", "transparent", "rgba(74,0,128,0.06)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.barTopLine}
      />
      <View
        style={s.barInner}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {/* Sliding indicator */}
        {barWidth > 0 && (
          <Animated.View
            style={[
              s.indicator,
              { width: indicatorWidth, transform: [{ translateX }] },
            ]}
          />
        )}

        {TABS.map((item, i) => {
          const isActive = item.label === currentTab;
          return (
            <TouchableOpacity
              key={i}
              style={s.barTab}
              onPress={() => {
                if (item.label !== currentTab) {
                  const currentIndex = TABS.findIndex((t) => t.label === currentTab);
                  setTabDirection(i > currentIndex ? "right" : "left");
                  router.replace(item.route as any);
                }
              }}
              activeOpacity={0.5}
            >
              <View style={s.barTabIconWrap}>
                <Text style={s.barTabIcon}>{item.icon}</Text>
                {item.label === "Alerts" && notifUnread > 0 && (
                  <View style={s.barDot} />
                )}
                {item.label === "Chat" && chatUnread > 0 && (
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
    flexDirection: "row",
    alignItems: "center", paddingVertical: 10,
  },
  indicator: {
    position: "absolute",
    top: 10,
    left: 0,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(74,0,128,0.15)",
  },
  barTab: {
    alignItems: "center", justifyContent: "center",
    flex: 1, height: 52,
  },
  barTabIconWrap: {
    width: 40, height: 34, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
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
