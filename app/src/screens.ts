import { fitInShell, origin, type Point, type Shell, type Size } from "./fit";

export type Rect = { x: number; y: number; width: number; height: number };
// The source is a fraction of the frame, the target is in canvas pixels. The window is the frame's screen it shows, top first.
export type View = { source: Rect; target: Rect; window: number };
// Each view's window is its target grown by the border on every side.
export type Layout = { canvas: Size; border: number; views: View[]; touch?: View };

const MAX_POINTER = 0x7fff;
const whole: Rect = { x: 0, y: 0, width: 1, height: 1 };
const topHalf: Rect = { x: 0, y: 0, width: 1, height: 0.5 };
const bottomHalf: Rect = { x: 0, y: 0.5, width: 1, height: 0.5 };

export function singleScreen(frame: Size, space: Size, shell?: Shell): Layout {
  const { image, border } = fitInShell(frame, space, shell);
  return {
    canvas: { width: image.width + 2 * border, height: image.height + 2 * border },
    border,
    views: [{ source: whole, target: { x: border, y: border, ...image }, window: 0 }],
  };
}

// The core composes the top screen over the bottom one, each half the frame.
export function dualScreen(frame: Size, space: Size, swapped: boolean, shell?: Shell): Layout {
  const half = { width: frame.width, height: frame.height / 2 };
  const stacked = space.width / space.height < half.width / half.height;
  const gap = stacked ? (shell?.gap ?? 0) : 0;
  const slotSpace = stacked
    ? { width: space.width, height: Math.max(space.height - gap, 0) / 2 }
    : { width: space.width / 2, height: space.height };
  const { image: screen, border } = fitInShell(half, slotSpace, shell);
  const slot = { width: screen.width + 2 * border, height: screen.height + 2 * border };
  const at = (index: number): Rect => ({
    x: (stacked ? 0 : index * slot.width) + border,
    y: (stacked ? index * (slot.height + gap) : 0) + border,
    ...screen,
  });
  const top: View = { source: topHalf, target: at(swapped ? 1 : 0), window: 0 };
  const bottom: View = { source: bottomHalf, target: at(swapped ? 0 : 1), window: 1 };
  return {
    canvas: stacked ? { width: slot.width, height: slot.height * 2 + gap } : { width: slot.width * 2, height: slot.height },
    border,
    views: swapped ? [bottom, top] : [top, bottom],
    touch: bottom,
  };
}

// Libretro pointer coordinates span the whole frame from -0x7fff to 0x7fff.
export function pointerAt(layout: Layout, point: Point, shifts: readonly Point[] = []): Point | undefined {
  if (!layout.touch) return undefined;
  const { source, target, window } = layout.touch;
  const shift = shifts[window] ?? origin;
  const u = (point.x - shift.x - target.x) / target.width;
  const v = (point.y - shift.y - target.y) / target.height;
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return undefined;
  const toPointer = (fraction: number) => Math.round((fraction * 2 - 1) * MAX_POINTER);
  return { x: toPointer(source.x + u * source.width), y: toPointer(source.y + v * source.height) };
}
