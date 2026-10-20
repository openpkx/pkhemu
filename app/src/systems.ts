export const systems = ["gb", "gbc", "gba", "nds", "n64", "3ds", "gc"] as const;

export type System = (typeof systems)[number];

export const systemNames: Record<System, string> = {
  gb: "Game Boy",
  gbc: "Game Boy Color",
  gba: "Game Boy Advance",
  nds: "Nintendo DS",
  n64: "Nintendo 64",
  "3ds": "Nintendo 3DS",
  gc: "Nintendo GameCube",
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
  "3ds": {
    dark: { chip: "#103a36", chipText: "#8fe3d6", pattern: "#4fd1c0" },
    light: { chip: "#d3f2ed", chipText: "#0f5a50", pattern: "#23a08f" },
    hero: "#06332f",
  },
  gc: {
    dark: { chip: "#212b52", chipText: "#b9c7ff", pattern: "#5b7bff" },
    light: { chip: "#e0e6ff", chipText: "#2f4ab8", pattern: "#3a5ce9" },
    hero: "#121c47",
  },
};

export type HandheldWindow = { depth: number };
export type HandheldDisplay = { marginDp: number; radiusDp: number; gapDp: number; windows: HandheldWindow[] };

const oneWindow: HandheldDisplay = { marginDp: 4, radiusDp: 3, gapDp: 0, windows: [{ depth: 1 }] };

// The touchscreen sits almost flush, as on the DS Lite.
const twoWindows: HandheldDisplay = { ...oneWindow, gapDp: 8, windows: [{ depth: 1 }, { depth: 0.5 }] };

export const handheld: Partial<Record<System, HandheldDisplay>> = {
  gb: oneWindow,
  gbc: oneWindow,
  gba: oneWindow,
  nds: twoWindows,
  n64: oneWindow,
  "3ds": twoWindows,
  gc: oneWindow,
};
