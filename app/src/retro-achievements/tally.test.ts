import { expect, it } from "vitest";
import type { Achievement } from "./retroAchievements";
import { earnedLine, rarityText, tallyText } from "./tally";

const achievement = (points: number, earned: Achievement["earned"] = null): Achievement => ({
  id: points,
  title: "Boulder Badge",
  description: "Defeat Brock",
  points,
  badge: "00001",
  earned,
  progress: null,
  rarity: 50,
});

it("counts unlocked achievements and their points", () => {
  const list = [achievement(10, { at: null, hardcore: false }), achievement(25), achievement(5, { at: null, hardcore: true })];

  expect(tallyText(list)).toBe("2/3 · 15 pts");
});

it("says when an achievement unlocked and in which mode", () => {
  const now = new Date(2026, 9, 15, 18, 0);
  const at = new Date(2026, 9, 15, 14, 32).getTime() / 1000;

  expect(earnedLine({ at, hardcore: false }, now)).toMatch(/^Today .*32.* · Softcore$/);
  expect(earnedLine({ at: null, hardcore: true }, now)).toBe("Hardcore");
});

it("rounds the share of players, keeping a decimal under 1%", () => {
  expect(rarityText(62.4)).toBe("62%");
  expect(rarityText(0.42)).toBe("0.4%");
});
