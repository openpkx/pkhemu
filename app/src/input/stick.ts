export type Analog = [leftX: number, leftY: number, rightX: number, rightY: number];

export const centred: Analog = [0, 0, 0, 0];

export function tilt(x: number, y: number, deadZone: number, scale = 1): [number, number] {
  const distance = Math.hypot(x, y);
  if (distance <= deadZone) return [0, 0];
  const tilted = Math.min(1, ((distance - deadZone) / (1 - deadZone)) * scale);
  return [(x / distance) * tilted, (y / distance) * tilted];
}

export function clampToCircle(x: number, y: number): [number, number] {
  const distance = Math.hypot(x, y);
  return distance > 1 ? [x / distance, y / distance] : [x, y];
}

export const toAxis = (value: number) => Math.max(-0x8000, Math.min(0x7fff, Math.round(value * 0x7fff)));
