
import { colors } from "./colors"

export const lightTheme = {
  background: colors.neutral.background,
  surface: colors.neutral.surface,
  card: colors.neutral.surface,
  text: colors.neutral.text.primary,
  mutedText: colors.neutral.text.muted,
  border: colors.neutral.border,
  primary: colors.brand.primary,
  secondary: colors.brand.secondary,
  accent: colors.brand.accent,
  success: colors.feedback.success,
  warning: colors.feedback.warning,
  error: colors.feedback.error,
}

export const darkTheme = {
  background: "#3C2F2F",         // dark coffee
  surface: "#4B3B3B",            // slightly lighter cards
  card: "#4B3B3B",
  text: "#FFF8F2",               // light cream
  mutedText: "#D9CFC4",          // muted lighter
  border: "#5A4B42",             // subtle dark border
  primary: "#D9A066",            // inverted soft caramel
  secondary: "#7F5A42",          // coffee accent
  accent: "#A3CFA3",             // calm green accent
  success: "#3AA76D",
  warning: "#E6B855",
  error: "#D94F3D",
}
