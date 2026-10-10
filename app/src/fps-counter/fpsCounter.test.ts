import { expect, it } from "vitest";
import { createFpsCounter, type Rates } from "./fpsCounter";

function runFor(counter: ReturnType<typeof createFpsCounter>, calls: number, frames: number, start = 0) {
  const reported: Rates[] = [];
  for (let i = 0; i <= calls; i++) {
    const rates = counter.add(frames, start + (i * 1000) / calls);
    if (rates) reported.push(rates);
  }
  return reported;
}

it("reports 60 for 60 single frames over one second", () => {
  expect(runFor(createFpsCounter(), 60, 1)).toEqual([{ fps: 60, drawn: 60 }]);
});

it("counts every frame of a fast-forwarded call", () => {
  expect(runFor(createFpsCounter(), 60, 2)).toEqual([{ fps: 120, drawn: 60 }]);
});

it("draws one frame per call", () => {
  expect(runFor(createFpsCounter(), 120, 2)).toEqual([{ fps: 240, drawn: 120 }]);
});

it("reports nothing before a full second has passed", () => {
  const counter = createFpsCounter();
  const reported = [0, 250, 500, 750, 999].map((now) => counter.add(15, now));

  expect(reported.every((fps) => fps === undefined)).toBe(true);
});

it("leaves time spent paused out of the next reading", () => {
  const counter = createFpsCounter();
  runFor(counter, 30, 1);
  for (let i = 0; i < 15; i++) counter.add(1, 1000 + (i * 1000) / 60);

  counter.reset();

  expect(runFor(counter, 60, 1, 10_000)).toEqual([{ fps: 60, drawn: 60 }]);
});
