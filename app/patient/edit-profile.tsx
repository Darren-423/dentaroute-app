import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { store } from "../../lib/store";



import { PatientTheme, SharedColors } from "../../constants/theme";
// ── Country Data ──
const ALL_COUNTRIES = [
  { code: "AF", name: "Afghanistan", flag: "\u{1F1E6}\u{1F1EB}" },
  { code: "AL", name: "Albania", flag: "\u{1F1E6}\u{1F1F1}" },
  { code: "DZ", name: "Algeria", flag: "\u{1F1E9}\u{1F1FF}" },
  { code: "AR", name: "Argentina", flag: "\u{1F1E6}\u{1F1F7}" },
  { code: "AM", name: "Armenia", flag: "\u{1F1E6}\u{1F1F2}" },
  { code: "AU", name: "Australia", flag: "\u{1F1E6}\u{1F1FA}" },
  { code: "AT", name: "Austria", flag: "\u{1F1E6}\u{1F1F9}" },
  { code: "AZ", name: "Azerbaijan", flag: "\u{1F1E6}\u{1F1FF}" },
  { code: "BH", name: "Bahrain", flag: "\u{1F1E7}\u{1F1ED}" },
  { code: "BD", name: "Bangladesh", flag: "\u{1F1E7}\u{1F1E9}" },
  { code: "BY", name: "Belarus", flag: "\u{1F1E7}\u{1F1FE}" },
  { code: "BE", name: "Belgium", flag: "\u{1F1E7}\u{1F1EA}" },
  { code: "BO", name: "Bolivia", flag: "\u{1F1E7}\u{1F1F4}" },
  { code: "BA", name: "Bosnia", flag: "\u{1F1E7}\u{1F1E6}" },
  { code: "BR", name: "Brazil", flag: "\u{1F1E7}\u{1F1F7}" },
  { code: "BN", name: "Brunei", flag: "\u{1F1E7}\u{1F1F3}" },
  { code: "BG", name: "Bulgaria", flag: "\u{1F1E7}\u{1F1EC}" },
  { code: "KH", name: "Cambodia", flag: "\u{1F1F0}\u{1F1ED}" },
  { code: "CM", name: "Cameroon", flag: "\u{1F1E8}\u{1F1F2}" },
  { code: "CA", name: "Canada", flag: "\u{1F1E8}\u{1F1E6}" },
  { code: "CL", name: "Chile", flag: "\u{1F1E8}\u{1F1F1}" },
  { code: "CN", name: "China", flag: "\u{1F1E8}\u{1F1F3}" },
  { code: "CO", name: "Colombia", flag: "\u{1F1E8}\u{1F1F4}" },
  { code: "CR", name: "Costa Rica", flag: "\u{1F1E8}\u{1F1F7}" },
  { code: "HR", name: "Croatia", flag: "\u{1F1ED}\u{1F1F7}" },
  { code: "CU", name: "Cuba", flag: "\u{1F1E8}\u{1F1FA}" },
  { code: "CY", name: "Cyprus", flag: "\u{1F1E8}\u{1F1FE}" },
  { code: "CZ", name: "Czech Republic", flag: "\u{1F1E8}\u{1F1FF}" },
  { code: "DK", name: "Denmark", flag: "\u{1F1E9}\u{1F1F0}" },
  { code: "DO", name: "Dominican Republic", flag: "\u{1F1E9}\u{1F1F4}" },
  { code: "EC", name: "Ecuador", flag: "\u{1F1EA}\u{1F1E8}" },
  { code: "EG", name: "Egypt", flag: "\u{1F1EA}\u{1F1EC}" },
  { code: "SV", name: "El Salvador", flag: "\u{1F1F8}\u{1F1FB}" },
  { code: "EE", name: "Estonia", flag: "\u{1F1EA}\u{1F1EA}" },
  { code: "ET", name: "Ethiopia", flag: "\u{1F1EA}\u{1F1F9}" },
  { code: "FI", name: "Finland", flag: "\u{1F1EB}\u{1F1EE}" },
  { code: "FR", name: "France", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "GE", name: "Georgia", flag: "\u{1F1EC}\u{1F1EA}" },
  { code: "DE", name: "Germany", flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "GH", name: "Ghana", flag: "\u{1F1EC}\u{1F1ED}" },
  { code: "GR", name: "Greece", flag: "\u{1F1EC}\u{1F1F7}" },
  { code: "GT", name: "Guatemala", flag: "\u{1F1EC}\u{1F1F9}" },
  { code: "HN", name: "Honduras", flag: "\u{1F1ED}\u{1F1F3}" },
  { code: "HK", name: "Hong Kong", flag: "\u{1F1ED}\u{1F1F0}" },
  { code: "HU", name: "Hungary", flag: "\u{1F1ED}\u{1F1FA}" },
  { code: "IS", name: "Iceland", flag: "\u{1F1EE}\u{1F1F8}" },
  { code: "IN", name: "India", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "ID", name: "Indonesia", flag: "\u{1F1EE}\u{1F1E9}" },
  { code: "IR", name: "Iran", flag: "\u{1F1EE}\u{1F1F7}" },
  { code: "IQ", name: "Iraq", flag: "\u{1F1EE}\u{1F1F6}" },
  { code: "IE", name: "Ireland", flag: "\u{1F1EE}\u{1F1EA}" },
  { code: "IL", name: "Israel", flag: "\u{1F1EE}\u{1F1F1}" },
  { code: "IT", name: "Italy", flag: "\u{1F1EE}\u{1F1F9}" },
  { code: "JM", name: "Jamaica", flag: "\u{1F1EF}\u{1F1F2}" },
  { code: "JP", name: "Japan", flag: "\u{1F1EF}\u{1F1F5}" },
  { code: "JO", name: "Jordan", flag: "\u{1F1EF}\u{1F1F4}" },
  { code: "KZ", name: "Kazakhstan", flag: "\u{1F1F0}\u{1F1FF}" },
  { code: "KE", name: "Kenya", flag: "\u{1F1F0}\u{1F1EA}" },
  { code: "KW", name: "Kuwait", flag: "\u{1F1F0}\u{1F1FC}" },
  { code: "LA", name: "Laos", flag: "\u{1F1F1}\u{1F1E6}" },
  { code: "LV", name: "Latvia", flag: "\u{1F1F1}\u{1F1FB}" },
  { code: "LB", name: "Lebanon", flag: "\u{1F1F1}\u{1F1E7}" },
  { code: "LT", name: "Lithuania", flag: "\u{1F1F1}\u{1F1F9}" },
  { code: "LU", name: "Luxembourg", flag: "\u{1F1F1}\u{1F1FA}" },
  { code: "MO", name: "Macau", flag: "\u{1F1F2}\u{1F1F4}" },
  { code: "MY", name: "Malaysia", flag: "\u{1F1F2}\u{1F1FE}" },
  { code: "MX", name: "Mexico", flag: "\u{1F1F2}\u{1F1FD}" },
  { code: "MN", name: "Mongolia", flag: "\u{1F1F2}\u{1F1F3}" },
  { code: "MA", name: "Morocco", flag: "\u{1F1F2}\u{1F1E6}" },
  { code: "MM", name: "Myanmar", flag: "\u{1F1F2}\u{1F1F2}" },
  { code: "NP", name: "Nepal", flag: "\u{1F1F3}\u{1F1F5}" },
  { code: "NL", name: "Netherlands", flag: "\u{1F1F3}\u{1F1F1}" },
  { code: "NZ", name: "New Zealand", flag: "\u{1F1F3}\u{1F1FF}" },
  { code: "NI", name: "Nicaragua", flag: "\u{1F1F3}\u{1F1EE}" },
  { code: "NG", name: "Nigeria", flag: "\u{1F1F3}\u{1F1EC}" },
  { code: "NO", name: "Norway", flag: "\u{1F1F3}\u{1F1F4}" },
  { code: "OM", name: "Oman", flag: "\u{1F1F4}\u{1F1F2}" },
  { code: "PK", name: "Pakistan", flag: "\u{1F1F5}\u{1F1F0}" },
  { code: "PA", name: "Panama", flag: "\u{1F1F5}\u{1F1E6}" },
  { code: "PY", name: "Paraguay", flag: "\u{1F1F5}\u{1F1FE}" },
  { code: "PE", name: "Peru", flag: "\u{1F1F5}\u{1F1EA}" },
  { code: "PH", name: "Philippines", flag: "\u{1F1F5}\u{1F1ED}" },
  { code: "PL", name: "Poland", flag: "\u{1F1F5}\u{1F1F1}" },
  { code: "PT", name: "Portugal", flag: "\u{1F1F5}\u{1F1F9}" },
  { code: "QA", name: "Qatar", flag: "\u{1F1F6}\u{1F1E6}" },
  { code: "RO", name: "Romania", flag: "\u{1F1F7}\u{1F1F4}" },
  { code: "RU", name: "Russia", flag: "\u{1F1F7}\u{1F1FA}" },
  { code: "SA", name: "Saudi Arabia", flag: "\u{1F1F8}\u{1F1E6}" },
  { code: "RS", name: "Serbia", flag: "\u{1F1F7}\u{1F1F8}" },
  { code: "SG", name: "Singapore", flag: "\u{1F1F8}\u{1F1EC}" },
  { code: "SK", name: "Slovakia", flag: "\u{1F1F8}\u{1F1F0}" },
  { code: "SI", name: "Slovenia", flag: "\u{1F1F8}\u{1F1EE}" },
  { code: "ZA", name: "South Africa", flag: "\u{1F1FF}\u{1F1E6}" },
  { code: "KR", name: "South Korea", flag: "\u{1F1F0}\u{1F1F7}" },
  { code: "ES", name: "Spain", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "LK", name: "Sri Lanka", flag: "\u{1F1F1}\u{1F1F0}" },
  { code: "SE", name: "Sweden", flag: "\u{1F1F8}\u{1F1EA}" },
  { code: "CH", name: "Switzerland", flag: "\u{1F1E8}\u{1F1ED}" },
  { code: "TW", name: "Taiwan", flag: "\u{1F1F9}\u{1F1FC}" },
  { code: "TH", name: "Thailand", flag: "\u{1F1F9}\u{1F1ED}" },
  { code: "TR", name: "Turkey", flag: "\u{1F1F9}\u{1F1F7}" },
  { code: "UA", name: "Ukraine", flag: "\u{1F1FA}\u{1F1E6}" },
  { code: "AE", name: "UAE", flag: "\u{1F1E6}\u{1F1EA}" },
  { code: "GB", name: "United Kingdom", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "US", name: "United States", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "UY", name: "Uruguay", flag: "\u{1F1FA}\u{1F1FE}" },
  { code: "UZ", name: "Uzbekistan", flag: "\u{1F1FA}\u{1F1FF}" },
  { code: "VE", name: "Venezuela", flag: "\u{1F1FB}\u{1F1EA}" },
  { code: "VN", name: "Vietnam", flag: "\u{1F1FB}\u{1F1F3}" },
];

const POPULAR_COUNTRIES = [
  { code: "US", name: "USA", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "CA", name: "Canada", flag: "\u{1F1E8}\u{1F1E6}" },
  { code: "AU", name: "Australia", flag: "\u{1F1E6}\u{1F1FA}" },
  { code: "SG", name: "Singapore", flag: "\u{1F1F8}\u{1F1EC}" },
];

// ── DOB Data ──
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i - 10);
const months = Array.from({ length: 12 }, (_, i) => i + 1);
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const getDaysInMonth = (year: number, month: number) => {
  if (!year || !month) return Array.from({ length: 31 }, (_, i) => i + 1);
  return Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1);
};

const DEFAULT_CONDITIONS = ["Diabetes", "Heart Disease", "High Blood Pressure", "Pregnancy", "Bleeding Disorder", "None"];
const DEFAULT_MEDICATIONS = ["Blood Thinners", "Insulin", "Blood Pressure Meds", "Painkillers", "Antibiotics", "None"];
const DEFAULT_ALLERGIES = ["Penicillin", "Latex", "Ibuprofen", "Aspirin", "Codeine", "None"];
const DEFAULT_ISSUES = ["Tooth Pain", "Missing Teeth", "Broken Teeth", "Gum Disease", "Cavities", "Discoloration"];
const VISIT_OPTIONS = ["< 6 months", "6-12 months", "1-2 years", "2+ years", "Never"];

export default function EditProfileScreen() {
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Personal Info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [countryName, setCountryName] = useState("");
  const [countryFlag, setCountryFlag] = useState("");
  const [birthYear, setBirthYear] = useState(0);
  const [birthMonth, setBirthMonth] = useState(0);
  const [birthDay, setBirthDay] = useState(0);

  // Country picker
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  // DOB pickers
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [yearSearch, setYearSearch] = useState("");

  // Medical History
  const [conditions, setConditions] = useState<string[]>([]);
  const [customConditions, setCustomConditions] = useState<string[]>([]);
  const [newCondition, setNewCondition] = useState("");
  const [showConditionInput, setShowConditionInput] = useState(false);

  const [medications, setMedications] = useState<string[]>([]);
  const [customMedications, setCustomMedications] = useState<string[]>([]);
  const [newMedication, setNewMedication] = useState("");
  const [showMedicationInput, setShowMedicationInput] = useState(false);

  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergies, setCustomAllergies] = useState<string[]>([]);
  const [newAllergy, setNewAllergy] = useState("");
  const [showAllergyInput, setShowAllergyInput] = useState(false);

  // Dental History
  const [issues, setIssues] = useState<string[]>([]);
  const [customIssues, setCustomIssues] = useState<string[]>([]);
  const [newIssue, setNewIssue] = useState("");
  const [showIssueInput, setShowIssueInput] = useState(false);
  const [dentistVisit, setDentistVisit] = useState("");

  // Load all existing data
  useEffect(() => {
    (async () => {
      try {
        const profile = await store.getPatientProfile();
        if (profile) {
          setFullName(profile.fullName || profile.name || "");
          setEmail(profile.email || "");
          setPhone(profile.phone || "");
          setProfileImage(profile.profileImage || null);
          // Country
          if (profile.country) {
            const found = ALL_COUNTRIES.find((c) => c.name === profile.country || c.code === profile.country);
            if (found) {
              setCountryCode(found.code);
              setCountryName(found.name);
              setCountryFlag(found.flag);
            } else {
              setCountryName(profile.country);
            }
          }
          // DOB
          if (profile.birthDate) {
            const parts = profile.birthDate.split("-");
            if (parts.length === 3) {
              setBirthYear(parseInt(parts[0], 10));
              setBirthMonth(parseInt(parts[1], 10));
              setBirthDay(parseInt(parts[2], 10));
            }
          }
        }
        const med = await store.getPatientMedical();
        if (med) {
          if (Array.isArray(med.conditions)) {
            setConditions(med.conditions.filter((c: string) => DEFAULT_CONDITIONS.includes(c)));
            setCustomConditions(med.conditions.filter((c: string) => !DEFAULT_CONDITIONS.includes(c)));
          }
          if (Array.isArray(med.medications)) {
            setMedications(med.medications.filter((m: string) => DEFAULT_MEDICATIONS.includes(m)));
            setCustomMedications(med.medications.filter((m: string) => !DEFAULT_MEDICATIONS.includes(m)));
          }
          if (Array.isArray(med.allergies)) {
            setAllergies(med.allergies.filter((a: string) => DEFAULT_ALLERGIES.includes(a)));
            setCustomAllergies(med.allergies.filter((a: string) => !DEFAULT_ALLERGIES.includes(a)));
          }
        }
        const dental = await store.getPatientDental();
        if (dental) {
          if (Array.isArray(dental.issues)) {
            setIssues(dental.issues.filter((i: string) => DEFAULT_ISSUES.includes(i)));
            setCustomIssues(dental.issues.filter((i: string) => !DEFAULT_ISSUES.includes(i)));
          }
          setDentistVisit(dental.dentistVisit || "");
        }
      } catch (e) {
        console.log("Error loading profile:", e);
      }
    })();
  }, []);

  const days = useMemo(() => getDaysInMonth(birthYear, birthMonth), [birthYear, birthMonth]);
  const safeDay = birthDay > days.length ? 0 : birthDay;

  const filteredCountries = countrySearch
    ? ALL_COUNTRIES.filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : ALL_COUNTRIES;

  const selectCountry = (c: { code: string; name: string; flag: string }) => {
    setCountryCode(c.code);
    setCountryName(c.name);
    setCountryFlag(c.flag);
    setShowCountryPicker(false);
    setCountrySearch("");
  };

  const toggleItem = (item: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const addCustomItem = (
    value: string, setValue: (v: string) => void,
    list: string[], setList: (v: string[]) => void,
    defaults: string[]
  ) => {
    const trimmed = value.trim();
    if (!trimmed || list.includes(trimmed) || defaults.includes(trimmed)) { setValue(""); return; }
    setList([...list, trimmed]);
    setValue("");
  };

  const pickImage = async () => {
    Alert.alert("Change Photo", "Choose an option", [
      { text: "Take Photo", onPress: () => launchImage("camera") },
      { text: "Choose from Library", onPress: () => launchImage("gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const launchImage = async (source: "camera" | "gallery") => {
    let result: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert("Permission Required", "Camera access needed."); return; }
      result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert("Permission Required", "Photo library access needed."); return; }
      result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    }
    if (!result.canceled && result.assets?.[0]?.uri) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) { Alert.alert("Required", "Please enter your full name."); return; }
    setLoading(true);
    const birthDate = (birthYear && birthMonth && safeDay)
      ? `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`
      : "";
    try {
      await store.savePatientProfile({
        fullName: fullName.trim(),
        name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        country: countryName || "",
        birthDate,
        profileImage,
      });
      await store.savePatientMedical({
        conditions: [...conditions, ...customConditions],
        medications: [...medications, ...customMedications],
        allergies: [...allergies, ...customAllergies],
      });
      await store.savePatientDental({
        issues: [...issues, ...customIssues],
        dentistVisit,
      });
      router.back();
    } catch (e) {
      console.log("Error saving:", e);
      Alert.alert("Error", "Failed to save profile.");
    }
    setLoading(false);
  };

  const initial = fullName?.[0]?.toUpperCase() || "P";

  const renderTagSection = (
    label: string,
    defaults: string[],
    selected: string[],
    setSelected: (v: string[]) => void,
    custom: string[],
    setCustom: (v: string[]) => void,
    newVal: string,
    setNewVal: (v: string) => void,
    showInput: boolean,
    setShowInput: (v: boolean) => void,
  ) => (
    <View style={st.subsection}>
      <Text style={st.subsectionLabel}>{label}</Text>
      <View style={st.tagWrap}>
        {defaults.map((item) => (
          <TouchableOpacity
            key={item}
            style={[st.tag, selected.includes(item) && st.tagSelected]}
            onPress={() => toggleItem(item, selected, setSelected)}
          >
            <Text style={[st.tagText, selected.includes(item) && st.tagTextSelected]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {custom.length > 0 && (
        <View style={st.tagWrap}>
          {custom.map((item) => (
            <View key={item} style={[st.tag, st.tagCustom]}>
              <Text style={st.tagTextCustom}>{item}</Text>
              <TouchableOpacity onPress={() => setCustom(custom.filter((x) => x !== item))}>
                <Text style={st.tagRemove}>  ✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      {showInput ? (
        <View style={st.addRow}>
          <TextInput
            style={st.addInput}
            placeholder={`Add custom ${label.toLowerCase()}...`}
            placeholderTextColor={SharedColors.slateLight}
            value={newVal}
            onChangeText={setNewVal}
            onSubmitEditing={() => { addCustomItem(newVal, setNewVal, custom, setCustom, defaults); }}
            returnKeyType="done"
            autoFocus
          />
          <TouchableOpacity style={st.addBtn} onPress={() => { addCustomItem(newVal, setNewVal, custom, setCustom, defaults); }}>
            <Text style={st.addBtnText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowInput(false)}>
            <Text style={st.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={st.addCustomBtn} onPress={() => setShowInput(true)}>
          <Text style={st.addCustomBtnText}>+ Add Custom</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={st.container}>
      <LinearGradient colors={[PatientTheme.primary, PatientTheme.primaryMid]} style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={st.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={st.title}>Edit Profile</Text>
        <Text style={st.subtitle}>Update your information</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Profile Photo */}
        <View style={st.photoSection}>
          <TouchableOpacity onPress={pickImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={st.avatar} />
            ) : (
              <View style={st.avatarPlaceholder}>
                <Text style={st.avatarText}>{initial}</Text>
              </View>
            )}
            <View style={st.cameraBadge}><Text style={st.cameraIcon}>📷</Text></View>
          </TouchableOpacity>
          <Text style={st.photoHint}>Tap to change photo</Text>
        </View>

        {/* Personal Information */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>PERSONAL INFORMATION</Text>
          <View style={st.fieldGroup}>
            <Text style={st.label}>Full Name *</Text>
            <TextInput style={st.input} value={fullName} onChangeText={setFullName} placeholder="Enter full name" placeholderTextColor={SharedColors.slateLight} />
          </View>
          <View style={st.fieldGroup}>
            <Text style={st.label}>Email</Text>
            <TextInput style={st.input} value={email} onChangeText={setEmail} placeholder="Enter email" placeholderTextColor={SharedColors.slateLight} keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={st.fieldGroup}>
            <Text style={st.label}>Phone Number</Text>
            <TextInput style={st.input} value={phone} onChangeText={setPhone} placeholder="Enter phone number" placeholderTextColor={SharedColors.slateLight} keyboardType="phone-pad" />
          </View>

          {/* Country Picker */}
          <View style={st.fieldGroup}>
            <Text style={st.label}>Country</Text>
            {/* Popular countries quick buttons */}
            <View style={st.popularRow}>
              {POPULAR_COUNTRIES.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={[st.popularBtn, countryCode === c.code && st.popularBtnSelected]}
                  onPress={() => selectCountry(c)}
                >
                  <Text style={st.popularFlag}>{c.flag}</Text>
                  <Text style={[st.popularName, countryCode === c.code && st.popularNameSelected]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={st.countrySelector} onPress={() => setShowCountryPicker(true)}>
              <Text style={countryName ? st.countrySelectorText : st.countrySelectorPlaceholder}>
                {countryName ? `${countryFlag} ${countryName}` : "Select your country..."}
              </Text>
              <Text style={st.countrySelectorArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* DOB Dropdown Picker */}
          <View style={st.fieldGroup}>
            <Text style={st.label}>Date of Birth</Text>
            <View style={st.dobRow}>
              {/* Year Dropdown */}
              <TouchableOpacity
                style={[st.dobDropdown, birthYear > 0 && st.dobDropdownSelected]}
                onPress={() => setShowYearPicker(true)}
              >
                <Text style={[st.dobDropdownText, birthYear > 0 ? st.dobDropdownTextSelected : st.dobDropdownPlaceholder]}>
                  {birthYear > 0 ? String(birthYear) : "Year"}
                </Text>
                <Text style={st.dobDropdownArrow}>▼</Text>
              </TouchableOpacity>
              {/* Month Dropdown */}
              <TouchableOpacity
                style={[st.dobDropdown, birthMonth > 0 && st.dobDropdownSelected]}
                onPress={() => setShowMonthPicker(true)}
              >
                <Text style={[st.dobDropdownText, birthMonth > 0 ? st.dobDropdownTextSelected : st.dobDropdownPlaceholder]}>
                  {birthMonth > 0 ? monthNames[birthMonth - 1] : "Month"}
                </Text>
                <Text style={st.dobDropdownArrow}>▼</Text>
              </TouchableOpacity>
              {/* Day Dropdown */}
              <TouchableOpacity
                style={[st.dobDropdown, safeDay > 0 && st.dobDropdownSelected]}
                onPress={() => setShowDayPicker(true)}
              >
                <Text style={[st.dobDropdownText, safeDay > 0 ? st.dobDropdownTextSelected : st.dobDropdownPlaceholder]}>
                  {safeDay > 0 ? String(safeDay) : "Day"}
                </Text>
                <Text style={st.dobDropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>
            {birthYear > 0 && birthMonth > 0 && safeDay > 0 && (
              <Text style={st.dobSummary}>
                Selected: {monthNames[birthMonth - 1]} {safeDay}, {birthYear}
              </Text>
            )}
          </View>
        </View>

        {/* Medical History */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>MEDICAL HISTORY</Text>
          {renderTagSection("Conditions", DEFAULT_CONDITIONS, conditions, setConditions, customConditions, setCustomConditions, newCondition, setNewCondition, showConditionInput, setShowConditionInput)}
          {renderTagSection("Medications", DEFAULT_MEDICATIONS, medications, setMedications, customMedications, setCustomMedications, newMedication, setNewMedication, showMedicationInput, setShowMedicationInput)}
          {renderTagSection("Allergies", DEFAULT_ALLERGIES, allergies, setAllergies, customAllergies, setCustomAllergies, newAllergy, setNewAllergy, showAllergyInput, setShowAllergyInput)}
        </View>

        {/* Dental History */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>DENTAL HISTORY</Text>
          {renderTagSection("Dental Issues", DEFAULT_ISSUES, issues, setIssues, customIssues, setCustomIssues, newIssue, setNewIssue, showIssueInput, setShowIssueInput)}
          <View style={st.subsection}>
            <Text style={st.subsectionLabel}>Last Dentist Visit</Text>
            <View style={st.tagWrap}>
              {VISIT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[st.tag, dentistVisit === opt && st.tagSelected]}
                  onPress={() => setDentistVisit(opt)}
                >
                  <Text style={[st.tagText, dentistVisit === opt && st.tagTextSelected]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={[st.saveBtn, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color={SharedColors.white} /> : <Text style={st.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Country Picker Modal */}
      <Modal visible={showCountryPicker} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => { setShowCountryPicker(false); setCountrySearch(""); }}>
                <Text style={st.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={st.searchInput}
              placeholder="Search countries..."
              placeholderTextColor={SharedColors.slateLight}
              value={countrySearch}
              onChangeText={setCountrySearch}
              autoFocus
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[st.countryRow, countryCode === item.code && st.countryRowSelected]}
                  onPress={() => selectCountry(item)}
                >
                  <Text style={st.countryRowFlag}>{item.flag}</Text>
                  <Text style={[st.countryRowName, countryCode === item.code && st.countryRowNameSelected]}>{item.name}</Text>
                  {countryCode === item.code && <Text style={st.countryRowCheck}>✓</Text>}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </View>
      </Modal>

      {/* Year Picker Modal */}
      <Modal visible={showYearPicker} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Select Year</Text>
              <TouchableOpacity onPress={() => { setShowYearPicker(false); setYearSearch(""); }}>
                <Text style={st.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={st.searchInput}
              placeholder="Search year..."
              placeholderTextColor={SharedColors.slateLight}
              value={yearSearch}
              onChangeText={setYearSearch}
              keyboardType="number-pad"
              autoFocus
            />
            <FlatList
              data={yearSearch ? years.filter((y) => String(y).includes(yearSearch)) : years}
              keyExtractor={(item) => String(item)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[st.pickerRow, birthYear === item && st.pickerRowSelected]}
                  onPress={() => { setBirthYear(item); setShowYearPicker(false); setYearSearch(""); }}
                >
                  <Text style={[st.pickerRowText, birthYear === item && st.pickerRowTextSelected]}>{item}</Text>
                  {birthYear === item && <Text style={st.pickerRowCheck}>✓</Text>}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </View>
      </Modal>

      {/* Month Picker Modal */}
      <Modal visible={showMonthPicker} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Select Month</Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                <Text style={st.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={months}
              keyExtractor={(item) => String(item)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[st.pickerRow, birthMonth === item && st.pickerRowSelected]}
                  onPress={() => { setBirthMonth(item); setShowMonthPicker(false); }}
                >
                  <Text style={[st.pickerRowText, birthMonth === item && st.pickerRowTextSelected]}>{monthNames[item - 1]}</Text>
                  {birthMonth === item && <Text style={st.pickerRowCheck}>✓</Text>}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </View>
      </Modal>

      {/* Day Picker Modal */}
      <Modal visible={showDayPicker} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Select Day</Text>
              <TouchableOpacity onPress={() => setShowDayPicker(false)}>
                <Text style={st.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={days}
              keyExtractor={(item) => String(item)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[st.pickerRow, safeDay === item && st.pickerRowSelected]}
                  onPress={() => { setBirthDay(item); setShowDayPicker(false); }}
                >
                  <Text style={[st.pickerRowText, safeDay === item && st.pickerRowTextSelected]}>{item}</Text>
                  {safeDay === item && <Text style={st.pickerRowCheck}>✓</Text>}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: SharedColors.bg },
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  backBtn: { position: "absolute", top: 54, left: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  backArrow: { color: SharedColors.white, fontSize: 24, fontWeight: "600", marginTop: -2 },
  title: { fontSize: 22, fontWeight: "700", color: SharedColors.white, textAlign: "center" },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 4 },
  content: { padding: 16 },
  photoSection: { alignItems: "center", marginBottom: 20 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: PatientTheme.primary },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: PatientTheme.primaryLight, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 32, fontWeight: "700", color: PatientTheme.primary },
  cameraBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: SharedColors.white, borderRadius: 14, width: 28, height: 28, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: SharedColors.border },
  cameraIcon: { fontSize: 14 },
  photoHint: { fontSize: 12, color: SharedColors.slate, marginTop: 6 },
  section: { backgroundColor: SharedColors.white, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: SharedColors.border },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: PatientTheme.primary, letterSpacing: 1, marginBottom: 12 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "600", color: SharedColors.slate, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: SharedColors.border, borderRadius: 10, padding: 12, fontSize: 15, color: SharedColors.navy, backgroundColor: SharedColors.bg },
  // Country picker
  popularRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  popularBtn: { flex: 1, alignItems: "center", padding: 8, borderRadius: 10, borderWidth: 1, borderColor: SharedColors.border, backgroundColor: SharedColors.bg },
  popularBtnSelected: { backgroundColor: PatientTheme.primaryLight, borderColor: PatientTheme.primary },
  popularFlag: { fontSize: 20, marginBottom: 2 },
  popularName: { fontSize: 11, color: SharedColors.slate },
  popularNameSelected: { color: PatientTheme.primary, fontWeight: "600" },
  countrySelector: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: SharedColors.border, borderRadius: 10, padding: 12, backgroundColor: SharedColors.bg },
  countrySelectorText: { fontSize: 15, color: SharedColors.navy },
  countrySelectorPlaceholder: { fontSize: 15, color: SharedColors.slateLight },
  countrySelectorArrow: { fontSize: 12, color: SharedColors.slate },
  // DOB Dropdown
  dobRow: { flexDirection: "row", gap: 8 },
  dobDropdown: { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: SharedColors.border, borderRadius: 10, padding: 12, backgroundColor: SharedColors.bg },
  dobDropdownSelected: { backgroundColor: PatientTheme.primaryLight, borderColor: PatientTheme.primary },
  dobDropdownText: { fontSize: 14, flex: 1 },
  dobDropdownTextSelected: { color: PatientTheme.primary, fontWeight: "600" },
  dobDropdownPlaceholder: { color: SharedColors.slateLight },
  dobDropdownArrow: { fontSize: 10, color: SharedColors.slate, marginLeft: 4 },
  dobSummary: { fontSize: 13, color: PatientTheme.primary, fontWeight: "600", textAlign: "center", marginTop: 8 },
  // DOB Picker rows
  pickerRow: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: SharedColors.border },
  pickerRowSelected: { backgroundColor: PatientTheme.primaryLight },
  pickerRowText: { fontSize: 16, color: SharedColors.navy, flex: 1 },
  pickerRowTextSelected: { color: PatientTheme.primary, fontWeight: "600" },
  pickerRowCheck: { fontSize: 18, color: PatientTheme.primary, fontWeight: "700" },
  // Tags
  subsection: { marginBottom: 16 },
  subsectionLabel: { fontSize: 13, fontWeight: "600", color: SharedColors.navy, marginBottom: 8 },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: SharedColors.border, backgroundColor: SharedColors.bg },
  tagSelected: { backgroundColor: PatientTheme.primaryLight, borderColor: PatientTheme.primary },
  tagText: { fontSize: 13, color: SharedColors.slate },
  tagTextSelected: { color: PatientTheme.primary, fontWeight: "600" },
  tagCustom: { flexDirection: "row", alignItems: "center", backgroundColor: "#fef3c7", borderColor: SharedColors.amber },
  tagTextCustom: { fontSize: 13, color: "#92400e" },
  tagRemove: { fontSize: 12, color: SharedColors.red },
  addRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 },
  addInput: { flex: 1, borderWidth: 1, borderColor: SharedColors.border, borderRadius: 10, padding: 10, fontSize: 14, color: SharedColors.navy, backgroundColor: SharedColors.bg },
  addBtn: { backgroundColor: PatientTheme.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { color: SharedColors.white, fontSize: 13, fontWeight: "600" },
  cancelBtnText: { color: SharedColors.slate, fontSize: 13, paddingHorizontal: 8 },
  addCustomBtn: { marginTop: 8 },
  addCustomBtnText: { fontSize: 13, color: PatientTheme.primary, fontWeight: "600" },
  saveBtn: { backgroundColor: PatientTheme.primary, padding: 16, borderRadius: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: SharedColors.white, fontSize: 16, fontWeight: "700" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: SharedColors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: SharedColors.navy },
  modalClose: { fontSize: 20, color: SharedColors.slate, padding: 4 },
  searchInput: { borderWidth: 1, borderColor: SharedColors.border, borderRadius: 10, padding: 12, fontSize: 15, color: SharedColors.navy, backgroundColor: SharedColors.bg, marginBottom: 12 },
  countryRow: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: SharedColors.border },
  countryRowSelected: { backgroundColor: PatientTheme.primaryLight },
  countryRowFlag: { fontSize: 22, marginRight: 12 },
  countryRowName: { fontSize: 15, color: SharedColors.navy, flex: 1 },
  countryRowNameSelected: { color: PatientTheme.primary, fontWeight: "600" },
  countryRowCheck: { fontSize: 18, color: PatientTheme.primary, fontWeight: "700" },
});
