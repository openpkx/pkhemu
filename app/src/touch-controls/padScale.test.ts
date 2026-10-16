import { expect, it } from "vitest";
import { MAX_PAD_SCALE, padScale } from "./padScale";

it.each([
  [390, 844],
  [375, 667],
  [440, 956],
  [375, 1032],
  [375, 486],
])("keeps phone sizes in a %dx%d portrait window", (width, height) => {
  expect(padScale(width, height)).toBe(1);
});

it.each([
  [844, 390],
  [1210, 834],
  [1376, 1032],
])("keeps phone sizes in a %dx%d landscape window", (width, height) => {
  expect(padScale(width, height)).toBe(1);
});

it("grows in an iPad's portrait window", () => {
  const split = padScale(683, 1032);
  const eleven = padScale(834, 1210);
  expect(split).toBeGreaterThan(1);
  expect(eleven).toBeGreaterThan(split);
  expect(eleven).toBeLessThanOrEqual(MAX_PAD_SCALE);
});

it("stops growing at the cap", () => {
  expect(padScale(1032, 1376)).toBe(MAX_PAD_SCALE);
  expect(padScale(2000, 3000)).toBe(MAX_PAD_SCALE);
});

it("grows no more than a short window allows", () => {
  expect(padScale(1032, 1000)).toBeLessThan(padScale(1032, 1376));
});
