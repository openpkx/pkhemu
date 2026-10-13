import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { ClipboardHost } from "./clipboard";
import type { UndoHost } from "./undo";

export const tauriSaveHost: UndoHost = {
  read: async () => new Uint8Array(await invoke<ArrayBuffer>("read_save")),
  apply: (edited) => invoke("apply_edit", edited),
  playTimeSinceSave: () => invoke("play_time_since_save"),
  undo: () => invoke("undo_edit"),
  canUndo: () => invoke("can_undo_edit"),
};

export const tauriClipboardHost: ClipboardHost = { writeText };
