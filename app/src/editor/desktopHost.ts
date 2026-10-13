import { basename, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import type { ExportHost } from "./exportFile";
import type { PokemonFileHost } from "./pokemonFile";

export const desktopExportHost: ExportHost = {
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

export const desktopPokemonFileHost: PokemonFileHost = {
  pick: async () => {
    const path = await open({ multiple: false, directory: false });
    if (!path) return null;
    return { name: await basename(path), bytes: await readFile(path) };
  },
};
