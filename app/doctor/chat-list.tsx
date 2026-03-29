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
import { getDoctorChatRoomsCache, loadDoctorChatRooms } from "../../lib/doctorTabDataCache";
import { ChatRoom } from "../../lib/store";



import { DoctorTheme, SharedColors } from "../../constants/theme";
export default function DoctorChatListScreen() {
  const [rooms, setRooms] = useState<ChatRoom[]>(getDoctorChatRoomsCache());

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const allRooms = await loadDoctorChatRooms(true);
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
      <LinearGradient colors={[DoctorTheme.primary, DoctorTheme.primaryDark]} style={s.header}>
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
          <TouchableOpacity
            style={{ marginTop: 24, backgroundColor: '#0F766E', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 }}
            onPress={() => router.push('/doctor/dashboard' as any)}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>View Cases</Text>
          </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 18 },
  title: { fontSize: 28, fontWeight: "700", color: SharedColors.white },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 },

  list: { padding: 16, gap: 8 },

  roomCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: SharedColors.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: SharedColors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "rgba(20,184,166,0.1)", alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: DoctorTheme.primary },
  roomInfo: { flex: 1, gap: 3 },
  roomTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roomName: { fontSize: 15, fontWeight: "700", color: SharedColors.navy, flex: 1 },
  roomTime: { fontSize: 11, color: SharedColors.navyMuted },
  roomCase: { fontSize: 11, color: SharedColors.navyMuted },
  roomLastMsg: { fontSize: 13, color: SharedColors.navySec, marginTop: 2 },

  badge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: SharedColors.red, alignItems: "center", justifyContent: "center",
  },
  badgeText: { color: SharedColors.white, fontSize: 11, fontWeight: "700" },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: SharedColors.navy, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: SharedColors.navySec, textAlign: "center", lineHeight: 22 },
});
