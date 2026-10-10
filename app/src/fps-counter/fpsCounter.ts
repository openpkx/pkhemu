const WINDOW_MS = 1000;

export type Rates = { fps: number; drawn: number };

export function createFpsCounter() {
  let start: number | undefined;
  let frames = 0;
  let drawn = 0;

  return {
    // The first call after a reset only opens the window: its frames ran over a stretch it can't time.
    add(count: number, now: number): Rates | undefined {
      if (start === undefined) {
        start = now;
        return;
      }
      frames += count;
      drawn += 1;
      const elapsed = now - start;
      if (elapsed < WINDOW_MS) return;
      const rates: Rates = { fps: Math.round((frames * 1000) / elapsed), drawn: Math.round((drawn * 1000) / elapsed) };
      start = now;
      frames = 0;
      drawn = 0;
      return rates;
    },
    reset() {
      start = undefined;
      frames = 0;
      drawn = 0;
    },
  };
}
