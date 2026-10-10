import { expect, it } from "vitest";
import { createPacer } from "./pacer";

const CORE_FPS = 59.7275;

function framesOver(seconds: number, displayHz: number, pace = createPacer(CORE_FPS)) {
  let frames = 0;
  for (let i = 0; i <= seconds * displayHz; i++) frames += pace((i * 1000) / displayHz);
  return frames;
}

it("runs one frame per refresh on a 60 Hz display", () => {
  const pace = createPacer(CORE_FPS);
  const runs = Array.from({ length: 120 }, (_, i) => pace((i * 1000) / 60));

  expect(runs.every((frames) => frames === 1)).toBe(true);
});

it("still runs one frame after a missed refresh on a 60 Hz display", () => {
  const pace = createPacer(CORE_FPS);
  for (let i = 0; i < 60; i++) pace((i * 1000) / 60);

  expect(pace((61 * 1000) / 60)).toBe(1);
});

it.each([75, 90, 120, 144])("runs at the core's speed on a %d Hz display", (hz) => {
  expect(Math.abs(framesOver(10, hz) - 10 * CORE_FPS)).toBeLessThanOrEqual(2);
});

it("runs at the core's speed on a 50 Hz display", () => {
  expect(Math.abs(framesOver(10, 50) - 10 * CORE_FPS)).toBeLessThanOrEqual(2);
});

it("doesn't race to catch up after a pause", () => {
  const pace = createPacer(CORE_FPS);
  for (let i = 0; i < 60; i++) pace((i * 1000) / 144);

  expect(pace(5000)).toBeLessThanOrEqual(2);
});
