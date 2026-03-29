import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { PatientTheme, SharedColors } from "../../constants/theme";
import { store } from "../../lib/store";
const API_URL = "https://concourse-api.onrender.com/api";

export default function PatientCreateAccountScreen() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  // Email 인증
  const [emailCode, setEmailCode] = useState(["", "", "", "", "", ""]);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const emailCodeRefs = useRef<(TextInput | null)[]>([]);

  const updateField = (field: string, value: string | boolean) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
    setApiError("");

    // 이메일 변경되면 인증 리셋
    if (field === "email") {
      setEmailVerified(false);
      setEmailCodeSent(false);
      setEmailCode(["", "", "", "", "", ""]);
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

  // ── 폼 검증 ──
  const validateForm = () => {
    const e: Record<string, string> = {};

    if (!formData.firstName.trim()) e.firstName = "First name is required";
    if (!formData.lastName.trim()) e.lastName = "Last name is required";
    if (!formData.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = "Invalid email format";
    if (!emailVerified) e.email = "Please verify your email";
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
      //     password: formData.password,
      //     role: "patient",
      //   }),
      // });
      // const data = await res.json();
      // if (!res.ok) {
      //   setApiError(data.error || "Registration failed. Please try again.");
      //   return;
      // }

      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      await store.savePatientProfile({
        fullName,
        email: formData.email.trim().toLowerCase(),
      });
      await store.setCurrentUser('patient', fullName);

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
            <ActivityIndicator color={PatientTheme.primary} size="small" />
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
      colors={[...PatientTheme.authGradientAlt]}
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
            accessibilityRole="button"
            accessibilityLabel="Go back"
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
                  accessibilityLabel="First name"
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
                  accessibilityLabel="Last name"
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
                  accessibilityLabel="Email address"
                />
                {!emailVerified && (
                  <TouchableOpacity
                    style={[
                      styles.sendCodeBtn,
                      emailCodeSent && styles.sendCodeBtnResend,
                    ]}
                    onPress={handleSendEmailCode}
                    disabled={emailVerifying}
                    accessibilityRole="button"
                    accessibilityLabel={emailCodeSent ? "Resend email verification code" : "Send email verification code"}
                  >
                    {emailVerifying ? (
                      <ActivityIndicator color={SharedColors.white} size="small" />
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
                accessibilityLabel="Password"
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
                accessibilityLabel="Confirm password"
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
              accessibilityRole="checkbox"
              accessibilityLabel="Agree to Terms of Service and Privacy Policy"
              accessibilityState={{ checked: formData.agreeTerms }}
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
                <Text style={styles.termsLink} onPress={() => router.push("/patient/terms" as any)}>Terms of Service</Text> and{" "}
                <Text style={styles.termsLink} onPress={() => router.push("/patient/privacy-policy" as any)}>Privacy Policy</Text>
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
            accessibilityRole="button"
            accessibilityLabel="Create account"
          >
            {loading ? (
              <ActivityIndicator color={PatientTheme.primary} size="small" />
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
  backArrow: { fontSize: 24, color: SharedColors.white, fontWeight: "600", marginTop: -2 },

  // Header
  header: { marginBottom: 28 },
  emoji: { fontSize: 36, marginBottom: 10 },
  title: { fontSize: 30, fontWeight: "700", color: SharedColors.white, marginBottom: 6 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.45)", fontWeight: "300" },

  // Error banner
  errorBanner: {
    backgroundColor: SharedColors.coralLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorBannerText: { color: SharedColors.coral, fontSize: 12 },

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
    color: SharedColors.white,
  },
  inputError: { borderColor: SharedColors.coral },
  inputVerified: { borderColor: SharedColors.green, backgroundColor: "rgba(22,163,74,0.1)" },
  fieldError: { fontSize: 11, color: SharedColors.coral, marginTop: 2 },
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

  // Email: input + send code button row
  inputWithBtn: { flexDirection: "row", gap: 8, alignItems: "center" },

  // Send code button
  sendCodeBtn: {
    backgroundColor: PatientTheme.primaryMid,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 80,
  },
  sendCodeBtnResend: { backgroundColor: "rgba(255,255,255,0.15)" },
  sendCodeBtnText: { color: SharedColors.white, fontSize: 13, fontWeight: "600" },

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
    color: SharedColors.white,
  },
  codeInputFilled: { borderColor: PatientTheme.primaryMid, backgroundColor: "rgba(92,16,160,0.15)" },
  codeInputVerified: { borderColor: SharedColors.green, backgroundColor: "rgba(22,163,74,0.15)" },

  // Verify button
  verifyBtn: {
    backgroundColor: SharedColors.white,
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 10,
    minWidth: 100,
    alignItems: "center",
  },
  verifyBtnDisabled: { opacity: 0.4 },
  verifyBtnText: { color: PatientTheme.primary, fontSize: 14, fontWeight: "600" },

  // Verified badge
  verifiedBadge: {
    backgroundColor: "rgba(22,163,74,0.15)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.3)",
  },
  verifiedText: { color: SharedColors.green, fontSize: 13, fontWeight: "700" },

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
  checkboxChecked: { backgroundColor: PatientTheme.primaryMid, borderColor: PatientTheme.primaryMid },
  checkboxError: { borderColor: SharedColors.coral },
  checkmark: { color: SharedColors.white, fontSize: 12, fontWeight: "700" },
  termsText: { flex: 1, fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 20 },
  termsLink: { color: PatientTheme.primaryMid, fontWeight: "600", textDecorationLine: "underline" },

  // Create button
  createBtn: {
    backgroundColor: SharedColors.white,
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
  createBtnText: { color: PatientTheme.primary, fontSize: 15, fontWeight: "600" },

  // Bottom link
  bottomLink: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    paddingBottom: 8,
  },
  bottomLinkText: { fontSize: 13, color: "rgba(255,255,255,0.35)" },
  bottomLinkAction: { fontSize: 13, color: PatientTheme.primaryMid, fontWeight: "600" },

});
