import { afterEach, beforeEach, expect, it } from "vitest";
import type { Calibrations } from "./calibration";
import { buttons, createInput, type Input, type InputEvent } from "./input";

let pads: Gamepad[];
let calibrations: Calibrations;
let input: Input;
let events: InputEvent[];
let detach: () => void;

beforeEach(() => {
  pads = [];
  calibrations = { pads: {} };
  events = [];
  input = createInput(
    () => pads,
    () => calibrations,
  );
  input.onEvent((event) => events.push(event));
  detach = input.attach(window);
});

afterEach(() => detach());

const HAT_UP = -1;
const HAT_RIGHT = -0.428571;
const HAT_NEUTRAL = 1.285714;

function pad({
  id = "Odd Pad",
  mapping = "",
  pressed = [],
  axes = [0, 0, HAT_NEUTRAL],
}: {
  id?: string;
  mapping?: GamepadMappingType;
  pressed?: readonly number[];
  axes?: readonly number[];
} = {}) {
  pads = [
    {
      id,
      mapping,
      axes,
      buttons: Array.from({ length: 17 }, (_, i) => ({
        pressed: pressed.includes(i),
        touched: false,
        value: 0,
      })),
    } as unknown as Gamepad,
  ];
}

const oddPad = {
  south: { button: 2 },
  east: { button: 1 },
  west: { button: 3 },
  north: { button: 0 },
  l1: { button: 4 },
  r2: { axis: 4, direction: 1 },
  select: { button: 8 },
  start: { button: 9 },
  guide: { button: 12 },
  up: { axis: 2, value: HAT_UP },
  right: { axis: 2, value: HAT_RIGHT },
  stickLeft: { axis: 0, direction: -1 },
  stickDown: { axis: 1, direction: 1 },
} as const;

it("drives nothing from a pad it can't read", () => {
  pad({ pressed: [0, 1, 2, 3, 12], axes: [-1, 1, HAT_UP] });

  expect(input.poll(0)).toBe(0);
  expect(events).toEqual([]);
});

it.each([
  ["a button", { pressed: [2] }, buttons.b],
  ["another button", { pressed: [1] }, buttons.a],
  ["an axis", { axes: [0, 0, HAT_NEUTRAL, 0, 1] }, buttons.r],
  ["a hat", { axes: [0, 0, HAT_UP] }, buttons.up],
  ["another hat direction", { axes: [0, 0, HAT_RIGHT] }, buttons.right],
  ["the stick", { axes: [-0.8, 0, HAT_NEUTRAL] }, buttons.left],
  ["the stick on another axis", { axes: [0, 0.9, HAT_NEUTRAL] }, buttons.down],
] as const)("drives a console button from %s of a calibrated pad", (_, state, button) => {
  calibrations = { pads: { "Odd Pad": oddPad } };
  pad(state);

  expect(input.poll(0)).toBe(1 << button);
});

it.each([
  ["a standard pad", { mapping: "standard", axes: [0, 0, 1, 1] }, {}],
  [
    "a calibrated pad",
    { axes: [0, 0, HAT_NEUTRAL, 0, 0, -1] },
    { "Odd Pad": { ...oddPad, rightStickUp: { axis: 5, direction: -1 }, rightStickLeft: { axis: 4, direction: -1 } } },
  ],
] as const)("presses no button from the right stick of %s", (_, state, calibrated) => {
  calibrations = { pads: calibrated };
  pad(state);

  expect(input.poll(0)).toBe(0);
});

it("ignores a calibrated stick resting near the centre", () => {
  calibrations = { pads: { "Odd Pad": oddPad } };
  pad({ axes: [-0.3, 0.4, HAT_NEUTRAL, 0, 0.2] });

  expect(input.poll(0)).toBe(0);
});

it("opens the pause menu from a calibrated pad's guide button", () => {
  calibrations = { pads: { "Odd Pad": oddPad } };
  pad({ pressed: [12] });
  input.poll(0);

  expect(events).toEqual(["pauseMenu"]);
});

it("opens the pause menu when a calibrated pad holds Select+Start", () => {
  calibrations = { pads: { "Odd Pad": oddPad } };
  pad({ pressed: [8, 9] });
  input.poll(0);
  input.poll(1000);

  expect(events).toEqual(["pauseMenu"]);
});

it("reads a standard pad through its calibration instead of the default layout", () => {
  calibrations = { pads: { "Odd Pad": { east: { button: 0 } } } };

  pad({ mapping: "standard", pressed: [0] });
  expect(input.poll(0)).toBe(1 << buttons.a);

  pad({ mapping: "standard", pressed: [1, 12] });
  expect(input.poll(16)).toBe(0);
});

it("keeps calibrations to the pad model they were made for", () => {
  calibrations = { pads: { "Other Pad": oddPad } };
  pad({ pressed: [2] });

  expect(input.poll(0)).toBe(0);
});

function key(type: "keydown" | "keyup", code: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code, cancelable: true }));
}

it("uses the keyboard's calibration when there is one", () => {
  calibrations = {
    pads: {},
    keyboard: { east: "KeyJ", south: "KeyK", up: "KeyW" },
  };

  key("keydown", "KeyJ");
  key("keydown", "KeyW");
  expect(input.poll(0)).toBe((1 << buttons.a) | (1 << buttons.up));

  key("keyup", "KeyJ");
  key("keydown", "KeyZ");
  expect(input.poll(16)).toBe(1 << buttons.up);
});

it("opens the pause menu from the keyboard's calibrated guide key", () => {
  calibrations = { pads: {}, keyboard: { guide: "KeyP" } };

  key("keydown", "KeyP");

  expect(events).toEqual(["pauseMenu"]);
  expect(input.poll(0)).toBe(0);
});

it("lets go of keys held when the keyboard's calibration changes", () => {
  key("keydown", "KeyZ");
  input.poll(0);
  calibrations = { pads: {}, keyboard: { east: "KeyJ" } };
  key("keyup", "KeyZ");

  expect(input.poll(16)).toBe(0);
});

function unreadablePresses() {
  const presses: string[] = [];
  input.onUnreadablePad((pad) => presses.push(pad.id));
  return presses;
}

it.each([
  ["a button", { pressed: [3] }],
  ["an axis", { axes: [0, 0, HAT_NEUTRAL, 0, 1] }],
  ["a hat", { axes: [0, 0, HAT_UP] }],
] as const)("tells when a pad it can't read presses %s", (_, state) => {
  const presses = unreadablePresses();
  pad();
  input.poll(0);

  pad(state);
  input.poll(16);
  input.poll(32);

  expect(presses).toEqual(["Odd Pad"]);
});

it("tells again once a pad it can't read lets go and presses again", () => {
  const presses = unreadablePresses();
  pad({ pressed: [3] });
  input.poll(0);
  pad();
  input.poll(16);
  pad({ axes: [0, 0, HAT_UP] });
  input.poll(32);

  expect(presses).toEqual(["Odd Pad", "Odd Pad"]);
});

it("doesn't count where a pad's axes rest as a press", () => {
  const presses = unreadablePresses();
  pad({ axes: [0, 0, HAT_NEUTRAL, -1, -1] });
  input.poll(0);
  input.poll(16);

  expect(presses).toEqual([]);
});

it.each([
  ["standard", "standard", {}],
  ["calibrated", "", { "Odd Pad": oddPad }],
] as const)("doesn't tell about %s pads", (_, mapping, pads) => {
  calibrations = { pads };
  const presses = unreadablePresses();
  pad({ mapping, pressed: [3], axes: [1, 1, HAT_UP] });
  input.poll(0);

  expect(presses).toEqual([]);
});
