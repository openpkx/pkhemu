import { useEffect, useRef } from "react";
import { bit, buttons, type Input } from "@/input/input";

const REPEAT_DELAY_MS = 400;
const REPEAT_EVERY_MS = 100;
const REPEATING = bit(buttons.up) | bit(buttons.down) | bit(buttons.left) | bit(buttons.right);

// Module-wide because the pad setup sits below the screens whose inputs it has to silence.
let capturing = 0;

export const capturingPads = () => capturing > 0;

export function useCapturePads() {
  useEffect(() => {
    capturing++;
    return () => void capturing--;
  }, []);
}

export function usePadPresses(input: Input | undefined, onPress: (button: number) => void, enabled = true) {
  const latest = useRef(onPress);
  latest.current = onPress;

  useEffect(() => {
    if (!enabled || !input) return;
    let held: number | undefined;
    const repeatAt = new Map<number, number>();
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const mask = input.poll(now);
      const down = held === undefined ? 0 : mask & ~held;
      held = mask;
      for (const button of repeatAt.keys()) if (!(mask & bit(button))) repeatAt.delete(button);
      if (capturing) return repeatAt.clear();
      for (let button = 0; mask >> button; button++) {
        const at = repeatAt.get(button);
        if (down & bit(button)) {
          if (REPEATING & bit(button)) repeatAt.set(button, now + REPEAT_DELAY_MS);
          latest.current(button);
        } else if (at !== undefined && now >= at) {
          const next = at + REPEAT_EVERY_MS;
          repeatAt.set(button, next > now ? next : now + REPEAT_EVERY_MS);
          latest.current(button);
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [input, enabled]);
}
