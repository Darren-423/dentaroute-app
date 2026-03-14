import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { TreatmentWarranty, store } from "../../lib/store";
import { warrantyLabel } from "../../constants/warranty";

const T = {
  purple: "#4A0080", purpleMid: "#5C10A0", purpleLight: "#f0e6f6",
  navy: "#0f172a", slate: "#64748b", slateLight: "#94a3b8",
  border: "#e2e8f0", bg: "#f8fafc", white: "#ffffff",
  green: "#16a34a", greenLight: "#dcfce7",
  coral: "#e05a3a", coralLight: "#fef2ee",
  amber: "#d97706", amberLight: "#fef3c7",
};

const STATUS_CONFIG = {
  active: { label: "Active", color: T.green, bg: T.greenLight, icon: "🟢" },
  claimed: { label: "Claimed", color: T.amber, bg: T.amberLight, icon: "📋" },
  expired: { label: "Expired", color: T.slateLight, bg: "#f1f5f9", icon: "⏰" },
  voided: { label: "Voided", color: T.coral, bg: T.coralLight, icon: "❌" },
};

const TREATMENT_ICONS: Record<string, string> = {
  "Dental Implant": "🦷",
  "Crown": "👑",
  "Bridge": "🌉",
  "Veneers": "✨",
  "Root Canal": "🔧",
  "Filling": "🪥",
  "Denture": "🦷",
  "Orthodontics": "😁",
  "Gum Treatment": "🩺",
  "Jaw Surgery": "🏥",
};

export default function WarrantyScreen() {
  const [warranties, setWarranties] = useState<TreatmentWarranty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWarranties();
  }, []);

  const loadWarranties = async () => {
    await store.checkExpiredWarranties();
    const user = await store.getCurrentUser();
    if (user) {
      const data = await store.getWarrantiesForPatient(user.name);
      // Sort: active first, then by expiry
      data.sort((a, b) => {
        const order = { active: 0, claimed: 1, expired: 2, voided: 3 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      });
      setWarranties(data);
    }
    setLoading(false);
  };

  const daysRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  const renderWarranty = ({ item }: { item: TreatmentWarranty }) => {
    const status = STATUS_CONFIG[item.status];
    const days = daysRemaining(item.expiresAt);
    const icon = TREATMENT_ICONS[item.treatmentName] || "🦷";
    const isExpiringSoon = item.status === "active" && days <= 90;

    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: "/patient/warranty-detail" as any, params: { warrantyId: item.id } })}
      >
        <View style={s.cardHeader}>
          <View style={s.cardIconWrap}>
            <Text style={s.cardIcon}>{icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{item.treatmentName} ×{item.treatmentQty}</Text>
            <Text style={s.cardClinic}>{item.clinicName} • {item.dentistName}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[s.statusText, { color: status.color }]}>
              {status.icon} {status.label}
            </Text>
          </View>
        </View>

        <View style={s.cardBody}>
          <View style={s.cardRow}>
            <Text style={s.cardLabel}>Coverage</Text>
            <Text style={s.cardValue}>{warrantyLabel(item.warrantyMonths)}</Text>
          </View>
          <View style={s.cardRow}>
            <Text style={s.cardLabel}>Treatment Date</Text>
            <Text style={s.cardValue}>{formatDate(item.treatmentDate)}</Text>
          </View>
          <View style={s.cardRow}>
            <Text style={s.cardLabel}>Expires</Text>
            <Text style={[s.cardValue, isExpiringSoon && { color: T.amber, fontWeight: "700" }]}>
              {formatDate(item.expiresAt)}
              {item.status === "active" && ` (${days}d left)`}
            </Text>
          </View>
        </View>

        {/* US Aftercare badge */}
        <View style={s.aftercareBadge}>
          <Text style={s.aftercareIcon}>🇺🇸</Text>
          <Text style={s.aftercareText}>US Aftercare Network Available</Text>
          <Text style={s.aftercareArrow}>›</Text>
        </View>

        {item.claims.length > 0 && (
          <View style={s.claimInfo}>
            <Text style={s.claimInfoText}>
              📋 {item.claims.length} claim{item.claims.length > 1 ? "s" : ""} filed
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const activeCount = warranties.filter((w) => w.status === "active").length;

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient colors={["#3D0070", "#2F0058", "#220040"]} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Treatment Warranty</Text>
          <Text style={s.headerSub}>
            {activeCount > 0 ? `${activeCount} active warrant${activeCount > 1 ? "ies" : "y"}` : "No active warranties"}
          </Text>
        </View>
        <Text style={s.headerIcon}>🛡️</Text>
      </LinearGradient>

      {/* Info Banner */}
      <View style={s.infoBanner}>
        <Text style={s.infoBannerIcon}>💡</Text>
        <Text style={s.infoBannerText}>
          Warranties are automatically activated when you pay through DentaRoute. Get aftercare at our US partner clinics.
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={warranties}
        keyExtractor={(item) => item.id}
        renderItem={renderWarranty}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🛡️</Text>
            <Text style={s.emptyTitle}>No Warranties Yet</Text>
            <Text style={s.emptySub}>
              Complete a treatment through DentaRoute to get automatic warranty coverage with US aftercare support.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  headerIcon: { fontSize: 28 },

  infoBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginTop: 12, padding: 12,
    backgroundColor: T.purpleLight, borderRadius: 12,
  },
  infoBannerIcon: { fontSize: 16 },
  infoBannerText: { flex: 1, fontSize: 12, color: T.purple, lineHeight: 18 },

  list: { padding: 16, paddingBottom: 40, gap: 12 },

  card: {
    backgroundColor: T.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: T.border,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: T.purpleLight,
    alignItems: "center", justifyContent: "center",
  },
  cardIcon: { fontSize: 22 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: T.navy },
  cardClinic: { fontSize: 12, color: T.slate, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700" },

  cardBody: { gap: 6, marginBottom: 12 },
  cardRow: { flexDirection: "row", justifyContent: "space-between" },
  cardLabel: { fontSize: 13, color: T.slate },
  cardValue: { fontSize: 13, fontWeight: "600", color: T.navy },

  aftercareBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: "#f0f7ff", borderRadius: 10,
    borderWidth: 1, borderColor: "#dbeafe",
  },
  aftercareIcon: { fontSize: 16 },
  aftercareText: { flex: 1, fontSize: 12, fontWeight: "600", color: "#1d4ed8" },
  aftercareArrow: { fontSize: 16, color: "#93c5fd", fontWeight: "700" },

  claimInfo: {
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border,
  },
  claimInfoText: { fontSize: 12, color: T.amber, fontWeight: "600" },

  empty: { alignItems: "center", paddingVertical: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: T.navy, marginBottom: 8 },
  emptySub: { fontSize: 14, color: T.slate, textAlign: "center", lineHeight: 20 },
});
