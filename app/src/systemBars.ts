import { useEffect } from "react";

declare global {
  interface Window {
    androidSystemBars?: { setHidden(hidden: boolean): void; setLight(light: boolean): void };
  }
}

export function useHiddenSystemBars() {
  useEffect(() => {
    window.androidSystemBars?.setHidden(true);
    return () => window.androidSystemBars?.setHidden(false);
  }, []);
}
