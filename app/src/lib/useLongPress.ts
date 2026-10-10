import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";

const LONG_PRESS_MS = 500;
const SLOP_PX = 10;
const CLICK_AFTER_MS = 500;

function createLongPress(onLongPress: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let start: { x: number; y: number } | undefined;
  let down = false;
  // The click that ends a long press comes on release, so it's swallowed until shortly after.
  let swallowUntil = 0;

  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    start = undefined;
  };

  const press = () => {
    cancel();
    swallowUntil = down ? Infinity : performance.now() + CLICK_AFTER_MS;
    onLongPress();
  };

  // The browser's own long press lands on whatever the long press opened, so it's held back there.
  const hold = (event: Event) => swallowUntil === Infinity && event.preventDefault();

  // On window, since the sheet a long click opens covers the element before the button comes up.
  const release = () => {
    cancel();
    removeEventListener("pointerup", release);
    removeEventListener("pointercancel", release);
    removeEventListener("contextmenu", hold, true);
    removeEventListener("selectstart", hold, true);
    down = false;
    if (swallowUntil === Infinity) swallowUntil = performance.now() + CLICK_AFTER_MS;
  };

  return {
    release,
    handlers: {
      onPointerDown(event: PointerEvent) {
        cancel();
        down = true;
        swallowUntil = 0;
        addEventListener("pointerup", release);
        addEventListener("pointercancel", release);
        addEventListener("contextmenu", hold, true);
        addEventListener("selectstart", hold, true);
        if (event.button !== 0) return;
        start = { x: event.clientX, y: event.clientY };
        timer = setTimeout(press, LONG_PRESS_MS);
      },
      onPointerMove(event: PointerEvent) {
        if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > SLOP_PX) cancel();
      },
      // Touch browsers send their own long press as a context menu, which can come before the timer.
      onContextMenu(event: MouseEvent) {
        event.preventDefault();
        if (!swallowUntil) press();
      },
      onClickCapture(event: MouseEvent) {
        const swallow = performance.now() < swallowUntil;
        swallowUntil = 0;
        if (!swallow) return;
        event.preventDefault();
        event.stopPropagation();
      },
    },
  };
}

export function useLongPress(onLongPress: (() => void) | undefined) {
  const latest = useRef(onLongPress);
  latest.current = onLongPress;
  const [longPress] = useState(() => createLongPress(() => latest.current?.()));

  useEffect(() => longPress.release, [longPress]);

  return onLongPress ? longPress.handlers : {};
}
