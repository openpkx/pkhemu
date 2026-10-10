import { useCallback, useEffect, useState } from "react";
import { usePreferences, type FastForwardSpeed } from "@/preferences/preferences";

export type Speed = 1 | FastForwardSpeed;

export type FastForward = {
  on: boolean;
  speed: Speed;
  toggle(): void;
};

export function useFastForward(listening = true): FastForward {
  const { preferences } = usePreferences();
  const [on, setOn] = useState(false);
  const toggle = useCallback(() => setOn((on) => !on), []);

  useEffect(() => {
    if (!listening) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      if (!event.repeat) toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle, listening]);

  return { on, speed: on ? preferences.fastForwardSpeed : 1, toggle };
}
