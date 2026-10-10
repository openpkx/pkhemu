import { invoke } from "@tauri-apps/api/core";
import type { DirEntry } from "@/library/scan";
import type { GamesFolderHost } from "./gamesFolder";
import { tauriGamesFolderHost } from "./tauriHost";

export const androidGamesFolderHost: GamesFolderHost = {
  ...tauriGamesFolderHost,
  pickFolder: () => invoke<string | null>("games_folder_pick"),
  makeFolder: () => invoke<string | null>("games_folder_make"),
  findFolder: () => invoke<string | null>("games_folder_find"),
  listFolders: async (folder) =>
    (await invoke<DirEntry[]>("games_folder_read_dir", { folder, path: "" })).filter((entry) => entry.isDirectory).map((entry) => entry.name),
  ensureFolder: (folder, name) => invoke("games_folder_create_dir", { folder, path: name }),
  folderExists: (folder) => invoke<boolean>("games_folder_exists", { folder }),
  save: async (folder) => {
    await invoke("games_folder_keep", { folder });
    await tauriGamesFolderHost.save(folder);
  },
  label: (folder) => {
    const { uri } = JSON.parse(folder) as { uri: string };
    const id = decodeURIComponent(uri.split("/tree/")[1]?.split("/")[0] ?? uri);
    return id.slice(id.indexOf(":") + 1) || id;
  },
  device: "phone",
  openFolder: undefined,
};
