export const tokens = {
  colors: {
    ink: "#08111f",
    canvas: "#f7f1e7",
    panel: "#fffdf8",
    primary: "#2563eb",
    primaryDark: "#173ea5",
    accent: "#ff7a18",
    mint: "#0ea5a4",
    line: "#d8d0c4",
    text: "#1e293b",
    muted: "#6b7280",
    success: "#167c48",
    warning: "#b25a00",
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 28,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
  },
} as const;

export type DesignTokens = typeof tokens;

