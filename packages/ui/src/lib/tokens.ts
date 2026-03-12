export const corensTokens = {
  colors: {
    background: "#F9F9F8",
    surface: "#FFFFFF",
    surfaceMuted: "#F3F2EF",
    surfaceElevated: "#FFFFFF",
    textPrimary: "#1C1C1E",
    textSecondary: "#6F6F75",
    textTertiary: "#9E9EA5",
    borderSubtle: "#E6E4DE",
    accentPrimary: "#5E5CE6",
    accentPrimaryMuted: "#EFEEFF",
    success: "#34C759",
    warning: "#FF9F0A",
    danger: "#FF3B30",
    beacon: "#BF5AF2"
  },
  radius: {
    control: 12,
    card: 20,
    pill: 999
  },
  spacing: {
    page: 16,
    section: 24
  }
} as const;

export type CorensTokens = typeof corensTokens;
