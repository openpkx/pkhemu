import { invoke } from "@tauri-apps/api/core";
import { basename, join } from "@tauri-apps/api/path";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import type { ClipboardHost } from "./clipboard";
import type { ExportHost } from "./exportFile";
import type { PokemonFileHost } from "./pokemonFile";
import type { UndoHost } from "./undo";

export const tauriSaveHost: UndoHost = {
  read: async () => new Uint8Array(await invoke<ArrayBuffer>("read_save")),
  apply: (edited) => invoke("apply_edit", edited),
  playTimeSinceSave: () => invoke("play_time_since_save"),
  undo: () => invoke("undo_edit"),
  canUndo: () => invoke("can_undo_edit"),
};

export const tauriExportHost: ExportHost = {
  saveFile: async ({ bytes, fileName }) => {
    const path = await save({ defaultPath: fileName });
    if (!path) return undefined;
    await writeFile(path, bytes);
    return basename(path);
  },
  saveFiles: async (files) => {
    const folder = await open({ directory: true });
    if (!folder) return undefined;
    for (const { bytes, fileName } of files) await writeFile(await join(folder, fileName), bytes);
    return files.map((file) => file.fileName).join(", ");
  },
};

export const tauriPokemonFileHost: PokemonFileHost = {
  pick: async () => {
    const path = await open({ multiple: false, directory: false });
    if (!path) return null;
    return { name: await basename(path), bytes: await readFile(path) };
  },
};

export const tauriClipboardHost: ClipboardHost = { writeText };
