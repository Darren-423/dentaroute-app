import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { ChatRoom, store } from "../../lib/store";

const T = {
  teal: "#0f766e",
  tealLight: "#14b8a6",
  bg: "#f8fafc",
  white: "#fff",
  text: "#0f172a",
  textSec: "#64748b",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  red: "#ef4444",
};

export default function DoctorChatListScreen() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const user = await store.getCurrentUser();
        const name = user?.name || "Doctor";
        const allRooms = await store.getChatRoomsForUser("doctor", name);
        allRooms.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        setRooms(allRooms);
      };
      load();
    }, [])
  );

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const renderRoom = ({ item }: { item: ChatRoom }) => (
    <TouchableOpacity
      style={s.roomCard}
      onPress={() => router.push({
        pathname: "/doctor/chat" as any,
        params: { chatRoomId: item.id, patientName: item.patientName },
      })}
      activeOpacity={0.7}
    >
      <View style={s.avatar}>
        <Text style={s.avatarText}>
          {item.patientName?.[0] || "P"}
        </Text>
      </View>
      <View style={s.roomInfo}>
        <View style={s.roomTop}>
          <Text style={s.roomName} numberOfLines={1}>{item.patientName}</Text>
          <Text style={s.roomTime}>{formatTime(item.lastMessageAt)}</Text>
        </View>
        <Text style={s.roomCase}>Case #{item.caseId}</Text>
        <Text style={s.roomLastMsg} numberOfLines={1}>
          {item.lastMessage || "No messages yet"}
        </Text>
      </View>
      {item.unreadDoctor > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{item.unreadDoctor}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <LinearGradient colors={["#0f766e", "#134e4a"]} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Messages</Text>
        <Text style={s.subtitle}>{rooms.length} patient conversation{rooms.length !== 1 ? "s" : ""}</Text>
      </LinearGradient>

      {rooms.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>💬</Text>
          <Text style={s.emptyTitle}>No messages yet</Text>
          <Text style={s.emptyDesc}>
            Patients will message you when{"\n"}they're interested in your quotes
          </Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={renderRoom}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: {
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },
  title: { fontSize: 24, fontWeight: "700", color: T.white, marginBottom: 4 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)" },

  list: { padding: 16, gap: 8 },

  roomCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: T.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: T.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "rgba(20,184,166,0.1)", alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: T.teal },
  roomInfo: { flex: 1, gap: 3 },
  roomTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roomName: { fontSize: 15, fontWeight: "700", color: T.text, flex: 1 },
  roomTime: { fontSize: 11, color: T.textMuted },
  roomCase: { fontSize: 11, color: T.textMuted },
  roomLastMsg: { fontSize: 13, color: T.textSec, marginTop: 2 },

  badge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: T.red, alignItems: "center", justifyContent: "center",
  },
  badgeText: { color: T.white, fontSize: 11, fontWeight: "700" },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: T.text, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: T.textSec, textAlign: "center", lineHeight: 22 },
});
