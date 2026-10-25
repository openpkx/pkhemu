const MAX_LIFT = 128;

export function controlsLift(spare: number, scale: number) {
  return Math.max(0, Math.min(spare / 2, MAX_LIFT * scale));
}
