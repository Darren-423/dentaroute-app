import { router, Stack, useGlobalSearchParams, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  buildRouteKey,
  getSafeBackTarget,
  markNavigationMode,
  syncNavigationHistory,
} from "../lib/navigationHistory";

export default function RootLayout() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  const routeKey = useMemo(() => {
    return buildRouteKey(pathname, params as Record<string, string | string[] | undefined>);
  }, [pathname, params]);

  useEffect(() => {
    syncNavigationHistory(routeKey, pathname);
  }, [pathname, routeKey]);

  useEffect(() => {
    const patchedRouter = router as typeof router & {
      __concoursePatched?: boolean;
      dismissAll?: () => void;
    };

    if (patchedRouter.__concoursePatched) {
      return;
    }

    patchedRouter.__concoursePatched = true;

    const originalPush = router.push.bind(router);
    const originalReplace = router.replace.bind(router);
    const originalBack = router.back.bind(router);
    const originalDismissAll =
      typeof patchedRouter.dismissAll === "function"
        ? patchedRouter.dismissAll.bind(router)
        : undefined;

    patchedRouter.push = ((href: Parameters<typeof router.push>[0]) => {
      markNavigationMode("push");
      return originalPush(href);
    }) as typeof router.push;

    patchedRouter.replace = ((href: Parameters<typeof router.replace>[0]) => {
      markNavigationMode("replace");
      return originalReplace(href);
    }) as typeof router.replace;

    patchedRouter.back = (() => {
      const target = getSafeBackTarget();
      if (target) {
        markNavigationMode("replace");
        return originalReplace(target as never);
      }

      if (typeof router.canGoBack === "function" && router.canGoBack()) {
        markNavigationMode("back");
        return originalBack();
      }

      return undefined;
    }) as typeof router.back;

    if (originalDismissAll) {
      patchedRouter.dismissAll = (() => {
        markNavigationMode("reset");
        return originalDismissAll();
      }) as typeof patchedRouter.dismissAll;
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={layoutStyles.outer}>
        <View style={layoutStyles.inner}>
          <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const layoutStyles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  inner: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 480 : undefined,
    ...(Platform.OS === "web" ? { boxShadow: "0 0 20px rgba(0,0,0,0.1)" } as any : {}),
  },
});