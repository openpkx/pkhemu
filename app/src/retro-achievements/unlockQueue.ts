import type { Completion, Unlock } from "./retroAchievements";

export type Arrival = { kind: "unlock"; unlock: Unlock } | { kind: "completion"; completion: Completion };

export type Shown = { key: number } & (Arrival | { kind: "more"; count: number });

export type UnlockQueue = { showing?: Shown; waiting: Arrival[]; fold: boolean; keys: number };

const FOLD_FROM = 4;

export const emptyQueue: UnlockQueue = { waiting: [], fold: false, keys: 0 };

const unlocks = (waiting: Arrival[]) => waiting.filter((arrival) => arrival.kind === "unlock").length;

export function arrive(queue: UnlockQueue, arrival: Arrival): UnlockQueue {
  const waiting = [...queue.waiting, arrival];
  const fold = queue.fold || (queue.showing?.kind === "unlock" && unlocks(waiting) >= FOLD_FROM);
  return { ...queue, waiting, fold };
}

export function advance(queue: UnlockQueue): UnlockQueue {
  const [first, ...rest] = queue.waiting;
  if (queue.showing || !first) return queue;
  const key = queue.keys + 1;
  if (queue.fold) {
    const waiting = queue.waiting.filter((arrival) => arrival.kind !== "unlock");
    return { showing: { key, kind: "more", count: unlocks(queue.waiting) }, waiting, fold: false, keys: key };
  }
  return { showing: { key, ...first }, waiting: rest, fold: unlocks(queue.waiting) >= FOLD_FROM, keys: key };
}

export function finish(queue: UnlockQueue, key: number): UnlockQueue {
  return queue.showing?.key === key ? { ...queue, showing: undefined } : queue;
}
