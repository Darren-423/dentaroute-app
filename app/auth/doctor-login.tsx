import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  Dimensions
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { store } from "../../lib/store";

const { width } = Dimensions.get('window');

const T = {
  white: "#ffffff",
  tealDeep: "#064e3b",
  tealMid: "#0f766e",
  tealLight: "#14b8a6",
  coralError: "#ff4d4f",
};

export default function DoctorLoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Animations
  const buttonScale = useSharedValue(1);

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      // Demo mode: skip API, go to dashboard
      await store.setCurrentUser("doctor", email.split("@")[0] || "Doctor");
      setTimeout(() => {
        setLoading(false);
        router.replace("/doctor/dashboard" as any);
      }, 800);
    } catch (err) {
      setError("Something went wrong.");
      setLoading(false);
    }
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Premium Background */}
      <LinearGradient
        colors={[T.tealDeep, T.tealMid, T.tealLight]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />


      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top + 20, 60), paddingBottom: Math.max(insets.bottom + 20, 40) }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <Animated.View entering={FadeInDown.duration(600).delay(100)}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && { opacity: 0.7 }
              ]}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="arrow-back" size={24} color={T.white} />
            </Pressable>
          </Animated.View>

          {/* Header */}
          <Animated.View entering={FadeInDown.duration(800).delay(200)} style={styles.header}>
            <View style={styles.iconBadge}>
              <Ionicons name="medkit" size={28} color={T.white} />
            </View>
            <Text style={styles.title}>Provider Portal</Text>
            <Text style={styles.subtitle}>Sign in to manage your practice</Text>
          </Animated.View>

          {/* Error Banner */}
          {error ? (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={T.coralError} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </Animated.View>
          ) : null}

          {/* Form Area */}
          <View style={styles.formArea}>
            {/* Email */}
            <Animated.View entering={FadeInDown.duration(700).delay(300)} style={styles.fieldGroup}>
              <Text style={styles.label}>EMAIL</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="doctor@clinic.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(""); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </Animated.View>

            {/* Password */}
            <Animated.View entering={FadeInDown.duration(700).delay(400)} style={styles.fieldGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { paddingRight: 50 }]}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(""); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <Pressable
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="rgba(255,255,255,0.7)" />
                </Pressable>
              </View>
            </Animated.View>

            {/* Forgot Password */}
            <Animated.View entering={FadeInDown.duration(700).delay(500)}>
              <Pressable style={({ pressed }) => [styles.forgotBtn, pressed && { opacity: 0.6 }]}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </Animated.View>
          </View>

          <View style={{ flex: 1, minHeight: 40 }} />

          {/* Sign In Button */}
          <Animated.View entering={FadeInDown.duration(800).delay(600)}>
            <Animated.View style={buttonAnimatedStyle}>
              <Pressable
                style={({ pressed }) => [
                  styles.signInBtnWrapper,
                  loading && { opacity: 0.6 }
                ]}
                onPressIn={() => { buttonScale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
                onPressOut={() => { buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
                onPress={handleLogin}
                disabled={loading}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.signInGradient}
                />
                {loading ? (
                  <ActivityIndicator color={T.white} size="small" />
                ) : (
                  <Text style={styles.signInBtnText}>Sign in</Text>
                )}
                {!loading && <Ionicons name="arrow-forward" size={20} color={T.white} style={{ marginLeft: 8 }} />}
              </Pressable>
            </Animated.View>
          </Animated.View>

          {/* Create Account Link */}
          <Animated.View entering={FadeInDown.duration(800).delay(700)} style={styles.bottomLink}>
            <Text style={styles.bottomLinkText}>New clinic? </Text>
            <Pressable
              onPress={() => router.push("/auth/doctor-create-account" as any)}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.bottomLinkAction}>Join DentaRoute</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#064e3b', // Fallback
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  header: {
    marginBottom: 32,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: T.white,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "400",
    lineHeight: 22,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgba(255,77,79,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,77,79,0.3)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  errorBannerText: {
    color: T.coralError,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
  formArea: {
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    overflow: 'hidden',
    height: 56,
  },
  inputIcon: {
    paddingLeft: 16,
    paddingRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: T.white,
    paddingRight: 16,
  },
  eyeBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  forgotText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "500",
  },
  signInBtnWrapper: {
    flexDirection: 'row',
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  signInGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  signInBtnText: {
    color: T.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  bottomLink: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    paddingBottom: 20,
  },
  bottomLinkText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  bottomLinkAction: {
    fontSize: 14,
    color: T.white,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});

