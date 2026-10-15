export type Direction = -1 | 0 | 1;

const LANDS_AT = 0.4;
const FLICK = 0.45;

export function step(index: number, direction: Direction, count: number) {
  return (((index + direction) % count) + count) % count;
}

export function lands(progress: number, pxPerMsTowardsNext: number) {
  if (Math.abs(pxPerMsTowardsNext) > FLICK) return pxPerMsTowardsNext > 0;
  return progress > LANDS_AT;
}

export function tapped(x: number, width: number): Direction {
  if (x < width / 4) return -1;
  if (x > (width * 3) / 4) return 1;
  return 0;
}

export function dragged(pulledLeft: number, width: number): { direction: Direction; progress: number } {
  const direction = Math.sign(pulledLeft) as Direction;
  return { direction, progress: direction ? Math.min(1, Math.abs(pulledLeft) / width) : 0 };
}
