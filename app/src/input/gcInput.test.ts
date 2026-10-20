import { afterEach, beforeEach, expect, it } from "vitest";
import type { Calibrations } from "./calibration";
import { bit, buttons, createInput, gcButtons, type Input } from "./input";

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
    "gc",
  );
  detach = input.attach(window);
});

afterEach(() => detach());

function pad(
  pressed: number[],
  { axes = [0, 0, 0, 0], values = {}, id = "Pad", mapping = "standard" as GamepadMappingType } = {} as {
    axes?: number[];
    values?: Record<number, number>;
    id?: string;
    mapping?: GamepadMappingType;
  },
) {
  pads = [
    {
      id,
      mapping,
      axes,
      buttons: Array.from({ length: 17 }, (_, i) => ({
        pressed: pressed.includes(i),
        touched: false,
        value: values[i] ?? (pressed.includes(i) ? 1 : 0),
      })),
    } as unknown as Gamepad,
  ];
}

function key(type: "keydown" | "keyup", code: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code, cancelable: true }));
}

it.each([
  [1, gcButtons.a],
  [0, gcButtons.b],
  [3, gcButtons.x],
  [2, gcButtons.y],
  [5, gcButtons.z],
  [6, gcButtons.l],
  [7, gcButtons.r],
  [9, buttons.start],
  [12, buttons.up],
  [13, buttons.down],
  [14, buttons.left],
  [15, buttons.right],
])("maps standard gamepad button %d for GameCube games", (index, button) => {
  pad([index]);

  expect(input.poll(0)).toBe(bit(button));
});

it("sends the left stick to the stick and the right stick to the C-stick", () => {
  pad([], { axes: [1, 0, 0, -1] });

  expect(input.poll(0)).toBe(0);
  expect(input.pollAnalog()).toEqual([0x7fff, 0, 0, -0x7fff]);
});

it("sends how far each trigger is pulled, beside its press", () => {
  pad([6, 7], { values: { 6: 0.5, 7: 1 } });

  expect(input.poll(0)).toBe(bit(gcButtons.l) | bit(gcButtons.r));
  expect(input.pollTriggers()).toEqual([0x4000, 0x7fff]);
});

it("sends a trigger pulled too lightly to press as a value alone", () => {
  pad([], { values: { 6: 0.1 } });

  expect(input.poll(0)).toBe(0);
  expect(input.pollTriggers()).toEqual([0xccd, 0]);
});

it("reads a trigger set up as an axis by how far the axis moves", () => {
  calibrations = { pads: { Pad: { l2: { axis: 4, direction: 1 }, r2: { button: 7 } } } };
  pad([7], { axes: [0, 0, 0, 0, 0.75], mapping: "" as GamepadMappingType });

  expect(input.poll(0)).toBe(bit(gcButtons.l) | bit(gcButtons.r));
  expect(input.pollTriggers()).toEqual([0x5fff, 0x7fff]);
});

it("counts a trigger's axis from where it rests once pulled", () => {
  calibrations = { pads: { Pad: { l2: { axis: 4, direction: 1 } } } };
  const at = (value: number) => {
    pad([], { axes: [0, 0, 0, 0, value], mapping: "" as GamepadMappingType });
    input.poll(0);
    return input.pollTriggers()[0];
  };

  expect(at(0)).toBe(0);
  expect(at(-1)).toBe(0);
  expect(at(0)).toBe(0x4000);
  expect(at(1)).toBe(0x7fff);
});

it("lets go of the triggers when the pad does", () => {
  pad([6], { values: { 6: 0.5 } });
  input.poll(0);
  pad([]);
  input.poll(0);

  expect(input.pollTriggers()).toEqual([0, 0]);
});

it("sends no trigger values to menus", () => {
  detach();
  pad([6], { values: { 6: 0.5 } });
  input.poll(0);

  expect(input.pollTriggers()).toEqual([0, 0]);
  detach = input.attach(window);
});

it.each([
  ["KeyZ", gcButtons.a],
  ["KeyX", gcButtons.b],
  ["KeyC", gcButtons.x],
  ["KeyV", gcButtons.y],
  ["KeyA", gcButtons.l],
  ["KeyS", gcButtons.r],
  ["KeyD", gcButtons.z],
  ["Enter", buttons.start],
  ["KeyT", buttons.up],
  ["KeyG", buttons.down],
  ["KeyF", buttons.left],
  ["KeyH", buttons.right],
])("maps %s for GameCube games", (code, button) => {
  key("keydown", code);

  expect(input.poll(0)).toBe(bit(button));
});

it.each([
  ["ArrowRight", [0x7fff, 0, 0, 0]],
  ["ArrowUp", [0, -0x7fff, 0, 0]],
  ["ArrowLeft", [-0x7fff, 0, 0, 0]],
  ["ArrowDown", [0, 0x7fff, 0, 0]],
  ["KeyL", [0, 0, 0x7fff, 0]],
  ["KeyJ", [0, 0, -0x7fff, 0]],
  ["KeyI", [0, 0, 0, -0x7fff]],
  ["KeyK", [0, 0, 0, 0x7fff]],
])("moves a stick with %s", (code, analog) => {
  key("keydown", code);

  expect(input.poll(0)).toBe(0);
  expect(input.pollAnalog()).toEqual(analog);
});

it("keeps the keyboard's set-up shoulders on L and R, and Z on D", () => {
  calibrations = { pads: {}, keyboard: { east: "KeyM", south: "KeyN", l1: "KeyQ", r1: "KeyW" } };

  for (const [code, button] of [
    ["KeyM", gcButtons.a],
    ["KeyN", gcButtons.b],
    ["KeyQ", gcButtons.l],
    ["KeyW", gcButtons.r],
    ["KeyD", gcButtons.z],
  ] as const) {
    key("keydown", code);
    expect(input.poll(0), code).toBe(bit(button));
    key("keyup", code);
  }
});
