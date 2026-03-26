import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { store } from "../../lib/store";
import { PatientTheme, SharedColors } from "../../constants/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Country Data ───
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
const POPULAR = [
  { code: "US", name: "USA", flag: "🇺🇸" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
];

// ─── Checklist Data ───
const CONDITIONS = ["Diabetes", "Heart Disease", "High Blood Pressure", "Pregnancy", "Bleeding Disorder", "None"];
const MEDICATIONS = ["Blood Thinners", "Insulin", "Blood Pressure Meds", "Painkillers", "Antibiotics", "None"];
const ALLERGIES = ["Penicillin", "Latex", "Ibuprofen", "Aspirin", "Codeine", "None"];
const DENTAL_ISSUES = ["Tooth Pain", "Missing Teeth", "Broken Teeth", "Gum Disease", "Cavities", "Discoloration"];
const VISIT_OPTIONS = ["< 6 months", "6-12 months", "1-2 years", "2+ years", "Never"];

// DOB helpers
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i - 10);
const months = Array.from({ length: 12 }, (_, i) => i + 1);
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const getDaysInMonth = (y: number, m: number) => {
  if (!y || !m) return Array.from({ length: 31 }, (_, i) => i + 1);
  return Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => i + 1);
};

type Section = "basic" | "medical" | "dental";

export default function PatientInfoScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();

  // ─── Section Accordion ───
  const [openSection, setOpenSection] = useState<Section>("basic");

  // ─── Basic Info State ───
  const [country, setCountry] = useState("");
  const [countryName, setCountryName] = useState("");
  const [countryFlag, setCountryFlag] = useState("");
  const [birthYear, setBirthYear] = useState(0);
  const [birthMonth, setBirthMonth] = useState(0);
  const [birthDay, setBirthDay] = useState(0);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [dobModal, setDobModal] = useState<"year" | "month" | "day" | null>(null);

  // ─── Medical State ───
  const [conditions, setConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);

  // ─── Dental State ───
  const [issues, setIssues] = useState<string[]>([]);
  const [lastVisit, setLastVisit] = useState("");

  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // ─── Load existing data ───
  useEffect(() => {
    (async () => {
      const [profile, med, dental] = await Promise.all([
        store.getPatientProfile(),
        store.getPatientMedical(),
        store.getPatientDental(),
      ]);
      if (profile) {
        if (profile.country) {
          const found = ALL_COUNTRIES.find(c => c.name === profile.country || c.code === profile.country);
          if (found) { setCountry(found.code); setCountryName(found.name); setCountryFlag(found.flag); }
        }
        if (profile.birthDate) {
          const p = profile.birthDate.split("-");
          if (p.length === 3) { setBirthYear(+p[0]); setBirthMonth(+p[1]); setBirthDay(+p[2]); }
        }
      }
      if (med) {
        if (Array.isArray(med.conditions)) setConditions(med.conditions);
        if (med.medications) {
          const arr = Array.isArray(med.medications) ? med.medications : med.medications.split(",").map((s: string) => s.trim()).filter(Boolean);
          setMedications(arr);
        }
        if (med.allergies) {
          const arr = Array.isArray(med.allergies) ? med.allergies : med.allergies.split(",").map((s: string) => s.trim()).filter(Boolean);
          setAllergies(arr);
        }
      }
      if (dental) {
        if (Array.isArray(dental.issues)) setIssues(dental.issues);
        if (dental.lastVisit) setLastVisit(dental.lastVisit);
      }
      setInitialLoaded(true);
    })();
  }, []);

  // ─── Derived ───
  const days = useMemo(() => getDaysInMonth(birthYear, birthMonth), [birthYear, birthMonth]);
  const safeDay = birthDay > days.length ? 0 : birthDay;
  const dobComplete = birthYear > 0 && birthMonth > 0 && safeDay > 0;
  const basicDone = !!country && dobComplete;
  const medicalDone = conditions.length > 0;
  const dentalDone = issues.length > 0;
  const allDone = basicDone && medicalDone && dentalDone;

  const toggleSection = (sec: Section) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSection(prev => prev === sec ? sec : sec);
  };

  // ─── Toggle helpers ───
  const toggle = (item: string, list: string[], setList: (v: string[]) => void) => {
    if (item === "None") { setList(["None"]); return; }
    const filtered = list.filter(c => c !== "None");
    setList(filtered.includes(item) ? filtered.filter(c => c !== item) : [...filtered, item]);
  };

  // ─── Save & Continue ───
  const handleContinue = async () => {
    if (!allDone) return;
    setLoading(true);
    try {
      const existing = await store.getPatientProfile() || {};
      const mm = String(birthMonth).padStart(2, "0");
      const dd = String(safeDay).padStart(2, "0");
      await Promise.all([
        store.savePatientProfile({ ...existing, country: countryName || country, birthDate: `${birthYear}-${mm}-${dd}` }),
        store.savePatientMedical({ conditions, medications, allergies }),
        store.savePatientDental({ issues, lastVisit }),
      ]);
    } catch {}
    setLoading(false);
    if (from === "review") { router.back(); return; }
    router.push("/patient/treatment-intent" as any);
  };

  const selectCountry = (c: { code: string; name: string; flag: string }) => {
    setCountry(c.code); setCountryName(c.name); setCountryFlag(c.flag);
    setShowCountryPicker(false); setCountrySearch("");
  };

  const filteredCountries = countrySearch
    ? ALL_COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : ALL_COUNTRIES;

  const getDobData = () => {
    if (dobModal === "year") return years.map(y => ({ key: y, label: `${y}` }));
    if (dobModal === "month") return months.map(m => ({ key: m, label: monthNames[m - 1] }));
    if (dobModal === "day") return days.map(d => ({ key: d, label: `${d}` }));
    return [];
  };
  const handleDobSelect = (key: number) => {
    if (dobModal === "year") setBirthYear(key);
    else if (dobModal === "month") setBirthMonth(key);
    else if (dobModal === "day") setBirthDay(key);
    setDobModal(null);
  };

  // ─── Reusable Tag ───
  const Tag = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
    <TouchableOpacity style={[s.tag, selected && s.tagSelected]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[s.tagText, selected && s.tagTextSelected]}>{selected ? "✓ " : ""}{label}</Text>
    </TouchableOpacity>
  );

  const PickerBtn = ({ label, value, onPress }: { label: string; value: string; onPress: () => void }) => (
    <TouchableOpacity style={s.pickerBtn} onPress={onPress} activeOpacity={0.7}>
      <Text style={[s.pickerBtnText, !value && { color: SharedColors.slateLight }]}>{value || label}</Text>
      <Text style={s.pickerArrow}>▾</Text>
    </TouchableOpacity>
  );

  const SectionHeader = ({ icon, title, done, section }: { icon: string; title: string; done: boolean; section: Section }) => (
    <TouchableOpacity
      style={[s.sectionHeader, openSection === section && s.sectionHeaderOpen]}
      onPress={() => toggleSection(section)}
      activeOpacity={0.7}
    >
      <Text style={s.sectionIcon}>{icon}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
      {done && <Text style={s.sectionCheck}>✅</Text>}
      <Text style={s.sectionChevron}>{openSection === section ? "▼" : "▶"}</Text>
    </TouchableOpacity>
  );

  if (!initialLoaded) {
    return (
      <View style={[s.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={PatientTheme.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={[...PatientTheme.gradient]} style={s.header}>
        <SafeAreaView>
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
              <Text style={s.backIcon}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>About You</Text>
              <Text style={s.headerSub}>Tell us a bit about yourself</Text>
            </View>
          </View>
          {/* Progress */}
          <View style={s.progressRow}>
            <View style={[s.dot, basicDone && s.dotDone, openSection === "basic" && s.dotActive]} />
            <View style={[s.line, basicDone && s.lineDone]} />
            <View style={[s.dot, medicalDone && s.dotDone, openSection === "medical" && s.dotActive]} />
            <View style={[s.line, medicalDone && s.lineDone]} />
            <View style={[s.dot, dentalDone && s.dotDone, openSection === "dental" && s.dotActive]} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Privacy notice */}
        <View style={s.privacyBanner}>
          <Text style={s.privacyText}>🔒 Your information is encrypted and only shared with dentists you choose to work with.</Text>
        </View>

        {/* ═══ Section 1: Basic Info ═══ */}
        <SectionHeader icon="👤" title="Basic Information" done={basicDone} section="basic" />
        {openSection === "basic" && (
          <View style={s.sectionBody}>
            <Text style={s.label}>COUNTRY</Text>
            <View style={s.tagWrap}>
              {POPULAR.map(c => (
                <Tag key={c.code} label={`${c.flag} ${c.name}`} selected={country === c.code} onPress={() => selectCountry(c)} />
              ))}
            </View>
            <TouchableOpacity
              style={[s.otherCountryBtn, country && !POPULAR.find(c => c.code === country) && s.otherCountryBtnSelected]}
              onPress={() => setShowCountryPicker(true)}
              activeOpacity={0.7}
            >
              {country && !POPULAR.find(c => c.code === country) ? (
                <Text style={s.otherCountryTextSelected}>{countryFlag} {countryName}</Text>
              ) : (
                <Text style={s.otherCountryText}>🌍 Other country...</Text>
              )}
              <Text style={{ color: SharedColors.slate }}>›</Text>
            </TouchableOpacity>

            <Text style={[s.label, { marginTop: 20 }]}>DATE OF BIRTH</Text>
            <View style={s.dobRow}>
              <View style={{ flex: 1.2 }}><PickerBtn label="Year" value={birthYear ? `${birthYear}` : ""} onPress={() => setDobModal("year")} /></View>
              <View style={{ flex: 1 }}><PickerBtn label="Month" value={birthMonth ? monthNames[birthMonth - 1] : ""} onPress={() => setDobModal("month")} /></View>
              <View style={{ flex: 0.8 }}><PickerBtn label="Day" value={safeDay ? `${safeDay}` : ""} onPress={() => setDobModal("day")} /></View>
            </View>
          </View>
        )}

        {/* ═══ Section 2: Medical History ═══ */}
        <SectionHeader icon="🏥" title="Medical History" done={medicalDone} section="medical" />
        {openSection === "medical" && (
          <View style={s.sectionBody}>
            <Text style={s.label}>HEALTH CONDITIONS</Text>
            <View style={s.tagWrap}>
              {CONDITIONS.map(c => <Tag key={c} label={c} selected={conditions.includes(c)} onPress={() => toggle(c, conditions, setConditions)} />)}
            </View>

            <Text style={[s.label, { marginTop: 16 }]}>CURRENT MEDICATIONS</Text>
            <View style={s.tagWrap}>
              {MEDICATIONS.map(m => <Tag key={m} label={m} selected={medications.includes(m)} onPress={() => toggle(m, medications, setMedications)} />)}
            </View>

            <Text style={[s.label, { marginTop: 16 }]}>ALLERGIES</Text>
            <View style={s.tagWrap}>
              {ALLERGIES.map(a => <Tag key={a} label={a} selected={allergies.includes(a)} onPress={() => toggle(a, allergies, setAllergies)} />)}
            </View>
          </View>
        )}

        {/* ═══ Section 3: Dental History ═══ */}
        <SectionHeader icon="🦷" title="Dental History" done={dentalDone} section="dental" />
        {openSection === "dental" && (
          <View style={s.sectionBody}>
            <Text style={s.label}>CURRENT DENTAL ISSUES</Text>
            <View style={s.tagWrap}>
              {DENTAL_ISSUES.map(i => <Tag key={i} label={i} selected={issues.includes(i)} onPress={() => toggle(i, issues, setIssues)} />)}
            </View>

            <Text style={[s.label, { marginTop: 16 }]}>LAST DENTAL VISIT</Text>
            <View style={s.tagWrap}>
              {VISIT_OPTIONS.map(v => <Tag key={v} label={v} selected={lastVisit === v} onPress={() => setLastVisit(v)} />)}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={[s.ctaBtn, !allDone && s.ctaBtnDisabled]}
          onPress={handleContinue}
          disabled={!allDone || loading}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Continue to treatment selection"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.ctaText}>Continue to Treatment →</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Country Picker Modal */}
      <Modal visible={showCountryPicker} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => { setShowCountryPicker(false); setCountrySearch(""); }}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={s.searchInput}
              placeholder="Search country..."
              value={countrySearch}
              onChangeText={setCountrySearch}
              placeholderTextColor={SharedColors.slateLight}
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={i => i.code}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.countryRow} onPress={() => selectCountry(item)}>
                  <Text style={s.countryRowText}>{item.flag}  {item.name}</Text>
                  {country === item.code && <Text style={s.countryRowCheck}>✓</Text>}
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>

      {/* DOB Picker Modal */}
      <Modal visible={!!dobModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select {dobModal === "year" ? "Year" : dobModal === "month" ? "Month" : "Day"}</Text>
              <TouchableOpacity onPress={() => setDobModal(null)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={getDobData()}
              keyExtractor={i => `${i.key}`}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.countryRow} onPress={() => handleDobSelect(item.key)}>
                  <Text style={s.countryRowText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: SharedColors.bg },
  header: {
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 8 : 0,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  backIcon: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 2 },
  progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16, gap: 0 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.3)" },
  dotActive: { backgroundColor: "#fff", width: 12, height: 12, borderRadius: 6 },
  dotDone: { backgroundColor: SharedColors.green },
  line: { width: 40, height: 2, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 4 },
  lineDone: { backgroundColor: SharedColors.green },
  content: { padding: 16 },
  privacyBanner: { backgroundColor: "#f0f9ff", borderRadius: 8, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: "#bae6fd" },
  privacyText: { fontSize: 12, color: "#0369a1", lineHeight: 17 },

  // Section accordion
  sectionHeader: {
    flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12,
    backgroundColor: SharedColors.white, marginBottom: 2,
    borderWidth: 1, borderColor: SharedColors.border,
  },
  sectionHeaderOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
  sectionIcon: { fontSize: 20, marginRight: 10 },
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: "600", color: SharedColors.navy },
  sectionCheck: { fontSize: 14, marginRight: 8 },
  sectionChevron: { fontSize: 12, color: SharedColors.slateLight },
  sectionBody: {
    backgroundColor: SharedColors.white, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: SharedColors.border,
    borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
  },

  label: { fontSize: 11, fontWeight: "600", color: SharedColors.slate, letterSpacing: 0.5, marginBottom: 8 },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: SharedColors.bg, borderWidth: 1, borderColor: SharedColors.border,
  },
  tagSelected: { backgroundColor: PatientTheme.primaryLight, borderColor: PatientTheme.primary },
  tagText: { fontSize: 13, color: SharedColors.slate },
  tagTextSelected: { color: PatientTheme.primary, fontWeight: "600" },

  otherCountryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 12, borderRadius: 10, borderWidth: 1, borderColor: SharedColors.border, marginTop: 8,
  },
  otherCountryBtnSelected: { borderColor: PatientTheme.primary, backgroundColor: PatientTheme.primaryLight },
  otherCountryText: { fontSize: 14, color: SharedColors.slate },
  otherCountryTextSelected: { fontSize: 14, color: PatientTheme.primary, fontWeight: "600" },

  dobRow: { flexDirection: "row", gap: 8 },
  pickerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 12, borderRadius: 10, borderWidth: 1, borderColor: SharedColors.border, backgroundColor: SharedColors.white,
  },
  pickerBtnText: { fontSize: 14, color: SharedColors.navy },
  pickerArrow: { fontSize: 12, color: SharedColors.slateLight, marginLeft: 4 },

  // Bottom CTA
  bottomBar: {
    padding: 16, paddingBottom: Platform.OS === "ios" ? 32 : 16,
    backgroundColor: SharedColors.white, borderTopWidth: 1, borderTopColor: SharedColors.border,
  },
  ctaBtn: {
    backgroundColor: PatientTheme.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center",
  },
  ctaBtnDisabled: { opacity: 0.4 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: SharedColors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "70%", paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: SharedColors.border },
  modalTitle: { fontSize: 18, fontWeight: "700", color: SharedColors.navy },
  modalClose: { fontSize: 20, color: SharedColors.slate, padding: 4 },
  searchInput: {
    marginHorizontal: 16, marginVertical: 8, padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: SharedColors.border, fontSize: 15, color: SharedColors.navy,
  },
  countryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  countryRowText: { fontSize: 15, color: SharedColors.navy },
  countryRowCheck: { fontSize: 16, color: PatientTheme.primary, fontWeight: "700" },
});
