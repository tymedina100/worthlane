// Semantic design tokens. Colors come in a dark and a light palette with
// identical keys — components consume them via useTheme() (see ThemeContext),
// never by importing a palette directly.

export const darkColors = {
  // Forest surfaces keep the mobile and desktop brand consistent.
  bg: "#14251F",
  surface: "#1D322A",
  surfaceAlt: "#294136",
  border: "#41584B",

  // Light sage actions contrast against dark forest surfaces.
  primary: "#D4E7B5",
  primaryDim: "#304A35",

  // Text
  text: "#F5F3EB",
  textMuted: "#BAC7B6",
  textDim: "#A1B39E",

  // Semantic
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",

  // Achievement accent — amber/gold for streaks & milestones
  gold: "#FBBF24",

  // Status colors supplement explicit budget labels; never communicate by color alone.
  budgetSafe: "#22C55E",    // >50% remaining
  budgetCaution: "#F59E0B", // 20-50% remaining
  budgetDanger: "#EF4444",  // <20% remaining

  // Content that must contrast with `primary` (button labels etc.)
  onPrimary: "#14251F",

  white: "#FFFFFF",
  black: "#000000",
};

export type ThemeColors = typeof darkColors;

export const lightColors: ThemeColors = {
  // Warm cream canvas with clear card boundaries.
  bg: "#F6F3EB",
  surface: "#FFFFFF",
  surfaceAlt: "#EDF2E4",
  border: "#C7CEC0",

  // Forest actions support white labels and readable links.
  primary: "#347457",
  primaryDim: "#E3EED7",

  // Muted text retains readable contrast on both canvas and cards.
  text: "#233D34",
  textMuted: "#626D63",
  textDim: "#626D63",

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
  lg: 22,
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
