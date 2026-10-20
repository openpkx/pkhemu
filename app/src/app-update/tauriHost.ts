import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AppUpdateHost } from "./appUpdate";

export const tauriAppUpdateHost: AppUpdateHost = {
  check: () => invoke("app_update_check"),
  start: () => invoke("app_update_start"),
  complete: () => invoke("app_update_complete"),
  onInstallState: (listener) => {
    const unlistens = [
      listen<{ bytesDownloaded: number; totalBytesToDownload: number }>("app-update-downloading", ({ payload }) =>
        listener({ status: "downloading", ...payload }),
      ),
      listen("app-update-downloaded", () => listener({ status: "downloaded" })),
      listen("app-update-stopped", () => listener({ status: "stopped" })),
    ];
    return () => unlistens.forEach((unlisten) => void unlisten.then((stop) => stop()));
  },
};
