/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const PatientTheme = {
  primary: "#4A0080",
  primaryMid: "#5C10A0",
  primaryLight: "#f0e6f6",
  primaryBorder: "#ddd6e8",
  primaryDeep: "#1A002E",
  gradient: ["#3D0070", "#2F0058", "#220040"] as const,
  heroTop: "#7B2FBE",
  heroMid: "#3A0068",
  heroBottom: "#1A002E",
  authGradient: ["#7B2FBE", "#3A0068", "#1A002E"] as const,
  authGradientAlt: ["#4A0080", "#2A0048"] as const,
  accentSoft: "rgba(74,0,128,0.08)",
  accentMid: "rgba(74,0,128,0.15)",
  unreadBg: "rgba(74,0,128,0.07)",
  unreadBorder: "rgba(74,0,128,0.15)",
  dot: "#7c3aed",
};

export const DoctorTheme = {
  primary: "#0F766E",
  primaryMid: "#0D9488",
  primaryLight: "#f0fdfa",
  primaryBorder: "#cddbd9",
  gradient: ["#0A4F4A", "#0F766E", "#14B8A6"] as const,
  primaryForest: "#064e3b",
  primaryDark: "#134e4a",
  primaryDeep: "#0d3d38",
  accentBright: "#14B8A6",
  accentSoft: "rgba(20,184,166,0.08)",
  accentMid: "rgba(20,184,166,0.15)",
  unreadBg: "rgba(20,184,166,0.07)",
  unreadBorder: "rgba(20,184,166,0.15)",
  dot: "#14B8A6",
};

export const SharedColors = {
  bg: "#f8fafc",
  white: "#ffffff",
  navy: "#0f172a",
  navySec: "#64748b",
  navyMuted: "#94a3b8",
  text: "#1E293B",
  slate: "#64748b",
  slateLight: "#94a3b8",
  border: "#e2e8f0",
  faint: "#cbd5e1",
  blue: "#2563eb",
  blueLight: "#dbeafe",
  sky: "#0EA5E9",
  skySoft: "rgba(14,165,233,0.12)",
  skySoftStrong: "rgba(14,165,233,0.22)",
  yellow: "#a16207",
  yellowLight: "#fef9c3",
  orange: "#f97316",
  orangeLight: "#fff7ed",
  cream: "#faf8ff",
  green: "#16a34a",
  greenLight: "#dcfce7",
  amber: "#f59e0b",
  amberLight: "#fffbeb",
  red: "#ef4444",
  redLight: "#fef2f2",
  coralError: "#ff4d4f",
  coral: "#e05a3a",
  coralLight: "#fef2ee",
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
