// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { systemColors, systems } from "@/systems";

const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");

function tokens(selector: string) {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const themes = { light: tokens(":root"), dark: tokens(':root[data-theme="dark"]') };

const pairs = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "muted"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["destructive", "background"],
  ["destructive", "card"],
  ["success", "background"],
  ["success", "card"],
  ["warning", "background"],
  ["warning", "card"],
  ["background", "destructive"],
  ["background", "success"],
  ["background", "warning"],
  ["pad-foreground", "pad"],
  ["pad-foreground", "pad-pressed"],
  ["pad-face-foreground", "pad-face"],
  ["pad-face-foreground", "pad-face-pressed"],
];

for (const [theme, values] of Object.entries(themes)) {
  for (const [text, ground] of pairs) {
    it(`reads --${text} on --${ground} at 4.5:1 in ${theme}`, () => {
      expect(contrast(values[text], values[ground])).toBeGreaterThanOrEqual(4.5);
    });
  }
}

for (const system of systems) {
  for (const theme of ["dark", "light"] as const) {
    it(`reads the ${system} chip at 4.5:1 in ${theme}`, () => {
      const { chip, chipText } = systemColors[system][theme];
      expect(contrast(chipText, chip)).toBeGreaterThanOrEqual(4.5);
    });
  }
  for (const text of ["hero-text", "hero-version"]) {
    it(`reads --${text} at 4.5:1 on the ${system} hero ground`, () => {
      expect(contrast(themes.light[text], systemColors[system].hero)).toBeGreaterThanOrEqual(4.5);
    });
  }
}

it("reads --overlay-warning at 4.5:1 on --overlay", () => {
  expect(contrast(themes.light["overlay-warning"], themes.light.overlay)).toBeGreaterThanOrEqual(4.5);
});
