import { invoke } from "@tauri-apps/api/core";
import type { ImportHost } from "./importFiles";

export const tauriImportHost: ImportHost = {
  pick: () => invoke("import_pick"),
  sha1s: (folder, paths) => invoke("import_sha1s", { folder, paths }),
  copyRom: (folder, file, path) => invoke("import_rom", { folder, file, path }),
  existingSave: (folder, rom, { file, name }) => invoke("import_existing_save", { folder, rom, file, name }),
  copySave: (folder, rom, { file, name }) => invoke("import_save", { folder, rom, file, name }),
  pickFolder: () => invoke("import_pick_folder"),
  scan: (folder, hash) => invoke("import_scan", { folder, hash }),
};
