import {
  HAT_TOLERANCE,
  isPressed,
  STICK_THRESHOLD,
  type PadCalibration,
  type RawInput,
  type StandardButton,
} from "./calibration";

export const setupSteps = [
  "up",
  "down",
  "left",
  "right",
  "east",
  "south",
  "north",
  "west",
  "l1",
  "r1",
  "l2",
  "r2",
  "select",
  "start",
  "guide",
  "stickUp",
  "stickLeft",
] as const satisfies readonly StandardButton[];

export type SetupStep = (typeof setupSteps)[number];
export type StepInputs = Partial<Record<SetupStep, RawInput>>;
export type SetupEvent = { type: "captured" | "skipped" | "idle" } | { type: "duplicate"; of: SetupStep };

export const HOLD_TO_SKIP_MS = 2000;
export const IDLE_MS = 30_000;
// Chrome reads a trigger's axis as 0 until its first pull and as -1 at rest after. An axis that lands
// on the other end after a press and stays there is resting; one that comes back was pressed the other way.
const SETTLE_MS = 2000;
const REST_MS = 1000;
const SETTLED = 0.9;
// A hat reporting as one axis rests outside -1..1; anything else rests inside it, even triggers at -1.
const HAT_REST = 1 + HAT_TOLERANCE;

const opposites: Partial<Record<SetupStep, StandardButton>> = { stickUp: "stickDown", stickLeft: "stickRight" };

function activeInputs(pad: Gamepad, resting: readonly number[], settling?: number) {
  const active: RawInput[] = [];
  for (const [button, { pressed }] of pad.buttons.entries()) if (pressed) active.push({ button });
  for (const [axis, value] of pad.axes.entries()) {
    if (axis === settling) continue;
    const at = resting[axis] ?? 0;
    if (Math.abs(at) > HAT_REST) {
      if (Math.abs(value - at) > HAT_TOLERANCE) active.push({ axis, value });
    } else if (Math.abs(value - at) >= STICK_THRESHOLD && Math.abs(value) >= STICK_THRESHOLD)
      active.push({ axis, direction: value < 0 ? -1 : 1 });
  }
  return active;
}

function sameInput(a: RawInput, b: RawInput) {
  if ("button" in a || "button" in b) return "button" in a && "button" in b && a.button === b.button;
  if (a.axis !== b.axis) return false;
  if ("direction" in a || "direction" in b) return "direction" in a && "direction" in b && a.direction === b.direction;
  return Math.abs(a.value - b.value) < HAT_TOLERANCE;
}

const opposite = (raw: RawInput): RawInput | undefined =>
  "direction" in raw ? { axis: raw.axis, direction: raw.direction === 1 ? -1 : 1 } : undefined;

function calibrationFrom(inputs: StepInputs): PadCalibration {
  const calibration: PadCalibration = { ...inputs };
  for (const step of setupSteps) {
    const other = opposites[step];
    const raw = inputs[step];
    const flipped = raw && opposite(raw);
    if (other && flipped) calibration[other] = flipped;
  }
  return calibration;
}

function stepWith(inputs: StepInputs, raw: RawInput) {
  return setupSteps.find((step) => {
    const bound = inputs[step];
    if (!bound) return false;
    const flipped = opposites[step] && opposite(bound);
    return sameInput(bound, raw) || (!!flipped && sameInput(flipped, raw));
  });
}

export function createPadSetup(restingAxes: readonly number[]) {
  const resting = [...restingAxes];
  let settling: { axis: number; direction: -1 | 1; until: number; oppositeSince?: number } | undefined;
  let step = 0;
  const inputs: StepInputs = {};
  let pressed: { input: RawInput; since: number } | undefined;
  let held: RawInput[] | undefined;
  // The press that opened the setup, and one held to skip, bind nothing when let go.
  let awaitingRelease = true;
  let lastInput: number | undefined;
  let lastFrame: number | undefined;

  const capture = (input: RawInput, now: number): SetupEvent => {
    if ("direction" in input) settling = { axis: input.axis, direction: input.direction, until: now + SETTLE_MS };
    const of = stepWith(inputs, input);
    if (of) return { type: "duplicate", of };
    inputs[setupSteps[step]] = input;
    step++;
    return { type: "captured" };
  };

  const settle = (pad: Gamepad, now: number): RawInput | undefined => {
    if (!settling) return;
    const { axis, direction } = settling;
    const value = pad.axes[axis] ?? 0;
    if (value * direction <= -SETTLED) {
      settling.oppositeSince ??= now;
      if (now - settling.oppositeSince < REST_MS) return;
      resting[axis] = value;
      settling = undefined;
      return;
    }
    const flicked = settling.oppositeSince !== undefined;
    if (flicked || now >= settling.until) settling = undefined;
    if (flicked) return { axis, direction: direction === 1 ? -1 : 1 };
  };

  const skip = () => {
    step++;
    awaitingRelease ||= !!pressed;
    pressed = undefined;
    lastInput = lastFrame;
  };

  return {
    step: (): SetupStep | undefined => setupSteps[step],
    inputs: () => inputs,
    calibration: () => calibrationFrom(inputs),
    skip,

    read(pad: Gamepad, now: number): SetupEvent | undefined {
      lastFrame = now;
      const flicked = settle(pad, now);
      const active = activeInputs(pad, resting, settling?.axis);
      // Android can hold back a release until the next press, so a new press counts even before the last is let go.
      const fresh = held && active.find((input) => !held!.some((before) => sameInput(before, input)));
      held = active;
      if (active.length || flicked || lastInput === undefined) lastInput = now;
      else if (now - lastInput >= IDLE_MS) return { type: "idle" };
      if (flicked && !pressed && !awaitingRelease) return capture(flicked, now);
      if (awaitingRelease && !fresh) {
        awaitingRelease = active.length > 0;
        return;
      }
      awaitingRelease = false;
      if (!pressed) {
        if (active.length) pressed = { input: fresh ?? active[0], since: now };
        return;
      }
      if (isPressed(pad, pressed.input)) {
        if (now - pressed.since < HOLD_TO_SKIP_MS) return;
        skip();
        return { type: "skipped" };
      }
      const { input } = pressed;
      const next = fresh && !("axis" in input && "axis" in fresh && fresh.axis === input.axis) ? fresh : undefined;
      pressed = next && { input: next, since: now };
      awaitingRelease = !next && active.length > 0;
      return capture(input, now);
    },
  };
}
