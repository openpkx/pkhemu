import type { Point } from "@/fit";
import type { System } from "@/systems";
import {
  calibrationFor,
  isPressed,
  noCalibrations,
  rightStickFor,
  STICK_THRESHOLD,
  type Calibrations,
  type KeyboardCalibration,
  type RawInput,
  type StandardButton,
} from "./calibration";
import { centred, clampToCircle, releasedTriggers, tilt, toAxis, type Analog, type Triggers } from "./stick";

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
  r2: 13,
} as const;

// The keyboard's stick sits past the RetroPad's 16 bits and reaches the core as the left stick.
const stickButtons = { up: 20, down: 21, left: 22, right: 23 } as const;

// The core reads the RetroPad's B as A, Y as B and L2 as Z. The C buttons also sit past the 16 bits, and reach the core
// as the right stick.
export const n64Buttons = {
  a: buttons.b,
  b: buttons.y,
  z: buttons.l2,
  cUp: 16,
  cDown: 17,
  cLeft: 18,
  cRight: 19,
  stickUp: stickButtons.up,
  stickDown: stickButtons.down,
  stickLeft: stickButtons.left,
  stickRight: stickButtons.right,
} as const;

// Dolphin reads the RetroPad's R as Z, and L2 and R2 as full presses of L and R. Pads also send how far each is pulled.
export const gcButtons = {
  a: buttons.a,
  b: buttons.b,
  x: buttons.x,
  y: buttons.y,
  z: buttons.r,
  l: buttons.l2,
  r: buttons.r2,
} as const;

export type StickSide = "left" | "right";

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

const gcCStickDpadAndZKeys: Record<string, number> = { ...n64CAndDpadKeys, KeyD: gcButtons.z };

const gcKeyButtons: Record<string, number> = {
  ArrowUp: stickButtons.up,
  ArrowDown: stickButtons.down,
  ArrowLeft: stickButtons.left,
  ArrowRight: stickButtons.right,
  KeyZ: gcButtons.a,
  KeyX: gcButtons.b,
  KeyC: gcButtons.x,
  KeyV: gcButtons.y,
  KeyA: gcButtons.l,
  KeyS: gcButtons.r,
  Enter: buttons.start,
};

const circlePadKeys: Record<string, number> = {
  KeyI: stickButtons.up,
  KeyK: stickButtons.down,
  KeyJ: stickButtons.left,
  KeyL: stickButtons.right,
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

const padButtonsWithStick: Partial<Record<StandardButton, number>> = {
  ...consoleButtons,
  stickUp: undefined,
  stickDown: undefined,
  stickLeft: undefined,
  stickRight: undefined,
};

// R2 would hold the core's C buttons mode, so both triggers press Z.
const n64PadButtons: Partial<Record<StandardButton, number>> = {
  ...padButtonsWithStick,
  l2: n64Buttons.z,
  r2: n64Buttons.z,
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

const gcPadButtons: Partial<Record<StandardButton, number>> = {
  ...padButtonsWithStick,
  l1: undefined,
  r1: gcButtons.z,
  l2: gcButtons.l,
  r2: gcButtons.r,
};

const gcKeyboardButtons: Partial<Record<StandardButton, number>> = {
  ...gcPadButtons,
  l1: gcButtons.l,
  r1: gcButtons.r,
  up: stickButtons.up,
  down: stickButtons.down,
  left: stickButtons.left,
  right: stickButtons.right,
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

// Digital buttons can report a press with no value. A trigger's axis reads 0 until its first pull and can rest at -1
// after, so a pull counts from the lowest the axis has read.
function pull(pad: Gamepad, raw: RawInput | undefined, rests: Map<string, number>) {
  if (!raw) return 0;
  if ("button" in raw) {
    const button = pad.buttons[raw.button];
    return button?.pressed && !button.value ? 1 : (button?.value ?? 0);
  }
  if ("value" in raw) return isPressed(pad, raw) ? 1 : 0;
  const at = (pad.axes[raw.axis] ?? 0) * raw.direction;
  const key = `${pad.index}:${pad.id}:${raw.axis}:${raw.direction}`;
  const rest = Math.min(rests.get(key) ?? 0, at);
  rests.set(key, rest);
  return Math.max(0, (at - rest) / (1 - rest));
}

function stick(pad: Gamepad, { up, down, left, right }: Record<"up" | "down" | "left" | "right", RawInput | undefined>) {
  return tilt(strength(pad, right) - strength(pad, left), strength(pad, down) - strength(pad, up), PAD_DEAD_ZONE);
}

function readPads(
  pads: readonly (Gamepad | null)[],
  calibrations: Calibrations,
  layout: Partial<Record<StandardButton, number>>,
  triggerRests: Map<string, number>,
) {
  let mask = 0;
  let guide = false;
  const left: [number, number] = [0, 0];
  const right: [number, number] = [0, 0];
  const triggers: [number, number] = [0, 0];
  for (const pad of pads) {
    const calibration = pad && calibrationFor(pad, calibrations);
    if (!calibration) continue;
    for (const [standard, raw] of Object.entries(calibration) as [StandardButton, RawInput][]) {
      if (!isPressed(pad, raw)) continue;
      const button = layout[standard];
      if (button !== undefined) mask |= bit(button);
      else if (standard === "guide") guide = true;
    }
    const [x, y] = stick(pad, {
      up: calibration.stickUp,
      down: calibration.stickDown,
      left: calibration.stickLeft,
      right: calibration.stickRight,
    });
    left[0] += x;
    left[1] += y;
    const [rx, ry] = stick(pad, rightStickFor(pad, calibration));
    right[0] += rx;
    right[1] += ry;
    triggers[0] = Math.max(triggers[0], pull(pad, calibration.l2, triggerRests));
    triggers[1] = Math.max(triggers[1], pull(pad, calibration.r2, triggerRests));
  }
  return { mask, guide, left, right, triggers };
}

type Sticks = Record<StickSide, [number, number]>;

function analogFrom(mask: number, pads: Sticks, touch: Sticks) {
  const on = (button: number) => (mask & bit(button) ? 1 : 0);
  const [leftX, leftY] = clampToCircle(
    pads.left[0] + touch.left[0] + on(stickButtons.right) - on(stickButtons.left),
    pads.left[1] + touch.left[1] + on(stickButtons.down) - on(stickButtons.up),
  );
  const [rightX, rightY] = clampToCircle(
    pads.right[0] + touch.right[0] + on(n64Buttons.cRight) - on(n64Buttons.cLeft),
    pads.right[1] + touch.right[1] + on(n64Buttons.cDown) - on(n64Buttons.cUp),
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

type Layouts = {
  pad: Partial<Record<StandardButton, number>>;
  keyboard: Partial<Record<StandardButton, number>>;
  keys: Record<string, number>;
  extraKeys: Record<string, number>;
};

const consoleLayouts: Layouts = { pad: padButtonsWithStick, keyboard: consoleButtons, keys: keyButtons, extraKeys: {} };

const stickLayouts: Partial<Record<System, Layouts>> = {
  n64: { pad: n64PadButtons, keyboard: n64KeyboardButtons, keys: n64KeyButtons, extraKeys: n64CAndDpadKeys },
  gc: { pad: gcPadButtons, keyboard: gcKeyboardButtons, keys: gcKeyButtons, extraKeys: gcCStickDpadAndZKeys },
  "3ds": { ...consoleLayouts, extraKeys: circlePadKeys },
};

const layoutsFor = (system: System | undefined) => (system && stickLayouts[system]) || consoleLayouts;

function keyboardLayout(calibration: KeyboardCalibration | undefined, system: System | undefined) {
  const { keyboard: layout, keys, extraKeys } = layoutsFor(system);
  if (!calibration) return { buttons: { ...keys, ...extraKeys }, guide: undefined };
  const calibrated: Record<string, number> = { ...extraKeys };
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
  const hasSticks = !!system && system in stickLayouts;
  const padLayout = layoutsFor(system).pad;
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
  let keyboard = keyboardLayout(undefined, system);
  // Menus read the same input while it's detached, where the stick moves through them like the D-pad.
  let attached = false;
  const touchSticks: Sticks = { left: [0, 0], right: [0, 0] };
  let padTilted = false;
  let analog: Analog = centred;
  let triggers: Triggers = releasedTriggers;
  const triggerRests = new Map<string, number>();
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
      keyboard = keyboardLayout(calibration, system);
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
      const playingSticks = hasSticks && attached;
      const read = readPads(pads, calibrated, playingSticks ? padLayout : consoleButtons, triggerRests);
      // The 3DS runs as an Old 3DS, which has no C-stick.
      if (system === "3ds") read.right = [0, 0];
      for (const pad of unreadablePresses(pads, calibrated)) unreadableListeners.forEach((listener) => listener(pad));
      const tilted = playingSticks && [...read.left, ...read.right].some((axis) => axis !== 0);
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
      if (!playingSticks) {
        analog = centred;
        triggers = releasedTriggers;
        return mask;
      }
      analog = analogFrom(mask, read, touchSticks);
      triggers = [toAxis(read.triggers[0]), toAxis(read.triggers[1])];
      return mask & 0xffff;
    },

    pollAnalog: (): Analog => analog,

    pollTriggers: (): Triggers => triggers,

    touchStick(x: number, y: number, side: StickSide = "left") {
      touchSticks[side] = [x, y];
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
