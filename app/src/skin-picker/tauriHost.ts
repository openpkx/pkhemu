import { invoke } from "@tauri-apps/api/core";
import type { PreviewFrameHost } from "./previewFrame";

export const tauriPreviewFrameHost: PreviewFrameHost = {
  pausedScreenshot: () => invoke("paused_screenshot"),
  recentlyPlayed: (limit) => invoke("recently_played", { limit }),
  lastScreenshot: (folder, path) => invoke("last_screenshot", { folder, path }),
};
