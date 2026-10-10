import type { KeyboardCalibration, PadCalibration, RawInput } from "@/input/calibration";
import { connectedGamepads } from "@/input/input";
import { createKeySetup, isSetupKey, keyboardSteps, keyName } from "@/input/keySetup";
import { createPadSetup, setupSteps, type SetupEvent, type SetupStep } from "@/input/padSetup";

export type SetupDriver<T> = {
  title: string;
  device?: string;
  hint: string;
  steps: readonly SetupStep[];
  step(): SetupStep | undefined;
  bound(step: SetupStep): string;
  skip(): void;
  calibration(): T;
  start(onEvent: (event: SetupEvent) => void, onLost: () => void): () => void;
};

export type SetupPad = { index: number; id: string };

function describe(raw: RawInput | undefined) {
  if (!raw) return "None";
  if ("button" in raw) return `Button ${raw.button}`;
  if ("direction" in raw) return `Axis ${raw.axis} ${raw.direction < 0 ? "−" : "+"}`;
  return `Axis ${raw.axis} at ${raw.value.toFixed(2)}`;
}

export function padDriver(pad: SetupPad): SetupDriver<PadCalibration> {
  const setup = createPadSetup(connectedGamepads()[pad.index]?.axes ?? []);
  return {
    title: "Set up controller",
    device: pad.id,
    hint: "Hold any button for 2 seconds to skip.",
    steps: setupSteps,
    step: setup.step,
    bound: (step) => describe(setup.inputs()[step]),
    skip: setup.skip,
    calibration: setup.calibration,
    start(onEvent, onLost) {
      let raf = 0;
      const tick = (now: number) => {
        const read = connectedGamepads()[pad.index];
        if (read?.id !== pad.id) return onLost();
        const event = setup.read(read, now);
        if (event) onEvent(event);
        if (event?.type === "idle" || !setup.step()) return;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    },
  };
}

export function keyboardDriver(): SetupDriver<KeyboardCalibration> {
  const setup = createKeySetup();
  return {
    title: "Set up keyboard",
    hint: "Hold any key for 2 seconds to skip.",
    steps: keyboardSteps,
    step: setup.step,
    bound: (step) => {
      const code = setup.inputs()[step];
      return code ? keyName(code) : "None";
    },
    skip: setup.skip,
    calibration: setup.calibration,
    start(onEvent) {
      let raf = 0;
      let done = false;
      const emit = (event: SetupEvent | undefined) => {
        if (!event || done) return;
        done = event.type === "idle" || !setup.step();
        onEvent(event);
      };
      const claim = (event: KeyboardEvent) => {
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      const keydown = (event: KeyboardEvent) => {
        if (!isSetupKey(event)) return;
        claim(event);
        emit(setup.keydown(event.code, event.repeat));
      };
      // A key let go while a modifier is down still binds. macOS drops keyups while Cmd is down, so Cmd lets go of the press.
      const keyup = (event: KeyboardEvent) => {
        if (event.key === "Meta") setup.release();
        const result = setup.keyup(event.code);
        if (result) claim(event);
        emit(result);
      };
      const tick = (now: number) => {
        emit(setup.tick(now));
        if (!done) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      window.addEventListener("keydown", keydown, true);
      window.addEventListener("keyup", keyup, true);
      window.addEventListener("blur", setup.release);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("keydown", keydown, true);
        window.removeEventListener("keyup", keyup, true);
        window.removeEventListener("blur", setup.release);
      };
    },
  };
}
