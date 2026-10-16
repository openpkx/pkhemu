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

// Closer to square than this, a landscape window leaves the touch controls no black beside the game to lie on.
export const closeToSquare = "(orientation: landscape) and (max-aspect-ratio: 5/3)";

// Shrunk below its own size the game would be better off under the controls.
export function singleScreen(frame: Size, space: Size, shell?: Shell, clearance = 0): Layout {
  const cleared = { ...space, width: space.width - 2 * clearance };
  const { image, border } = fitInShell(frame, stretch(frame, cleared) >= 1 ? cleared : space, shell);
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

// Large and small is for landscape. A portrait window's space can still be wider than tall once the controls below take their share, and stacking fills it better.
export const inPortrait = (screens: Screens): Screens => ({ ...screens, largeAndSmall: false });

// Both screens share one scale, except large and small, where the second gets half the first's. Snapping to a whole scale never shrinks the bigger of two, so comparing before it is safe
// and keeps a near tie where it would fall without snapping. The clearance keeps the touch screen off controls at the sides, so side by side gives it up on the touch screen's side only,
// unless both sides are asked for. With both sides, the window is close to square and large and small has to beat stacking on size; elsewhere a wide space is enough.
// Shrunk below their own size, like a single screen, they'd be better off under the controls.
export function dualScreen(frame: Size, screens: Screens, space: Size, swapped: boolean, shell?: Shell, clearance = 0, bothSides = false): Layout {
  const border = shell?.border ?? 0;
  const gap = shell?.gap ?? 0;
  const beside = bothSides ? 2 * clearance : clearance;
  const inFrame = (source: Rect) => ({ width: frame.width * source.width, height: frame.height * source.height });
  const [top, bottom] = [inFrame(screens.top), inFrame(screens.bottom)];
  const room = (width: number, height: number) => ({ width: Math.max(width, 0), height: Math.max(height, 0) });
  const stackedFit = [
    { width: Math.max(top.width, bottom.width), height: top.height + bottom.height },
    room(space.width - 2 * clearance - 2 * border, space.height - gap - 4 * border),
  ] as const;
  const sideBySideFit = [
    { width: top.width + bottom.width, height: Math.max(top.height, bottom.height) },
    room(space.width - beside - 4 * border, space.height - 2 * border),
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
  const largeAndSmall = !!screens.largeAndSmall && (bothSides ? stretch(...largeAndSmallFit) > stretch(...stackedFit) : space.width - beside > space.height);
  const stacked = !largeAndSmall && stretch(...stackedFit) > stretch(...sideBySideFit);
  const scale = fitScale(...(largeAndSmall ? largeAndSmallFit : stacked ? stackedFit : sideBySideFit));
  if (scale < 1 && clearance > 0) return dualScreen(frame, screens, space, swapped, shell);
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
