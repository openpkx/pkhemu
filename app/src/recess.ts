import type { Point, Shell } from "./fit";
import { TILT } from "./motion/tilt";
import type { Look, Parallax, Rgb } from "./screen";
import type { HandheldDisplay, HandheldWindow } from "./systems";

const PLATE_SHADE = 0.3;

// Whole pixels, because a shift by part of one would resample the game's pixels unevenly as it moves.
function inPixels(dp: Point, mostDp: number): Point {
  const most = Math.round(mostDp * devicePixelRatio);
  const pixels = (value: number) => Math.max(-most, Math.min(most, Math.round(value * devicePixelRatio)));
  return { x: pixels(dp.x), y: pixels(dp.y) };
}

export function parallax(windows: HandheldWindow[], dp: Point): Parallax[] {
  return windows.map(({ depth }) => {
    const deep = { x: dp.x * depth, y: dp.y * depth };
    return {
      shift: inPixels(deep, TILT.maxDp * depth),
      exact: { x: deep.x * devicePixelRatio, y: deep.y * devicePixelRatio },
      lean: { x: deep.x / TILT.maxDp, y: deep.y / TILT.maxDp },
    };
  });
}

export function rgb(hex: string): Rgb {
  const value = parseInt(hex.trim().slice(1), 16);
  return [(value >> 16) / 255, ((value >> 8) & 0xff) / 255, (value & 0xff) / 255];
}

export function shellIn(display: HandheldDisplay): Shell {
  return { border: Math.round(display.marginDp * devicePixelRatio), gap: Math.round(display.gapDp * devicePixelRatio) };
}

export function shellLook(display: HandheldDisplay, shell: Rgb, glass: boolean): Look {
  return {
    shell,
    plate: shell.map((channel) => channel * PLATE_SHADE) as Rgb,
    dp: devicePixelRatio,
    radius: display.radiusDp * devicePixelRatio,
    glass,
  };
}
