import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider } from "@/back/back";
import { parseCalibrations, type Calibrations } from "@/input/calibration";
import { CalibrationsProvider, type CalibrationsHost } from "@/input/calibrations";
import { fakePads } from "@/input/fakePads";
import { buttons, createInput } from "@/input/input";
import { PadNavigation } from "@/pad-navigation/PadNavigation";
import { PreferencesProvider, type Preferences, type PreferencesHost } from "@/preferences/preferences";
import { defaultSkins } from "@/skins";
import { ControlsSettings } from "./ControlsSettings";

const HAT_NEUTRAL = 1.285714;
const HAT_UP = -1;
const HAT_RIGHT = -0.428571;
const HAT_DOWN = 0.142857;
const HAT_LEFT = 0.714286;
const STEPS = 19;
const LEFT_STICK = 15;

const defaults: Preferences = { touchControls: false, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, updateDismissedVersion: 0, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1, playInSilentMode: false, renderer: "automatic", skins: defaultSkins, skinHintSeen: false, screenDepth: true, screenGlass: true, asyncShaders: false, gameCubeResolution: 1 };

let pads: ReturnType<typeof fakePads>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  pads = fakePads();
  Object.defineProperty(navigator, "getGamepads", { configurable: true, value: pads.gamepads });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const connectOddPad = () => pads.connect({ id: "Odd Pad", mapping: "", axes: [0, 0, HAT_NEUTRAL, -1, -1] });
type Pad = ReturnType<typeof connectOddPad>;

async function openSettings(stored?: Calibrations, { withNavigation = false, touchControls = false } = {}) {
  let saved: unknown = stored;
  const host: CalibrationsHost = {
    load: async () => saved,
    save: vi.fn(async (calibrations) => {
      saved = calibrations;
    }),
  };
  let preferences: Partial<Preferences> = { touchControls };
  const preferencesHost: PreferencesHost = {
    load: async () => preferences,
    save: async (next) => {
      preferences = next;
    },
  };
  render(
    <BackProvider>
      <PreferencesProvider host={preferencesHost} defaults={defaults}>
        <CalibrationsProvider host={host}>
          {withNavigation && <PadNavigation input={createInput(pads.gamepads)} />}
          <ControlsSettings />
        </CalibrationsProvider>
      </PreferencesProvider>
    </BackProvider>,
  );
  await act(async () => {});
  return { saved: () => parseCalibrations(saved), save: host.save, preferences: () => preferences };
}

function configure(id: string) {
  fireEvent.click(within(screen.getByRole("group", { name: id })).getByRole("button", { name: "Configure" }));
  act(() => void vi.advanceTimersToNextFrame());
}

const currentStep = () =>
  screen.getAllByRole("listitem").findIndex((row) => row.getAttribute("aria-current") === "step");
const setupOpen = () => screen.queryAllByRole("listitem").length > 0;

async function pressEach(pad: Pad, buttonsToPress: number[]) {
  for (const button of buttonsToPress) pad.press(button);
  await act(async () => {});
}

const range = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i);

async function skipRightStick() {
  for (let i = 0; i < 2; i++) fireEvent.click(screen.getByRole("button", { name: "Skip" }));
  await act(async () => {});
}

it("turns touch controls on", async () => {
  const { preferences } = await openSettings();
  const toggle = screen.getByRole("switch", { name: "Touch controls" });
  expect(toggle.getAttribute("aria-checked")).toBe("false");

  await act(async () => fireEvent.click(toggle));

  expect(toggle.getAttribute("aria-checked")).toBe("true");
  expect(preferences().touchControls).toBe(true);
});

it("shows Stick sensitivity only while touch controls are on", async () => {
  await openSettings();
  expect(screen.queryByRole("radiogroup", { name: "Stick sensitivity" })).toBeNull();

  await act(async () => fireEvent.click(screen.getByRole("switch", { name: "Touch controls" })));

  expect(screen.getByRole("radiogroup", { name: "Stick sensitivity" })).toBeTruthy();
});

it("raises the stick sensitivity", async () => {
  const { preferences } = await openSettings(undefined, { touchControls: true });
  const high = within(screen.getByRole("radiogroup", { name: "Stick sensitivity" })).getByRole("radio", { name: "High" });

  await act(async () => fireEvent.click(high));

  expect(high.getAttribute("aria-checked")).toBe("true");
  expect(preferences().stickSensitivity).toBe(1.5);
});

it("lists connected controllers", async () => {
  connectOddPad();
  pads.connect({ id: "Standard Pad" });
  await openSettings();

  expect(screen.getByRole("group", { name: "Odd Pad" })).toBeTruthy();
  expect(screen.getByRole("group", { name: "Standard Pad" })).toBeTruthy();
});

it("saves a setup that drives the game", async () => {
  const pad = connectOddPad();
  const { saved } = await openSettings();
  configure("Odd Pad");

  pad.flick(2, HAT_UP);
  pad.flick(2, HAT_DOWN);
  pad.flick(2, HAT_LEFT);
  pad.flick(2, HAT_RIGHT);
  for (const button of [1, 2, 0, 3, 4, 5]) pad.press(button);
  pad.flick(3, 1);
  pad.flick(4, 1);
  for (const button of [8, 9, 12]) pad.press(button);
  pad.flick(1, -1);
  pad.flick(0, -1);
  await skipRightStick();

  expect(setupOpen()).toBe(false);
  expect(screen.getByRole("status")).toBeTruthy();
  const input = createInput(pads.gamepads, saved);
  pad.hold(1);
  expect(input.poll(0)).toBe(1 << buttons.a);
  pad.hold();
  pad.move(2, HAT_UP);
  expect(input.poll(16)).toBe(1 << buttons.up);
  pad.move(2, HAT_NEUTRAL);
  pad.move(3, 1);
  expect(input.poll(32)).toBe(1 << buttons.l);
  pad.move(3, -1);
  pad.move(1, 1);
  expect(input.poll(48)).toBe(1 << buttons.down);
});

it("drives the N64 right stick from the right stick steps", async () => {
  const pad = pads.connect({ id: "Odd Pad", mapping: "", axes: [0, 0, 0, 0, 0, 0] });
  const { saved } = await openSettings();
  configure("Odd Pad");
  await pressEach(pad, range(0, LEFT_STICK));
  pad.flick(1, -1);
  pad.flick(0, -1);
  expect(currentStep()).toBe(LEFT_STICK + 2);

  pad.flick(5, -1);
  pad.flick(4, -1);
  await act(async () => {});

  expect(setupOpen()).toBe(false);
  const input = createInput(pads.gamepads, saved, "n64");
  const detach = input.attach(window);
  pad.move(4, 1);
  expect(input.poll(0)).toBe(0);
  expect(input.pollAnalog()).toEqual([0, 0, 0x7fff, 0]);
  detach();
});

it("leaves a pad without a right stick when its steps are skipped", async () => {
  const pad = connectOddPad();
  const { saved } = await openSettings();
  configure("Odd Pad");
  await pressEach(pad, range(0, LEFT_STICK));
  pad.flick(1, -1);
  pad.flick(0, -1);

  await skipRightStick();

  expect(setupOpen()).toBe(false);
  expect(Object.keys(saved().pads["Odd Pad"] ?? {}).filter((step) => step.startsWith("rightStick"))).toEqual([]);
  const input = createInput(pads.gamepads, saved, "n64");
  const detach = input.attach(window);
  pad.move(3, 1);
  input.poll(0);
  expect(input.pollAnalog()).toEqual([0, 0, 0, 0]);
  detach();
});

it("skips a step when a button is held for 2 seconds", async () => {
  const pad = connectOddPad();
  const { saved } = await openSettings();
  configure("Odd Pad");

  pad.hold(16);
  act(() => void vi.advanceTimersByTime(2000));
  pad.hold();
  expect(currentStep()).toBe(1);
  await pressEach(pad, range(0, STEPS - 3));
  await skipRightStick();

  expect(saved().pads["Odd Pad"]?.up).toBeUndefined();
  expect(saved().pads["Odd Pad"]?.down).toEqual({ button: 0 });
});

it("skips a step from the Skip button", async () => {
  const pad = connectOddPad();
  const { saved } = await openSettings();
  configure("Odd Pad");

  fireEvent.click(screen.getByRole("button", { name: "Skip" }));
  expect(currentStep()).toBe(1);
  await pressEach(pad, range(0, STEPS - 3));
  await skipRightStick();

  expect(saved().pads["Odd Pad"]?.up).toBeUndefined();
  expect(saved().pads["Odd Pad"]?.down).toEqual({ button: 0 });
});

it("binds nothing from a press already bound in the same setup", async () => {
  const pad = connectOddPad();
  await openSettings();
  configure("Odd Pad");
  pad.press(5);

  pad.press(5);

  expect(currentStep()).toBe(1);
  expect(screen.getAllByRole("listitem")[0].hasAttribute("data-flash")).toBe(true);
  pad.press(6);
  expect(currentStep()).toBe(2);
});

it("takes a press that arrives as the last one is let go", async () => {
  const pad = connectOddPad();
  await openSettings();
  configure("Odd Pad");

  pad.hold(3);
  pad.hold(4);
  pad.hold();

  expect(currentStep()).toBe(2);
});

it("takes both directions of an axis for opposite steps", async () => {
  const pad = pads.connect({ id: "Odd Pad", mapping: "", axes: [0, 0, 0, 0] });
  await openSettings();
  configure("Odd Pad");

  pad.flick(3, -1);
  act(() => void vi.advanceTimersByTime(100));
  pad.move(3, 1);
  act(() => void vi.advanceTimersByTime(500));
  pad.move(3, 0);

  expect(currentStep()).toBe(2);
});

it("treats the stick's opposite direction as bound", async () => {
  const pad = connectOddPad();
  await openSettings();
  configure("Odd Pad");
  await pressEach(pad, range(0, LEFT_STICK));
  pad.flick(1, -1);
  act(() => void vi.advanceTimersByTime(1000));

  pad.flick(1, 1);

  expect(currentStep()).toBe(LEFT_STICK + 1);
});

const previous: Calibrations = { pads: { "Odd Pad": { east: { button: 7 } } } };

it.each([
  ["Cancel", () => fireEvent.click(screen.getByRole("button", { name: "Cancel" }))],
  ["Escape", () => fireEvent.keyDown(document.body, { key: "Escape" })],
  ["30 seconds without input", () => act(() => void vi.advanceTimersByTime(30_000))],
])("keeps the previous setup after %s", async (_, end) => {
  const pad = connectOddPad();
  const { saved, save } = await openSettings(previous);
  configure("Odd Pad");
  await pressEach(pad, [1, 2, 3]);

  end();
  await act(async () => {});

  expect(setupOpen()).toBe(false);
  expect(save).not.toHaveBeenCalled();
  expect(saved()).toEqual(previous);
});

it("keeps Escape from reaching the screen behind the setup", async () => {
  connectOddPad();
  await openSettings();
  configure("Odd Pad");
  const behind = vi.fn();
  window.addEventListener("keydown", behind);

  fireEvent.keyDown(document.body, { key: "Escape" });
  window.removeEventListener("keydown", behind);

  expect(setupOpen()).toBe(false);
  expect(behind).not.toHaveBeenCalled();
});

it("learns where a trigger rests after its first pull", async () => {
  const pad = pads.connect({ id: "Odd Pad", mapping: "", axes: [0, 0, 0, 0] });
  const { saved } = await openSettings();
  configure("Odd Pad");
  await pressEach(pad, range(0, 10));
  pad.move(3, 1);
  pad.move(3, -1);
  act(() => void vi.advanceTimersByTime(3000));

  await pressEach(pad, range(10, 14));
  pad.flick(1, -1);
  pad.flick(0, -1);
  await skipRightStick();

  expect(setupOpen()).toBe(false);
  expect(saved().pads["Odd Pad"]).toMatchObject({ l2: { axis: 3, direction: 1 }, r2: { button: 10 }, stickUp: { axis: 1, direction: -1 } });
});

it("keeps the settings behind the setup out of reach", async () => {
  connectOddPad();
  await openSettings();
  configure("Odd Pad");
  const row = screen.getByRole("group", { name: "Odd Pad" });

  expect(row.closest("[inert]")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(row.closest("[inert]")).toBeNull();
});

it("ignores other controllers while setting one up", async () => {
  const pad = connectOddPad();
  const other = pads.connect({ id: "Other Pad" });
  await openSettings();
  configure("Odd Pad");

  other.press(3);
  expect(currentStep()).toBe(0);
  pad.press(3);
  expect(currentStep()).toBe(1);
});

it("keeps menus from reacting to the controller being set up", async () => {
  const pad = pads.connect({ id: "Standard Pad" });
  await openSettings(undefined, { withNavigation: true });
  configure("Standard Pad");

  pad.press(0);
  pad.press(1);

  expect(setupOpen()).toBe(true);
  expect(currentStep()).toBe(2);
});

it("resets a controller to its default", async () => {
  connectOddPad();
  const { saved } = await openSettings(previous);

  await act(async () =>
    fireEvent.click(within(screen.getByRole("group", { name: "Odd Pad" })).getByRole("button", { name: "Reset to default" })),
  );

  expect(saved()).toEqual({ pads: {} });
});

const KEY_STEPS = 12;
const keyboard = () => screen.getByRole("group", { name: "Keyboard" });

function tap(code: string, init: KeyboardEventInit = {}) {
  fireEvent.keyDown(document.body, { code, ...init });
  fireEvent.keyUp(document.body, { code, ...init });
}

async function tapEach(codes: string[]) {
  for (const code of codes) tap(code);
  await act(async () => {});
}

function playWith(calibrations: () => Calibrations) {
  const input = createInput(pads.gamepads, calibrations);
  const detach = input.attach(window);
  const held = (...codes: string[]) => {
    for (const code of codes) fireEvent.keyDown(window, { code });
    const mask = input.poll(0);
    for (const code of codes) fireEvent.keyUp(window, { code });
    input.poll(16);
    return mask;
  };
  return { held, detach };
}

const wasd = ["KeyW", "KeyS", "KeyA", "KeyD", "KeyL", "KeyK", "KeyI", "KeyJ", "KeyQ", "KeyE", "Backspace", "Space"];

it("saves a keyboard setup that drives the game", async () => {
  const { saved } = await openSettings();
  configure("Keyboard");

  await tapEach(wasd);

  expect(setupOpen()).toBe(false);
  expect(screen.getByRole("status")).toBeTruthy();
  const { held, detach } = playWith(saved);
  expect(held("KeyL")).toBe(1 << buttons.a);
  expect(held("KeyW", "KeyJ")).toBe((1 << buttons.up) | (1 << buttons.y));
  expect(held("Space")).toBe(1 << buttons.start);
  expect(held("KeyZ")).toBe(0);
  detach();
});

it("asks the keyboard for console buttons only", async () => {
  await openSettings();
  configure("Keyboard");

  expect(screen.getAllByRole("listitem")).toHaveLength(KEY_STEPS);
});

it("shows the keys bound so far", async () => {
  await openSettings();
  configure("Keyboard");

  await tapEach(["KeyW"]);

  expect(screen.getAllByRole("listitem")[0].textContent).toContain("W");
});

const previousKeys: Calibrations = { pads: {}, keyboard: { east: "KeyJ" } };

it.each([
  ["Cancel", () => fireEvent.click(screen.getByRole("button", { name: "Cancel" }))],
  ["Escape", () => fireEvent.keyDown(document.body, { code: "Escape", key: "Escape" })],
  ["30 seconds without input", () => act(() => void vi.advanceTimersByTime(30_000))],
])("keeps the previous keyboard setup after %s", async (_, end) => {
  const { saved, save } = await openSettings(previousKeys);
  configure("Keyboard");
  await tapEach(["KeyW", "KeyS"]);

  end();
  await act(async () => {});

  expect(setupOpen()).toBe(false);
  expect(save).not.toHaveBeenCalled();
  expect(saved()).toEqual(previousKeys);
});

it("leaves Tab and keys pressed with a modifier to the app", async () => {
  await openSettings();
  configure("Keyboard");

  tap("Tab");
  tap("KeyW", { ctrlKey: true });
  tap("KeyW", { metaKey: true });
  tap("KeyW", { altKey: true });

  expect(currentStep()).toBe(0);
  tap("KeyW");
  expect(currentStep()).toBe(1);
});

it("binds nothing from a key held since before the keyboard setup", async () => {
  await openSettings();
  configure("Keyboard");

  fireEvent.keyDown(document.body, { code: "Enter", repeat: true });
  fireEvent.keyUp(document.body, { code: "Enter" });

  expect(currentStep()).toBe(0);
});

it("skips a keyboard step when a key is held for 2 seconds", async () => {
  const { saved } = await openSettings();
  configure("Keyboard");

  fireEvent.keyDown(document.body, { code: "KeyW" });
  for (let i = 0; i < 10; i++) {
    act(() => void vi.advanceTimersByTime(210));
    fireEvent.keyDown(document.body, { code: "KeyW", repeat: true });
  }
  fireEvent.keyUp(document.body, { code: "KeyW" });
  expect(currentStep()).toBe(1);
  await tapEach(wasd.slice(1));

  expect(saved().keyboard?.up).toBeUndefined();
  expect(saved().keyboard?.down).toBe("KeyS");
});

it("binds nothing from a key already bound in the same keyboard setup", async () => {
  await openSettings();
  configure("Keyboard");
  tap("KeyW");

  tap("KeyW");

  expect(currentStep()).toBe(1);
  expect(screen.getAllByRole("listitem")[0].hasAttribute("data-flash")).toBe(true);
});

it("resets the keyboard to its default keys", async () => {
  const { saved } = await openSettings(previousKeys);

  await act(async () => fireEvent.click(within(keyboard()).getByRole("button", { name: "Reset to default" })));

  expect(saved()).toEqual({ pads: {} });
  const { held, detach } = playWith(saved);
  expect(held("KeyZ")).toBe(1 << buttons.a);
  expect(held("KeyJ")).toBe(0);
  detach();
});

it("binds a key let go while a modifier is down", async () => {
  await openSettings();
  configure("Keyboard");

  fireEvent.keyDown(document.body, { code: "KeyW" });
  fireEvent.keyUp(document.body, { code: "KeyW", ctrlKey: true });

  expect(currentStep()).toBe(1);
});

it("cancels the keyboard setup from a key that reads as Escape", async () => {
  const { save } = await openSettings();
  configure("Keyboard");

  fireEvent.keyDown(document.body, { code: "CapsLock", key: "Escape" });
  await act(async () => {});

  expect(setupOpen()).toBe(false);
  expect(save).not.toHaveBeenCalled();
});
