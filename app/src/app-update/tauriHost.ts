import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AppUpdateHost } from "./appUpdate";

export const tauriAppUpdateHost: AppUpdateHost = {
  check: () => invoke("app_update_check"),
  start: () => invoke("app_update_start"),
  complete: () => invoke("app_update_complete"),
  onDownloaded: (listener) => {
    const unlisten = listen("app-update-downloaded", () => listener());
    return () => void unlisten.then((stop) => stop());
  },
};
