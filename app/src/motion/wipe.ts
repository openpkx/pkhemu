import type { CSSProperties } from "react";

const SOFT_EDGE_PERCENT = 34;

export function wipe(from: "left" | "right", progress: number, reduced: boolean): { layer: CSSProperties; light?: CSSProperties } {
  if (reduced) return { layer: { opacity: progress } };
  const front = progress * (100 + SOFT_EDGE_PERCENT);
  const back = front - SOFT_EDGE_PERCENT;
  const side = from === "right" ? "to left" : "to right";
  const mask = `linear-gradient(${side}, #000 ${back}%, transparent ${front}%)`;
  return {
    layer: { maskImage: mask, WebkitMaskImage: mask },
    light: {
      background: `linear-gradient(${side}, transparent ${back}%, #ffffff ${front - SOFT_EDGE_PERCENT / 2}%, transparent ${front}%)`,
      opacity: 0.35 * Math.sin(Math.PI * progress),
    },
  };
}
