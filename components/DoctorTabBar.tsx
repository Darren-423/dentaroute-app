import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type DoctorTabName = "Home" | "Chat" | "Schedule" | "Earnings" | "Profile";

interface DoctorTabBarProps {
  currentTab: DoctorTabName;
  chatUnread?: number;
  onTabPress?: (tab: DoctorTabName) => void;
}

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

const TABS: { icon: FeatherIconName; label: DoctorTabName; route: string }[] = [
  { icon: "home", label: "Home", route: "/doctor/dashboard" },
  { icon: "message-circle", label: "Chat", route: "/doctor/chat-list" },
  { icon: "calendar", label: "Schedule", route: "/doctor/availability" },
  { icon: "dollar-sign", label: "Earnings", route: "/doctor/earnings" },
  { icon: "user", label: "Profile", route: "/doctor/profile" },
];

export function DoctorTabBar({ currentTab, chatUnread = 0, onTabPress }: DoctorTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = TABS.findIndex((t) => t.label === currentTab);
  const [barWidth, setBarWidth] = useState(0);

  const tabWidth = barWidth / TABS.length;
  const dotSize = 4;
  const dotLeft = tabWidth * activeIndex + tabWidth / 2 - dotSize / 2;

  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 4) }]}>
      <View style={s.divider} />
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
                  onTabPress?.(item.label);
                }
              }}
              activeOpacity={0.6}
            >
              <View style={s.iconWrap}>
                <Feather
                  name={item.icon}
                  size={20}
                  color={isActive ? "#0f766e" : "#b0b0b0"}
                  style={{ strokeWidth: 1.5 } as any}
                />
                {item.label === "Chat" && chatUnread > 0 && (
                  <View style={s.badge} />
                )}
              </View>
              <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Active dot indicator */}
        {barWidth > 0 && (
          <View style={[s.activeDot, { left: dotLeft }]} />
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
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e8e8e8",
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
    height: 46,
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
    backgroundColor: "#0f766e",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#b0b0b0",
    marginTop: 2,
  },
  tabLabelActive: {
    color: "#0f766e",
  },
});
