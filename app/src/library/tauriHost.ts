import { invoke } from "@tauri-apps/api/core";
import type { LibraryHost } from "./library";

export const tauriLibraryHost: Omit<LibraryHost, "listDir"> = {
  recentlyPlayed: (limit) => invoke("recently_played", { limit }),
  scanGameArt: (folder, paths) => invoke("game_art_scan", { folder, paths }),
  resumeScreenshot: (folder, path) => invoke("resume_screenshot", { folder, path }),
  hasResumeState: (folder, path) => invoke("has_resume_state", { folder, path }),
  playHistory: (path) => invoke("play_history", { path }),
};
