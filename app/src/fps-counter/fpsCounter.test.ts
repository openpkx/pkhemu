import { expect, it } from "vitest";
import { createFpsCounter, type Counts, type Rates } from "./fpsCounter";

const none: Counts = { frames: 0, skipped: 0, repeated: 0 };

function runFor(counter: ReturnType<typeof createFpsCounter>, calls: number, each: Partial<Counts>, start = 0, from = none) {
  const reported: Rates[] = [];
  for (let i = 0; i <= calls; i++) {
    const counts = {
      frames: (from.frames + i * (each.frames ?? 1)) >>> 0,
      skipped: from.skipped + i * (each.skipped ?? 0),
      repeated: from.repeated + i * (each.repeated ?? 0),
    };
    const rates = counter.add(counts, start + (i * 1000) / calls);
    if (rates) reported.push(rates);
  }
  return reported;
}

it("reports 60 for 60 single frames over one second", () => {
  expect(runFor(createFpsCounter(), 60, { frames: 1 })).toEqual([{ fps: 60, drawn: 60, skipped: 0, repeated: 0 }]);
});

it("counts every frame run between two drawn", () => {
  expect(runFor(createFpsCounter(), 60, { frames: 2 })).toEqual([{ fps: 120, drawn: 60, skipped: 0, repeated: 0 }]);
});

it("reports the frames skipped and repeated each second", () => {
  expect(runFor(createFpsCounter(), 60, { frames: 1, skipped: 1, repeated: 2 })).toEqual([
    { fps: 60, drawn: 60, skipped: 60, repeated: 120 },
  ]);
});

it("counts across the totals wrapping at 32 bits", () => {
  const from = { frames: 2 ** 32 - 10, skipped: 0, repeated: 0 };

  expect(runFor(createFpsCounter(), 60, { frames: 1 }, 0, from)).toEqual([{ fps: 60, drawn: 60, skipped: 0, repeated: 0 }]);
});

it("reports nothing before a full second has passed", () => {
  const counter = createFpsCounter();
  const reported = [0, 250, 500, 750, 999].map((now, i) => counter.add({ ...none, frames: i * 15 }, now));

  expect(reported.every((rates) => rates === undefined)).toBe(true);
});

it("leaves time spent paused out of the next reading", () => {
  const counter = createFpsCounter();
  runFor(counter, 30, { frames: 1 });
  for (let i = 0; i < 15; i++) counter.add({ ...none, frames: 30 + i }, 1000 + (i * 1000) / 60);

  counter.reset();

  expect(runFor(counter, 60, { frames: 1 }, 10_000, { ...none, frames: 45 })).toEqual([
    { fps: 60, drawn: 60, skipped: 0, repeated: 0 },
  ]);
});
