import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setTabDirection } from "../lib/tabDirection";

export type TabName = "Home" | "Chat" | "Reservation" | "My Trips" | "Profile";

interface PatientTabBarProps {
  currentTab: TabName;
  notifUnread?: number;
  chatUnread?: number;
}

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

const TABS: { icon: FeatherIconName; label: TabName; route: string }[] = [
  { icon: "home", label: "Home", route: "/patient/dashboard" },
  { icon: "message-circle", label: "Chat", route: "/patient/chat-list" },
  { icon: "calendar", label: "Reservation", route: "/patient/reservation" },
  { icon: "navigation", label: "My Trips", route: "/patient/my-trips" },
  { icon: "user", label: "Profile", route: "/patient/profile" },
];

export function PatientTabBar({ currentTab, chatUnread = 0 }: PatientTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = TABS.findIndex((t) => t.label === currentTab);
  const slideAnim = useRef(new Animated.Value(activeIndex)).current;
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeIndex,
      useNativeDriver: true,
      tension: 100,
      friction: 15,
    }).start();
  }, [activeIndex]);

  const tabWidth = barWidth / TABS.length;
  const dotSize = 4;
  const translateX = slideAnim.interpolate({
    inputRange: TABS.map((_, i) => i),
    outputRange: TABS.map((_, i) => i * tabWidth + tabWidth / 2 - dotSize / 2),
  });

  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 4) }]}>
      <View
        style={s.barInner}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
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
              activeOpacity={0.6}
            >
              <View style={s.iconWrap}>
                <Feather
                  name={item.icon}
                  size={20}
                  color={isActive ? "#4A0080" : "#b0b0b0"}
                  style={{ strokeWidth: 1.5 } as any}
                />
                {item.label === "Chat" && chatUnread > 0 && (
                  <View style={s.badge} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Active dot indicator */}
        {barWidth > 0 && (
          <Animated.View
            style={[s.activeDot, { transform: [{ translateX }] }]}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
  },
  barInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 2,
  },
  barTab: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    height: 36,
  },
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ef4444",
  },
  activeDot: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#4A0080",
  },
});
