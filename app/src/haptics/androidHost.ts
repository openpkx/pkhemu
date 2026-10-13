import type { HapticsHost } from "./haptics";

declare global {
  interface Window {
    androidHaptics?: { tap(): void };
  }
}

export const androidHapticsHost: HapticsHost = { tap: () => window.androidHaptics?.tap() };
