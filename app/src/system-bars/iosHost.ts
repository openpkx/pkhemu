import { invoke } from "@tauri-apps/api/core";
import type { SystemBarsHost } from "./systemBars";

export const iosSystemBarsHost: SystemBarsHost = {
  setHidden: (hidden) => void invoke("system_bars_set_hidden", { hidden }).catch((error) => console.error(error)),
  setLight: (light) => void invoke("system_bars_set_light", { light }).catch((error) => console.error(error)),
  splashHidden() {},
};
