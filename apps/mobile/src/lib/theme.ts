// Semantic design tokens. Colors come in a dark and a light palette with
// identical keys — components consume them via useTheme() (see ThemeContext),
// never by importing a palette directly.

export const darkColors = {
  // Backgrounds — deep navy base (premium, trust-inducing)
  bg: "#0B0F1A",
  surface: "#141927",
  surfaceAlt: "#1C2333",
  border: "#252D3D",

  // Brand — emerald green (growth, money, progress)
  primary: "#34D399",
  primaryDim: "#064E3B",

  // Text
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  textDim: "#475569",

  // Semantic
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",

  // Achievement accent — amber/gold for streaks & milestones
  gold: "#FBBF24",

  // Budget states (loss aversion color progression)
  budgetSafe: "#22C55E",    // >50% remaining
  budgetCaution: "#F59E0B", // 20-50% remaining
  budgetDanger: "#EF4444",  // <20% remaining

  // Content that must contrast with `primary` (button labels etc.)
  onPrimary: "#0B0F1A",

  white: "#FFFFFF",
  black: "#000000",
};

export type ThemeColors = typeof darkColors;

export const lightColors: ThemeColors = {
  // Backgrounds — soft off-white, white cards ("clean & calm")
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF2F7",
  border: "#CBD5E1",

  // Brand — deeper emerald for contrast on white
  primary: "#10B981",
  primaryDim: "#D1FAE5",

  // Text — dark slate (darkened for legible contrast on white: textMuted ~7:1,
  // textDim ~4.6:1 — both meet WCAG AA, the previous values did not)
  text: "#0F172A",
  textMuted: "#475569",
  textDim: "#64748B",

  // Semantic — slightly deeper for light backgrounds
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",

  gold: "#D97706",

  budgetSafe: "#16A34A",
  budgetCaution: "#D97706",
  budgetDanger: "#DC2626",

  onPrimary: "#FFFFFF",

  white: "#FFFFFF",
  black: "#000000",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export function makeTypography(colors: ThemeColors) {
  return {
    h1: { fontSize: 32, fontWeight: "700" as const, color: colors.text },
    h2: { fontSize: 24, fontWeight: "700" as const, color: colors.text },
    h3: { fontSize: 20, fontWeight: "600" as const, color: colors.text },
    body: { fontSize: 16, fontWeight: "400" as const, color: colors.text },
    bodySmall: { fontSize: 14, fontWeight: "400" as const, color: colors.textMuted },
    caption: { fontSize: 12, fontWeight: "400" as const, color: colors.textDim },
    label: { fontSize: 14, fontWeight: "600" as const, color: colors.text },
    number: { fontSize: 36, fontWeight: "700" as const, color: colors.text },
    numberLarge: { fontSize: 48, fontWeight: "700" as const, color: colors.text },
  };
}

export type Typography = ReturnType<typeof makeTypography>;
