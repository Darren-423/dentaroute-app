import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { store } from "../../lib/store";

import { PatientTheme, SharedColors } from "../../constants/theme";
// 전 세계 국가 리스트
const ALL_COUNTRIES = [
  { code: "AF", name: "Afghanistan", flag: "🇦🇫" },
  { code: "AL", name: "Albania", flag: "🇦🇱" },
  { code: "DZ", name: "Algeria", flag: "🇩🇿" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "AM", name: "Armenia", flag: "🇦🇲" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "AZ", name: "Azerbaijan", flag: "🇦🇿" },
  { code: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "BY", name: "Belarus", flag: "🇧🇾" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "BA", name: "Bosnia", flag: "🇧🇦" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "BN", name: "Brunei", flag: "🇧🇳" },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
  { code: "KH", name: "Cambodia", flag: "🇰🇭" },
  { code: "CM", name: "Cameroon", flag: "🇨🇲" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "HR", name: "Croatia", flag: "🇭🇷" },
  { code: "CU", name: "Cuba", flag: "🇨🇺" },
  { code: "CY", name: "Cyprus", flag: "🇨🇾" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "DO", name: "Dominican Republic", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "EE", name: "Estonia", flag: "🇪🇪" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "GE", name: "Georgia", flag: "🇬🇪" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "IS", name: "Iceland", flag: "🇮🇸" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "IR", name: "Iran", flag: "🇮🇷" },
  { code: "IQ", name: "Iraq", flag: "🇮🇶" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "JM", name: "Jamaica", flag: "🇯🇲" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "JO", name: "Jordan", flag: "🇯🇴" },
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "LA", name: "Laos", flag: "🇱🇦" },
  { code: "LV", name: "Latvia", flag: "🇱🇻" },
  { code: "LB", name: "Lebanon", flag: "🇱🇧" },
  { code: "LT", name: "Lithuania", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "MO", name: "Macau", flag: "🇲🇴" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "MN", name: "Mongolia", flag: "🇲🇳" },
  { code: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "MM", name: "Myanmar", flag: "🇲🇲" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "PA", name: "Panama", flag: "🇵🇦" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "RS", name: "Serbia", flag: "🇷🇸" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "SK", name: "Slovakia", flag: "🇸🇰" },
  { code: "SI", name: "Slovenia", flag: "🇸🇮" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "AE", name: "UAE", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "UZ", name: "Uzbekistan", flag: "🇺🇿" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
];

// 인기 국가 (상단에 보여줄 4개)
const POPULAR_COUNTRIES = [
  { code: "US", name: "USA", flag: "🇺🇸" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
];

// DOB
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i - 10);
const months = Array.from({ length: 12 }, (_, i) => i + 1);
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const getDaysInMonth = (year: number, month: number) => {
  if (!year || !month) return Array.from({ length: 31 }, (_, i) => i + 1);
  return Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1);
};

export default function PatientBasicInfoScreen() {
  const { mode, from } = useLocalSearchParams<{ mode?: string; from?: string }>();
  const isEditMode = mode === "edit";
  const [formData, setFormData] = useState({
    country: "",
    countryName: "",
    countryFlag: "",
    birthYear: 0,
    birthMonth: 0,
    birthDay: 0,
  });
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [dobModal, setDobModal] = useState<"year" | "month" | "day" | null>(null);

  // 저장된 프로필 데이터 불러오기
  useEffect(() => {
    const loadProfile = async () => {
      const profile = await store.getPatientProfile();
      if (profile) {
        const updates: any = {};
        // 국가 매핑
        if (profile.country) {
          const found = ALL_COUNTRIES.find(
            (c) => c.name === profile.country || c.code === profile.country
          );
          if (found) {
            updates.country = found.code;
            updates.countryName = found.name;
            updates.countryFlag = found.flag;
          }
        }
        // 생년월일 파싱 (형식: "1990-05-15")
        if (profile.birthDate) {
          const parts = profile.birthDate.split("-");
          if (parts.length === 3) {
            updates.birthYear = parseInt(parts[0], 10);
            updates.birthMonth = parseInt(parts[1], 10);
            updates.birthDay = parseInt(parts[2], 10);
          }
        }
        if (Object.keys(updates).length > 0) {
          setFormData((prev) => ({ ...prev, ...updates }));
        }
      }
    };
    loadProfile();
  }, []);

  const days = useMemo(() => getDaysInMonth(formData.birthYear, formData.birthMonth), [formData.birthYear, formData.birthMonth]);
  const safeDay = formData.birthDay > days.length ? 0 : formData.birthDay;
  const dobComplete = formData.birthYear > 0 && formData.birthMonth > 0 && safeDay > 0;

  const isComplete = formData.country && dobComplete;

  const age = useMemo(() => {
    if (!dobComplete) return null;
    const today = new Date();
    let a = today.getFullYear() - formData.birthYear;
    const md = today.getMonth() + 1 - formData.birthMonth;
    if (md < 0 || (md === 0 && today.getDate() < safeDay)) a--;
    return a;
  }, [formData.birthYear, formData.birthMonth, safeDay, dobComplete]);

  const filteredCountries = countrySearch
    ? ALL_COUNTRIES.filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : ALL_COUNTRIES;

  const selectCountry = (c: { code: string; name: string; flag: string }) => {
    setFormData({ ...formData, country: c.code, countryName: c.name, countryFlag: c.flag });
    setShowCountryPicker(false);
    setCountrySearch("");
  };

  const handleNext = async () => {
    if (!isComplete) return;
    setLoading(true);
    try {
      const existing = await store.getPatientProfile() || {};
      const mm = String(formData.birthMonth).padStart(2, "0");
      const dd = String(safeDay).padStart(2, "0");
      await store.savePatientProfile({
        ...existing,
        country: formData.countryName || formData.country,
        birthDate: `${formData.birthYear}-${mm}-${dd}`,
      });
    } catch {}
    setLoading(false);
    if (from === "review" || from === "checklist") { router.back(); return; }
    if (isEditMode) { router.push("/patient/medical-history?mode=edit" as any); return; }
    router.push("/patient/treatment-intent" as any);
  };

  const Tag = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
    <TouchableOpacity style={[s.tag, selected && s.tagSelected]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[s.tagText, selected && s.tagTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  const PickerButton = ({ label, value, onPress }: { label: string; value: string; onPress: () => void }) => (
    <TouchableOpacity style={s.pickerBtn} onPress={onPress} activeOpacity={0.7}>
      <Text style={[s.pickerBtnText, !value && { color: SharedColors.slateLight }]}>{value || label}</Text>
      <Text style={s.pickerArrow}>▾</Text>
    </TouchableOpacity>
  );

  const getDobData = () => {
    if (dobModal === "year") return years.map((y) => ({ key: y, label: `${y}` }));
    if (dobModal === "month") return months.map((m) => ({ key: m, label: monthNames[m - 1] }));
    if (dobModal === "day") return days.map((d) => ({ key: d, label: `${d}` }));
    return [];
  };

  const handleDobSelect = (key: number) => {
    if (dobModal === "year") setFormData({ ...formData, birthYear: key });
    else if (dobModal === "month") setFormData({ ...formData, birthMonth: key });
    else if (dobModal === "day") setFormData({ ...formData, birthDay: key });
    setDobModal(null);
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient colors={[...PatientTheme.gradient]} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.title}>Basic Information</Text>
            <Text style={s.subtitle}>Tell us about yourself</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.progressRow}>
          <View style={[s.progressDot, s.progressDotActive]} />
          <View style={s.progressLine} />
          <View style={s.progressDot} />
          <View style={s.progressLine} />
          <View style={s.progressDot} />
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Country */}
        <View style={s.section}>
          <Text style={s.label}>COUNTRY</Text>
          <View style={s.tagWrap}>
            {POPULAR_COUNTRIES.map((c) => (
              <Tag
                key={c.code}
                label={`${c.flag} ${c.name}`}
                selected={formData.country === c.code}
                onPress={() => selectCountry(c)}
              />
            ))}
          </View>
          <TouchableOpacity
            style={[
              s.countryPickerBtn,
              formData.country && !POPULAR_COUNTRIES.find((c) => c.code === formData.country) && s.countryPickerBtnSelected,
            ]}
            onPress={() => setShowCountryPicker(true)}
            activeOpacity={0.7}
          >
            {formData.country && !POPULAR_COUNTRIES.find((c) => c.code === formData.country) ? (
              <Text style={s.countryPickerBtnTextSelected}>{formData.countryFlag} {formData.countryName}</Text>
            ) : (
              <Text style={s.countryPickerBtnText}>🌍 Other country...</Text>
            )}
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Date of Birth */}
        <View style={s.section}>
          <Text style={s.label}>DATE OF BIRTH</Text>
          <View style={s.dobRow}>
            <View style={{ flex: 1.2 }}>
              <PickerButton label="Year" value={formData.birthYear ? `${formData.birthYear}` : ""} onPress={() => setDobModal("year")} />
            </View>
            <View style={{ flex: 1 }}>
              <PickerButton label="Month" value={formData.birthMonth ? monthNames[formData.birthMonth - 1] : ""} onPress={() => setDobModal("month")} />
            </View>
            <View style={{ flex: 0.8 }}>
              <PickerButton label="Day" value={safeDay ? `${safeDay}` : ""} onPress={() => setDobModal("day")} />
            </View>
          </View>
          {age !== null && age >= 0 && (
            <View style={s.ageDisplay}>
              <Text style={s.ageText}>🎂 Age: {age} years old</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={[s.nextBtn, !isComplete && s.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!isComplete || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={SharedColors.white} size="small" />
          ) : (
            <Text style={s.nextBtnText}>Next →</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Country Picker Modal ── */}
      <Modal visible={showCountryPicker} transparent animationType="slide" onRequestClose={() => setShowCountryPicker(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowCountryPicker(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={s.searchBox}>
              <Text style={{ fontSize: 16 }}>🔍</Text>
              <TextInput
                style={s.searchInput}
                placeholder="Search country..."
                placeholderTextColor={SharedColors.slateLight}
                value={countrySearch}
                onChangeText={setCountrySearch}
                autoCorrect={false}
              />
              {countrySearch ? (
                <TouchableOpacity onPress={() => setCountrySearch("")}>
                  <Text style={s.searchClear}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.countryItem, formData.country === item.code && s.countryItemSelected]}
                  onPress={() => selectCountry(item)}
                >
                  <Text style={s.countryItemFlag}>{item.flag}</Text>
                  <Text style={s.countryItemName}>{item.name}</Text>
                  {formData.country === item.code && <Text style={s.countryItemCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── DOB Picker Modal ── */}
      <Modal visible={dobModal !== null} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setDobModal(null)}>
          <View style={s.dobModalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {dobModal === "year" ? "Select Year" : dobModal === "month" ? "Select Month" : "Select Day"}
              </Text>
              <TouchableOpacity onPress={() => setDobModal(null)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={getDobData()}
              keyExtractor={(item) => String(item.key)}
              style={{ paddingHorizontal: 8 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const sel =
                  (dobModal === "year" && formData.birthYear === item.key) ||
                  (dobModal === "month" && formData.birthMonth === item.key) ||
                  (dobModal === "day" && safeDay === item.key);
                return (
                  <TouchableOpacity style={[s.dobItem, sel && s.dobItemSelected]} onPress={() => handleDobSelect(item.key)}>
                    <Text style={[s.dobItemText, sel && s.dobItemTextSelected]}>{item.label}</Text>
                    {sel && <Text style={s.dobCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
              initialScrollIndex={
                dobModal === "year" && formData.birthYear ? Math.max(0, years.indexOf(formData.birthYear) - 3) :
                dobModal === "month" && formData.birthMonth ? Math.max(0, formData.birthMonth - 2) : 0
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  progressRow: { flexDirection: "row", alignItems: "center", marginTop: 14, paddingHorizontal: 20 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)" },
  progressDotActive: { backgroundColor: SharedColors.amber, width: 10, height: 10, borderRadius: 5 },
  progressLine: { flex: 1, height: 2, backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 6 },

  content: { padding: 24, gap: 24, paddingBottom: 60 },
  section: { gap: 10 },
  label: { fontSize: 11, fontWeight: "600", color: SharedColors.slate, letterSpacing: 0.8 },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: SharedColors.border, backgroundColor: SharedColors.white },
  tagSelected: { borderColor: PatientTheme.primaryMid, backgroundColor: PatientTheme.primaryLight },
  tagText: { fontSize: 13, color: SharedColors.slate, fontWeight: "400" },
  tagTextSelected: { color: PatientTheme.primary, fontWeight: "600" },

  // Country picker btn
  countryPickerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1.5, borderColor: SharedColors.border, backgroundColor: SharedColors.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13 },
  countryPickerBtnSelected: { borderColor: PatientTheme.primaryMid, backgroundColor: PatientTheme.primaryLight },
  countryPickerBtnText: { fontSize: 14, color: SharedColors.slate },
  countryPickerBtnTextSelected: { fontSize: 14, color: PatientTheme.primary, fontWeight: "600" },
  chevron: { fontSize: 20, color: SharedColors.slateLight },

  // DOB
  dobRow: { flexDirection: "row", gap: 10 },
  pickerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1.5, borderColor: SharedColors.border, backgroundColor: SharedColors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 46 },
  pickerBtnText: { fontSize: 14, color: SharedColors.navy, fontWeight: "500" },
  pickerArrow: { fontSize: 12, color: SharedColors.slateLight, marginLeft: 4 },
  ageDisplay: { backgroundColor: PatientTheme.primaryLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignSelf: "flex-start" },
  ageText: { fontSize: 13, color: PatientTheme.primary, fontWeight: "600" },

  // Bottom
  bottomBar: { paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: SharedColors.border, backgroundColor: SharedColors.white },
  nextBtn: { backgroundColor: PatientTheme.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center", minHeight: 52 },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: SharedColors.white, fontSize: 15, fontWeight: "600" },

  // ── Modals ──
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: SharedColors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "75%", paddingBottom: 30 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: SharedColors.border, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: SharedColors.navy },
  modalClose: { fontSize: 20, color: SharedColors.slateLight, padding: 4 },

  // Search
  searchBox: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 12, borderWidth: 1.5, borderColor: SharedColors.border, borderRadius: 12, paddingHorizontal: 14, backgroundColor: SharedColors.bg, gap: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: SharedColors.navy },
  searchClear: { fontSize: 16, color: SharedColors.slateLight, padding: 4 },

  // Country list
  countryItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, gap: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  countryItemSelected: { backgroundColor: PatientTheme.primaryLight },
  countryItemFlag: { fontSize: 24 },
  countryItemName: { flex: 1, fontSize: 15, color: SharedColors.navy },
  countryItemCheck: { fontSize: 16, color: PatientTheme.primary, fontWeight: "700" },

  // DOB modal
  dobModalContent: { backgroundColor: SharedColors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "50%", paddingBottom: 34 },
  dobItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13, borderRadius: 10, height: 48 },
  dobItemSelected: { backgroundColor: PatientTheme.primaryLight },
  dobItemText: { fontSize: 15, color: SharedColors.navy },
  dobItemTextSelected: { color: PatientTheme.primary, fontWeight: "600" },
  dobCheck: { fontSize: 16, color: PatientTheme.primary, fontWeight: "700" },
});
