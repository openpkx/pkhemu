export const systems = ["gb", "gbc", "gba", "nds", "n64"] as const;

export type System = (typeof systems)[number];

export const systemNames: Record<System, string> = {
  gb: "Game Boy",
  gbc: "Game Boy Color",
  gba: "Game Boy Advance",
  nds: "Nintendo DS",
  n64: "Nintendo 64",
};

type ThemeColors = { chip: string; chipText: string; pattern: string };

// Hero grounds keep the GBA ratio of #1e1247 to its chip fill: same hue, lightness × 0.77, saturation × 1.4.
export const systemColors: Record<System, { dark: ThemeColors; light: ThemeColors; hero: string }> = {
  gb: {
    dark: { chip: "#1d3320", chipText: "#b3e0a0", pattern: "#9ad17b" },
    light: { chip: "#dcefd2", chipText: "#2d5a1e", pattern: "#5c9c3e" },
    hero: "#132b16",
  },
  gbc: {
    dark: { chip: "#3d2e12", chipText: "#f5cd85", pattern: "#f0b95a" },
    light: { chip: "#f8e6c4", chipText: "#6b4708", pattern: "#c98a1e" },
    hero: "#362607",
  },
  gba: {
    dark: { chip: "#2a2152", chipText: "#c9b9ff", pattern: "#a48bff" },
    light: { chip: "#e6e0ff", chipText: "#4a2fb8", pattern: "#7c5cff" },
    hero: "#1e1247",
  },
  nds: {
    dark: { chip: "#14304a", chipText: "#9fd8fa", pattern: "#6cc4f5" },
    light: { chip: "#d6ecfa", chipText: "#12507c", pattern: "#2f93d1" },
    hero: "#072542",
  },
  n64: {
    dark: { chip: "#3d1518", chipText: "#f5a3a8", pattern: "#ef6b73" },
    light: { chip: "#fadadc", chipText: "#7c1820", pattern: "#d63a45" },
    hero: "#350a0d",
  },
};

export type HandheldWindow = { depth: number };
export type HandheldDisplay = { marginDp: number; radiusDp: number; gapDp: number; windows: HandheldWindow[] };

const oneWindow: HandheldDisplay = { marginDp: 4, radiusDp: 3, gapDp: 0, windows: [{ depth: 1 }] };

// The DS touchscreen sits almost flush, as on the DS Lite.
export const handheld: Partial<Record<System, HandheldDisplay>> = {
  gb: oneWindow,
  gbc: oneWindow,
  gba: oneWindow,
  nds: { ...oneWindow, gapDp: 8, windows: [{ depth: 1 }, { depth: 0.5 }] },
  n64: oneWindow,
};
