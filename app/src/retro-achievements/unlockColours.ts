import type { Skin } from "@/skins";

export type UnlockColours = { fill: string; ring: string; text: string; muted: string };

const MUTED_ALPHA = 0.74;
const NUDGE = 0.04;
const MOST_NUDGES = 25;

function channels(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function mix(over: string, under: string, alpha: number) {
  const [a, b] = [channels(over), channels(under)];
  return `#${a.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex: string) {
  const [r, g, b] = channels(hex)
    .map((v) => v / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

export function unlockColours({ base, tone, moulded }: Pick<Skin, "base" | "tone" | "moulded">): UnlockColours {
  const text = tone === "light" ? "#16131f" : "#ffffff";
  const away = tone === "light" ? "#ffffff" : "#000000";
  let fill = base;
  for (let step = 1; step <= MOST_NUDGES && contrast(mix(text, fill, MUTED_ALPHA), fill) < 4.5; step++) {
    fill = mix(away, base, step * NUDGE);
  }
  return { fill, ring: moulded.face, text, muted: mix(text, fill, MUTED_ALPHA) };
}
