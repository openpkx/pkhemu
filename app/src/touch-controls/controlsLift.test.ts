import { expect, it } from "vitest";
import { controlsLift } from "./controlsLift";

it.each([
  [0, 1, 0],
  [-20, 1, 0],
  [100, 1, 50],
  [400, 1, 128],
  [400, 1.4, 179.2],
])("lifts the controls by half of %spx spare at pad scale %s, up to the cap", (spare, scale, lift) => {
  expect(controlsLift(spare, scale)).toBeCloseTo(lift);
});
