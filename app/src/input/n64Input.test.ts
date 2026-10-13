import { afterEach, beforeEach, expect, it } from "vitest";
import type { Calibrations } from "./calibration";
import { bit, buttons, createInput, n64Buttons, type Input } from "./input";

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
    "n64",
  );
  detach = input.attach(window);
});

afterEach(() => detach());

function pad(pressed: number[], axes = [0, 0, 0, 0], { id = "Pad", mapping = "standard" as GamepadMappingType } = {}) {
  pads = [
    {
      id,
      mapping,
      axes,
      buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), touched: false, value: 0 })),
    } as unknown as Gamepad,
  ];
}

function key(type: "keydown" | "keyup", code: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code, cancelable: true }));
}

it.each([
  [0, n64Buttons.a],
  [2, n64Buttons.b],
  [4, buttons.l],
  [5, buttons.r],
  [6, n64Buttons.z],
  [7, n64Buttons.z],
  [9, buttons.start],
  [12, buttons.up],
  [13, buttons.down],
  [14, buttons.left],
  [15, buttons.right],
])("maps standard gamepad button %d for N64 games", (index, button) => {
  pad([index]);

  expect(input.poll(0)).toBe(bit(button));
});

it("sends the left stick to the core's left stick, not the D-pad", () => {
  pad([], [1, 0, 0, 0]);

  expect(input.poll(0)).toBe(0);
  expect(input.pollAnalog()).toEqual([0x7fff, 0, 0, 0]);
});

it("sends the right stick to the core's right stick, for the C buttons", () => {
  pad([], [0, 0, -1, 1]);
  input.poll(0);

  const [, , x, y] = input.pollAnalog();
  expect(x).toBeCloseTo(-0x7fff * Math.SQRT1_2, -1);
  expect(y).toBeCloseTo(0x7fff * Math.SQRT1_2, -1);
});

it("keeps a standard pad's right stick after it's set up", () => {
  calibrations = { pads: { Pad: { south: { button: 1 } } } };
  pad([], [0, 0, 1, 0]);
  input.poll(0);

  expect(input.pollAnalog()).toEqual([0, 0, 0x7fff, 0]);
});

it("reads the right stick from a pad's right stick setup", () => {
  calibrations = {
    pads: {
      Pad: {
        rightStickUp: { axis: 5, direction: -1 },
        rightStickDown: { axis: 5, direction: 1 },
        rightStickLeft: { axis: 4, direction: -1 },
        rightStickRight: { axis: 4, direction: 1 },
      },
    },
  };
  pad([], [0, 0, 1, 1, 0, -1]);

  expect(input.poll(0)).toBe(0);
  expect(input.pollAnalog()).toEqual([0, 0, 0, -0x7fff]);
});

it("ignores sticks resting near the centre", () => {
  pad([], [0.1, -0.1, 0.12, 0]);
  input.poll(0);

  expect(input.pollAnalog()).toEqual([0, 0, 0, 0]);
});

it("reads the stick from a calibrated pad's stick axes", () => {
  calibrations = { pads: { Odd: { stickLeft: { axis: 3, direction: 1 }, stickRight: { axis: 3, direction: -1 } } } };
  pad([], [0, 0, 0, 1], { id: "Odd", mapping: "" });
  input.poll(0);

  expect(input.pollAnalog()).toEqual([-0x7fff, 0, 0, 0]);
});

it("counts a moved stick as gamepad use", () => {
  pad([], [0, -1, 0, 0]);
  input.poll(0);

  expect(input.lastUsed()).toBe("gamepad");
});

it("moves the stick through menus while detached", () => {
  detach();
  pad([], [0, -1, 0, 0]);

  expect(input.poll(0)).toBe(bit(buttons.up));
  expect(input.pollAnalog()).toEqual([0, 0, 0, 0]);
  detach = input.attach(window);
});

it.each([
  ["ArrowUp", [0, -0x7fff, 0, 0]],
  ["ArrowDown", [0, 0x7fff, 0, 0]],
  ["ArrowLeft", [-0x7fff, 0, 0, 0]],
  ["ArrowRight", [0x7fff, 0, 0, 0]],
  ["KeyI", [0, 0, 0, -0x7fff]],
  ["KeyK", [0, 0, 0, 0x7fff]],
  ["KeyJ", [0, 0, -0x7fff, 0]],
  ["KeyL", [0, 0, 0x7fff, 0]],
])("tilts all the way while %s is held", (code, analog) => {
  key("keydown", code);
  expect(input.poll(0)).toBe(0);
  expect(input.pollAnalog()).toEqual(analog);

  key("keyup", code);
  input.poll(16);
  expect(input.pollAnalog()).toEqual([0, 0, 0, 0]);
});

it("keeps a diagonal on keys inside the stick's circle", () => {
  key("keydown", "ArrowUp");
  key("keydown", "ArrowRight");
  input.poll(0);

  const [x, y] = input.pollAnalog();
  expect(x).toBeCloseTo(0x7fff * Math.SQRT1_2, -1);
  expect(y).toBeCloseTo(-0x7fff * Math.SQRT1_2, -1);
});

it.each([
  ["KeyZ", n64Buttons.a],
  ["KeyX", n64Buttons.b],
  ["KeyC", n64Buttons.z],
  ["KeyA", buttons.l],
  ["KeyS", buttons.r],
  ["Enter", buttons.start],
  ["KeyT", buttons.up],
  ["KeyG", buttons.down],
  ["KeyF", buttons.left],
  ["KeyH", buttons.right],
])("holds %s as an N64 button", (code, button) => {
  key("keydown", code);

  expect(input.poll(0)).toBe(bit(button));
  key("keyup", code);
});

it("puts a calibrated keyboard's directions on the stick and keeps its A and B", () => {
  calibrations = { pads: {}, keyboard: { east: "KeyQ", south: "KeyW", up: "KeyE" } };
  key("keydown", "KeyQ");
  key("keydown", "KeyW");
  key("keydown", "KeyE");

  expect(input.poll(0)).toBe(bit(n64Buttons.a) | bit(n64Buttons.b));
  expect(input.pollAnalog()).toEqual([0, -0x7fff, 0, 0]);
});
