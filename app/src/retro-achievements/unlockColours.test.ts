import { expect, it } from "vitest";
import { skins } from "@/skins";
import { unlockColours } from "./unlockColours";

const skin = (system: keyof typeof skins, id: string) => skins[system].find((skin) => skin.id === id)!;

it("fills with the skin's base and rings with its face", () => {
  expect(unlockColours(skin("gba", "indigo"))).toEqual({ fill: "#3c367c", ring: "#9a9aab", text: "#ffffff", muted: "#cccbdd" });
});

it("darkens a dark skin's fill until its muted text reads", () => {
  expect(unlockColours(skin("gbc", "teal")).fill).toBe("#0b6270");
});

it("lightens a light skin's fill and writes in dark text", () => {
  expect(unlockColours(skin("n64", "gold"))).toMatchObject({ fill: "#c0a260", text: "#16131f" });
});
