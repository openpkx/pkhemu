const WINDOW_MS = 1000;

export type Rates = { fps: number; drawn: number; skipped: number; repeated: number };

// Totals since the game started, as Rust counts them in each frame it sends. They wrap at 32 bits.
export type Counts = { frames: number; skipped: number; repeated: number };

export function createFpsCounter() {
  let start: { at: number; counts: Counts } | undefined;
  let drawn = 0;

  return {
    // Each call is a frame drawn. The first after a reset only opens the window: its frames ran over a stretch it can't time.
    add(counts: Counts, now: number): Rates | undefined {
      if (start === undefined) {
        start = { at: now, counts };
        drawn = 0;
        return;
      }
      drawn += 1;
      const elapsed = now - start.at;
      if (elapsed < WINDOW_MS) return;
      const perSecond = (count: number) => Math.round((count * 1000) / elapsed);
      const since = (count: keyof Counts) => perSecond((counts[count] - start!.counts[count]) >>> 0);
      const rates: Rates = { fps: since("frames"), drawn: perSecond(drawn), skipped: since("skipped"), repeated: since("repeated") };
      start = { at: now, counts };
      drawn = 0;
      return rates;
    },
    reset() {
      start = undefined;
      drawn = 0;
    },
  };
}
