import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { desktopBackHost } from "@/back/desktopHost";
import { buttons, createInput, type Input } from "@/input/input";
import { useOverlay } from "./overlay";

const GUIDE = 16;

let pads: (Gamepad | null)[];
let input: Input;
let backGesture: (() => void) | undefined;
let stopDesktopHost = () => {};
const onBackGesture = (handler: () => void) => {
  backGesture = handler;
  return () => (backGesture = undefined);
};

beforeEach(() => {
  pads = [];
  backGesture = undefined;
  input = createInput(() => pads);
});

afterEach(() => {
  stopDesktopHost();
  cleanup();
});

function launch() {
  return renderHook(() => useOverlay(input, onBackGesture));
}

function key(code: string, init: KeyboardEventInit = {}) {
  act(() => void window.dispatchEvent(new KeyboardEvent("keydown", { code, cancelable: true, ...init })));
}

function guide(now: number) {
  pads = [
    {
      mapping: "standard",
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === GUIDE, touched: false, value: 0 })),
    } as unknown as Gamepad,
  ];
  act(() => void input.poll(now));
  pads = [];
  act(() => void input.poll(now + 16));
}

function back() {
  act(() => backGesture?.());
}

it("starts playing", () => {
  const { result } = launch();

  expect(result.current.overlay).toBeUndefined();
});

it("opens the pause menu with Esc", () => {
  const { result } = launch();

  key("Escape");

  expect(result.current.overlay).toBe("menu");
});

it("opens the pause menu with Esc on a computer, where Esc is also back", () => {
  stopDesktopHost = desktopBackHost.listen(() => backGesture?.());
  const { result } = launch();

  act(() => void document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true })));

  expect(result.current.overlay).toBe("menu");
});

it("opens and closes the pause menu with Guide", () => {
  const { result } = launch();

  guide(0);
  expect(result.current.overlay).toBe("menu");

  guide(100);
  expect(result.current.overlay).toBeUndefined();
});

it("opens the pause menu with the back gesture and resumes with the next", () => {
  const { result } = launch();

  back();
  expect(result.current.overlay).toBe("menu");

  back();
  expect(result.current.overlay).toBeUndefined();
});

it("goes back from settings to the pause menu", () => {
  const { result } = launch();

  act(() => result.current.show("licences"));
  back();
  expect(result.current.overlay).toBe("settings");

  back();
  expect(result.current.overlay).toBe("menu");
});

it("opens the editor with Cmd+E and leaves its back gesture to it", () => {
  const { result } = launch();

  key("KeyE", { key: "e", metaKey: true });

  expect(result.current.overlay).toBe("editor");
  expect(backGesture).toBeUndefined();
});

it("keeps keys from the game while something is over it", () => {
  const { result } = launch();

  key("Escape");
  key("KeyZ");

  expect(result.current.overlay).toBe("menu");
  expect(input.poll(0)).toBe(0);

  act(() => result.current.show(undefined));
  key("KeyZ");
  expect(input.poll(16)).toBe(1 << buttons.a);
});
