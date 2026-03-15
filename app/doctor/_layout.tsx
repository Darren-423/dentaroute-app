import { Stack, useSegments, router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, PanResponder } from "react-native";
import { useFocusEffect } from "expo-router";
import { DoctorTabBar, DoctorTabName } from "../../components/DoctorTabBar";
import { store } from "../../lib/store";

const TAB_MAP: Record<string, DoctorTabName> = {
  dashboard: "Home",
  alerts: "Alerts",
  "chat-list": "Chat",
  profile: "Profile",
};

const TAB_SCREENS = ["dashboard", "alerts", "chat-list", "profile"];
const TAB_ROUTES = ["/doctor/dashboard", "/doctor/alerts", "/doctor/chat-list", "/doctor/profile"];

export default function DoctorLayout() {
  const segments = useSegments();
  const currentScreen = segments[1] as string | undefined;
  const [notifUnread, setNotifUnread] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const screenRef = useRef(currentScreen);

  useEffect(() => {
    screenRef.current = currentScreen;
  }, [currentScreen]);

  const showTabBar = !!currentScreen && currentScreen in TAB_MAP;
  const currentTab = currentScreen ? TAB_MAP[currentScreen] : undefined;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) < 50) return;

        const screen = screenRef.current || "";
        const currentIndex = TAB_SCREENS.indexOf(screen);
        if (currentIndex === -1) return;

        if (gestureState.dx < -50 && currentIndex < TAB_SCREENS.length - 1) {
          router.replace(TAB_ROUTES[currentIndex + 1] as any);
        } else if (gestureState.dx > 50 && currentIndex > 0) {
          router.replace(TAB_ROUTES[currentIndex - 1] as any);
        }
      },
    })
  ).current;

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setNotifUnread(await store.getUnreadCount("doctor"));
        setChatUnread(await store.getChatUnreadCount("doctor"));
      };
      load();
      const interval = setInterval(load, 5000);
      return () => clearInterval(interval);
    }, [])
  );

  return (
    <View style={{ flex: 1 }} {...(showTabBar ? panResponder.panHandlers : {})}>
      <Stack screenOptions={() => ({ headerShown: false, animation: "none" })} />
      {showTabBar && currentTab && (
        <DoctorTabBar currentTab={currentTab} notifUnread={notifUnread} chatUnread={chatUnread} />
      )}
    </View>
  );
}
