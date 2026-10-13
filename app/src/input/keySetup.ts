import type { KeyboardCalibration } from "./calibration";
import { HOLD_TO_SKIP_MS, IDLE_MS, setupSteps, type SetupEvent, type SetupStep } from "./padSetup";

const padOnly: readonly SetupStep[] = ["l2", "r2", "guide", "stickUp", "stickLeft", "rightStickUp", "rightStickLeft"];
export const keyboardSteps = setupSteps.filter((step) => !padOnly.includes(step));

export const isSetupKey = (event: KeyboardEvent) =>
  event.key !== "Escape" && event.code !== "Escape" && event.code !== "Tab" && !event.metaKey && !event.ctrlKey && !event.altKey;

export const keyName = (code: string) => code.replace(/^(Key|Digit)(?=.)/, "");

// Times come only from tick, so a key event is dated to the frame before it.
export function createKeySetup() {
  let step = 0;
  const inputs: Partial<Record<SetupStep, string>> = {};
  let pressed: { code: string; since?: number } | undefined;
  let touched = true;
  let lastInput: number | undefined;
  let lastFrame: number | undefined;

  const capture = (code: string): SetupEvent => {
    const of = keyboardSteps.find((each) => inputs[each] === code);
    if (of) return { type: "duplicate", of };
    inputs[keyboardSteps[step]] = code;
    step++;
    return { type: "captured" };
  };

  const skip = () => {
    step++;
    pressed = undefined;
    touched = true;
  };

  return {
    step: (): SetupStep | undefined => keyboardSteps[step],
    inputs: () => inputs,
    calibration: (): KeyboardCalibration => ({ ...inputs }),
    skip,

    keydown(code: string, repeat: boolean): SetupEvent | undefined {
      if (repeat) return;
      touched = true;
      const before = pressed;
      pressed = { code };
      // Fast typists press the next key before letting go of the last.
      if (before && before.code !== code) return capture(before.code);
    },

    keyup(code: string): SetupEvent | undefined {
      touched = true;
      if (pressed?.code !== code) return;
      pressed = undefined;
      return capture(code);
    },

    release() {
      pressed = undefined;
    },

    tick(now: number): SetupEvent | undefined {
      const at = lastFrame ?? now;
      lastFrame = now;
      if (touched) lastInput = at;
      touched = false;
      if (pressed) pressed.since ??= at;
      if (pressed?.since !== undefined && now - pressed.since >= HOLD_TO_SKIP_MS) {
        skip();
        return { type: "skipped" };
      }
      if (!pressed && lastInput !== undefined && now - lastInput >= IDLE_MS) return { type: "idle" };
    },
  };
}
