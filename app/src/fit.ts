export type Size = { width: number; height: number };
export type Point = { x: number; y: number };
export const origin: Point = { x: 0, y: 0 };

const MIN_WHOLE_FILL = 0.85;

export function fit(frame: Size, space: Size): Size {
  const fractional = Math.min(space.width / frame.width, space.height / frame.height);
  const whole = Math.floor(fractional);
  const scale = whole >= 1 && (whole / fractional) ** 2 >= MIN_WHOLE_FILL ? whole : fractional;
  return { width: Math.round(frame.width * scale), height: Math.round(frame.height * scale) };
}

export type Shell = { border: number; gap?: number };

export function fitInShell(frame: Size, space: Size, shell?: Shell): { image: Size; border: number } {
  const border = shell?.border ?? 0;
  const image = fit(frame, { width: Math.max(space.width - 2 * border, 0), height: Math.max(space.height - 2 * border, 0) });
  return { image, border };
}
