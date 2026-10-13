import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ImportHost } from "./importFiles";

export const tauriImportHost: ImportHost = {
  pick: () => invoke("import_pick"),
  opened: () => invoke("import_opened"),
  onOpened: (listener) => {
    const unlisten = listen("files-opened", () => listener());
    return () => void unlisten.then((stop) => stop());
  },
  sha1s: (folder, paths) => invoke("import_sha1s", { folder, paths }),
  copyRom: (folder, file, path) => invoke("import_rom", { folder, file, path }),
  copyDemo: (folder) => invoke("import_demo", { folder }),
  existingSave: (folder, rom, { file, name }) => invoke("import_existing_save", { folder, rom, file, name }),
  copySave: (folder, { game, file: { file, name }, clock }) => invoke("import_save", { folder, rom: game, file, name, clock: clock?.file ?? null }),
  pickFolder: () => invoke("import_pick_folder"),
  scan: (folder, hash) => invoke("import_scan", { folder, hash }),
};
