import { fitInShell, fitScale, origin, scaled, stretch, type Point, type Shell, type Size } from "./fit";
import type { System } from "./systems";

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

export type Screens = { top: Rect; bottom: Rect; largeAndSmall?: boolean };

// The core composes the top screen over the bottom one. Azahar centres the 3DS's 320-pixel bottom screen under its 400-pixel top.
export const dualScreens: Partial<Record<System, Screens>> = {
  nds: { top: topHalf, bottom: bottomHalf },
  "3ds": { top: topHalf, bottom: { x: 0.1, y: 0.5, width: 0.8, height: 0.5 }, largeAndSmall: true },
};

// Both screens share one scale, except large and small, where the second gets half the first's. Snapping to a whole scale never shrinks the bigger of two, so comparing before it is safe
// and keeps a near tie where it would fall without snapping. The clearance keeps the touch screen off controls at the sides, so side by side gives it up on the touch screen's side only.
export function dualScreen(frame: Size, screens: Screens, space: Size, swapped: boolean, shell?: Shell, clearance = 0): Layout {
  const border = shell?.border ?? 0;
  const gap = shell?.gap ?? 0;
  const inFrame = (source: Rect) => ({ width: frame.width * source.width, height: frame.height * source.height });
  const [top, bottom] = [inFrame(screens.top), inFrame(screens.bottom)];
  const room = (width: number, height: number) => ({ width: Math.max(width, 0), height: Math.max(height, 0) });
  const stackedFit = [
    { width: Math.max(top.width, bottom.width), height: top.height + bottom.height },
    room(space.width - 2 * clearance - 2 * border, space.height - gap - 4 * border),
  ] as const;
  const sideBySideFit = [
    { width: top.width + bottom.width, height: Math.max(top.height, bottom.height) },
    room(space.width - clearance - 4 * border, space.height - 2 * border),
  ] as const;
  const topScreen = { source: screens.top, frame: top, window: 0 };
  const bottomScreen = { source: screens.bottom, frame: bottom, window: 1 };
  const [firstScreen, secondScreen] = swapped ? [bottomScreen, topScreen] : [topScreen, bottomScreen];
  const largeAndSmallFit = [
    {
      width: firstScreen.frame.width + secondScreen.frame.width / 2,
      height: Math.max(firstScreen.frame.height, secondScreen.frame.height / 2),
    },
    sideBySideFit[1],
  ] as const;
  const largeAndSmall = !!screens.largeAndSmall && space.width - clearance > space.height;
  const stacked = !largeAndSmall && stretch(...stackedFit) > stretch(...sideBySideFit);
  const scale = fitScale(...(largeAndSmall ? largeAndSmallFit : stacked ? stackedFit : sideBySideFit));
  const first = { ...firstScreen, size: scaled(firstScreen.frame, scale) };
  const second = { ...secondScreen, size: scaled(secondScreen.frame, largeAndSmall ? scale / 2 : scale) };
  const across = Math.max(first.size.width, second.size.width);
  const tall = Math.max(first.size.height, second.size.height);
  const place = ({ source, size, window }: typeof first, index: number): View => ({
    source,
    target: stacked
      ? {
          x: border + Math.floor((across - size.width) / 2),
          y: border + index * (first.size.height + 2 * border + gap),
          ...size,
        }
      : { x: border + index * (first.size.width + 2 * border), y: border + Math.floor((tall - size.height) / 2), ...size },
    window,
  });
  const views = [place(first, 0), place(second, 1)];
  return {
    canvas: stacked
      ? { width: across + 2 * border, height: first.size.height + second.size.height + 4 * border + gap }
      : { width: first.size.width + second.size.width + 4 * border, height: tall + 2 * border },
    border,
    views,
    touch: views.find((view) => view.window === 1),
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
