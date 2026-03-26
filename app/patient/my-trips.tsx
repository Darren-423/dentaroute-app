import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SavedTrip, store } from "../../lib/store";





import { PatientTheme, SharedColors } from "../../constants/theme";
export default function MyTripsScreen() {
  const [trips, setTrips] = useState<SavedTrip[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [])
  );

  const loadTrips = async () => {
    const data = await store.getTrips();
    setTrips(data);
  };

  const handleDelete = (trip: SavedTrip) => {
    Alert.alert("Delete Trip", "Are you sure you want to delete this trip information?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await store.deleteTrip(trip.id);
          loadTrips();
        },
      },
    ]);
  };

  const hasDeparture = (item: SavedTrip) =>
    !!(item.depAirline || item.depFlightNumber || item.depFlightDate || item.depFlightTime);

  const renderTrip = ({ item, index }: { item: SavedTrip; index: number }) => (
    <View style={s.card}>
      {/* 카드 상단 헤더 */}
      <LinearGradient colors={[PatientTheme.primary, PatientTheme.primaryMid]} style={s.cardHeader}>
        <Text style={s.cardHeaderText}>
          {item.caseId ? `Case ${item.caseId} · Trip ${(item.tripIndex ?? 0) + 1}` : `Trip #${index + 1}`}
        </Text>
        {item.flightDate ? (
          <Text style={s.cardHeaderDate}>{item.flightDate}</Text>
        ) : null}
      </LinearGradient>

      <View style={s.cardBody}>
        {/* Flight Row */}
        <View style={s.flightRow}>
          <View style={s.flightCol}>
            <View style={s.sectionBadge}>
              <Text style={s.sectionBadgeIcon}>🛬</Text>
              <Text style={s.sectionBadgeText}>Arrival</Text>
            </View>
            <Text style={s.infoMain}>{item.airline}</Text>
            <Text style={s.infoSub}>{item.flightNumber}</Text>
            {item.flightDate ? <Text style={s.infoSub}>{item.flightDate}</Text> : null}
            {item.flightTime ? <Text style={s.infoSub}>{item.flightTime}</Text> : null}
            {item.terminal ? <Text style={s.infoSub}>{item.terminal}</Text> : null}
          </View>
          <View style={s.flightDivider} />
          <View style={s.flightCol}>
            <View style={s.sectionBadge}>
              <Text style={s.sectionBadgeIcon}>🛫</Text>
              <Text style={s.sectionBadgeText}>Departure</Text>
            </View>
            {hasDeparture(item) ? (
              <>
                <Text style={s.infoMain}>{item.depAirline || ""}</Text>
                {item.depFlightNumber ? <Text style={s.infoSub}>{item.depFlightNumber}</Text> : null}
                {item.depFlightDate ? <Text style={s.infoSub}>{item.depFlightDate}</Text> : null}
                {item.depFlightTime ? <Text style={s.infoSub}>{item.depFlightTime}</Text> : null}
                {item.depTerminal ? <Text style={s.infoSub}>{item.depTerminal}</Text> : null}
              </>
            ) : (
              <Text style={s.infoPlaceholder}>Not set</Text>
            )}
          </View>
        </View>

        {(item.hotelName || item.hotelAddress) && (
          <View style={s.hotelSection}>
            <View style={s.sectionBadge}>
              <Text style={s.sectionBadgeIcon}>🏨</Text>
              <Text style={s.sectionBadgeText}>Hotel</Text>
            </View>
            {item.hotelName ? <Text style={s.infoMain}>{item.hotelName}</Text> : null}
            {item.hotelAddress ? <Text style={s.infoSub}>{item.hotelAddress}</Text> : null}
            {item.checkInDate ? <Text style={s.infoSub}>Check-in: {item.checkInDate}</Text> : null}
            {item.checkOutDate ? <Text style={s.infoSub}>Check-out: {item.checkOutDate}</Text> : null}
            {item.confirmationNumber ? <Text style={s.infoSub}>Confirmation: {item.confirmationNumber}</Text> : null}
          </View>
        )}

        <View style={s.cardActions}>
          <View style={s.autoSavedBadge}>
            <Text style={s.autoSavedText}>Auto-saved from case</Text>
          </View>
          <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)}>
            <Text style={s.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <LinearGradient colors={[PatientTheme.primary, PatientTheme.primaryMid]} style={s.header}>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>My Trips</Text>
          <Text style={s.headerSub}>{trips.length} trip{trips.length !== 1 ? "s" : ""} saved</Text>
        </View>
      </LinearGradient>

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={renderTrip}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>✈️</Text>
            <Text style={s.emptyTitle}>No Trips Yet</Text>
            <Text style={s.emptySub}>
              Trip info will appear here automatically{"\n"}when you submit trip details through your case.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  headerCenter: { alignItems: "center" },
  headerTitle: { color: SharedColors.white, fontSize: 20, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },
  list: { padding: 16, paddingBottom: 100 },

  card: {
    backgroundColor: SharedColors.white, borderRadius: 16, overflow: "hidden",
    marginBottom: 16, borderWidth: 1, borderColor: SharedColors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  cardHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 12,
  },
  cardHeaderText: { color: SharedColors.white, fontSize: 15, fontWeight: "700" },
  cardHeaderDate: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500" },
  cardBody: { padding: 18 },
  flightRow: { flexDirection: "row", marginBottom: 12 },
  flightCol: { flex: 1 },
  flightDivider: { width: 1, backgroundColor: SharedColors.border, marginHorizontal: 12 },
  infoPlaceholder: { fontSize: 13, color: SharedColors.slateLight, fontStyle: "italic", marginTop: 4 },
  hotelSection: {
    borderTopWidth: 1, borderTopColor: SharedColors.border, paddingTop: 14, marginBottom: 12,
    backgroundColor: "#faf5ff", marginHorizontal: -18, paddingHorizontal: 18, paddingBottom: 14,
  },
  sectionBadge: {
    flexDirection: "row", alignItems: "center", backgroundColor: PatientTheme.primaryLight,
    alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    marginBottom: 8,
  },
  sectionBadgeIcon: { fontSize: 12, marginRight: 4 },
  sectionBadgeText: { fontSize: 12, fontWeight: "700", color: PatientTheme.primary },
  infoMain: { fontSize: 16, fontWeight: "600", color: SharedColors.navy, marginBottom: 2 },
  infoSub: { fontSize: 13, color: SharedColors.slate, marginBottom: 1 },

  cardActions: { flexDirection: "row", gap: 10, marginTop: 4, alignItems: "center" },
  autoSavedBadge: {
    flex: 1, backgroundColor: SharedColors.greenLight, borderRadius: 10,
    paddingVertical: 10, alignItems: "center",
  },
  autoSavedText: { color: SharedColors.green, fontSize: 12, fontWeight: "600", fontStyle: "italic" },
  deleteBtn: {
    flex: 1, backgroundColor: SharedColors.redLight, borderRadius: 10,
    paddingVertical: 10, alignItems: "center",
  },
  deleteBtnText: { color: SharedColors.red, fontSize: 14, fontWeight: "600" },

  empty: { alignItems: "center", paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: SharedColors.navy },
  emptySub: { fontSize: 14, color: SharedColors.slate, marginTop: 4, textAlign: "center", paddingHorizontal: 20 },
});
