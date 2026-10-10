import { invoke } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { readDir } from "@tauri-apps/plugin-fs";
import type { LibraryHost } from "./library";

export const tauriLibraryHost: LibraryHost = {
  listDir: async (folder, path) =>
    (await readDir(path ? await join(folder, path) : folder)).map(({ name, isDirectory }) => ({ name, isDirectory })),
  recentlyPlayed: (limit) => invoke("recently_played", { limit }),
  scanGameArt: (folder, paths) => invoke("game_art_scan", { folder, paths }),
  resumeScreenshot: (folder, path) => invoke("resume_screenshot", { folder, path }),
  hasResumeState: (folder, path) => invoke("has_resume_state", { folder, path }),
  playHistory: (path) => invoke("play_history", { path }),
};
