import { useSyncExternalStore } from "react";
import { onResize } from "@/lib/onResize";
import type { Size } from "./fit";
import type { System } from "./systems";

// Shorter than a phone, the portrait controls leave the game a stamp, and the landscape layout's controls over it leave more. A DS keeps its touch screen
// clear of them there, though, which from this size shrinks it more than the portrait controls do.
const PHONE_HEIGHT = 640;
const DS_PORTRAIT = { width: 432, height: 580 };

export function portraitLayout({ width, height }: Size, system: System) {
  if (height < width) return false;
  return height >= PHONE_HEIGHT || (system === "nds" && width >= DS_PORTRAIT.width && height >= DS_PORTRAIT.height);
}

export function usePortraitLayout(system: System) {
  return useSyncExternalStore(onResize, () => portraitLayout({ width: innerWidth, height: innerHeight }, system));
}
