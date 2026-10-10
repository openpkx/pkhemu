import { useEffect, type KeyboardEvent } from "react";
import { useGoBack } from "@/back/back";
import { buttons, type Input } from "@/input/input";
import { usePadPresses } from "@/input/padPresses";

export type Direction = "up" | "down" | "left" | "right";

const directions: Record<number, Direction> = {
  [buttons.up]: "up",
  [buttons.down]: "down",
  [buttons.left]: "left",
  [buttons.right]: "right",
};

const FOCUSABLE = "button:enabled, a[href], input:enabled, textarea:enabled, [tabindex]:not([tabindex='-1'])";

const gapBetween = (startA: number, endA: number, startB: number, endB: number) =>
  Math.max(0, startB - endA, startA - endB);

function distance(from: DOMRect, to: DOMRect, direction: Direction) {
  const ahead = {
    up: from.top - to.bottom,
    down: to.top - from.bottom,
    left: from.left - to.right,
    right: to.left - from.right,
  }[direction];
  if (ahead < 0) return undefined;
  if (direction === "left" || direction === "right")
    return gapBetween(from.top, from.bottom, to.top, to.bottom) ? undefined : { ahead, aside: 0 };
  return { ahead, aside: gapBetween(from.left, from.right, to.left, to.right) };
}

function nextFocus(direction: Direction) {
  const current = document.activeElement;
  const dialog = current?.closest("[role=dialog], [role=alertdialog]");
  const candidates = [...(dialog ?? document).querySelectorAll<HTMLElement>(FOCUSABLE)];
  if (!(current instanceof HTMLElement) || !candidates.includes(current))
    return document.querySelector<HTMLElement>(`main :is(${FOCUSABLE})`) ?? candidates[0];
  const linked = current.getAttribute(`data-focus-${direction}`);
  if (linked) return document.getElementById(linked) ?? undefined;

  const from = current.getBoundingClientRect();
  let best: { element: HTMLElement; ahead: number; aside: number } | undefined;
  for (const element of candidates) {
    const rect = element.getBoundingClientRect();
    if (element === current || !rect.width || !rect.height) continue;
    const d = distance(from, rect, direction);
    if (!d) continue;
    if (!best || d.ahead < best.ahead - 1 || (d.ahead <= best.ahead + 1 && d.aside < best.aside)) best = { element, ...d };
  }
  return best?.element;
}

export function reveal(element: HTMLElement) {
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: "nearest", inline: "nearest" });
}

export function moveFocus(direction: Direction) {
  const next = nextFocus(direction);
  if (next) reveal(next);
}

const arrows: Record<string, Direction> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };

export function moveFocusWithArrows(event: KeyboardEvent) {
  const direction = arrows[event.key];
  if (!direction) return;
  event.preventDefault();
  moveFocus(direction);
}

export function PadNavigation({ input }: { input: Input }) {
  const goBack = useGoBack();
  const root = document.documentElement;

  usePadPresses(input, (button) => {
    root.setAttribute("data-gamepad", "");
    const direction = directions[button];
    if (direction) moveFocus(direction);
    const focused = document.activeElement;
    if (button === buttons.a && focused instanceof HTMLElement && focused !== document.body) focused.click();
    if (button === buttons.b) goBack();
  });

  useEffect(() => {
    const stop = () => root.removeAttribute("data-gamepad");
    window.addEventListener("pointerdown", stop, true);
    window.addEventListener("keydown", stop, true);
    return () => {
      window.removeEventListener("pointerdown", stop, true);
      window.removeEventListener("keydown", stop, true);
      stop();
    };
  }, [root]);

  return null;
}
