import { expect, it } from "vitest";
import { portraitLayout } from "./portraitLayout";
import { systems } from "./systems";

it.each([
  [390, 844],
  [375, 667],
  [360, 640],
  [440, 956],
  [375, 1032],
  [683, 1032],
  [834, 1210],
  [1032, 1376],
])("keeps the portrait layout in a %dx%d window", (width, height) => {
  for (const system of systems) expect(portraitLayout({ width, height }, system)).toBe(true);
});

it.each([
  [375, 486],
  [320, 400],
  [320, 560],
  [375, 600],
  [480, 500],
])("lays a short %dx%d portrait window out as landscape", (width, height) => {
  for (const system of systems) expect(portraitLayout({ width, height }, system)).toBe(false);
});

it.each([
  [440, 600],
  [500, 590],
  [600, 620],
])("keeps a DS in portrait in a short %dx%d window wide enough that its touch screen would shrink clear of the landscape controls", (width, height) => {
  expect(portraitLayout({ width, height }, "nds")).toBe(true);
  for (const system of ["gb", "gbc", "gba", "n64", "3ds"] as const) expect(portraitLayout({ width, height }, system)).toBe(false);
});

it.each([
  [844, 390],
  [1210, 834],
  [600, 480],
])("lays a %dx%d landscape window out as landscape", (width, height) => {
  for (const system of systems) expect(portraitLayout({ width, height }, system)).toBe(false);
});
