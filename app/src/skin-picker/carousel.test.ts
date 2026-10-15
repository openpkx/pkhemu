import { expect, test } from "vitest";
import { dragged, lands, step, tapped } from "./carousel";

test("wraps around at both ends", () => {
  expect(step(3, 1, 4)).toBe(0);
  expect(step(0, -1, 4)).toBe(3);
  expect(step(1, 1, 4)).toBe(2);
});

test("lands a move released past 40%", () => {
  expect(lands(0.41, 0)).toBe(true);
  expect(lands(0.39, 0)).toBe(false);
});

test("lands a flick short of 40% and springs back from one flung the other way", () => {
  expect(lands(0.1, 0.6)).toBe(true);
  expect(lands(0.6, -0.6)).toBe(false);
});

test("steps back from the left quarter and forward from the right one", () => {
  expect(tapped(20, 400)).toBe(-1);
  expect(tapped(380, 400)).toBe(1);
  expect(tapped(200, 400)).toBe(0);
  expect(tapped(101, 400)).toBe(0);
});

test("pulling left reveals the next skin and pulling right the previous one", () => {
  expect(dragged(100, 400)).toEqual({ direction: 1, progress: 0.25 });
  expect(dragged(-200, 400)).toEqual({ direction: -1, progress: 0.5 });
  expect(dragged(800, 400)).toEqual({ direction: 1, progress: 1 });
  expect(dragged(0, 400)).toEqual({ direction: 0, progress: 0 });
});
