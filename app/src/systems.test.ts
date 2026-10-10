import { expect, it } from "vitest";
import { handheld, systems } from "./systems";

it.each(systems)("gives %s a handheld display", (system) => {
  expect(handheld[system]?.windows.length).toBeGreaterThan(0);
});

it("sets the DS touchscreen shallower than the top screen, with a hinge between them", () => {
  expect(handheld.nds!.windows.map(({ depth }) => depth)).toEqual([1, 0.5]);
  expect(handheld.nds!.gapDp).toBe(8);
});

it.each(["gb", "gbc", "gba"] as const)("gives %s one window at full depth", (system) => {
  expect(handheld[system]!.windows).toEqual([{ depth: 1 }]);
});
