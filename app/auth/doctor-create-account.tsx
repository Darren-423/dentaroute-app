import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SharedColors } from "../../constants/theme";
const API_URL = "https://concourse-api.onrender.com/api";

const COUNTRY_CODES = [
  { code: "+1", country: "US", flag: "🇺🇸", name: "United States" },
  { code: "+82", country: "KR", flag: "🇰🇷", name: "South Korea" },
  { code: "+44", country: "GB", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+86", country: "CN", flag: "🇨🇳", name: "China" },
  { code: "+81", country: "JP", flag: "🇯🇵", name: "Japan" },
  { code: "+49", country: "DE", flag: "🇩🇪", name: "Germany" },
  { code: "+33", country: "FR", flag: "🇫🇷", name: "France" },
  { code: "+61", country: "AU", flag: "🇦🇺", name: "Australia" },
  { code: "+1", country: "CA", flag: "🇨🇦", name: "Canada" },
  { code: "+91", country: "IN", flag: "🇮🇳", name: "India" },
  { code: "+55", country: "BR", flag: "🇧🇷", name: "Brazil" },
  { code: "+52", country: "MX", flag: "🇲🇽", name: "Mexico" },
  { code: "+65", country: "SG", flag: "🇸🇬", name: "Singapore" },
  { code: "+66", country: "TH", flag: "🇹🇭", name: "Thailand" },
  { code: "+84", country: "VN", flag: "🇻🇳", name: "Vietnam" },
  { code: "+63", country: "PH", flag: "🇵🇭", name: "Philippines" },
  { code: "+971", country: "AE", flag: "🇦🇪", name: "UAE" },
  { code: "+7", country: "RU", flag: "🇷🇺", name: "Russia" },
  { code: "+39", country: "IT", flag: "🇮🇹", name: "Italy" },
  { code: "+34", country: "ES", flag: "🇪🇸", name: "Spain" },
];

export default function DoctorCreateAccountScreen() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Email 인증
  const [emailCode, setEmailCode] = useState(["", "", "", "", "", ""]);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const emailCodeRefs = useRef<(TextInput | null)[]>([]);

  // Phone 인증
  const [phoneCode, setPhoneCode] = useState(["", "", "", "", "", ""]);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const phoneCodeRefs = useRef<(TextInput | null)[]>([]);

  // 라이센스 업로드
  const [licenseImages, setLicenseImages] = useState<{ uri: string; name: string }[]>([]);
  const [showUploadOptions, setShowUploadOptions] = useState(false);

  const updateField = (field: string, value: string | boolean) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
    setApiError("");
    if (field === "email") {
      setEmailVerified(false);
      setEmailCodeSent(false);
      setEmailCode(["", "", "", "", "", ""]);
    }
    if (field === "phone") {
      setPhoneVerified(false);
      setPhoneCodeSent(false);
      setPhoneCode(["", "", "", "", "", ""]);
    }
  };

  // ── 인증코드 핸들러 ──
  const handleCodeInput = (
    value: string, index: number, codes: string[],
    setCodes: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(TextInput | null)[]>
  ) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newCodes = [...codes];
      digits.forEach((d, i) => { if (i < 6) newCodes[i] = d; });
      setCodes(newCodes);
      refs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }
    const newCodes = [...codes];
    newCodes[index] = value.replace(/\D/g, "");
    setCodes(newCodes);
    if (value && index < 5) refs.current[index + 1]?.focus();
  };

  const handleCodeKeyPress = (
    key: string, index: number, codes: string[],
    setCodes: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(TextInput | null)[]>
  ) => {
    if (key === "Backspace" && !codes[index] && index > 0) {
      const newCodes = [...codes];
      newCodes[index - 1] = "";
      setCodes(newCodes);
      refs.current[index - 1]?.focus();
    }
  };

  const handleSendEmailCode = () => {
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      setErrors({ ...errors, email: "Please enter a valid email first" });
      return;
    }
    setEmailVerifying(true);
    setTimeout(() => { setEmailCodeSent(true); setEmailVerifying(false); setEmailCode(["", "", "", "", "", ""]); }, 1000);
  };

  const handleVerifyEmail = () => {
    if (emailCode.join("").length !== 6) return;
    setEmailVerifying(true);
    setTimeout(() => { setEmailVerified(true); setEmailVerifying(false); }, 800);
  };

  const handleSendPhoneCode = () => {
    if (!formData.phone.trim() || formData.phone.length < 6) {
      setErrors({ ...errors, phone: "Please enter a valid phone number first" });
      return;
    }
    setPhoneVerifying(true);
    setTimeout(() => { setPhoneCodeSent(true); setPhoneVerifying(false); setPhoneCode(["", "", "", "", "", ""]); }, 1000);
  };

  const handleVerifyPhone = () => {
    if (phoneCode.join("").length !== 6) return;
    setPhoneVerifying(true);
    setTimeout(() => { setPhoneVerified(true); setPhoneVerifying(false); }, 800);
  };

  // ── 라이센스 업로드 ──
  const pickFromCamera = async () => {
    setShowUploadOptions(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access to take a photo of your license.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.fileName || `license_photo_${Date.now()}.jpg`;
      setLicenseImages([...licenseImages, { uri: asset.uri, name: fileName }]);
      if (errors.license) {
        const newErrors = { ...errors };
        delete newErrors.license;
        setErrors(newErrors);
      }
    }
  };

  const pickFromGallery = async () => {
    setShowUploadOptions(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access to select your license.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: false,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.fileName || `license_scan_${Date.now()}.jpg`;
      setLicenseImages([...licenseImages, { uri: asset.uri, name: fileName }]);
      if (errors.license) {
        const newErrors = { ...errors };
        delete newErrors.license;
        setErrors(newErrors);
      }
    }
  };

  const removeImage = (index: number) => {
    const updated = [...licenseImages];
    updated.splice(index, 1);
    setLicenseImages(updated);
  };

  // ── 폼 검증 ──
  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!formData.firstName.trim()) e.firstName = "First name is required";
    if (!formData.lastName.trim()) e.lastName = "Last name is required";
    if (!formData.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = "Invalid email format";
    if (!emailVerified) e.email = "Please verify your email";
    if (!formData.phone.trim()) e.phone = "Phone number is required";
    if (!phoneVerified) e.phone = "Please verify your phone number";
    if (licenseImages.length === 0) e.license = "Please upload your U.S. dental license";
    if (!formData.password) e.password = "Password is required";
    else if (formData.password.length < 8) e.password = "Password must be 8+ characters";
    if (formData.password !== formData.confirmPassword) e.confirmPassword = "Passwords don't match";
    if (!formData.agreeTerms) e.agreeTerms = "You must agree to the terms";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setApiError("");

    try {
      // TODO: 실제 API 연동 시 여기에 register 호출 추가
      router.replace("/doctor/profile-setup" as any);
    } catch (err) {
      setApiError("Cannot connect to server. Please check your internet.");
    } finally {
      setLoading(false);
    }
  };

  // ── 인증코드 입력 UI ──
  const renderCodeInputs = (
    codes: string[],
    setCodes: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(TextInput | null)[]>,
    verified: boolean, verifying: boolean, onVerify: () => void
  ) => (
    <View style={styles.codeSection}>
      <View style={styles.codeRow}>
        {codes.map((digit, i) => (
          <TextInput
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            style={[styles.codeInput, digit ? styles.codeInputFilled : null, verified ? styles.codeInputVerified : null]}
            value={digit}
            onChangeText={(v) => handleCodeInput(v, i, codes, setCodes, refs)}
            onKeyPress={({ nativeEvent }) => handleCodeKeyPress(nativeEvent.key, i, codes, setCodes, refs)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            editable={!verified}
          />
        ))}
      </View>
      {!verified ? (
        <TouchableOpacity
          style={[styles.verifyBtn, codes.join("").length !== 6 && styles.verifyBtnDisabled]}
          onPress={onVerify} disabled={codes.join("").length !== 6 || verifying}
        >
          {verifying ? <ActivityIndicator color={SharedColors.navy} size="small" /> : <Text style={styles.verifyBtnText}>Verify</Text>}
        </TouchableOpacity>
      ) : (
        <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ Verified</Text></View>
      )}
    </View>
  );

  return (
    <LinearGradient colors={[SharedColors.navy, "#0f2a40"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.emoji}>👨‍⚕️</Text>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join our network of dentists</Text>
          </View>

          {apiError ? <View style={styles.errorBanner}><Text style={styles.errorBannerText}>❌ {apiError}</Text></View> : null}

          <View style={styles.formArea}>

            {/* ━━━ Name ━━━ */}
            <View style={styles.nameRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>FIRST NAME</Text>
                <TextInput style={[styles.input, errors.firstName && styles.inputError]} placeholder="John" placeholderTextColor="rgba(255,255,255,0.3)" value={formData.firstName} onChangeText={(v) => updateField("firstName", v)} editable={!loading} />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>LAST NAME</Text>
                <TextInput style={[styles.input, errors.lastName && styles.inputError]} placeholder="Smith" placeholderTextColor="rgba(255,255,255,0.3)" value={formData.lastName} onChangeText={(v) => updateField("lastName", v)} editable={!loading} />
              </View>
            </View>
            {(errors.firstName || errors.lastName) ? <Text style={styles.fieldError}>⚠️ {errors.firstName || errors.lastName}</Text> : null}
            <View style={styles.passportNotice}>
              <Text style={styles.passportIcon}>🪪</Text>
              <Text style={styles.passportText}>Your name must match your dental license name</Text>
            </View>

            {/* ━━━ Email + Verify ━━━ */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <View style={styles.inputWithBtn}>
                <TextInput
                  style={[styles.input, { flex: 1 }, errors.email && styles.inputError, emailVerified && styles.inputVerified]}
                  placeholder="your@email.com" placeholderTextColor="rgba(255,255,255,0.3)"
                  value={formData.email} onChangeText={(v) => updateField("email", v)}
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!loading && !emailVerified}
                />
                {!emailVerified && (
                  <TouchableOpacity style={[styles.sendCodeBtn, emailCodeSent && styles.sendCodeBtnResend]} onPress={handleSendEmailCode} disabled={emailVerifying}>
                    {emailVerifying ? <ActivityIndicator color={SharedColors.white} size="small" /> : <Text style={styles.sendCodeBtnText}>{emailCodeSent ? "Resend" : "Send Code"}</Text>}
                  </TouchableOpacity>
                )}
              </View>
              {errors.email && !emailCodeSent ? <Text style={styles.fieldError}>⚠️ {errors.email}</Text> : null}
            </View>
            {emailCodeSent && (
              <View style={styles.verifySection}>
                <Text style={styles.verifyLabel}>Enter the 6-digit code sent to your email</Text>
                {renderCodeInputs(emailCode, setEmailCode, emailCodeRefs, emailVerified, emailVerifying, handleVerifyEmail)}
              </View>
            )}

            {/* ━━━ Phone + Verify ━━━ */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PHONE NUMBER</Text>
              <View style={styles.phoneRow}>
                <TouchableOpacity style={styles.countryCodeBtn} onPress={() => setShowCountryPicker(true)} disabled={phoneVerified}>
                  <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryCodeText}>{selectedCountry.code}</Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, { flex: 1 }, errors.phone && styles.inputError, phoneVerified && styles.inputVerified]}
                  placeholder="Phone number" placeholderTextColor="rgba(255,255,255,0.3)"
                  value={formData.phone} onChangeText={(v) => updateField("phone", v.replace(/\D/g, ""))}
                  keyboardType="phone-pad" editable={!loading && !phoneVerified}
                />
                {!phoneVerified && (
                  <TouchableOpacity style={[styles.sendCodeBtn, phoneCodeSent && styles.sendCodeBtnResend]} onPress={handleSendPhoneCode} disabled={phoneVerifying}>
                    {phoneVerifying ? <ActivityIndicator color={SharedColors.white} size="small" /> : <Text style={styles.sendCodeBtnText}>{phoneCodeSent ? "Resend" : "Send"}</Text>}
                  </TouchableOpacity>
                )}
              </View>
              {errors.phone && !phoneCodeSent ? <Text style={styles.fieldError}>⚠️ {errors.phone}</Text> : null}
            </View>
            {phoneCodeSent && (
              <View style={styles.verifySection}>
                <Text style={styles.verifyLabel}>Enter the 6-digit code sent to your phone</Text>
                {renderCodeInputs(phoneCode, setPhoneCode, phoneCodeRefs, phoneVerified, phoneVerifying, handleVerifyPhone)}
              </View>
            )}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {/* ━━━ U.S. Dental License Upload ━━━ */}
            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <View style={styles.licenseSection}>
              <View style={styles.licenseTitleRow}>
                <Text style={styles.licenseTitle}>U.S. Dental License</Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredBadgeText}>Required</Text>
                </View>
              </View>
              <Text style={styles.licenseDesc}>
                Upload a clear photo or scan of your valid U.S. dental license. This will be verified by our team before your account is activated.
              </Text>

              {/* 업로드된 이미지 미리보기 */}
              {licenseImages.map((img, index) => (
                <View key={index} style={styles.imagePreviewCard}>
                  <Image source={{ uri: img.uri }} style={styles.imagePreview} resizeMode="cover" />
                  <View style={styles.imageInfo}>
                    <Text style={styles.imageFileName} numberOfLines={1}>{img.name}</Text>
                    <Text style={styles.imageStatus}>📎 Ready to upload</Text>
                  </View>
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* 업로드 버튼 */}
              {licenseImages.length < 3 && (
                <TouchableOpacity
                  style={[styles.uploadBtn, errors.license && styles.uploadBtnError]}
                  onPress={() => setShowUploadOptions(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.uploadIconCircle}>
                    <Text style={styles.uploadIcon}>📄</Text>
                  </View>
                  <View style={styles.uploadTextWrap}>
                    <Text style={styles.uploadMainText}>
                      {licenseImages.length === 0 ? "Upload License" : "Add Another Page"}
                    </Text>
                    <Text style={styles.uploadSubText}>
                      Take a photo or choose from gallery
                    </Text>
                  </View>
                  <Text style={styles.uploadPlus}>+</Text>
                </TouchableOpacity>
              )}

              {errors.license ? <Text style={styles.fieldError}>⚠️ {errors.license}</Text> : null}

              {/* 안내 사항 */}
              <View style={styles.licenseHints}>
                <View style={styles.hintRow}>
                  <Text style={styles.hintIcon}>✓</Text>
                  <Text style={styles.hintText}>Must be a valid, non-expired U.S. dental license</Text>
                </View>
                <View style={styles.hintRow}>
                  <Text style={styles.hintIcon}>✓</Text>
                  <Text style={styles.hintText}>All text and numbers must be clearly readable</Text>
                </View>
                <View style={styles.hintRow}>
                  <Text style={styles.hintIcon}>✓</Text>
                  <Text style={styles.hintText}>Accepted: JPG, PNG (max 10MB per file)</Text>
                </View>
                <View style={styles.hintRow}>
                  <Text style={styles.hintIcon}>⏱</Text>
                  <Text style={styles.hintText}>Verification takes 24-48 hours</Text>
                </View>
              </View>
            </View>

            {/* ━━━ Password ━━━ */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput style={[styles.input, errors.password && styles.inputError]} placeholder="Min. 8 characters" placeholderTextColor="rgba(255,255,255,0.3)" value={formData.password} onChangeText={(v) => updateField("password", v)} secureTextEntry autoCapitalize="none" editable={!loading} />
              {errors.password ? <Text style={styles.fieldError}>⚠️ {errors.password}</Text> : <Text style={styles.helpText}>💡 Use a strong password</Text>}
            </View>

            {/* ━━━ Confirm Password ━━━ */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <TextInput style={[styles.input, errors.confirmPassword && styles.inputError]} placeholder="Re-enter password" placeholderTextColor="rgba(255,255,255,0.3)" value={formData.confirmPassword} onChangeText={(v) => updateField("confirmPassword", v)} secureTextEntry autoCapitalize="none" editable={!loading} />
              {errors.confirmPassword ? <Text style={styles.fieldError}>⚠️ {errors.confirmPassword}</Text> : null}
            </View>

            {/* ━━━ Terms ━━━ */}
            <TouchableOpacity style={styles.termsRow} onPress={() => updateField("agreeTerms", !formData.agreeTerms)} activeOpacity={0.7}>
              <View style={[styles.checkbox, formData.agreeTerms && styles.checkboxChecked, errors.agreeTerms && styles.checkboxError]}>
                {formData.agreeTerms ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.termsLink} onPress={() => router.push("/patient/terms" as any)}>Terms of Service</Text> and <Text style={styles.termsLink} onPress={() => router.push("/patient/privacy-policy" as any)}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
            {errors.agreeTerms ? <Text style={[styles.fieldError, { marginLeft: 30 }]}>⚠️ {errors.agreeTerms}</Text> : null}
          </View>

          {/* Create Account */}
          <TouchableOpacity style={[styles.createBtn, loading && { opacity: 0.6 }]} onPress={handleCreateAccount} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={SharedColors.navy} size="small" /> : <Text style={styles.createBtnText}>Create Account →</Text>}
          </TouchableOpacity>

          <View style={styles.bottomLink}>
            <Text style={styles.bottomLinkText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.bottomLinkAction}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Upload Options Modal ── */}
      <Modal visible={showUploadOptions} transparent animationType="fade" onRequestClose={() => setShowUploadOptions(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowUploadOptions(false)}>
          <View style={styles.uploadModalContent}>
            <View style={styles.uploadModalHandle} />
            <Text style={styles.uploadModalTitle}>Upload License</Text>
            <Text style={styles.uploadModalDesc}>Choose how to upload your dental license</Text>

            <TouchableOpacity style={styles.uploadOption} onPress={pickFromCamera} activeOpacity={0.7}>
              <View style={styles.uploadOptionIcon}>
                <Text style={{ fontSize: 28 }}>📷</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadOptionTitle}>Take a Photo</Text>
                <Text style={styles.uploadOptionDesc}>Use your camera to photograph the license</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadOption} onPress={pickFromGallery} activeOpacity={0.7}>
              <View style={styles.uploadOptionIcon}>
                <Text style={{ fontSize: 28 }}>🖼️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.uploadOptionDesc}>Select a saved photo or scanned document</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadCancelBtn} onPress={() => setShowUploadOptions(false)}>
              <Text style={styles.uploadCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Country Code Picker Modal ── */}
      <Modal visible={showCountryPicker} transparent animationType="slide" onRequestClose={() => setShowCountryPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCountryPicker(false)}>
          <View style={styles.countryModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => `${item.country}-${item.code}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryItem, selectedCountry.country === item.country && selectedCountry.code === item.code && styles.countryItemSelected]}
                  onPress={() => { setSelectedCountry(item); setShowCountryPicker(false); }}
                >
                  <Text style={styles.countryItemFlag}>{item.flag}</Text>
                  <Text style={styles.countryItemName}>{item.name}</Text>
                  <Text style={styles.countryItemCode}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  backArrow: { fontSize: 24, color: SharedColors.white, fontWeight: "600", marginTop: -2 },
  header: { marginBottom: 28 },
  emoji: { fontSize: 36, marginBottom: 10 },
  title: { fontSize: 30, fontWeight: "700", color: SharedColors.white, marginBottom: 6 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.45)", fontWeight: "300" },
  errorBanner: { backgroundColor: SharedColors.coralLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 16 },
  errorBannerText: { color: SharedColors.coral, fontSize: 12 },
  formArea: { gap: 16 },
  nameRow: { flexDirection: "row", gap: 12 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.5)", letterSpacing: 0.8 },
  input: { borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 14, color: SharedColors.white },
  inputError: { borderColor: SharedColors.coral },
  inputVerified: { borderColor: SharedColors.green, backgroundColor: "rgba(22,163,74,0.1)" },
  fieldError: { fontSize: 11, color: SharedColors.coral, marginTop: 2 },
  helpText: { fontSize: 11, color: "rgba(255,255,255,0.4)" },
  passportNotice: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  passportIcon: { fontSize: 16 },
  passportText: { fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: "500", flex: 1 },
  inputWithBtn: { flexDirection: "row", gap: 8, alignItems: "center" },
  phoneRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  sendCodeBtn: { backgroundColor: "#1a9e8f", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, justifyContent: "center", alignItems: "center", minWidth: 80 },
  sendCodeBtnResend: { backgroundColor: "rgba(255,255,255,0.15)" },
  sendCodeBtnText: { color: SharedColors.white, fontSize: 13, fontWeight: "600" },
  countryCodeBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 13 },
  countryFlag: { fontSize: 18 },
  countryCodeText: { color: SharedColors.white, fontSize: 14, fontWeight: "500" },
  dropdownArrow: { color: "rgba(255,255,255,0.4)", fontSize: 8, marginLeft: 2 },
  verifySection: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  verifyLabel: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 14, textAlign: "center" },
  codeSection: { alignItems: "center", gap: 14 },
  codeRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  codeInput: { width: 42, height: 48, borderRadius: 10, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.08)", textAlign: "center", fontSize: 20, fontWeight: "700", color: SharedColors.white },
  codeInputFilled: { borderColor: "#1a9e8f", backgroundColor: "rgba(26,158,143,0.15)" },
  codeInputVerified: { borderColor: SharedColors.green, backgroundColor: "rgba(22,163,74,0.15)" },
  verifyBtn: { backgroundColor: SharedColors.white, borderRadius: 10, paddingHorizontal: 28, paddingVertical: 10, minWidth: 100, alignItems: "center" },
  verifyBtnDisabled: { opacity: 0.4 },
  verifyBtnText: { color: SharedColors.navy, fontSize: 14, fontWeight: "600" },
  verifiedBadge: { backgroundColor: "rgba(22,163,74,0.15)", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(22,163,74,0.3)" },
  verifiedText: { color: SharedColors.green, fontSize: 13, fontWeight: "700" },

  // ── License Upload ──
  licenseSection: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 14,
  },
  licenseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  licenseTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: SharedColors.white,
  },
  requiredBadge: {
    backgroundColor: "rgba(224,90,58,0.15)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(224,90,58,0.3)",
  },
  requiredBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: SharedColors.coral,
  },
  licenseDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 20,
  },

  // Image preview
  imagePreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.3)",
  },
  imagePreview: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  imageInfo: {
    flex: 1,
    gap: 4,
  },
  imageFileName: {
    fontSize: 13,
    fontWeight: "600",
    color: SharedColors.white,
  },
  imageStatus: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },
  removeImageBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(224,90,58,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeImageText: {
    color: SharedColors.coral,
    fontSize: 14,
    fontWeight: "600",
  },

  // Upload button
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  uploadBtnError: {
    borderColor: "rgba(224,90,58,0.5)",
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(26,158,143,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIcon: { fontSize: 22 },
  uploadTextWrap: { flex: 1, gap: 2 },
  uploadMainText: { fontSize: 14, fontWeight: "600", color: SharedColors.white },
  uploadSubText: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  uploadPlus: { fontSize: 24, color: "rgba(255,255,255,0.3)", fontWeight: "300" },

  // License hints
  licenseHints: { gap: 8 },
  hintRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  hintIcon: { fontSize: 12, color: "#1a9e8f", fontWeight: "700", marginTop: 1 },
  hintText: { fontSize: 12, color: "rgba(255,255,255,0.45)", flex: 1, lineHeight: 18 },

  // Terms
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", backgroundColor: "transparent", alignItems: "center", justifyContent: "center", marginTop: 2 },
  checkboxChecked: { backgroundColor: "#1a9e8f", borderColor: "#1a9e8f" },
  checkboxError: { borderColor: SharedColors.coral },
  checkmark: { color: SharedColors.white, fontSize: 12, fontWeight: "700" },
  termsText: { flex: 1, fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 20 },
  termsLink: { color: "#1a9e8f", fontWeight: "600", textDecorationLine: "underline" },

  // Create button
  createBtn: { backgroundColor: SharedColors.white, borderRadius: 14, paddingVertical: 15, alignItems: "center", justifyContent: "center", minHeight: 52, marginTop: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
  createBtnText: { color: SharedColors.navy, fontSize: 15, fontWeight: "600" },
  bottomLink: { flexDirection: "row", justifyContent: "center", marginTop: 16, paddingBottom: 8 },
  bottomLinkText: { fontSize: 13, color: "rgba(255,255,255,0.35)" },
  bottomLinkAction: { fontSize: 13, color: "#1a9e8f", fontWeight: "600" },

  // ── Upload Options Modal ──
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  uploadModalContent: {
    backgroundColor: SharedColors.text,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  uploadModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 8,
  },
  uploadModalTitle: { fontSize: 20, fontWeight: "700", color: SharedColors.white },
  uploadModalDesc: { fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 8 },
  uploadOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  uploadOptionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(26,158,143,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadOptionTitle: { fontSize: 15, fontWeight: "600", color: SharedColors.white, marginBottom: 2 },
  uploadOptionDesc: { fontSize: 12, color: "rgba(255,255,255,0.45)" },
  uploadCancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  uploadCancelText: { fontSize: 15, color: "rgba(255,255,255,0.5)", fontWeight: "500" },

  // ── Country Picker Modal ──
  countryModalContent: { backgroundColor: SharedColors.text, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "60%", paddingBottom: 30 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: SharedColors.white },
  modalClose: { fontSize: 20, color: "rgba(255,255,255,0.5)", padding: 4 },
  countryItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, gap: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  countryItemSelected: { backgroundColor: "rgba(26,158,143,0.15)" },
  countryItemFlag: { fontSize: 24 },
  countryItemName: { flex: 1, fontSize: 15, color: SharedColors.white },
  countryItemCode: { fontSize: 15, color: "rgba(255,255,255,0.5)", fontWeight: "500" },
});

