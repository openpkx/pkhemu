const standardButtons = [
  "south",
  "east",
  "west",
  "north",
  "l1",
  "r1",
  "l2",
  "r2",
  "select",
  "start",
  "up",
  "down",
  "left",
  "right",
  "guide",
  "stickUp",
  "stickDown",
  "stickLeft",
  "stickRight",
  "rightStickUp",
  "rightStickDown",
  "rightStickLeft",
  "rightStickRight",
] as const;

export type StandardButton = (typeof standardButtons)[number];

export type RawInput = { button: number } | { axis: number; direction: -1 | 1 } | { axis: number; value: number };

export type PadCalibration = Partial<Record<StandardButton, RawInput>>;
export type KeyboardCalibration = Partial<Record<StandardButton, string>>;

export type Calibrations = {
  pads: Record<string, PadCalibration>;
  keyboard?: KeyboardCalibration;
};

export const noCalibrations: Calibrations = { pads: {} };

const standardLayout: PadCalibration = {
  south: { button: 0 },
  east: { button: 1 },
  west: { button: 2 },
  north: { button: 3 },
  l1: { button: 4 },
  r1: { button: 5 },
  l2: { button: 6 },
  r2: { button: 7 },
  select: { button: 8 },
  start: { button: 9 },
  up: { button: 12 },
  down: { button: 13 },
  left: { button: 14 },
  right: { button: 15 },
  guide: { button: 16 },
  stickUp: { axis: 1, direction: -1 },
  stickDown: { axis: 1, direction: 1 },
  stickLeft: { axis: 0, direction: -1 },
  stickRight: { axis: 0, direction: 1 },
  rightStickUp: { axis: 3, direction: -1 },
  rightStickDown: { axis: 3, direction: 1 },
  rightStickLeft: { axis: 2, direction: -1 },
  rightStickRight: { axis: 2, direction: 1 },
};

export const STICK_THRESHOLD = 0.5;
// Hats that report as one axis step through eight positions about 0.29 apart.
export const HAT_TOLERANCE = 0.1;

export function isPressed(pad: Gamepad, raw: RawInput) {
  if ("button" in raw) return !!pad.buttons[raw.button]?.pressed;
  const value = pad.axes[raw.axis];
  if (value === undefined) return false;
  if ("direction" in raw) return value * raw.direction >= STICK_THRESHOLD;
  return Math.abs(value - raw.value) < HAT_TOLERANCE;
}

export function withPad(calibrations: Calibrations, id: string, calibration?: PadCalibration): Calibrations {
  const pads = { ...calibrations.pads };
  if (calibration && Object.keys(calibration).length) pads[id] = calibration;
  else delete pads[id];
  return { ...calibrations, pads };
}

export function calibrationFor(pad: Gamepad, calibrations: Calibrations) {
  return calibrations.pads[pad.id] ?? (pad.mapping === "standard" ? standardLayout : undefined);
}

// Setup asked for no right stick before, so a standard pad set up then keeps the standard one.
export function rightStickFor(pad: Gamepad, calibration: PadCalibration) {
  const { rightStickUp, rightStickDown, rightStickLeft, rightStickRight } =
    calibration.rightStickUp || calibration.rightStickDown || calibration.rightStickLeft || calibration.rightStickRight
      ? calibration
      : pad.mapping === "standard"
        ? standardLayout
        : {};
  return { up: rightStickUp, down: rightStickDown, left: rightStickLeft, right: rightStickRight };
}

const isStandardButton = (value: string): value is StandardButton => standardButtons.includes(value as StandardButton);
const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
const isIndex = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;

function parseRawInput(value: unknown): RawInput | undefined {
  if (!isObject(value)) return undefined;
  const raw = value as Record<string, unknown>;
  if (isIndex(raw.button)) return { button: raw.button };
  if (!isIndex(raw.axis)) return undefined;
  if (raw.direction === -1 || raw.direction === 1) return { axis: raw.axis, direction: raw.direction };
  if (typeof raw.value === "number" && Number.isFinite(raw.value)) return { axis: raw.axis, value: raw.value };
  return undefined;
}

function parseCalibration<T>(value: unknown, parse: (input: unknown) => T | undefined) {
  if (!isObject(value)) return undefined;
  const calibration: Partial<Record<StandardButton, T>> = {};
  for (const [button, input] of Object.entries(value)) {
    const parsed = parse(input);
    if (isStandardButton(button) && parsed !== undefined) calibration[button] = parsed;
  }
  return Object.keys(calibration).length ? calibration : undefined;
}

export function parseCalibrations(stored: unknown): Calibrations {
  if (!isObject(stored)) return noCalibrations;
  const { pads, keyboard } = stored as Record<string, unknown>;
  const calibrations: Calibrations = { pads: {} };
  if (isObject(pads))
    for (const [id, pad] of Object.entries(pads)) {
      const calibration = parseCalibration(pad, parseRawInput);
      if (calibration) calibrations.pads[id] = calibration;
    }
  const keys = parseCalibration(keyboard, (code) => (typeof code === "string" ? code : undefined));
  if (keys) calibrations.keyboard = keys;
  return calibrations;
}
