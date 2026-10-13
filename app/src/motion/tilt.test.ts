import { expect, it } from "vitest";
import type { Point } from "@/fit";
import type { Gravity } from "@/gravity/gravity";
import { handheld } from "@/systems";
import { TILT, tilt, type Tilt } from "./tilt";

const FRAME_MS = 1000 / 60;
const G = 9.81;

// Degrees the top and right edges are raised from lying flat, face up.
function held(top: number, right: number): Gravity {
  const [pitch, roll] = [top, right].map((degrees) => (degrees * Math.PI) / 180);
  return { x: G * Math.sin(roll), y: G * Math.sin(pitch) * Math.cos(roll), z: G * Math.cos(pitch) * Math.cos(roll) };
}

function track() {
  let state: Tilt | undefined;
  let now = 0;
  const shifts: Point[] = [];
  const hold = (seconds: number, reading: (at: number) => Gravity) => {
    for (let at = 0; at < seconds * 1000; at += FRAME_MS) {
      now += FRAME_MS;
      state = tilt(state, reading(at), now);
      shifts.push(state!.shift);
    }
    return state!.shift;
  };
  return { hold, shifts };
}

function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const length = ({ x, y }: Point) => Math.hypot(x, y);

it.each([
  ["flat", 0, 0],
  ["upright", 90, 0],
  ["at 45°", 45, 0],
  ["rolled and pitched", 60, -30],
])("shows no offset once the phone is held still %s", (_, top, right) => {
  const { hold } = track();
  hold(1, () => held(30, 10));

  const shift = hold(25, () => held(top, right));

  expect(length(shift)).toBeLessThan(0.01);
});

it("moves the image right when the right edge comes up, then drifts back while held", () => {
  const { hold } = track();
  hold(10, () => held(45, 0));

  const quick = hold(0.3, (at) => held(45, Math.min(at / 100, 1) * 10));

  expect(quick.x).toBeGreaterThan(1);
  expect(Math.abs(quick.y)).toBeLessThan(quick.x / 5);
  expect(length(hold(15, () => held(45, 10)))).toBeLessThan(0.05);
});

it("moves the image up when the top edge comes up, then drifts back while held", () => {
  const { hold } = track();
  hold(10, () => held(45, 0));

  const quick = hold(0.3, (at) => held(45 + Math.min(at / 100, 1) * 10, 0));

  expect(quick.y).toBeLessThan(-1);
  expect(Math.abs(quick.x)).toBeLessThan(-quick.y / 5);
  expect(length(hold(15, () => held(55, 0)))).toBeLessThan(0.05);
});

it("tilts by up to 5 dp over 25°, settling in 3 seconds", () => {
  expect(TILT).toEqual({ maxDp: 5, fullDegrees: 25, neutralSeconds: 3, smoothingSeconds: 0.12 });
});

it("shifts further than the margin, so the lip covers the game's edge", () => {
  const { hold } = track();
  hold(10, () => held(45, 0));

  const shift = hold(0.5, () => held(45 + TILT.fullDegrees + 10, 0));

  expect(length(shift)).toBeGreaterThan(handheld.gb!.marginDp);
  expect(length(shift)).toBeLessThanOrEqual(TILT.maxDp + 1e-9);
});

it("reaches the maximum at the full tilt from neutral", () => {
  const { hold } = track();
  hold(10, () => held(45, 0));

  const shift = hold(0.5, () => held(45 + TILT.fullDegrees + 10, 0));

  expect(length(shift)).toBeCloseTo(TILT.maxDp, 5);
});

it("never goes past the maximum", () => {
  const { hold, shifts } = track();
  const next = random(1);

  for (let i = 0; i < 40; i++) {
    const [top, right] = [next() * 180 - 90, next() * 180 - 90];
    hold(next() * 0.5, () => held(top, right));
  }

  expect(Math.max(...shifts.map(length))).toBeLessThanOrEqual(TILT.maxDp + 1e-9);
  expect(Math.max(...shifts.map(length))).toBeGreaterThan(TILT.maxDp - 0.01);
});

it("keeps sensor noise around a held tilt under half a dp", () => {
  const { hold, shifts } = track();
  const next = random(7);
  const noisy = () => {
    const { x, y, z } = held(45, 10);
    return { x: x + (next() - 0.5) * 0.8, y: y + (next() - 0.5) * 0.8, z: z + (next() - 0.5) * 0.8 };
  };
  hold(5, noisy);
  shifts.length = 0;

  hold(20, noisy);

  expect(Math.max(...shifts.map(length))).toBeLessThan(0.5);
});

it("ignores a reading with no direction", () => {
  const { hold } = track();
  const before = hold(1, () => held(45, 0));

  expect(tilt(undefined, { x: 0, y: 0, z: 0 }, 0)).toBeUndefined();
  expect(hold(0.1, () => ({ x: 0, y: 0, z: 0 }))).toEqual(before);
});
