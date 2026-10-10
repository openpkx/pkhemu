import type { BackHost } from "./back";

function inTextField(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

function shortcut(event: KeyboardEvent) {
  if (event.metaKey) return event.code === "ArrowLeft" || event.code === "BracketLeft";
  return event.altKey && event.code === "ArrowLeft";
}

export const desktopBackHost: BackHost = {
  listen(handler) {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!event.defaultPrevented) handler();
      } else if (shortcut(event) && !inTextField(event.target)) {
        event.preventDefault();
        handler();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  },
  exit() {},
};
