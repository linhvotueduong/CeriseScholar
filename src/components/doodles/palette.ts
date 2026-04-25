/** Shared design palette — single source of truth for all decoration components */
export const palette = {
  cream: "#fefefe",
  ink: "#1a1208",
  inkMuted: "#7a6a5a",
  inkFaint: "#9a8a7a",
  cerise: "#c0392b",
  gold: "#c8a84b",
  rule: "#e0d8d0",
  cardBorder: "#d4cdc5",
  surface: "#fdfcfa",
  warmSurface: "#faf7f0",
} as const;

export type Palette = typeof palette;
