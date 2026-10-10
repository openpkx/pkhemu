import { useEffect } from "react";
import { usePreferences, type Theme } from "@/preferences/preferences";

export function resolveTheme(theme: Theme, deviceDark: boolean): "light" | "dark" {
  if (theme !== "system") return theme;
  return deviceDark ? "dark" : "light";
}

export function useAppliedTheme() {
  const { theme } = usePreferences().preferences;

  useEffect(() => {
    const device = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = resolveTheme(theme, device.matches);
      document.documentElement.dataset.theme = resolved;
      window.androidSystemBars?.setLight(resolved === "light");
    };
    apply();
    if (theme !== "system") return;
    device.addEventListener("change", apply);
    return () => device.removeEventListener("change", apply);
  }, [theme]);
}
