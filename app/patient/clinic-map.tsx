import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Dimensions,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from "react-native";
import { DentistQuote, store } from "../../lib/store";

let MapView: any = View;
let Marker: any = View;
let Callout: any = View;
let PROVIDER_GOOGLE: any = undefined;
if (Platform.OS !== "web") {
  try {
    const Maps = require("react-native-maps");
    MapView = Maps.default;
    Marker = Maps.Marker;
    Callout = Maps.Callout;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  } catch {
    // Maps not available on web
  }
}

const T = {
  teal: "#4A0080", tealMid: "#5C10A0", tealLight: "#f0e6f6",
  navy: "#0f172a", slate: "#64748b", slateLight: "#94a3b8",
  border: "#e2e8f0", bg: "#f8fafc", white: "#fff",
  green: "#16a34a", greenLight: "#f0fdf4",
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MARKER_COLORS = ["#4A0080", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function ClinicMapScreen() {
  const { caseId, highlightQuoteId } = useLocalSearchParams<{ caseId?: string; highlightQuoteId?: string }>();
  const [quotes, setQuotes] = useState<DentistQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<DentistQuote | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const load = async () => {
      let q: DentistQuote[] = [];
      if (caseId) {
        q = await store.getQuotesForCase(caseId);
      } else {
        // Get all quotes
        const cases = await store.getCases();
        for (const c of cases) {
          const cq = await store.getQuotesForCase(c.id);
          q.push(...cq);
        }
      }
      // Only keep quotes with coordinates
      q = q.filter((qt) => qt.latitude && qt.longitude);
      setQuotes(q);
      setLoading(false);

      // Highlight specific quote
      if (highlightQuoteId) {
        const hl = q.find((qt) => qt.id === highlightQuoteId);
        if (hl) setSelectedQuote(hl);
      }
    };
    load();
  }, [caseId]);

  const openDirections = (lat: number, lng: number, label: string) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });
    if (url) Linking.openURL(url);
  };

  const centerRegion = quotes.length > 0
    ? {
        latitude: quotes.reduce((s, q) => s + (q.latitude || 0), 0) / quotes.length,
        longitude: quotes.reduce((s, q) => s + (q.longitude || 0), 0) / quotes.length,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }
    : { latitude: 37.5326, longitude: 127.0246, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={T.teal} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Header overlay */}
      <View style={s.headerOverlay}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Clinic Locations</Text>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={s.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={centerRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {quotes.map((q, i) => (
          <Marker
            key={q.id}
            coordinate={{ latitude: q.latitude!, longitude: q.longitude! }}
            pinColor={MARKER_COLORS[i % MARKER_COLORS.length]}
            onPress={() => setSelectedQuote(q)}
          >
            <Callout>
              <View style={{ padding: 4, maxWidth: 200 }}>
                <Text style={{ fontWeight: "700", fontSize: 13 }}>{q.clinicName}</Text>
                <Text style={{ fontSize: 11, color: "#666" }}>{q.dentistName}</Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: T.teal, marginTop: 2 }}>${q.totalPrice.toLocaleString()}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Clinic cards at bottom */}
      <View style={s.bottomSheet}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.cardsScroll}
          snapToInterval={SCREEN_WIDTH * 0.78 + 12}
          decelerationRate="fast"
        >
          {quotes.map((q, i) => {
            const isSelected = selectedQuote?.id === q.id;
            return (
              <TouchableOpacity
                key={q.id}
                style={[s.clinicCard, isSelected && s.clinicCardSelected]}
                onPress={() => {
                  setSelectedQuote(q);
                  mapRef.current?.animateToRegion({
                    latitude: q.latitude!,
                    longitude: q.longitude!,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }, 500);
                }}
                activeOpacity={0.8}
              >
                <View style={s.cardTop}>
                  <View style={[s.cardMarker, { backgroundColor: MARKER_COLORS[i % MARKER_COLORS.length] }]}>
                    <Text style={s.cardMarkerText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardClinic}>{q.clinicName}</Text>
                    <Text style={s.cardDoctor}>{q.dentistName}</Text>
                  </View>
                  <View style={s.cardPrice}>
                    <Text style={s.cardPriceText}>${q.totalPrice.toLocaleString()}</Text>
                  </View>
                </View>

                <Text style={s.cardAddress} numberOfLines={1}>📍 {q.address || q.location}</Text>

                <View style={s.cardBottom}>
                  <View style={s.cardRating}>
                    <Text style={{ fontSize: 12 }}>⭐</Text>
                    <Text style={s.cardRatingText}>{q.rating}</Text>
                    <Text style={s.cardReviewCount}>({q.reviewCount})</Text>
                  </View>

                  <View style={s.cardActions}>
                    <TouchableOpacity
                      style={s.cardActionBtn}
                      onPress={() => openDirections(q.latitude!, q.longitude!, q.clinicName)}
                    >
                      <Text style={s.cardActionText}>🧭 Directions</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.cardActionBtn, s.cardActionPrimary]}
                      onPress={() => router.push({
                        pathname: "/patient/quote-detail" as any,
                        params: { quoteId: q.id, caseId: q.caseId },
                      })}
                    >
                      <Text style={[s.cardActionText, { color: T.white }]}>View Quote</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  map: { flex: 1 },

  // Header
  headerOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  backArrow: { fontSize: 24, color: "#0f172a", fontWeight: "600", marginTop: -2 },
  headerTitle: {
    fontSize: 18, fontWeight: "700", color: T.navy,
    backgroundColor: T.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },

  // Bottom sheet
  bottomSheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  cardsScroll: { paddingHorizontal: 16, gap: 12 },

  // Clinic card
  clinicCard: {
    width: SCREEN_WIDTH * 0.78, backgroundColor: T.white, borderRadius: 18,
    padding: 16, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 5,
    borderWidth: 2, borderColor: "transparent",
  },
  clinicCardSelected: { borderColor: T.teal },

  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardMarker: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
  },
  cardMarkerText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  cardClinic: { fontSize: 14, fontWeight: "700", color: T.navy },
  cardDoctor: { fontSize: 12, color: T.slate },
  cardPrice: {
    backgroundColor: T.tealLight, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  cardPriceText: { fontSize: 14, fontWeight: "800", color: T.teal },

  cardAddress: { fontSize: 12, color: T.slate },

  cardBottom: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  cardRating: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardRatingText: { fontSize: 13, fontWeight: "700", color: T.navy },
  cardReviewCount: { fontSize: 11, color: T.slateLight },

  cardActions: { flexDirection: "row", gap: 8 },
  cardActionBtn: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: T.border,
  },
  cardActionPrimary: { backgroundColor: T.teal, borderColor: T.teal },
  cardActionText: { fontSize: 11, fontWeight: "600", color: T.navy },
});
