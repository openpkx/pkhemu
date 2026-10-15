export type Easing = (t: number) => number;

export const linear: Easing = (t) => t;
export const easeOut: Easing = (t) => 1 - (1 - t) ** 3;
export const easeInOut: Easing = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

export type Tween = { done: Promise<boolean>; cancel(): void };

export function tween(duration: number, ease: Easing, step: (t: number) => void): Tween {
  let frame = 0;
  let finish: (finished: boolean) => void = () => {};
  const done = new Promise<boolean>((resolve) => (finish = resolve));
  let start: number | undefined;
  const tick = (now: number) => {
    start ??= now;
    const t = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
    step(ease(t));
    if (t < 1) frame = requestAnimationFrame(tick);
    else finish(true);
  };
  frame = requestAnimationFrame(tick);
  return {
    done,
    cancel() {
      cancelAnimationFrame(frame);
      finish(false);
    },
  };
}
