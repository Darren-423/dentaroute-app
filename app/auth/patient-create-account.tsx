import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

const API_URL = "https://concourse-api.onrender.com/api";

// 국가코드 리스트
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

export default function PatientCreateAccountScreen() {
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

  // 국가코드
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

  const updateField = (field: string, value: string | boolean) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
    setApiError("");

    // 이메일이나 폰 변경되면 인증 리셋
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

  // ── 인증코드 입력 핸들러 ──
  const handleCodeInput = (
    value: string,
    index: number,
    codes: string[],
    setCodes: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(TextInput | null)[]>
  ) => {
    // 붙여넣기: 6자리가 한번에 들어온 경우
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newCodes = [...codes];
      digits.forEach((d, i) => {
        if (i < 6) newCodes[i] = d;
      });
      setCodes(newCodes);
      const nextIndex = Math.min(digits.length, 5);
      refs.current[nextIndex]?.focus();
      return;
    }

    const newCodes = [...codes];
    newCodes[index] = value.replace(/\D/g, "");
    setCodes(newCodes);

    if (value && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyPress = (
    key: string,
    index: number,
    codes: string[],
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

  // ── Email 인증 ──
  const handleSendEmailCode = () => {
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      setErrors({ ...errors, email: "Please enter a valid email first" });
      return;
    }
    setEmailVerifying(true);
    // TODO: 백엔드 API 호출 - POST /api/auth/send-email-code { email }
    setTimeout(() => {
      setEmailCodeSent(true);
      setEmailVerifying(false);
      setEmailCode(["", "", "", "", "", ""]);
    }, 1000);
  };

  const handleVerifyEmail = () => {
    const code = emailCode.join("");
    if (code.length !== 6) return;

    setEmailVerifying(true);
    // TODO: 백엔드 API 호출 - POST /api/auth/verify-email { email, code }
    setTimeout(() => {
      setEmailVerified(true);
      setEmailVerifying(false);
    }, 800);
  };

  // ── Phone 인증 ──
  const handleSendPhoneCode = () => {
    if (!formData.phone.trim() || formData.phone.length < 6) {
      setErrors({ ...errors, phone: "Please enter a valid phone number first" });
      return;
    }
    setPhoneVerifying(true);
    // TODO: 백엔드 API 호출 - POST /api/auth/send-sms-code { phone, countryCode }
    setTimeout(() => {
      setPhoneCodeSent(true);
      setPhoneVerifying(false);
      setPhoneCode(["", "", "", "", "", ""]);
    }, 1000);
  };

  const handleVerifyPhone = () => {
    const code = phoneCode.join("");
    if (code.length !== 6) return;

    setPhoneVerifying(true);
    // TODO: 백엔드 API 호출 - POST /api/auth/verify-sms { phone, code }
    setTimeout(() => {
      setPhoneVerified(true);
      setPhoneVerifying(false);
    }, 800);
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
      // TODO: 실제 API 연동 시 아래 주석 해제
      // const res = await fetch(`${API_URL}/auth/register`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
      //     email: formData.email.trim().toLowerCase(),
      //     phone: `${selectedCountry.code}${formData.phone.trim()}`,
      //     password: formData.password,
      //     role: "patient",
      //   }),
      // });
      // const data = await res.json();
      // if (!res.ok) {
      //   setApiError(data.error || "Registration failed. Please try again.");
      //   return;
      // }

      router.replace("/patient/basic-info" as any);
    } catch (err) {
      setApiError("Cannot connect to server. Please check your internet.");
    } finally {
      setLoading(false);
    }
  };

  // ── 인증코드 입력 UI 컴포넌트 ──
  const renderCodeInputs = (
    codes: string[],
    setCodes: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(TextInput | null)[]>,
    verified: boolean,
    verifying: boolean,
    onVerify: () => void
  ) => (
    <View style={styles.codeSection}>
      <View style={styles.codeRow}>
        {codes.map((digit, i) => (
          <TextInput
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            style={[
              styles.codeInput,
              digit ? styles.codeInputFilled : null,
              verified ? styles.codeInputVerified : null,
            ]}
            value={digit}
            onChangeText={(v) => handleCodeInput(v, i, codes, setCodes, refs)}
            onKeyPress={({ nativeEvent }) =>
              handleCodeKeyPress(nativeEvent.key, i, codes, setCodes, refs)
            }
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            editable={!verified}
          />
        ))}
      </View>
      {!verified ? (
        <TouchableOpacity
          style={[
            styles.verifyBtn,
            codes.join("").length !== 6 && styles.verifyBtnDisabled,
          ]}
          onPress={onVerify}
          disabled={codes.join("").length !== 6 || verifying}
        >
          {verifying ? (
            <ActivityIndicator color="#4A0080" size="small" />
          ) : (
            <Text style={styles.verifyBtnText}>Verify</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedText}>✓ Verified</Text>
        </View>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={["#4A0080", "#2A0048"]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>🙋</Text>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Start your dental journey</Text>
          </View>

          {/* API Error */}
          {apiError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>❌ {apiError}</Text>
            </View>
          ) : null}

          {/* ── Form ── */}
          <View style={styles.formArea}>

            {/* ━━━ Name Row ━━━ */}
            <View style={styles.nameRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>FIRST NAME</Text>
                <TextInput
                  style={[styles.input, errors.firstName && styles.inputError]}
                  placeholder="John"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={formData.firstName}
                  onChangeText={(v) => updateField("firstName", v)}
                  editable={!loading}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>LAST NAME</Text>
                <TextInput
                  style={[styles.input, errors.lastName && styles.inputError]}
                  placeholder="Smith"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={formData.lastName}
                  onChangeText={(v) => updateField("lastName", v)}
                  editable={!loading}
                />
              </View>
            </View>
            {/* Name 에러 */}
            {(errors.firstName || errors.lastName) ? (
              <Text style={styles.fieldError}>
                ⚠️ {errors.firstName || errors.lastName}
              </Text>
            ) : null}
            {/* 여권 이름 안내 */}
            <View style={styles.passportNotice}>
              <Text style={styles.passportIcon}>🛂</Text>
              <Text style={styles.passportText}>
                Your name must match your passport name
              </Text>
            </View>

            {/* ━━━ Email + Verify ━━━ */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <View style={styles.inputWithBtn}>
                <TextInput
                  style={[
                    styles.input,
                    { flex: 1 },
                    errors.email && styles.inputError,
                    emailVerified && styles.inputVerified,
                  ]}
                  placeholder="your@email.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={formData.email}
                  onChangeText={(v) => updateField("email", v)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading && !emailVerified}
                />
                {!emailVerified && (
                  <TouchableOpacity
                    style={[
                      styles.sendCodeBtn,
                      emailCodeSent && styles.sendCodeBtnResend,
                    ]}
                    onPress={handleSendEmailCode}
                    disabled={emailVerifying}
                  >
                    {emailVerifying ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.sendCodeBtnText}>
                        {emailCodeSent ? "Resend" : "Send Code"}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              {errors.email && !emailCodeSent ? (
                <Text style={styles.fieldError}>⚠️ {errors.email}</Text>
              ) : null}
            </View>

            {/* Email 인증코드 입력 */}
            {emailCodeSent && (
              <View style={styles.verifySection}>
                <Text style={styles.verifyLabel}>
                  Enter the 6-digit code sent to your email
                </Text>
                {renderCodeInputs(
                  emailCode,
                  setEmailCode,
                  emailCodeRefs,
                  emailVerified,
                  emailVerifying,
                  handleVerifyEmail
                )}
              </View>
            )}

            {/* ━━━ Phone + Country Code + Verify ━━━ */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PHONE NUMBER</Text>
              <View style={styles.phoneRow}>
                {/* 국가코드 드롭다운 */}
                <TouchableOpacity
                  style={styles.countryCodeBtn}
                  onPress={() => setShowCountryPicker(true)}
                  disabled={phoneVerified}
                >
                  <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryCodeText}>{selectedCountry.code}</Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>

                {/* 전화번호 입력 */}
                <TextInput
                  style={[
                    styles.input,
                    { flex: 1 },
                    errors.phone && styles.inputError,
                    phoneVerified && styles.inputVerified,
                  ]}
                  placeholder="Phone number"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={formData.phone}
                  onChangeText={(v) => updateField("phone", v.replace(/\D/g, ""))}
                  keyboardType="phone-pad"
                  editable={!loading && !phoneVerified}
                />

                {/* Send Code 버튼 */}
                {!phoneVerified && (
                  <TouchableOpacity
                    style={[
                      styles.sendCodeBtn,
                      phoneCodeSent && styles.sendCodeBtnResend,
                    ]}
                    onPress={handleSendPhoneCode}
                    disabled={phoneVerifying}
                  >
                    {phoneVerifying ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.sendCodeBtnText}>
                        {phoneCodeSent ? "Resend" : "Send"}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              {errors.phone && !phoneCodeSent ? (
                <Text style={styles.fieldError}>⚠️ {errors.phone}</Text>
              ) : null}
            </View>

            {/* Phone 인증코드 입력 */}
            {phoneCodeSent && (
              <View style={styles.verifySection}>
                <Text style={styles.verifyLabel}>
                  Enter the 6-digit code sent to your phone
                </Text>
                {renderCodeInputs(
                  phoneCode,
                  setPhoneCode,
                  phoneCodeRefs,
                  phoneVerified,
                  phoneVerifying,
                  handleVerifyPhone
                )}
              </View>
            )}

            {/* ━━━ Password ━━━ */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="Min. 8 characters"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={formData.password}
                onChangeText={(v) => updateField("password", v)}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
              {errors.password ? (
                <Text style={styles.fieldError}>⚠️ {errors.password}</Text>
              ) : (
                <Text style={styles.helpText}>💡 Use a strong password</Text>
              )}
            </View>

            {/* ━━━ Confirm Password ━━━ */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <TextInput
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                placeholder="Re-enter password"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={formData.confirmPassword}
                onChangeText={(v) => updateField("confirmPassword", v)}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
              {errors.confirmPassword ? (
                <Text style={styles.fieldError}>⚠️ {errors.confirmPassword}</Text>
              ) : null}
            </View>

            {/* ━━━ Terms ━━━ */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => updateField("agreeTerms", !formData.agreeTerms)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  formData.agreeTerms && styles.checkboxChecked,
                  errors.agreeTerms && styles.checkboxError,
                ]}
              >
                {formData.agreeTerms ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : null}
              </View>
              <Text style={styles.termsText}>
                I agree to the{" "}
                <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
            {errors.agreeTerms ? (
              <Text style={[styles.fieldError, { marginLeft: 30 }]}>
                ⚠️ {errors.agreeTerms}
              </Text>
            ) : null}
          </View>

          {/* ── Create Account Button ── */}
          <TouchableOpacity
            style={[styles.createBtn, loading && { opacity: 0.6 }]}
            onPress={handleCreateAccount}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#4A0080" size="small" />
            ) : (
              <Text style={styles.createBtnText}>Create Account →</Text>
            )}
          </TouchableOpacity>

          {/* Sign In Link */}
          <View style={styles.bottomLink}>
            <Text style={styles.bottomLinkText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.bottomLinkAction}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Country Code Picker Modal ── */}
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCountryPicker(false)}
        >
          <View style={styles.modalContent}>
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
                  style={[
                    styles.countryItem,
                    selectedCountry.country === item.country &&
                      selectedCountry.code === item.code &&
                      styles.countryItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryPicker(false);
                  }}
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Back
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },

  // Header
  header: { marginBottom: 28 },
  emoji: { fontSize: 36, marginBottom: 10 },
  title: { fontSize: 30, fontWeight: "700", color: "#ffffff", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.45)", fontWeight: "300" },

  // Error banner
  errorBanner: {
    backgroundColor: "#fef2ee",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorBannerText: { color: "#e05a3a", fontSize: 12 },

  // Form
  formArea: { gap: 16 },
  nameRow: { flexDirection: "row", gap: 12 },
  fieldGroup: { gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: "#ffffff",
  },
  inputError: { borderColor: "#e05a3a" },
  inputVerified: { borderColor: "#16a34a", backgroundColor: "rgba(22,163,74,0.1)" },
  fieldError: { fontSize: 11, color: "#e05a3a", marginTop: 2 },
  helpText: { fontSize: 11, color: "rgba(255,255,255,0.4)" },

  // Passport notice
  passportNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  passportIcon: { fontSize: 16 },
  passportText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "500",
    flex: 1,
  },

  // Email/Phone: input + send code button row
  inputWithBtn: { flexDirection: "row", gap: 8, alignItems: "center" },
  phoneRow: { flexDirection: "row", gap: 8, alignItems: "center" },

  // Send code button
  sendCodeBtn: {
    backgroundColor: "#5C10A0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 80,
  },
  sendCodeBtnResend: { backgroundColor: "rgba(255,255,255,0.15)" },
  sendCodeBtnText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },

  // Country code
  countryCodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  countryFlag: { fontSize: 18 },
  countryCodeText: { color: "#ffffff", fontSize: 14, fontWeight: "500" },
  dropdownArrow: { color: "rgba(255,255,255,0.4)", fontSize: 8, marginLeft: 2 },

  // Verification section
  verifySection: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  verifyLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 14,
    textAlign: "center",
  },
  codeSection: { alignItems: "center", gap: 14 },
  codeRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  codeInput: {
    width: 42,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
  },
  codeInputFilled: { borderColor: "#5C10A0", backgroundColor: "rgba(92,16,160,0.15)" },
  codeInputVerified: { borderColor: "#16a34a", backgroundColor: "rgba(22,163,74,0.15)" },

  // Verify button
  verifyBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 10,
    minWidth: 100,
    alignItems: "center",
  },
  verifyBtnDisabled: { opacity: 0.4 },
  verifyBtnText: { color: "#4A0080", fontSize: 14, fontWeight: "600" },

  // Verified badge
  verifiedBadge: {
    backgroundColor: "rgba(22,163,74,0.15)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.3)",
  },
  verifiedText: { color: "#16a34a", fontSize: 13, fontWeight: "700" },

  // Terms
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: "#5C10A0", borderColor: "#5C10A0" },
  checkboxError: { borderColor: "#e05a3a" },
  checkmark: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  termsText: { flex: 1, fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 20 },
  termsLink: { color: "#5C10A0", fontWeight: "600", textDecorationLine: "underline" },

  // Create button
  createBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  createBtnText: { color: "#4A0080", fontSize: 15, fontWeight: "600" },

  // Bottom link
  bottomLink: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    paddingBottom: 8,
  },
  bottomLinkText: { fontSize: 13, color: "rgba(255,255,255,0.35)" },
  bottomLinkAction: { fontSize: 13, color: "#5C10A0", fontWeight: "600" },

  // ── Country Picker Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "60%",
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#ffffff" },
  modalClose: { fontSize: 20, color: "rgba(255,255,255,0.5)", padding: 4 },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  countryItemSelected: { backgroundColor: "rgba(92,16,160,0.15)" },
  countryItemFlag: { fontSize: 24 },
  countryItemName: { flex: 1, fontSize: 15, color: "#ffffff" },
  countryItemCode: { fontSize: 15, color: "rgba(255,255,255,0.5)", fontWeight: "500" },
});
