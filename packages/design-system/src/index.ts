export const tokens = {
  colors: {
    ink: "#000000",
    canvas: "#080808",
    panel: "#111111",
    primary: "#1e3a5f",
    primaryDark: "#0d1f38",
    accent: "#1e3a5f",
    mint: "#1a2e4a",
    line: "#222222",
    text: "#f0f0f0",
    muted: "#666666",
    success: "#1a8a52",
    warning: "#c9920a",
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

