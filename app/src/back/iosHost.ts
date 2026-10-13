import type { BackHost } from "./back";
import { desktopBackHost } from "./desktopHost";

const EDGE = 24;
const DISTANCE = 60;

function optedOut(target: EventTarget | null) {
  return target instanceof Element && target.closest("[data-no-back-swipe]") !== null;
}

function onEdgeSwipe(handler: () => void) {
  let start: { identifier: number; x: number; y: number } | undefined;

  const touchstart = (event: TouchEvent) => {
    const touch = event.changedTouches[0];
    start =
      event.touches.length === 1 && touch.clientX <= EDGE && !optedOut(event.target)
        ? { identifier: touch.identifier, x: touch.clientX, y: touch.clientY }
        : undefined;
  };
  const touchend = (event: TouchEvent) => {
    const touch = Array.from(event.changedTouches).find((touch) => touch.identifier === start?.identifier);
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    start = undefined;
    if (dx >= DISTANCE && Math.abs(dy) < dx) handler();
  };
  const touchcancel = () => (start = undefined);

  window.addEventListener("touchstart", touchstart, { passive: true });
  window.addEventListener("touchend", touchend);
  window.addEventListener("touchcancel", touchcancel);
  return () => {
    window.removeEventListener("touchstart", touchstart);
    window.removeEventListener("touchend", touchend);
    window.removeEventListener("touchcancel", touchcancel);
  };
}

export const iosBackHost: BackHost = {
  listen(handler) {
    const stopKeys = desktopBackHost.listen(handler);
    const stopSwipe = onEdgeSwipe(handler);
    return () => {
      stopKeys();
      stopSwipe();
    };
  },
  exit() {},
};
