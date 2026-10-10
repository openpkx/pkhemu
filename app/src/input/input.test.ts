import { afterEach, beforeEach, expect, it } from "vitest";
import { buttons, createInput, type Input, type InputEvent } from "./input";

const START = 9;
const SELECT = 8;
const GUIDE = 16;

let pads: (Gamepad | null)[];
let input: Input;
let events: InputEvent[];
let detach: () => void;

beforeEach(() => {
  pads = [];
  events = [];
  input = createInput(() => pads);
  input.onEvent((event) => events.push(event));
  detach = input.attach(window);
});

afterEach(() => detach());

function key(type: "keydown" | "keyup", code: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent(type, { code, cancelable: true, ...init });
  window.dispatchEvent(event);
  return event;
}

function pad(pressed: number[], axes = [0, 0, 0, 0], mapping: GamepadMappingType = "standard") {
  pads = [
    {
      mapping,
      axes,
      buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), touched: false, value: 0 })),
    } as unknown as Gamepad,
  ];
}

it.each([
  ["ArrowUp", buttons.up],
  ["ArrowDown", buttons.down],
  ["ArrowLeft", buttons.left],
  ["ArrowRight", buttons.right],
  ["KeyZ", buttons.a],
  ["KeyX", buttons.b],
  ["KeyC", buttons.x],
  ["KeyV", buttons.y],
  ["KeyA", buttons.l],
  ["KeyS", buttons.r],
  ["Enter", buttons.start],
  ["ShiftLeft", buttons.select],
  ["ShiftRight", buttons.select],
])("holds %s as a game button until it's released", (code, button) => {
  key("keydown", code);
  expect(input.poll(0)).toBe(1 << button);

  key("keyup", code);
  expect(input.poll(16)).toBe(0);
});

it("doesn't lose a key tapped between two frames", () => {
  key("keydown", "KeyZ");
  key("keyup", "KeyZ");

  expect(input.poll(0)).toBe(1 << buttons.a);
  expect(input.poll(16)).toBe(0);
});

it("lets go of keys released while Cmd was held", () => {
  key("keydown", "ArrowLeft");
  key("keydown", "MetaLeft", { key: "Meta", metaKey: true });
  key("keyup", "MetaLeft", { key: "Meta" });
  input.poll(0);

  expect(input.poll(16)).toBe(0);
});

it("holds several keys at once", () => {
  key("keydown", "ArrowRight");
  key("keydown", "KeyZ");

  expect(input.poll(0)).toBe((1 << buttons.right) | (1 << buttons.a));
});

it("keeps game keys from scrolling or moving focus", () => {
  expect(key("keydown", "ArrowDown").defaultPrevented).toBe(true);
  expect(key("keydown", "Enter").defaultPrevented).toBe(true);
  expect(key("keydown", "KeyQ").defaultPrevented).toBe(false);
});

it("lets go of every key when the window loses focus", () => {
  key("keydown", "KeyZ");
  input.poll(0);
  window.dispatchEvent(new Event("blur"));

  expect(input.poll(16)).toBe(0);
});

it.each([
  ["Tab", {}, "fastForward"],
  ["Escape", {}, "pauseMenu"],
  ["KeyE", { key: "e", metaKey: true }, "editor"],
  ["KeyE", { key: "e", ctrlKey: true }, "editor"],
] as const)("sends an event for %s", (code, init, event) => {
  const keydown = key("keydown", code, init);

  expect(events).toEqual([event]);
  expect(keydown.defaultPrevented).toBe(true);
  expect(input.poll(0)).toBe(0);
});

it("sends one event for a held key", () => {
  key("keydown", "Tab");
  key("keydown", "Tab", { repeat: true });

  expect(events).toEqual(["fastForward"]);
});

it("ignores game keys pressed with Cmd or Ctrl", () => {
  key("keydown", "KeyA", { metaKey: true });
  key("keydown", "KeyS", { ctrlKey: true });

  expect(input.poll(0)).toBe(0);
});

it.each([
  [0, buttons.b],
  [1, buttons.a],
  [2, buttons.y],
  [3, buttons.x],
  [4, buttons.l],
  [5, buttons.r],
  [6, buttons.l],
  [7, buttons.r],
  [SELECT, buttons.select],
  [START, buttons.start],
  [12, buttons.up],
  [13, buttons.down],
  [14, buttons.left],
  [15, buttons.right],
])("maps standard gamepad button %d", (index, button) => {
  pad([index]);

  expect(input.poll(0)).toBe(1 << button);
});

it("moves with the left stick", () => {
  pad([], [-0.9, 0.8, 0, 0]);

  expect(input.poll(0)).toBe((1 << buttons.left) | (1 << buttons.down));
});

it("ignores a stick resting near the centre", () => {
  pad([], [0.2, -0.3, 0, 0]);

  expect(input.poll(0)).toBe(0);
});

it("ignores gamepads without the standard layout", () => {
  pad([0], [0, 0, 0, 0], "");

  expect(input.poll(0)).toBe(0);
});

it("combines keyboard and gamepad", () => {
  key("keydown", "KeyZ");
  pad([12]);

  expect(input.poll(0)).toBe((1 << buttons.a) | (1 << buttons.up));
});

it("sends the pause event once when Guide is pressed", () => {
  pad([GUIDE]);
  input.poll(0);
  input.poll(16);
  pad([]);
  input.poll(32);
  pad([GUIDE]);
  input.poll(48);

  expect(events).toEqual(["pauseMenu", "pauseMenu"]);
});

it("sends the pause event after Select+Start is held for a second", () => {
  pad([SELECT, START]);
  input.poll(0);
  input.poll(990);
  expect(events).toEqual([]);

  input.poll(1000);
  input.poll(2500);
  expect(events).toEqual(["pauseMenu"]);
});

it("doesn't press Start in the game while Select+Start is held", () => {
  pad([SELECT, START]);
  expect(input.poll(0)).toBe(1 << buttons.select);
  expect(input.poll(1200)).toBe(1 << buttons.select);

  pad([START]);
  expect(input.poll(1300)).toBe(0);

  pad([]);
  input.poll(1400);
  pad([START]);
  expect(input.poll(1500)).toBe(1 << buttons.start);
});

it("starts the hold over when Select+Start is let go early", () => {
  pad([SELECT, START]);
  input.poll(0);
  pad([SELECT]);
  input.poll(600);
  pad([SELECT, START]);
  input.poll(700);
  input.poll(1500);

  expect(events).toEqual([]);
});

it("leaves A+B+Select+Start to the game for a soft reset", () => {
  pad([0, 1, SELECT, START]);

  expect(input.poll(0)).toBe((1 << buttons.a) | (1 << buttons.b) | (1 << buttons.select) | (1 << buttons.start));
  input.poll(1500);
  expect(events).toEqual([]);
});

it("remembers which input was used last", () => {
  const changes: unknown[] = [];
  input.onLastUsedChange(() => changes.push(input.lastUsed()));
  expect(input.lastUsed()).toBeUndefined();

  key("keydown", "KeyZ");
  pad([1]);
  input.poll(0);
  input.poll(16);
  window.dispatchEvent(Object.assign(new Event("pointerdown"), { pointerType: "touch" }));
  window.dispatchEvent(Object.assign(new Event("pointerdown"), { pointerType: "mouse" }));

  expect(changes).toEqual(["keyboard", "gamepad", "touch"]);
});

it("doesn't count keys the game doesn't use as keyboard use", () => {
  key("keydown", "MetaLeft", { key: "Meta", metaKey: true });
  key("keydown", "KeyQ");

  expect(input.lastUsed()).toBeUndefined();
});

it("doesn't count a gamepad as used until a button is pressed", () => {
  key("keydown", "KeyZ");
  pad([]);
  input.poll(0);

  expect(input.lastUsed()).toBe("keyboard");
});

it("stops listening once detached", () => {
  detach();
  key("keydown", "KeyZ");
  key("keyup", "KeyZ");

  expect(input.poll(0)).toBe(0);
  expect(input.lastUsed()).toBeUndefined();
});

it("passes on events sent from elsewhere, like the back gesture", () => {
  input.send("pauseMenu");

  expect(events).toEqual(["pauseMenu"]);
});

it("keeps buttons held before ignoreHeld out of the game until they're let go", () => {
  pad([0, 12]);
  input.ignoreHeld();
  expect(input.poll(0)).toBe(0);

  pad([0, 12, 1]);
  expect(input.poll(16)).toBe(1 << buttons.a);

  pad([12]);
  input.poll(32);
  pad([0, 12]);
  expect(input.poll(48)).toBe(1 << buttons.b);
});

it("ignores a key that starts repeating after it was pressed elsewhere", () => {
  key("keydown", "Enter", { repeat: true });

  expect(input.poll(0)).toBe(0);
});

it("holds touch buttons until they're let go", () => {
  input.touch((1 << buttons.up) | (1 << buttons.a));
  expect(input.poll(0)).toBe((1 << buttons.up) | (1 << buttons.a));

  input.touch(1 << buttons.up);
  expect(input.poll(16)).toBe(1 << buttons.up);
});

it("doesn't lose a touch tapped between two frames", () => {
  input.touch(1 << buttons.b);
  input.touch(0);

  expect(input.poll(0)).toBe(1 << buttons.b);
  expect(input.poll(16)).toBe(0);
});

it("keeps held buttons down through touches until they're released", () => {
  input.hold(1 << buttons.b);
  input.touch(1 << buttons.a);
  input.touch(0);
  expect(input.poll(0)).toBe((1 << buttons.b) | (1 << buttons.a));
  expect(input.poll(16)).toBe(1 << buttons.b);

  input.hold(0);
  expect(input.poll(32)).toBe(0);
});

it("keeps held buttons down when the game resumes from the pause menu", () => {
  input.hold(1 << buttons.b);

  input.ignoreHeld();

  expect(input.poll(0)).toBe(1 << buttons.b);
});

it("lets a touched direction replace the held one until it's let go", () => {
  input.hold((1 << buttons.right) | (1 << buttons.b));

  input.touch(1 << buttons.up);
  expect(input.poll(0)).toBe((1 << buttons.up) | (1 << buttons.b));

  input.touch(0);
  input.poll(16);
  expect(input.poll(32)).toBe((1 << buttons.right) | (1 << buttons.b));
});

it("holds the touch screen where it's pressed until it's let go", () => {
  input.touchScreen({ x: 1, y: 2 });
  expect(input.pollPointer()).toEqual({ x: 1, y: 2 });

  input.touchScreen({ x: 3, y: 4 });
  expect(input.pollPointer()).toEqual({ x: 3, y: 4 });

  input.touchScreen(undefined);
  expect(input.pollPointer()).toBeUndefined();
});

it("doesn't lose a touch screen tap between two frames", () => {
  input.touchScreen({ x: 1, y: 2 });
  input.touchScreen(undefined);

  expect(input.pollPointer()).toEqual({ x: 1, y: 2 });
  expect(input.pollPointer()).toBeUndefined();
});
