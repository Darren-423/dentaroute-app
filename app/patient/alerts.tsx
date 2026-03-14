import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { AppNotification, store } from "../../lib/store";

const THEME = {
  gradient: ["#3D0070", "#2F0058", "#220040"] as const,
  accent: "#4A0080",
  accentSoft: "rgba(74,0,128,0.08)",
  accentMid: "rgba(74,0,128,0.15)",
  accentLight: "#f0e6f6",
  unreadBg: "rgba(74,0,128,0.07)",
  unreadBorder: "rgba(74,0,128,0.15)",
  dot: "#7c3aed",
};

const C = {
  navy: "#0f172a",
  text: "#1e293b",
  sub: "#64748b",
  muted: "#94a3b8",
  border: "#e8ecf1",
  bg: "#f6f7f9",
  card: "#ffffff",
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

export default function PatientAlertsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const notifs = await store.getNotifications("patient");
        setNotifications(notifs);
      };
      load();
    }, [])
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
    await store.markAllNotificationsRead("patient");
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <View style={s.container}>
      {/* ── Gradient header ── */}
      <LinearGradient
        colors={THEME.gradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerTop}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={s.backArrow}>{"<"}</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={s.headerSub}>{unreadCount} unread</Text>
            )}
          </View>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={s.markAllText}>Read all</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={s.emptyState}>
            <View style={[s.emptyIconWrap, { backgroundColor: THEME.accentSoft, borderColor: THEME.accentMid }]}>
              <Text style={{ fontSize: 36 }}>🔔</Text>
            </View>
            <Text style={s.emptyTitle}>No notifications yet</Text>
            <Text style={s.emptyDesc}>
              You'll be notified about quotes,{"\n"}messages, and updates here.
            </Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.label} style={s.group}>
              <Text style={s.groupLabel}>{group.label}</Text>
              {group.items.map((n) => (
                <TouchableOpacity
                  key={n.id}
                  style={[
                    s.notifCard,
                    !n.read && { backgroundColor: THEME.unreadBg, borderColor: THEME.unreadBorder },
                  ]}
                  onPress={() => handleTap(n)}
                  activeOpacity={0.7}
                >
                  <View style={[s.notifIconWrap, !n.read && { backgroundColor: THEME.accentSoft }]}>
                    <Text style={s.notifIcon}>{n.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.notifTitleRow}>
                      <Text style={s.notifTitle} numberOfLines={1}>{n.title}</Text>
                      {!n.read && <View style={[s.unreadDot, { backgroundColor: THEME.dot }]} />}
                    </View>
                    <Text style={s.notifBody} numberOfLines={2}>{n.body}</Text>
                    <Text style={s.notifTime}>{timeAgo(n.createdAt)}</Text>
                  </View>
                  {n.route && <Text style={s.notifArrow}>›</Text>}
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  /* ── Header ── */
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18 },
  headerTop: { flexDirection: "row", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 20, color: "#fff", fontWeight: "600" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#fff", letterSpacing: 0.1 },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  markAllText: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.7)" },

  /* ── Content ── */
  content: { padding: 20, gap: 20 },

  /* ── Empty ── */
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.navy },
  emptyDesc: { fontSize: 13, color: C.sub, textAlign: "center", marginTop: 6, lineHeight: 20 },

  /* ── Groups ── */
  group: { gap: 8 },
  groupLabel: {
    fontSize: 12, fontWeight: "700", color: C.muted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
  },

  /* ── Notification card ── */
  notifCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 14,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
  },
  notifIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: C.bg, alignItems: "center", justifyContent: "center",
  },
  notifIcon: { fontSize: 20 },
  notifTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  notifTitle: { fontSize: 14, fontWeight: "700", color: C.navy, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notifBody: { fontSize: 12, color: C.sub, marginTop: 2, lineHeight: 17 },
  notifTime: { fontSize: 11, color: C.muted, marginTop: 4 },
  notifArrow: { fontSize: 22, color: C.muted },
});
