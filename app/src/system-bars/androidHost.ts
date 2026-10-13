import type { SystemBarsHost } from "./systemBars";

declare global {
  interface Window {
    androidSystemBars?: { setHidden(hidden: boolean): void; setLight(light: boolean): void; splashHidden(): void };
  }
}

export const androidSystemBarsHost: SystemBarsHost = {
  setHidden: (hidden) => window.androidSystemBars?.setHidden(hidden),
  setLight: (light) => window.androidSystemBars?.setLight(light),
  splashHidden: () => window.androidSystemBars?.splashHidden(),
};
