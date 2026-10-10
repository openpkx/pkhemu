import { invoke } from "@tauri-apps/api/core";
import type { LibraryHost } from "./library";
import type { DirEntry } from "./scan";
import { tauriLibraryHost } from "./tauriHost";

export const androidLibraryHost: LibraryHost = {
  ...tauriLibraryHost,
  listDir: (folder, path) => invoke<DirEntry[]>("games_folder_read_dir", { folder, path }),
};
