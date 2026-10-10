import { invoke } from "@tauri-apps/api/core";
import { documentDir, join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { exists, mkdir, readDir } from "@tauri-apps/plugin-fs";
import { settings } from "@/settings";
import type { GamesFolderHost } from "./gamesFolder";

export const tauriGamesFolderHost: GamesFolderHost = {
  pickFolder: () => open({ directory: true, recursive: true }),
  // A folder that was already there would prompt for Documents access when read, so the player picks it instead.
  makeFolder: async () => {
    const { path, made } = await invoke<{ path: string; made: boolean }>("games_folder_make");
    return made ? path : open({ directory: true, recursive: true, defaultPath: path });
  },
  // A missing defaultPath opens its parent, Documents.
  findFolder: async () => open({ directory: true, recursive: true, defaultPath: await join(await documentDir(), "pkhemu") }),
  listFolders: async (folder) => (await readDir(folder)).filter((entry) => entry.isDirectory).map((entry) => entry.name),
  ensureFolder: async (parent, name) => mkdir(await join(parent, name), { recursive: true }),
  folderExists: (path) => exists(path),
  loadSaved: async () => (await settings.get<string>("gamesFolder")) ?? null,
  save: async (folder) => {
    await settings.set("gamesFolder", folder);
    await settings.save();
  },
  label: (folder) => folder,
  device: "Mac",
  openFolder: () => invoke("games_folder_open"),
};
