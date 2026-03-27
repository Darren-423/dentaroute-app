import { router, Stack, useFocusEffect, usePathname, useSegments } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, PanResponder, Platform, View } from "react-native";
import { PatientTabBar, TabName } from "../../components/PatientTabBar";
import {
  getSafeBackTarget,
  isPatientRootRoute,
  markNavigationMode,
} from "../../lib/navigationHistory";
import { store } from "../../lib/store";

const TAB_MAP: Record<string, TabName> = {
  dashboard: "Home",
  "chat-list": "Chat",
  reservation: "Reservation",
  "my-trips": "My Trips",
  profile: "Profile",
};

const TAB_SCREENS = ["dashboard", "chat-list", "reservation", "my-trips", "profile"];
const TAB_ROUTES = [
  "/patient/dashboard",
  "/patient/chat-list",
  "/patient/reservation",
  "/patient/my-trips",
  "/patient/profile",
];

export default function PatientLayout() {
  const segments = useSegments();
  const pathname = usePathname();
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
          markNavigationMode("replace");
          router.replace(TAB_ROUTES[currentIndex + 1] as any);
        } else if (gestureState.dx > 50 && currentIndex > 0) {
          markNavigationMode("replace");
          router.replace(TAB_ROUTES[currentIndex - 1] as any);
        }
      },
    })
  ).current;

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setNotifUnread(await store.getUnreadCount("patient"));
        setChatUnread(await store.getChatUnreadCount("patient"));
      };
      load();
      const interval = setInterval(load, 5000);
      return () => clearInterval(interval);
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") {
        return undefined;
      }

      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        if (isPatientRootRoute(pathname)) {
          if (pathname !== "/patient/dashboard") {
            markNavigationMode("replace");
            router.replace("/patient/dashboard" as any);
          }
          return true;
        }

        const target = getSafeBackTarget("/patient/dashboard");
        if (target) {
          markNavigationMode("replace");
          router.replace(target as any);
          return true;
        }

        return true;
      });

      return () => subscription.remove();
    }, [pathname])
  );

  return (
    <View style={{ flex: 1 }} {...(showTabBar ? panResponder.panHandlers : {})}>
      <Stack
        screenOptions={({ route }) => ({
          headerShown: false,
          animation: route.name in TAB_MAP ? "fade" : "slide_from_right",
          gestureEnabled: route.name !== "hotel-arrived",
          fullScreenGestureEnabled: route.name !== "hotel-arrived",
        })}
      />
      {showTabBar && currentTab && (
        <PatientTabBar currentTab={currentTab} notifUnread={notifUnread} chatUnread={chatUnread} />
      )}
    </View>
  );
}