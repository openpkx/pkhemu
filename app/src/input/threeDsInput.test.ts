import { afterEach, beforeEach, expect, it } from "vitest";
import type { Calibrations } from "./calibration";
import { bit, buttons, createInput, type Input } from "./input";

let pads: (Gamepad | null)[];
let calibrations: Calibrations;
let input: Input;
let detach: () => void;

beforeEach(() => {
  pads = [];
  calibrations = { pads: {} };
  input = createInput(
    () => pads,
    () => calibrations,
    "3ds",
  );
  detach = input.attach(window);
});

afterEach(() => detach());

function pad(pressed: number[], axes = [0, 0, 0, 0]) {
  pads = [
    {
      id: "Pad",
      mapping: "standard",
      axes,
      buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), touched: false, value: 0 })),
    } as unknown as Gamepad,
  ];
}

function key(type: "keydown" | "keyup", code: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code, cancelable: true }));
}

it.each([
  [0, buttons.b],
  [1, buttons.a],
  [2, buttons.y],
  [3, buttons.x],
  [4, buttons.l],
  [5, buttons.r],
  [8, buttons.select],
  [9, buttons.start],
  [12, buttons.up],
  [15, buttons.right],
])("maps standard gamepad button %d as on the DS", (index, button) => {
  pad([index]);

  expect(input.poll(0)).toBe(bit(button));
});

it("sends the left stick to the circle pad, not the D-pad", () => {
  pad([], [1, 0, 0, 0]);

  expect(input.poll(0)).toBe(0);
  expect(input.pollAnalog()).toEqual([0x7fff, 0, 0, 0]);
});

it("leaves the right stick out, since the core has no C-stick", () => {
  pad([], [0, 0, 1, -1]);

  expect(input.poll(0)).toBe(0);
  expect(input.pollAnalog()).toEqual([0, 0, 0, 0]);
});

it("counts a moved circle pad as gamepad use", () => {
  pad([], [0, -1, 0, 0]);
  input.poll(0);

  expect(input.lastUsed()).toBe("gamepad");
});

it("sends the touch stick to the circle pad", () => {
  input.touchStick(0, -1);
  input.poll(0);

  expect(input.pollAnalog()).toEqual([0, -0x7fff, 0, 0]);
});

it("moves the stick through menus while detached", () => {
  detach();
  pad([], [0, -1, 0, 0]);

  expect(input.poll(0)).toBe(bit(buttons.up));
  expect(input.pollAnalog()).toEqual([0, 0, 0, 0]);
  detach = input.attach(window);
});

it("keeps the arrow keys on the D-pad", () => {
  key("keydown", "ArrowUp");

  expect(input.poll(0)).toBe(bit(buttons.up));
  expect(input.pollAnalog()).toEqual([0, 0, 0, 0]);
  key("keyup", "ArrowUp");
});

it.each([
  ["KeyI", [0, -0x7fff, 0, 0]],
  ["KeyK", [0, 0x7fff, 0, 0]],
  ["KeyJ", [-0x7fff, 0, 0, 0]],
  ["KeyL", [0x7fff, 0, 0, 0]],
])("tilts the circle pad all the way while %s is held", (code, analog) => {
  key("keydown", code);
  expect(input.poll(0)).toBe(0);
  expect(input.pollAnalog()).toEqual(analog);

  key("keyup", code);
  input.poll(16);
  expect(input.pollAnalog()).toEqual([0, 0, 0, 0]);
});

it("keeps the circle pad keys on a calibrated keyboard", () => {
  calibrations = { pads: {}, keyboard: { east: "KeyQ" } };
  key("keydown", "KeyQ");
  key("keydown", "KeyL");

  expect(input.poll(0)).toBe(bit(buttons.a));
  expect(input.pollAnalog()).toEqual([0x7fff, 0, 0, 0]);
});
