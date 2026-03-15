import { Stack, useSegments } from "expo-router";
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";
import { DoctorTabBar, DoctorTabName } from "../../components/DoctorTabBar";
import { store } from "../../lib/store";
import { tabAnimation } from "../../lib/tabDirection";

const TAB_MAP: Record<string, DoctorTabName> = {
  dashboard: "Home",
  alerts: "Alerts",
  "chat-list": "Chat",
  profile: "Profile",
};

export default function DoctorLayout() {
  const segments = useSegments();
  const currentScreen = segments[1] as string | undefined;
  const [unreadCount, setUnreadCount] = useState(0);

  const showTabBar = !!currentScreen && currentScreen in TAB_MAP;
  const currentTab = currentScreen ? TAB_MAP[currentScreen] : undefined;

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const count = await store.getUnreadCount("doctor");
        setUnreadCount(count);
      };
      load();
      const interval = setInterval(load, 5000);
      return () => clearInterval(interval);
    }, [])
  );

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={() => ({ headerShown: false, animation: tabAnimation })} />
      {showTabBar && currentTab && (
        <DoctorTabBar currentTab={currentTab} unreadCount={unreadCount} />
      )}
    </View>
  );
}
