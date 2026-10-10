import { bit, buttons } from "@/input/input";

const DEAD_ZONE = 0.25;
const DIAGONAL_HALF_WIDTH = Math.PI / 12;

const right = bit(buttons.right);
const left = bit(buttons.left);
const up = bit(buttons.up);
const down = bit(buttons.down);
const directions = [right, down | right, down, down | left, left, up | left, up, up | right];

export function dpadDirection(x: number, y: number): number {
  if (Math.hypot(x, y) < DEAD_ZONE) return 0;
  const angle = (Math.atan2(y, x) + 2 * Math.PI) % (2 * Math.PI);
  const octant = Math.round(angle / (Math.PI / 4)) % 8;
  if (octant % 2 === 0) return directions[octant];
  const offDiagonal = Math.abs(angle - (octant * Math.PI) / 4);
  if (offDiagonal <= DIAGONAL_HALF_WIDTH) return directions[octant];
  return directions[(angle > (octant * Math.PI) / 4 ? octant + 1 : octant + 7) % 8];
}
