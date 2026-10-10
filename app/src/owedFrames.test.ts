import { expect, it } from "vitest";
import type { Speed } from "./fast-forward/fastForward";
import { MAX_OWED_FRAMES, oweFrames } from "./owedFrames";

function owedAfterRefreshes(refreshes: number, speed: Speed, steady: boolean) {
  let owed = 0;
  for (let i = 0; i < refreshes; i++) owed = oweFrames(owed, 1, { speed, steady });
  return owed;
}

it("runs one refresh at a time on steady fast-forward", () => {
  expect(owedAfterRefreshes(6, 4, true)).toBe(1);
});

it("doesn't run more than one refresh when the pacer owes two", () => {
  expect(oweFrames(0, 2, { speed: 2, steady: true })).toBe(1);
});

it("catches up on owed frames when steady fast-forward is off", () => {
  expect(owedAfterRefreshes(6, 4, false)).toBe(MAX_OWED_FRAMES);
});

it("catches up on owed frames at normal speed", () => {
  expect(owedAfterRefreshes(6, 1, true)).toBe(MAX_OWED_FRAMES);
});
