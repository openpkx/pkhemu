import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HapticsProvider } from "@/haptics/haptics";
import { buttons, createInput, gcButtons, n64Buttons, type Input, type InputEvent } from "@/input/input";
import { PreferencesProvider, type Preferences, type StickSensitivity } from "@/preferences/preferences";
import type { System } from "@/systems";
import { TouchControls } from "./TouchControls";
import { defaultSkins } from "@/skins";

let input: Input;
let events: InputEvent[];
let detach: () => void;
let taps: number;

beforeEach(() => {
  input = createInput(() => []);
  events = [];
  input.onEvent((event) => events.push(event));
  detach = input.attach(window);
  taps = 0;
});

afterEach(() => {
  cleanup();
  detach();
});

async function launch({
  system = "gb" as System,
  touchControls = true,
  fastForwardOn = false,
  stickSensitivity = 1 as StickSensitivity,
  lift = undefined as number | undefined,
} = {}) {
  if (system === "n64" || system === "3ds" || system === "gc") {
    detach();
    input = createInput(() => [], undefined, system);
    detach = input.attach(window);
  }
  const host = { load: async (): Promise<Partial<Preferences>> => ({ touchControls, stickSensitivity }), save: async () => {} };
  const fastForward = { on: fastForwardOn, speed: 1, toggle: vi.fn() } as const;
  render(
    <PreferencesProvider host={host} defaults={{ touchControls: false, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, updateDismissedVersion: 0, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1, playInSilentMode: false, renderer: "automatic", skins: defaultSkins, skinHintSeen: false, screenDepth: true, screenGlass: true, asyncShaders: false, gameCubeResolution: 1 }}>
      <HapticsProvider host={{ tap: () => void taps++ }}>
        <TouchControls input={input} system={system} fastForward={fastForward} lift={lift} />
      </HapticsProvider>
    </PreferencesProvider>,
  );
  await act(async () => {});
  return { fastForward };
}

const bit = (button: number) => 1 << button;

function pointer(type: string, target: Element, pointerId: number, clientX = 0, clientY = 0) {
  fireEvent(target, new PointerEvent(type, { pointerId, pointerType: "touch", clientX, clientY, bubbles: true }));
}

function tapOn(target: Element, pointerId = 1, clientX = 0, clientY = 0) {
  pointer("pointerdown", target, pointerId, clientX, clientY);
  pointer("pointerup", target, pointerId, clientX, clientY);
}

const holdButton = () => screen.getByRole("button", { name: "Hold" });

function stick(name = "Stick") {
  const element = screen.getByLabelText(name);
  element.getBoundingClientRect = () => ({ left: 0, top: 0, width: 120, height: 120 }) as DOMRect;
  return element;
}

const names = () => [...screen.getAllByRole("button"), screen.queryByLabelText("D-pad"), screen.queryByLabelText("Stick"), screen.queryByLabelText("C-stick")].filter(Boolean).map((element) => element!.getAttribute("aria-label"));

function dpad() {
  const element = screen.getByLabelText("D-pad");
  element.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
  return element;
}

const controlsBody = () => screen.getByLabelText("D-pad").closest<HTMLElement>("[style]")!;

it.each(["gb", "n64"] as const)("lifts the %s controls by the lift it's given", async (system) => {
  await launch({ system, lift: 40 });

  expect(controlsBody().style.translate).toBe("0 -40px");
});

it("keeps the controls at the bottom edge without a lift", async () => {
  await launch();

  expect(controlsBody().style.translate).toBe("");
});

it("holds a button while it's touched", async () => {
  await launch();

  pointer("pointerdown", screen.getByRole("button", { name: "A" }), 1);
  expect(input.poll(0)).toBe(bit(buttons.a));
  expect(input.poll(16)).toBe(bit(buttons.a));

  pointer("pointerup", screen.getByRole("button", { name: "A" }), 1);
  expect(input.poll(32)).toBe(0);
});

it.each([
  ["B", buttons.b],
  ["Start", buttons.start],
  ["Select", buttons.select],
])("has %s", async (name, button) => {
  await launch();

  pointer("pointerdown", screen.getByRole("button", { name }), 1);

  expect(input.poll(0)).toBe(bit(button));
});

it("presses the D-pad direction under the finger and follows it as it slides", async () => {
  await launch();

  pointer("pointerdown", dpad(), 1, 95, 50);
  expect(input.poll(0)).toBe(bit(buttons.right));

  pointer("pointermove", dpad(), 1, 50, 5);
  expect(input.poll(16)).toBe(bit(buttons.up));

  pointer("pointerup", dpad(), 1, 50, 5);
  expect(input.poll(32)).toBe(0);
});

it("holds the D-pad and a button together", async () => {
  await launch();

  pointer("pointerdown", dpad(), 1, 50, 95);
  pointer("pointerdown", screen.getByRole("button", { name: "B" }), 2);
  expect(input.poll(0)).toBe(bit(buttons.down) | bit(buttons.b));

  pointer("pointerup", screen.getByRole("button", { name: "B" }), 2);
  expect(input.poll(16)).toBe(bit(buttons.down));
});

it("lets go when the system cancels a touch", async () => {
  await launch();

  pointer("pointerdown", dpad(), 1, 5, 50);
  pointer("pointercancel", dpad(), 1);

  input.poll(0);
  expect(input.poll(16)).toBe(0);
});

it("ignores a mouse moving over the D-pad without pressing", async () => {
  await launch();

  pointer("pointermove", dpad(), 1, 95, 50);

  expect(input.poll(0)).toBe(0);
});

it("has L and R only for GBA games", async () => {
  await launch({ system: "gbc" });
  expect(screen.queryByRole("button", { name: "L" })).toBeNull();
  cleanup();

  await launch({ system: "gba" });
  pointer("pointerdown", screen.getByRole("button", { name: "L" }), 1);
  pointer("pointerdown", screen.getByRole("button", { name: "R" }), 2);
  expect(input.poll(0)).toBe(bit(buttons.l) | bit(buttons.r));
});

it("has X, Y, L and R for DS games", async () => {
  await launch({ system: "nds" });

  pointer("pointerdown", screen.getByRole("button", { name: "X" }), 1);
  pointer("pointerdown", screen.getByRole("button", { name: "Y" }), 2);
  pointer("pointerdown", screen.getByRole("button", { name: "L" }), 3);
  pointer("pointerdown", screen.getByRole("button", { name: "R" }), 4);

  expect(input.poll(0)).toBe(bit(buttons.x) | bit(buttons.y) | bit(buttons.l) | bit(buttons.r));
});

it("has no X or Y for GB games", async () => {
  await launch({ system: "gb" });

  expect(screen.queryByRole("button", { name: "X" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Y" })).toBeNull();
});

it("opens the pause menu", async () => {
  await launch();

  pointer("pointerdown", screen.getByRole("button", { name: "Pause menu" }), 1);

  expect(events).toEqual(["pauseMenu"]);
});

it("toggles fast-forward", async () => {
  const { fastForward } = await launch({ fastForwardOn: true });
  const button = screen.getByRole("button", { name: "Fast-forward" });
  expect(button.getAttribute("aria-pressed")).toBe("true");

  pointer("pointerdown", button, 1);

  expect(fastForward.toggle).toHaveBeenCalledOnce();
});

it("toggles hold mode", async () => {
  await launch();
  expect(holdButton().getAttribute("aria-pressed")).toBe("false");

  tapOn(holdButton());
  expect(holdButton().getAttribute("aria-pressed")).toBe("true");

  tapOn(holdButton());
  expect(holdButton().getAttribute("aria-pressed")).toBe("false");
});

it("holds a button tapped in hold mode until it's tapped again", async () => {
  await launch();
  const b = screen.getByRole("button", { name: "B" });

  tapOn(holdButton());
  tapOn(b);
  expect(input.poll(0)).toBe(bit(buttons.b));
  expect(input.poll(16)).toBe(bit(buttons.b));

  tapOn(b);
  expect(input.poll(32)).toBe(0);
});

it("keeps held buttons down and highlighted after leaving hold mode, until tapped", async () => {
  await launch();
  const b = screen.getByRole("button", { name: "B" });
  tapOn(holdButton());
  tapOn(b);

  tapOn(holdButton());
  expect(input.poll(0)).toBe(bit(buttons.b));
  expect(b.dataset.pressed).toBe("true");

  tapOn(b);
  input.poll(16);
  expect(input.poll(32)).toBe(0);
  expect(b.dataset.pressed).toBe("false");
});

it("presses buttons only while touched outside hold mode", async () => {
  await launch();
  const a = screen.getByRole("button", { name: "A" });

  pointer("pointerdown", a, 1);
  expect(input.poll(0)).toBe(bit(buttons.a));
  pointer("pointerup", a, 1);
  input.poll(16);
  expect(input.poll(32)).toBe(0);
});

it("holds one D-pad direction at a time", async () => {
  await launch();
  tapOn(holdButton());

  tapOn(dpad(), 1, 95, 50);
  expect(input.poll(0)).toBe(bit(buttons.right));

  tapOn(dpad(), 1, 5, 50);
  expect(input.poll(16)).toBe(bit(buttons.left));
});

it("lets a pressed direction replace the held one while touched", async () => {
  await launch();
  tapOn(holdButton());
  tapOn(dpad(), 1, 95, 50);
  tapOn(holdButton());

  pointer("pointerdown", dpad(), 2, 50, 5);
  expect(input.poll(0)).toBe(bit(buttons.up));

  pointer("pointerup", dpad(), 2, 50, 5);
  input.poll(16);
  expect(input.poll(32)).toBe(bit(buttons.right));
});

it("releases held buttons and leaves hold mode when it hides", async () => {
  await launch();
  tapOn(holdButton());
  tapOn(screen.getByRole("button", { name: "B" }));

  act(() => void window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp" })));
  input.poll(0);
  expect(input.poll(16)).toBe(bit(buttons.up));

  act(() => void window.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch" })));
  expect(holdButton().getAttribute("aria-pressed")).toBe("false");
});

it("releases held buttons when the game quits", async () => {
  await launch();
  tapOn(holdButton());
  tapOn(screen.getByRole("button", { name: "B" }));

  cleanup();

  expect(input.poll(0)).toBe(0);
});

it("taps the phone on each press", async () => {
  await launch();

  pointer("pointerdown", screen.getByRole("button", { name: "A" }), 1);
  pointer("pointerdown", dpad(), 2, 95, 50);
  pointer("pointermove", dpad(), 2, 94, 51);
  pointer("pointermove", dpad(), 2, 50, 95);

  expect(taps).toBe(3);
});

it("stays off when the setting is off", async () => {
  await launch({ touchControls: false });

  expect(screen.queryByRole("button", { name: "A" })).toBeNull();
});

it("hides when a keyboard or gamepad is used and comes back on the next touch", async () => {
  await launch();

  act(() => void window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyZ" })));
  expect(screen.queryByRole("button", { name: "A" })).toBeNull();

  act(() => void window.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "mouse" })));
  expect(screen.queryByRole("button", { name: "A" })).toBeNull();

  act(() => void window.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch" })));
  expect(screen.getByRole("button", { name: "A" })).toBeTruthy();
});

it("lets go of held buttons when it hides", async () => {
  await launch();
  pointer("pointerdown", screen.getByRole("button", { name: "A" }), 1);

  act(() => void window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp" })));

  input.poll(0);
  expect(input.poll(16)).toBe(bit(buttons.up));
});

it("ignores right clicks", async () => {
  await launch();

  fireEvent(screen.getByRole("button", { name: "A" }), new PointerEvent("pointerdown", { pointerId: 1, button: 2, bubbles: true }));
  fireEvent(screen.getByRole("button", { name: "Pause menu" }), new PointerEvent("pointerdown", { pointerId: 2, button: 2, bubbles: true }));

  expect(input.poll(0)).toBe(0);
  expect(events).toEqual([]);
});

it("keeps the menu button's tap from clicking the menu it opens", async () => {
  await launch();

  const touchEnd = new Event("touchend", { bubbles: true, cancelable: true });
  fireEvent(screen.getByRole("button", { name: "Pause menu" }), touchEnd);

  expect(touchEnd.defaultPrevented).toBe(true);
});

it.each([
  ["gb", ["Select", "Pause menu", "B", "A", "Hold", "Fast-forward", "Start", "D-pad"]],
  ["gba", ["L", "Select", "Pause menu", "R", "B", "A", "Hold", "Fast-forward", "Start", "D-pad"]],
  ["nds", ["L", "Select", "Pause menu", "R", "X", "Y", "A", "B", "Hold", "Fast-forward", "Start", "D-pad"]],
] as const)("keeps the %s layout", async (system, expected) => {
  await launch({ system });

  expect(names()).toEqual(expected);
});

it("has an N64 layout with a stick, Z and C buttons, and no Select", async () => {
  await launch({ system: "n64" });

  expect(names()).toEqual(["L", "Pause menu", "Start", "R", "Z", "B", "A", "C up", "C left", "C right", "C down", "Hold", "Fast-forward", "D-pad", "Stick"]);
});

it("has a GameCube layout with a stick, a C-stick, Z, X and Y, and no Select", async () => {
  await launch({ system: "gc" });

  expect(names()).toEqual(["L", "Pause menu", "Start", "Z", "R", "Y", "X", "B", "A", "Hold", "Fast-forward", "D-pad", "Stick", "C-stick"]);
});

it.each([
  ["A", gcButtons.a],
  ["B", gcButtons.b],
  ["X", gcButtons.x],
  ["Y", gcButtons.y],
  ["Z", gcButtons.z],
  ["L", gcButtons.l],
  ["R", gcButtons.r],
  ["Start", buttons.start],
])("presses the GameCube's %s", async (name, button) => {
  await launch({ system: "gc" });

  pointer("pointerdown", screen.getByRole("button", { name }), 1);

  expect(input.poll(0)).toBe(bit(button));
});

it("sends the GameCube's C-stick to the core as the right stick, beside the stick", async () => {
  await launch({ system: "gc" });

  pointer("pointerdown", stick(), 1, 60, 60);
  pointer("pointermove", stick(), 1, 100, 60);
  pointer("pointerdown", stick("C-stick"), 2, 60, 60);
  pointer("pointermove", stick("C-stick"), 2, 60, 20);

  expect(input.poll(0)).toBe(0);
  expect(input.pollAnalog()).toEqual([0x7fff, 0, 0, -0x7fff]);

  pointer("pointerup", stick("C-stick"), 2, 60, 20);
  input.poll(16);
  expect(input.pollAnalog()).toEqual([0x7fff, 0, 0, 0]);
});

it("has the DS layout with a circle pad for 3DS games, and no ZL, ZR or C-stick", async () => {
  await launch({ system: "3ds" });

  expect(names()).toEqual(["L", "Select", "Pause menu", "R", "X", "Y", "A", "B", "Hold", "Fast-forward", "Start", "D-pad", "Stick"]);
});

it("sends the 3DS circle pad to the core as the left stick", async () => {
  await launch({ system: "3ds" });

  pointer("pointerdown", stick(), 1, 60, 60);
  pointer("pointermove", stick(), 1, 60, 100);

  expect(input.poll(0)).toBe(0);
  expect(input.pollAnalog()).toEqual([0, 0x7fff, 0, 0]);
});

it.each([
  ["A", n64Buttons.a],
  ["B", n64Buttons.b],
  ["Z", n64Buttons.z],
  ["L", buttons.l],
  ["R", buttons.r],
  ["Start", buttons.start],
])("presses the N64's %s", async (name, button) => {
  await launch({ system: "n64" });

  pointer("pointerdown", screen.getByRole("button", { name }), 1);

  expect(input.poll(0)).toBe(bit(button));
});

it.each([
  ["C up", [0, 0, 0, -0x7fff]],
  ["C down", [0, 0, 0, 0x7fff]],
  ["C left", [0, 0, -0x7fff, 0]],
  ["C right", [0, 0, 0x7fff, 0]],
])("sends %s to the core as the right stick", async (name, analog) => {
  await launch({ system: "n64" });

  pointer("pointerdown", screen.getByRole("button", { name }), 1);

  expect(input.poll(0)).toBe(0);
  expect(input.pollAnalog()).toEqual(analog);
});

it("holds a C button and Z in hold mode", async () => {
  await launch({ system: "n64" });
  tapOn(holdButton());
  tapOn(screen.getByRole("button", { name: "C right" }));
  tapOn(screen.getByRole("button", { name: "Z" }));

  input.poll(0);
  expect(input.poll(16)).toBe(bit(n64Buttons.z));
  expect(input.pollAnalog()).toEqual([0, 0, 0x7fff, 0]);
});

it("doesn't tilt the stick where the thumb lands, even off centre", async () => {
  await launch({ system: "n64" });

  pointer("pointerdown", stick(), 1, 20, 100);

  input.poll(0);
  expect(input.pollAnalog()).toEqual([0, 0, 0, 0]);
});

it("tilts the stick by how far the thumb moves from where it landed", async () => {
  await launch({ system: "n64" });

  pointer("pointerdown", stick(), 1, 20, 100);
  pointer("pointermove", stick(), 1, 60, 100);
  input.poll(0);
  expect(input.pollAnalog()).toEqual([0x7fff, 0, 0, 0]);

  pointer("pointermove", stick(), 1, 20, 80);
  input.poll(16);
  const [x, y] = input.pollAnalog();
  expect(x).toBe(0);
  expect(y).toBeCloseTo(-0x7fff * (0.5 - 0.1) / 0.9, -1);

  pointer("pointerup", stick(), 1, 20, 80);
  input.poll(32);
  expect(input.pollAnalog()).toEqual([0, 0, 0, 0]);
});

it("ignores a small slide inside the stick's dead zone", async () => {
  await launch({ system: "n64" });

  pointer("pointerdown", stick(), 1, 60, 60);
  pointer("pointermove", stick(), 1, 62, 61);

  input.poll(0);
  expect(input.pollAnalog()).toEqual([0, 0, 0, 0]);
});

it("keeps the stick at full tilt past the edge, in a circle", async () => {
  await launch({ system: "n64" });

  pointer("pointerdown", stick(), 1, 60, 60);
  pointer("pointermove", stick(), 1, 160, 160);

  input.poll(0);
  const [x, y] = input.pollAnalog();
  expect(x).toBeCloseTo(0x7fff * Math.SQRT1_2, -1);
  expect(y).toBeCloseTo(0x7fff * Math.SQRT1_2, -1);
});

it.each(["n64", "3ds"] as const)("scales the %s stick's tilt by the sensitivity setting", async (system) => {
  const tiltAt = async (stickSensitivity: StickSensitivity) => {
    await launch({ system, stickSensitivity });
    pointer("pointerdown", stick(), 1, 60, 60);
    pointer("pointermove", stick(), 1, 76, 60);
    input.poll(0);
    const [x] = input.pollAnalog();
    cleanup();
    return x;
  };

  const medium = await tiltAt(1);
  expect(medium).toBeGreaterThan(0);
  expect(await tiltAt(1.5)).toBeCloseTo(medium * 1.5, -1);
  expect(await tiltAt(0.75)).toBeCloseTo(medium * 0.75, -1);
});

it("lets go of the stick when the controls hide", async () => {
  await launch({ system: "n64" });
  pointer("pointerdown", stick(), 1, 60, 60);
  pointer("pointermove", stick(), 1, 100, 60);

  cleanup();

  input.poll(0);
  expect(input.pollAnalog()).toEqual([0, 0, 0, 0]);
});
