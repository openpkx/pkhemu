const SAMPLES = 60;
const LOCK_TOLERANCE = 0.02;
const PAUSE_MS = 100;
const MAX_FRAMES = 2;

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

// Near the core's rate, one frame per refresh, and the audio resampler absorbs the difference.
// Elsewhere (50, 75, 90, 120, 144 Hz...) that would run the game at the wrong speed, so frames
// follow elapsed time instead and some refreshes repeat a frame.
export function createPacer(coreFps: number) {
  const period = 1000 / coreFps;
  const intervals: number[] = [];
  let last: number | undefined;
  let owed = 0;

  return (now: number): number => {
    const elapsed = last === undefined ? period : now - last;
    if (last !== undefined && elapsed < PAUSE_MS) {
      intervals.push(elapsed);
      if (intervals.length > SAMPLES) intervals.shift();
    }
    last = now;
    const refresh = intervals.length ? median(intervals) : period;
    if (Math.abs(refresh - period) / period <= LOCK_TOLERANCE) {
      owed = 0;
      return 1;
    }
    owed += elapsed;
    const frames = Math.min(Math.floor(owed / period), MAX_FRAMES);
    owed = Math.min(owed - frames * period, period);
    return frames;
  };
}
