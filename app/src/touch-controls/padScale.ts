import { useSyncExternalStore } from "react";
import { onResize } from "@/lib/onResize";

export const MAX_PAD_SCALE = 1.4;
const GROWS_FROM = { width: 600, height: 880 };

export function padScale(width: number, height: number) {
  if (width > height) return 1;
  const room = Math.min(width / GROWS_FROM.width, height / GROWS_FROM.height);
  return Math.min(Math.max(room, 1), MAX_PAD_SCALE);
}

export function usePadScale() {
  return useSyncExternalStore(onResize, () => padScale(innerWidth, innerHeight));
}
