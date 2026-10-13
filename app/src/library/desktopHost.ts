import { join } from "@tauri-apps/api/path";
import { readDir } from "@tauri-apps/plugin-fs";
import type { LibraryHost } from "./library";
import { tauriLibraryHost } from "./tauriHost";

export const desktopLibraryHost: LibraryHost = {
  ...tauriLibraryHost,
  listDir: async (folder, path) =>
    (await readDir(path ? await join(folder, path) : folder)).map(({ name, isDirectory }) => ({ name, isDirectory })),
};
