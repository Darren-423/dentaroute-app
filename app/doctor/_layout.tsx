import { router, Stack, useFocusEffect, usePathname, useSegments } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, BackHandler, Platform, StyleSheet, View } from "react-native";
import { DoctorTabBar, DoctorTabName } from "../../components/DoctorTabBar";
import { warmDoctorTabData } from "../../lib/doctorTabDataCache";
import { isDoctorTabSwipeBlocked, setDoctorTabSwipeBlocked } from "../../lib/doctorTabSwipeGuard";
import {
  getSafeBackTarget,
  isDoctorRootRoute,
  markNavigationMode,
} from "../../lib/navigationHistory";
import { store } from "../../lib/store";

const TAB_MAP: Record<string, DoctorTabName> = {
  dashboard: "Home",
  "chat-list": "Chat",
  availability: "Schedule",
  earnings: "Earnings",
  profile: "Profile",
};

const TAB_ROUTES: Record<DoctorTabName, string> = {
  Home: "/doctor/dashboard",
  Chat: "/doctor/chat-list",
  Schedule: "/doctor/availability",
  Earnings: "/doctor/earnings",
  Profile: "/doctor/profile",
};

export default function DoctorLayout() {
  const segments = useSegments();
  const pathname = usePathname();
  const currentScreen = segments[1] as string | undefined;
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    if (currentScreen !== "availability") {
      setDoctorTabSwipeBlocked(false);
    }
  }, [currentScreen]);

  useEffect(() => {
    warmDoctorTabData().catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setChatUnread(await store.getChatUnreadCount("doctor"));
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
        if (isDoctorTabSwipeBlocked()) {
          return true;
        }

        if (isDoctorRootRoute(pathname)) {
          if (pathname !== "/doctor/dashboard") {
            markNavigationMode("replace");
            router.replace("/doctor/dashboard" as any);
          }
          return true;
        }

        const target = getSafeBackTarget("/doctor/dashboard");
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

  const showTabBar = !!currentScreen && currentScreen in TAB_MAP;
  const currentTab = currentScreen ? TAB_MAP[currentScreen] : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.stackLayer}>
        <Stack
          screenOptions={({ route }) => ({
            headerShown: false,
            animation: "none",
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          })}
        />
      </View>

      {showTabBar && currentTab && (
        <DoctorTabBar
          currentTab={currentTab}
          chatUnread={chatUnread}
          onTabPress={(tab) => {
            const route = TAB_ROUTES[tab];
            if (
              currentScreen === "availability" &&
              tab !== "Schedule" &&
              isDoctorTabSwipeBlocked()
            ) {
              Alert.alert(
                "Unsaved Changes",
                "You have unsaved changes. Save now, or choose Save later to leave this page without saving.",
                [
                  { text: "Stay", style: "cancel" },
                  {
                    text: "Save later",
                    style: "destructive",
                    onPress: () => {
                      setDoctorTabSwipeBlocked(false);
                      if (route) {
                        markNavigationMode("replace");
                        router.replace(route as any);
                      }
                    },
                  },
                ]
              );
              return;
            }

            if (route) {
              markNavigationMode("replace");
              router.replace(route as any);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },
  stackLayer: { flex: 1 },
});