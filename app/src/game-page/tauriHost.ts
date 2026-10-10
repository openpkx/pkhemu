import { invoke } from "@tauri-apps/api/core";
import { tauriSaveFormatHost } from "@/preferences/gameSettingsTauriHost";
import { tauriStatesHost } from "@/save-states/tauriHost";
import { tauriTransferPakHost } from "@/transfer-pak/tauriHost";
import type { StoredCopy } from "@/transfer/keptCopies";
import type { GamePageHost } from "./GamePage";

const romNames = new Map<string, Promise<string | null>>();

function romGameName(folder: string, path: string) {
  const key = JSON.stringify([folder, path]);
  let name = romNames.get(key);
  if (!name) {
    name = invoke<string | null>("rom_game_name", { folder, path }).catch(() => null);
    romNames.set(key, name);
  }
  return name;
}

export const tauriGamePageHost: GamePageHost = {
  hasResumeState: (folder, path) => invoke("has_resume_state", { folder, path }),
  resumePreview: (folder, path) => invoke("resume_preview", { folder, path }),
  resumeInfo: (folder, path) => invoke("resume_info", { folder, path }),
  playHistory: (path) => invoke("play_history", { path }),
  applyEdit: (folder, path, edited) => invoke("apply_edit_to_file", { folder, path, edited: Array.from(edited) }),
  deleteGame: (folder, path) => invoke("delete_game", { folder, path }),
  writeTransfer: (folder, destination, source) =>
    invoke("write_transfer", {
      folder,
      destination: { ...destination, save: Array.from(destination.save) },
      source: { ...source, save: Array.from(source.save) },
    }),
  keptCopies: async (keys) =>
    (await invoke<(Omit<StoredCopy, "bytes"> & { bytes: number[] })[]>("kept_copies", { keys })).map((copy) => ({ ...copy, bytes: new Uint8Array(copy.bytes) })),
  keepCopies: (copies) => invoke("keep_copies", { copies: copies.map((copy) => ({ ...copy, bytes: Array.from(copy.bytes) })) }),
  readSave: (folder, path) => invoke("read_save_file", { folder, path }),
  readSaveFiles: (folder, path) => invoke("read_save_files", { folder, path }),
  romGameName,
  saveSummary: (sha256) => invoke("save_summary", { sha256 }),
  keepSaveSummary: (sha256, summary) => invoke("keep_save_summary", { sha256, summary }),
  saveFormat: tauriSaveFormatHost.saveFormat,
  keepSaveFormat: tauriSaveFormatHost.keepSaveFormat,
  listBackups: (folder, path) => invoke("list_backups", { folder, path }),
  readBackup: async (folder, path, name) => new Uint8Array(await invoke<ArrayBuffer>("read_backup", { folder, path, name })),
  restoreBackup: (folder, path, name, keep) => invoke("restore_backup", { folder, path, name, keep }),
  deleteBackup: (folder, path, name) => invoke("delete_backup", { folder, path, name }),
  listStates: tauriStatesHost.listStates,
  stateScreenshot: tauriStatesHost.stateScreenshot,
  deleteState: tauriStatesHost.deleteState,
  transferPak: tauriTransferPakHost.transferPak,
  chooseTransferPak: tauriTransferPakHost.chooseTransferPak,
};
