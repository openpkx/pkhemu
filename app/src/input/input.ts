import type { Point } from "@/fit";
import type { System } from "@/systems";
import {
  calibrationFor,
  isPressed,
  noCalibrations,
  STICK_THRESHOLD,
  type Calibrations,
  type KeyboardCalibration,
  type RawInput,
  type StandardButton,
} from "./calibration";
import { centred, clampToCircle, tilt, toAxis, type Analog } from "./stick";

export const buttons = {
  b: 0,
  y: 1,
  select: 2,
  start: 3,
  up: 4,
  down: 5,
  left: 6,
  right: 7,
  a: 8,
  x: 9,
  l: 10,
  r: 11,
  l2: 12,
} as const;

// The core reads the RetroPad's B as A, Y as B and L2 as Z. The C buttons and the keyboard's stick sit past the
// RetroPad's 16 bits and reach the core as the right and left sticks.
export const n64Buttons = {
  a: buttons.b,
  b: buttons.y,
  z: buttons.l2,
  cUp: 16,
  cDown: 17,
  cLeft: 18,
  cRight: 19,
  stickUp: 20,
  stickDown: 21,
  stickLeft: 22,
  stickRight: 23,
} as const;

export const connectedGamepads = () => navigator.getGamepads?.() ?? [];

export type InputEvent = "fastForward" | "pauseMenu" | "editor";
export type InputSource = "keyboard" | "gamepad" | "touch";

const keyButtons: Record<string, number> = {
  ArrowUp: buttons.up,
  ArrowDown: buttons.down,
  ArrowLeft: buttons.left,
  ArrowRight: buttons.right,
  KeyZ: buttons.a,
  KeyX: buttons.b,
  KeyC: buttons.x,
  KeyV: buttons.y,
  KeyA: buttons.l,
  KeyS: buttons.r,
  Enter: buttons.start,
  ShiftLeft: buttons.select,
  ShiftRight: buttons.select,
};

const n64CAndDpadKeys: Record<string, number> = {
  KeyI: n64Buttons.cUp,
  KeyK: n64Buttons.cDown,
  KeyJ: n64Buttons.cLeft,
  KeyL: n64Buttons.cRight,
  KeyT: buttons.up,
  KeyG: buttons.down,
  KeyF: buttons.left,
  KeyH: buttons.right,
};

const n64KeyButtons: Record<string, number> = {
  ArrowUp: n64Buttons.stickUp,
  ArrowDown: n64Buttons.stickDown,
  ArrowLeft: n64Buttons.stickLeft,
  ArrowRight: n64Buttons.stickRight,
  KeyZ: n64Buttons.a,
  KeyX: n64Buttons.b,
  KeyC: n64Buttons.z,
  KeyA: buttons.l,
  KeyS: buttons.r,
  Enter: buttons.start,
  ...n64CAndDpadKeys,
};

const keyEvents: Record<string, InputEvent> = {
  Tab: "fastForward",
  Escape: "pauseMenu",
};

// Positional, like the GBA and DS: bottom is B, right is A, north is X and west is Y.
const consoleButtons: Partial<Record<StandardButton, number>> = {
  south: buttons.b,
  east: buttons.a,
  west: buttons.y,
  north: buttons.x,
  l1: buttons.l,
  r1: buttons.r,
  l2: buttons.l,
  r2: buttons.r,
  select: buttons.select,
  start: buttons.start,
  up: buttons.up,
  down: buttons.down,
  left: buttons.left,
  right: buttons.right,
  stickUp: buttons.up,
  stickDown: buttons.down,
  stickLeft: buttons.left,
  stickRight: buttons.right,
};

// R2 would hold the core's C buttons mode, so both triggers press Z.
const n64PadButtons: Partial<Record<StandardButton, number>> = {
  ...consoleButtons,
  l2: n64Buttons.z,
  r2: n64Buttons.z,
  stickUp: undefined,
  stickDown: undefined,
  stickLeft: undefined,
  stickRight: undefined,
};

// A keyboard has no positions, so its keys keep their labels: A is A and B is B.
const n64KeyboardButtons: Partial<Record<StandardButton, number>> = {
  ...n64PadButtons,
  east: n64Buttons.a,
  south: n64Buttons.b,
  north: n64Buttons.z,
  west: undefined,
  up: n64Buttons.stickUp,
  down: n64Buttons.stickDown,
  left: n64Buttons.stickLeft,
  right: n64Buttons.stickRight,
};

const PAD_DEAD_ZONE = 0.15;
const PAUSE_HOLD_MS = 1000;

export const bit = (button: number) => 1 << button;
const SELECT_START = bit(buttons.select) | bit(buttons.start);
const A_OR_B = bit(buttons.a) | bit(buttons.b);
export const DPAD = bit(buttons.up) | bit(buttons.down) | bit(buttons.left) | bit(buttons.right);

function strength(pad: Gamepad, raw: RawInput | undefined) {
  if (!raw) return 0;
  if ("direction" in raw) return Math.max(0, (pad.axes[raw.axis] ?? 0) * raw.direction);
  return isPressed(pad, raw) ? 1 : 0;
}

function readPads(
  pads: readonly (Gamepad | null)[],
  calibrations: Calibrations,
  layout: Partial<Record<StandardButton, number>>,
) {
  let mask = 0;
  let guide = false;
  const left: [number, number] = [0, 0];
  const right: [number, number] = [0, 0];
  for (const pad of pads) {
    const calibration = pad && calibrationFor(pad, calibrations);
    if (!calibration) continue;
    for (const [standard, raw] of Object.entries(calibration) as [StandardButton, RawInput][]) {
      if (!isPressed(pad, raw)) continue;
      const button = layout[standard];
      if (button !== undefined) mask |= bit(button);
      else if (standard === "guide") guide = true;
    }
    const [x, y] = tilt(
      strength(pad, calibration.stickRight) - strength(pad, calibration.stickLeft),
      strength(pad, calibration.stickDown) - strength(pad, calibration.stickUp),
      PAD_DEAD_ZONE,
    );
    left[0] += x;
    left[1] += y;
    // Setup doesn't ask for a right stick, so only a standard pad has one, on axes 2 and 3.
    if (pad.mapping !== "standard") continue;
    const [rx, ry] = tilt(pad.axes[2] ?? 0, pad.axes[3] ?? 0, PAD_DEAD_ZONE);
    right[0] += rx;
    right[1] += ry;
  }
  return { mask, guide, left, right };
}

function n64Analog(mask: number, pads: { left: [number, number]; right: [number, number] }, touch: [number, number]) {
  const on = (button: number) => (mask & bit(button) ? 1 : 0);
  const [leftX, leftY] = clampToCircle(
    pads.left[0] + touch[0] + on(n64Buttons.stickRight) - on(n64Buttons.stickLeft),
    pads.left[1] + touch[1] + on(n64Buttons.stickDown) - on(n64Buttons.stickUp),
  );
  const [rightX, rightY] = clampToCircle(
    pads.right[0] + on(n64Buttons.cRight) - on(n64Buttons.cLeft),
    pads.right[1] + on(n64Buttons.cDown) - on(n64Buttons.cUp),
  );
  return [toAxis(leftX), toAxis(leftY), toAxis(rightX), toAxis(rightY)] satisfies Analog;
}

// A pad's axes rest where they first read, as hats and triggers rest away from 0.
function createUnreadablePressDetector() {
  const seen = new Map<string, { resting: readonly number[]; active: boolean }>();
  return (pads: readonly (Gamepad | null)[], calibrations: Calibrations) => {
    const pressed: Gamepad[] = [];
    for (const pad of pads) {
      if (!pad || calibrationFor(pad, calibrations)) continue;
      const key = `${pad.index}:${pad.id}`;
      const state = seen.get(key) ?? { resting: [...pad.axes], active: false };
      seen.set(key, state);
      const active =
        pad.buttons.some((button) => button.pressed) ||
        pad.axes.some((value, axis) => Math.abs(value - (state.resting[axis] ?? 0)) >= STICK_THRESHOLD);
      if (active && !state.active) pressed.push(pad);
      state.active = active;
    }
    return pressed;
  };
}

function keyboardLayout(calibration: KeyboardCalibration | undefined, n64: boolean) {
  if (!calibration) return { buttons: n64 ? n64KeyButtons : keyButtons, guide: undefined };
  const calibrated: Record<string, number> = n64 ? { ...n64CAndDpadKeys } : {};
  const layout = n64 ? n64KeyboardButtons : consoleButtons;
  for (const [standard, code] of Object.entries(calibration) as [StandardButton, string][]) {
    const button = layout[standard];
    if (button !== undefined) calibrated[code] = button;
  }
  return { buttons: calibrated, guide: calibration.guide };
}

export type Input = ReturnType<typeof createInput>;

export function createInput(
  gamepads: () => readonly (Gamepad | null)[],
  calibrations: () => Calibrations = () => noCalibrations,
  system?: System,
) {
  const n64 = system === "n64";
  let keysHeld = 0;
  let keysTapped = 0;
  let touchHeld = 0;
  let touchTapped = 0;
  let heldButtons = 0;
  let pointerHeld: Point | undefined;
  let pointerTapped: Point | undefined;
  let padHeld = 0;
  let guideHeld = false;
  let pauseHeldSince: number | undefined;
  let pauseSent = false;
  let startHeldForPause = false;
  let ignoreNextHeld = false;
  let ignored = 0;
  let lastUsed: InputSource | undefined;
  let keyboardCalibration: KeyboardCalibration | undefined;
  let keyboard = keyboardLayout(undefined, n64);
  // Menus read the same input while it's detached, where the stick moves through them like the D-pad.
  let attached = false;
  let touchStick: [number, number] = [0, 0];
  let padTilted = false;
  let analog: Analog = centred;
  const unreadablePresses = createUnreadablePressDetector();
  const eventListeners = new Set<(event: InputEvent) => void>();
  const unreadableListeners = new Set<(pad: Gamepad) => void>();
  const lastUsedListeners = new Set<() => void>();

  const send = (event: InputEvent) => eventListeners.forEach((listener) => listener(event));
  const markUsed = (source: InputSource) => {
    if (lastUsed === source) return;
    lastUsed = source;
    lastUsedListeners.forEach((listener) => listener());
  };
  // Keys held under an old calibration would never see their keyup.
  const keys = () => {
    const calibration = calibrations().keyboard;
    if (calibration !== keyboardCalibration) {
      keyboardCalibration = calibration;
      keyboard = keyboardLayout(calibration, n64);
      keysHeld = 0;
    }
    return keyboard;
  };
  const subscribe =
    <T>(listeners: Set<T>) =>
    (listener: T) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    };

  return {
    attach(target: EventTarget) {
      const keydown = (event: Event) => {
        const e = event as KeyboardEvent;
        const modified = e.metaKey || e.ctrlKey || e.altKey;
        const layout = keys();
        const keyEvent =
          (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e"
            ? "editor"
            : modified
              ? undefined
              : (keyEvents[e.code] ?? (e.code === layout.guide ? "pauseMenu" : undefined));
        const button = modified ? undefined : layout.buttons[e.code];
        if (!keyEvent && button === undefined) return;
        e.preventDefault();
        markUsed("keyboard");
        if (keyEvent && !e.repeat) send(keyEvent);
        if (button !== undefined && (!e.repeat || keysHeld & bit(button))) {
          keysHeld |= bit(button);
          keysTapped |= bit(button);
        }
      };
      const keyup = (event: Event) => {
        const e = event as KeyboardEvent;
        // macOS drops the keyup of keys released while Cmd is down.
        if (e.key === "Meta") keysHeld = 0;
        const button = keys().buttons[e.code];
        if (button !== undefined) keysHeld &= ~bit(button);
      };
      const blur = () => (keysHeld = 0);
      const pointerdown = (event: Event) => {
        if ((event as PointerEvent).pointerType === "touch") markUsed("touch");
      };
      // Before the desktop back host, so Escape toggles the pause menu once instead of opening it through back too.
      target.addEventListener("keydown", keydown, { capture: true });
      target.addEventListener("keyup", keyup);
      target.addEventListener("blur", blur);
      target.addEventListener("pointerdown", pointerdown);
      attached = true;
      return () => {
        attached = false;
        target.removeEventListener("keydown", keydown, { capture: true });
        target.removeEventListener("keyup", keyup);
        target.removeEventListener("blur", blur);
        target.removeEventListener("pointerdown", pointerdown);
        keysHeld = 0;
      };
    },

    poll(now: number): number {
      const pads = gamepads();
      const calibrated = calibrations();
      const playingN64 = n64 && attached;
      const read = readPads(pads, calibrated, playingN64 ? n64PadButtons : consoleButtons);
      for (const pad of unreadablePresses(pads, calibrated)) unreadableListeners.forEach((listener) => listener(pad));
      const tilted = playingN64 && [...read.left, ...read.right].some((axis) => axis !== 0);
      if ((read.mask && read.mask !== padHeld) || (read.guide && !guideHeld) || (tilted && !padTilted)) markUsed("gamepad");
      padTilted = tilted;
      if (read.guide && !guideHeld) send("pauseMenu");
      padHeld = read.mask;
      guideHeld = read.guide;
      if (ignoreNextHeld) ignored = padHeld;
      ignoreNextHeld = false;
      ignored &= padHeld;

      const holdingPause = (padHeld & SELECT_START) === SELECT_START && !(padHeld & A_OR_B);
      if (!holdingPause) {
        pauseHeldSince = undefined;
        pauseSent = false;
      } else {
        pauseHeldSince ??= now;
        if (!pauseSent && now - pauseHeldSince >= PAUSE_HOLD_MS) {
          pauseSent = true;
          send("pauseMenu");
        }
      }
      // Start stays out of the game until it's let go, so releasing Select first doesn't press it.
      if (!(padHeld & bit(buttons.start)) || padHeld & A_OR_B) startHeldForPause = false;
      else if (holdingPause) startHeldForPause = true;

      const touch = touchHeld | touchTapped;
      const holds = touch & DPAD ? heldButtons & ~DPAD : heldButtons;
      const keys = keysHeld | keysTapped | touch | holds;
      keysTapped = 0;
      touchTapped = 0;
      const pad = padHeld & ~ignored;
      const mask = keys | (startHeldForPause ? pad & ~bit(buttons.start) : pad);
      if (!playingN64) {
        analog = centred;
        return mask;
      }
      analog = n64Analog(mask, read, touchStick);
      return mask & 0xffff;
    },

    pollAnalog: (): Analog => analog,

    touchStick(x: number, y: number) {
      touchStick = [x, y];
    },

    touch(mask: number) {
      touchTapped |= mask & ~touchHeld;
      touchHeld = mask;
    },

    hold(mask: number) {
      heldButtons = mask;
    },

    touchScreen(at: Point | undefined) {
      if (at && !pointerHeld) pointerTapped = at;
      pointerHeld = at;
    },

    pollPointer(): Point | undefined {
      const pointer = pointerHeld ?? pointerTapped;
      pointerTapped = undefined;
      return pointer;
    },

    ignoreHeld() {
      ignoreNextHeld = true;
    },

    lastUsed: () => lastUsed,
    onLastUsedChange: subscribe(lastUsedListeners),
    onEvent: subscribe(eventListeners),
    onUnreadablePad: subscribe(unreadableListeners),
    send,
  };
}
