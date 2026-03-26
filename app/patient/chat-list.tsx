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

import { PatientTheme, SharedColors } from "../../constants/theme";
export default function PatientChatListScreen() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const allRooms = await store.getChatRoomsForUser("patient", "Patient");
        // Sort by last message time, newest first
        allRooms.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        setRooms(allRooms);
        // Mark all chat rooms as read
        for (const room of allRooms) {
          if (room.unreadPatient > 0) await store.markAsRead(room.id, "patient");
        }
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
        pathname: "/patient/chat" as any,
        params: { chatRoomId: item.id, dentistName: item.dentistName, clinicName: item.clinicName },
      })}
      activeOpacity={0.7}
    >
      <View style={s.avatar}>
        <Text style={s.avatarText}>
          {item.dentistName.split(" ").pop()?.[0] || "D"}
        </Text>
      </View>
      <View style={s.roomInfo}>
        <View style={s.roomTop}>
          <Text style={s.roomName} numberOfLines={1}>{item.dentistName}</Text>
          <Text style={s.roomTime}>{formatTime(item.lastMessageAt)}</Text>
        </View>
        <Text style={s.roomClinic} numberOfLines={1}>{item.clinicName}</Text>
        <Text style={s.roomLastMsg} numberOfLines={1}>
          {item.lastMessage || "Start a conversation..."}
        </Text>
      </View>
      {item.unreadPatient > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{item.unreadPatient}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient colors={[...PatientTheme.gradient]} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.title}>Messages</Text>
            <Text style={s.subtitle}>{rooms.length} conversation{rooms.length !== 1 ? "s" : ""}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      {rooms.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>💬</Text>
          <Text style={s.emptyTitle}>No messages yet</Text>
          <Text style={s.emptyDesc}>
            Start a conversation with a dentist{"\n"}from their quote details page
          </Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={renderRoom}
          contentContainerStyle={[s.list, { paddingBottom: 80 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 24, color: SharedColors.white, fontWeight: "600", marginTop: -2 },
  title: { fontSize: 18, fontWeight: "700", color: SharedColors.white },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },

  list: { padding: 16, gap: 8 },

  roomCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: PatientTheme.primaryLight, alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: PatientTheme.primary },
  roomInfo: { flex: 1, gap: 3 },
  roomTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roomName: { fontSize: 15, fontWeight: "700", color: SharedColors.navy, flex: 1 },
  roomTime: { fontSize: 11, color: SharedColors.slateLight },
  roomClinic: { fontSize: 12, color: SharedColors.slate },
  roomLastMsg: { fontSize: 13, color: SharedColors.slateLight, marginTop: 2 },

  badge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: SharedColors.red, alignItems: "center", justifyContent: "center",
  },
  badgeText: { color: SharedColors.white, fontSize: 11, fontWeight: "700" },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: SharedColors.navy, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: SharedColors.slate, textAlign: "center", lineHeight: 22 },
});
