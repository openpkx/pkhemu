import { expect, it } from "vitest";
import { buttons } from "@/input/input";
import { dpadDirection } from "./dpad";

const up = 1 << buttons.up;
const down = 1 << buttons.down;
const left = 1 << buttons.left;
const right = 1 << buttons.right;

it.each([
  [1, 0, right],
  [-1, 0, left],
  [0, -1, up],
  [0, 1, down],
  [0.7, -0.7, up | right],
  [-0.7, 0.7, down | left],
])("points (%d, %d) at the nearest direction", (x, y, mask) => {
  expect(dpadDirection(x, y)).toBe(mask);
});

it("keeps cardinal directions wider than diagonals", () => {
  expect(dpadDirection(1, -0.4)).toBe(right);
  expect(dpadDirection(0.4, 1)).toBe(down);
});

it("presses nothing in the middle", () => {
  expect(dpadDirection(0.1, -0.1)).toBe(0);
});

it("keeps pointing past the edge, so a slide off the D-pad keeps its direction", () => {
  expect(dpadDirection(3, 0)).toBe(right);
});
