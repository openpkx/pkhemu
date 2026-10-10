import type { Gravity } from "@/gravity";
import type { Tilt } from "@/motion/tilt";

export { TILT, type Tilt } from "@/motion/tilt";

const [x, y] = (new URLSearchParams(location.search).get("shift") ?? "0,0").split(",").map(Number);

// Holds the shift the URL asks for, which can reach past the tilt's length limit to show a corner at full depth.
export function tilt(_previous: Tilt | undefined, reading: Gravity, at: number): Tilt {
  return { at, reading, neutral: reading, shift: { x, y } };
}
