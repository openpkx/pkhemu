import { invoke } from "@tauri-apps/api/core";
import { documentDir, join } from "@tauri-apps/api/path";
import type { GamesFolderHost } from "./gamesFolder";
import { desktopGamesFolderHost } from "./desktopHost";
import { tauriGamesFolderHost } from "./tauriHost";

declare global {
  interface Window {
    iosDevice?: "iPhone" | "iPad";
  }
}

// An update can move the app's container, so the folder is saved relative to Documents.
async function inDocuments(folder: string) {
  const documents = `${await documentDir()}/`;
  if (!folder.startsWith(documents)) throw new Error(`${folder} isn't in the app's Documents`);
  return folder.slice(documents.length);
}

export const iosGamesFolderHost: GamesFolderHost = {
  ...desktopGamesFolderHost,
  pickFolder: undefined,
  findFolder: undefined,
  makeFolder: () => invoke<string>("games_folder_make"),
  loadSaved: async () => {
    const saved = await tauriGamesFolderHost.loadSaved();
    return saved && join(await documentDir(), saved);
  },
  save: async (folder) => tauriGamesFolderHost.save(await inDocuments(folder)),
  label: (folder) => folder.slice(folder.lastIndexOf("/") + 1),
  device: window.iosDevice ?? "iPhone",
};
