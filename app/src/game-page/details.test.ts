import { expect, it } from "vitest";
import { gameTitle, playedSummary, resumedFrom, savedSummary } from "./details";

it.each([
  ["Pokemon - Emerald Version (USA, Europe)", "Pokemon - Emerald Version"],
  ["Pokemon - Crystal Version (USA, Europe) (Rev 1) [!]", "Pokemon - Crystal Version"],
  ["Pokemon Radical Red", "Pokemon Radical Red"],
  ["Pokemon (Fire) Red Hack", "Pokemon (Fire) Red Hack"],
  ["(USA)", "(USA)"],
])("titles %s as %s", (name, title) => {
  expect(gameTitle(name)).toBe(title);
});

const day = 24 * 60 * 60 * 1000;

it("sums up when the game was last played and for how long", () => {
  const now = Date.UTC(2026, 9, 5);

  const summary = playedSummary({ lastPlayed: now - 2 * day, playTime: 14.5 * 3600 }, now);

  expect(summary).toMatch(/2 days ago/);
  expect(summary).toMatch(/14 h/);
});

it("counts short play in minutes", () => {
  const now = Date.UTC(2026, 9, 5);

  expect(playedSummary({ lastPlayed: now - 5 * 60_000, playTime: 25 * 60 }, now)).toMatch(/25 min/);
});

it("says nothing for a game never played", () => {
  expect(playedSummary({ lastPlayed: null, playTime: 0 }, Date.now())).toBeUndefined();
});

it("says how long ago the game saved", () => {
  const now = Date.UTC(2026, 9, 5);

  expect(savedSummary(now - 2 * 3600_000, now)).toBe("Saved 2 hours ago");
  expect(savedSummary(now - 10_000, now)).toBe("Saved just now");
});

const slots = [
  { slot: 3, savedAt: new Date(2026, 9, 6, 14, 12).getTime(), playSinceSave: null, loadable: true },
  { slot: 5, savedAt: new Date(2026, 9, 1, 9, 0).getTime(), playSinceSave: null, loadable: true },
];

it("names the slot the resume point came from and when it was saved", () => {
  expect(resumedFrom(3, slots, new Date(2026, 9, 6, 18))).toMatch(/^From slot 3 · saved Today /);
});

it("names no slot when the resume point didn't come from one", () => {
  expect(resumedFrom(undefined, slots, new Date(2026, 9, 6, 18))).toBeUndefined();
});

it("names no slot once that slot is gone", () => {
  expect(resumedFrom(7, slots, new Date(2026, 9, 6, 18))).toBeUndefined();
});
