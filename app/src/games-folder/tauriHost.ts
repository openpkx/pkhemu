import { invoke } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
import { settings } from "@/settings";
import type { GamesFolderHost } from "./gamesFolder";

export const tauriGamesFolderHost: GamesFolderHost = {
  pickFolder: () => open({ directory: true, recursive: true }),
  ensureFolder: async (parent, name) => mkdir(await join(parent, name), { recursive: true }),
  folderExists: (path) => exists(path),
  loadSaved: async () => (await settings.get<string>("gamesFolder")) ?? null,
  save: async (folder) => {
    await settings.set("gamesFolder", folder);
    await settings.save();
  },
  label: (folder) => folder,
  openFolder: () => invoke("games_folder_open"),
};
