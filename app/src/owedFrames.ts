import type { Speed } from "./fast-forward/fastForward";

// Covers run_frames round trips of a few refreshes, as on Android, without the game racing to catch up after a stall.
export const MAX_OWED_FRAMES = 4;

export function oweFrames(owed: number, paced: number, { speed, steady }: { speed: Speed; steady: boolean }) {
  return Math.min(owed + paced, steady && speed > 1 ? 1 : MAX_OWED_FRAMES);
}
