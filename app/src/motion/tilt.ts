import { origin, type Point } from "@/fit";
import type { Gravity } from "@/gravity";

export const TILT = {
  neutralSeconds: 3,
  smoothingSeconds: 0.12,
  fullDegrees: 25,
  maxDp: 5,
};

export type Tilt = { at: number; reading: Gravity; neutral: Gravity; shift: Point };

function unit({ x, y, z }: Gravity): Gravity | undefined {
  const length = Math.hypot(x, y, z);
  return length > 0 && Number.isFinite(length) ? { x: x / length, y: y / length, z: z / length } : undefined;
}

function towards(from: Gravity, to: Gravity, seconds: number, timeConstant: number): Gravity {
  const amount = 1 - Math.exp(-seconds / timeConstant);
  return unit({ x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount, z: from.z + (to.z - from.z) * amount }) ?? to;
}

// The image follows the viewer, who moves in the phone's frame as gravity does. Turning about the phone's y axis moves
// them along the screen's x, and turning about its x axis (which points right, with y up the screen) along the screen's y.
function shiftFrom(neutral: Gravity, reading: Gravity): Point {
  const axis = {
    x: neutral.y * reading.z - neutral.z * reading.y,
    y: neutral.z * reading.x - neutral.x * reading.z,
  };
  const sine = Math.hypot(axis.x, axis.y, neutral.x * reading.y - neutral.y * reading.x);
  if (sine === 0) return origin;
  const angle = Math.atan2(sine, neutral.x * reading.x + neutral.y * reading.y + neutral.z * reading.z);
  const scale = ((angle / sine) * TILT.maxDp) / ((TILT.fullDegrees * Math.PI) / 180);
  const shift = { x: axis.y * scale, y: axis.x * scale };
  const length = Math.hypot(shift.x, shift.y);
  return length > TILT.maxDp ? { x: (shift.x * TILT.maxDp) / length, y: (shift.y * TILT.maxDp) / length } : shift;
}

export function tilt(previous: Tilt | undefined, gravity: Gravity, now: number): Tilt | undefined {
  const down = unit(gravity);
  if (!down) return previous;
  if (!previous) return { at: now, reading: down, neutral: down, shift: origin };
  const seconds = Math.max(0, (now - previous.at) / 1000);
  const reading = towards(previous.reading, down, seconds, TILT.smoothingSeconds);
  const neutral = towards(previous.neutral, reading, seconds, TILT.neutralSeconds);
  return { at: now, reading, neutral, shift: shiftFrom(neutral, reading) };
}
