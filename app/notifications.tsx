import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { AppNotification, store } from "../lib/store";

const T = {
  teal: "#0f766e", tealMid: "#134e4a", tealLight: "#14b8a6",
  navy: "#0f172a", slate: "#64748b", slateLight: "#94a3b8",
  border: "#e2e8f0", bg: "#f8fafc", white: "#fff",
  blue: "#3b82f6", blueLight: "#eff6ff",
  red: "#ef4444",
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
};

const groupByDate = (notifs: AppNotification[]) => {
  const groups: { label: string; items: AppNotification[] }[] = [];
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now.getTime() - 86400000).toDateString();

  const map: Record<string, AppNotification[]> = {};
  notifs.forEach((n) => {
    const d = new Date(n.createdAt).toDateString();
    const label = d === todayStr ? "Today" : d === yesterdayStr ? "Yesterday" : d;
    if (!map[label]) map[label] = [];
    map[label].push(n);
  });

  Object.entries(map).forEach(([label, items]) => {
    groups.push({ label, items });
  });
  return groups;
};

export default function NotificationsScreen() {
  const { role: paramRole } = useLocalSearchParams<{ role?: string }>();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [currentRole, setCurrentRole] = useState<"patient" | "doctor">("patient");

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const user = await store.getCurrentUser();
        const role = (paramRole as any) || user?.role || "patient";
        setCurrentRole(role);
        const notifs = await store.getNotifications(role);
        setNotifications(notifs);
      };
      load();
    }, [paramRole])
  );

  const unreadCount = notifications.filter((n) => !n.read).length;
  const groups = groupByDate(notifications);

  const handleTap = async (notif: AppNotification) => {
    if (!notif.read) {
      await store.markNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => n.id === notif.id ? { ...n, read: true } : n)
      );
    }
    if (notif.route) {
      router.push(notif.route as any);
    }
  };

  const handleMarkAllRead = async () => {
    await store.markAllNotificationsRead(currentRole);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const isDark = currentRole === "doctor";

  return (
    <View style={[s.container, isDark && s.containerDark]}>
      {/* Header */}
      <View style={[s.header, isDark && s.headerDark]}>
        <View style={s.headerTop}>
          <TouchableOpacity
            style={[s.backBtn, isDark && s.backBtnDark]}
            onPress={() => router.back()}
          >
            <Text style={[s.backArrow, isDark && s.backArrowDark]}>‹</Text>
          </TouchableOpacity>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Text style={s.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[s.title, isDark && { color: T.white }]}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={s.unreadBadge}>
            <Text style={s.unreadBadgeText}>{unreadCount} new</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🔔</Text>
            <Text style={[s.emptyTitle, isDark && { color: T.white }]}>No notifications yet</Text>
            <Text style={[s.emptyDesc, isDark && { color: "rgba(255,255,255,0.5)" }]}>You'll be notified about quotes, messages, and updates here.</Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.label} style={s.group}>
              <Text style={[s.groupLabel, isDark && { color: "rgba(255,255,255,0.45)" }]}>{group.label}</Text>
              {group.items.map((n) => (
                <TouchableOpacity
                  key={n.id}
                  style={[
                    s.notifCard,
                    isDark && s.notifCardDark,
                    !n.read && s.notifCardUnread,
                    !n.read && isDark && s.notifCardUnreadDark,
                  ]}
                  onPress={() => handleTap(n)}
                  activeOpacity={0.7}
                >
                  <View style={[s.notifIconWrap, isDark && s.notifIconWrapDark]}>
                    <Text style={s.notifIcon}>{n.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.notifTitleRow}>
                      <Text style={[s.notifTitle, isDark && { color: T.white }]} numberOfLines={1}>{n.title}</Text>
                      {!n.read && <View style={s.unreadDot} />}
                    </View>
                    <Text style={[s.notifBody, isDark && { color: "rgba(255,255,255,0.6)" }]} numberOfLines={2}>{n.body}</Text>
                    <Text style={[s.notifTime, isDark && { color: "rgba(255,255,255,0.4)" }]}>{timeAgo(n.createdAt)}</Text>
                  </View>
                  {n.route && <Text style={[s.notifArrow, isDark && { color: "rgba(255,255,255,0.2)" }]}>›</Text>}
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  containerDark: { backgroundColor: "#042f2e" },
  header: {
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 18,
    borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.white,
  },
  headerDark: { backgroundColor: "#0f766e", borderBottomColor: "rgba(255,255,255,0.12)" },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  backBtnDark: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.2)",
  },
  backArrow: { fontSize: 24, color: "#0f172a", fontWeight: "600", marginTop: -2 },
  backArrowDark: { color: "#fff" },
  markAllText: { color: T.tealLight, fontSize: 13, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "700", color: T.navy },
  unreadBadge: {
    alignSelf: "flex-start", backgroundColor: "rgba(20,184,166,0.15)",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8,
  },
  unreadBadgeText: { fontSize: 12, fontWeight: "600", color: T.tealLight },

  content: { padding: 20, gap: 20, paddingBottom: 60 },

  // Empty
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: T.navy },
  emptyDesc: { fontSize: 13, color: T.slate, textAlign: "center", marginTop: 4 },

  // Groups
  group: { gap: 8 },
  groupLabel: { fontSize: 12, fontWeight: "700", color: T.slate, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },

  // Notification card
  notifCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 14,
    backgroundColor: T.white, borderWidth: 1, borderColor: T.border,
  },
  notifCardDark: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.08)" },
  notifCardUnread: { backgroundColor: T.blueLight, borderColor: "rgba(59,130,246,0.15)" },
  notifCardUnreadDark: { backgroundColor: "rgba(20,184,166,0.12)", borderColor: "rgba(20,184,166,0.2)" },
  notifIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center",
  },
  notifIconWrapDark: { backgroundColor: "rgba(255,255,255,0.1)" },
  notifIcon: { fontSize: 22 },
  notifTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  notifTitle: { fontSize: 14, fontWeight: "700", color: T.navy, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.tealLight },
  notifBody: { fontSize: 12, color: T.slate, marginTop: 2, lineHeight: 17 },
  notifTime: { fontSize: 11, color: T.slateLight, marginTop: 4 },
  notifArrow: { fontSize: 22, color: T.slateLight },
});
