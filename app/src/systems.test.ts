import { expect, it } from "vitest";
import { handheld, systems } from "./systems";

it.each(systems)("gives %s a handheld display", (system) => {
  expect(handheld[system]?.windows.length).toBeGreaterThan(0);
});

it.each(["nds", "3ds"] as const)("sets the %s touchscreen shallower than the top screen, with a hinge between them", (system) => {
  expect(handheld[system]!.windows.map(({ depth }) => depth)).toEqual([1, 0.5]);
  expect(handheld[system]!.gapDp).toBe(8);
});

it.each(["gb", "gbc", "gba"] as const)("gives %s one window at full depth", (system) => {
  expect(handheld[system]!.windows).toEqual([{ depth: 1 }]);
});
