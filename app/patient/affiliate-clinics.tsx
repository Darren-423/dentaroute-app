import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const T = {
  purple: "#4A0080",
  purpleMid: "#5C10A0",
  purpleLight: "#f0e6f6",
  navy: "#0f172a",
  slate: "#64748b",
  slateLight: "#94a3b8",
  border: "#e2e8f0",
  bg: "#f8fafc",
  white: "#ffffff",
  green: "#16a34a",
};

interface AffiliateClinic {
  id: string;
  name: string;
  city: string;
  state: string;
  phone: string;
  rating: number;
  reviewCount: number;
  specialties: string[];
  address: string;
  description: string;
}

const AFFILIATE_CLINICS: AffiliateClinic[] = [
  {
    id: "aff_1",
    name: "Bright Smile Dental Care",
    city: "Los Angeles",
    state: "CA",
    phone: "+1-213-555-0142",
    rating: 4.8,
    reviewCount: 124,
    specialties: ["Implant Aftercare", "General Dentistry"],
    address: "4521 Wilshire Blvd, Los Angeles, CA 90010",
    description: "Specialized in post-implant care and follow-up treatments for dental tourism patients.",
  },
  {
    id: "aff_2",
    name: "Manhattan Dental Group",
    city: "New York",
    state: "NY",
    phone: "+1-212-555-0198",
    rating: 4.7,
    reviewCount: 89,
    specialties: ["Crown & Veneer Care", "Cosmetic Dentistry"],
    address: "350 5th Ave, Suite 4200, New York, NY 10118",
    description: "Expert follow-up care for crowns, veneers, and cosmetic dental procedures.",
  },
  {
    id: "aff_3",
    name: "Peachtree Dental Clinic",
    city: "Atlanta",
    state: "GA",
    phone: "+1-404-555-0167",
    rating: 4.9,
    reviewCount: 156,
    specialties: ["General Aftercare", "Root Canal Follow-up"],
    address: "225 Peachtree St NE, Atlanta, GA 30303",
    description: "Comprehensive aftercare services with multilingual staff for international patients.",
  },
  {
    id: "aff_4",
    name: "Pacific Dental Associates",
    city: "San Francisco",
    state: "CA",
    phone: "+1-415-555-0134",
    rating: 4.6,
    reviewCount: 72,
    specialties: ["Implant Aftercare", "Orthodontic Follow-up"],
    address: "580 California St, San Francisco, CA 94104",
    description: "Partnered with top Korean clinics for seamless aftercare coordination.",
  },
  {
    id: "aff_5",
    name: "Lakeside Family Dentistry",
    city: "Chicago",
    state: "IL",
    phone: "+1-312-555-0189",
    rating: 4.7,
    reviewCount: 98,
    specialties: ["General Dentistry", "Whitening Maintenance"],
    address: "233 S Wacker Dr, Chicago, IL 60606",
    description: "Friendly aftercare environment with experience handling dental tourism follow-ups.",
  },
];

const handleCall = (phone: string) => {
  Linking.openURL(`tel:${phone.replace(/[^+\d]/g, "")}`);
};

const handleMap = (address: string) => {
  const encoded = encodeURIComponent(address);
  const url = Platform.select({
    ios: `maps:0,0?q=${encoded}`,
    android: `geo:0,0?q=${encoded}`,
    default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
  });
  if (url) Linking.openURL(url);
};

const renderStars = (rating: number) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let stars = "";
  for (let i = 0; i < full; i++) stars += "\u2605";
  if (half) stars += "\u00BD";
  return stars;
};

const renderClinic = ({ item }: { item: AffiliateClinic }) => (
  <View style={s.card}>
    <View style={s.cardHeader}>
      <Text style={s.clinicName}>{item.name}</Text>
      <View style={s.ratingRow}>
        <Text style={s.stars}>{renderStars(item.rating)}</Text>
        <Text style={s.ratingText}>{item.rating}</Text>
        <Text style={s.reviewCount}>({item.reviewCount})</Text>
      </View>
    </View>

    <View style={s.infoRow}>
      <Text style={s.infoIcon}>📍</Text>
      <Text style={s.infoText}>{item.city}, {item.state}</Text>
    </View>
    <View style={s.infoRow}>
      <Text style={s.infoIcon}>🦷</Text>
      <Text style={s.infoText}>{item.specialties.join(" / ")}</Text>
    </View>
    <View style={s.infoRow}>
      <Text style={s.infoIcon}>📞</Text>
      <Text style={s.infoText}>{item.phone}</Text>
    </View>

    <Text style={s.description}>{item.description}</Text>

    <View style={s.actionRow}>
      <TouchableOpacity style={s.actionBtn} onPress={() => handleCall(item.phone)}>
        <Text style={s.actionBtnText}>Contact</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.actionBtn, s.actionBtnOutline]} onPress={() => handleMap(item.address)}>
        <Text style={[s.actionBtnText, s.actionBtnOutlineText]}>Map</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function AffiliateClinicsScreen() {
  return (
    <View style={s.container}>
      <LinearGradient colors={[T.purple, T.purpleMid]} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>{"\u2190"}</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Affiliate Clinics</Text>
            <Text style={s.headerSub}>Aftercare partner clinics in the U.S.</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <FlatList
        data={AFFILIATE_CLINICS}
        keyExtractor={(item) => item.id}
        renderItem={renderClinic}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🏥</Text>
            <Text style={s.emptyTitle}>No Affiliate Clinics</Text>
            <Text style={s.emptySub}>No affiliate clinics available in your area yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  backText: { color: T.white, fontSize: 20 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: T.white, fontSize: 20, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },

  list: { padding: 16, paddingBottom: 100 },

  card: {
    backgroundColor: T.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: T.border,
  },
  cardHeader: { marginBottom: 12 },
  clinicName: { fontSize: 17, fontWeight: "700", color: T.navy, marginBottom: 4 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  stars: { color: "#f59e0b", fontSize: 14 },
  ratingText: { fontSize: 13, fontWeight: "600", color: T.navy },
  reviewCount: { fontSize: 12, color: T.slate },

  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 },
  infoIcon: { fontSize: 14 },
  infoText: { fontSize: 14, color: T.slate, flex: 1 },

  description: { fontSize: 13, color: T.slateLight, lineHeight: 18, marginTop: 8, marginBottom: 14 },

  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    backgroundColor: T.purple,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  actionBtnText: { color: T.white, fontSize: 14, fontWeight: "600" },
  actionBtnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: T.purple,
  },
  actionBtnOutlineText: { color: T.purple },

  empty: { alignItems: "center", paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: T.navy },
  emptySub: { fontSize: 14, color: T.slate, marginTop: 4 },
});
