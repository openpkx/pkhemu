import { invoke } from "@tauri-apps/api/core";
import type { ExportHost } from "./exportFile";
import type { PokemonFileHost } from "./pokemonFile";

export const iosPokemonFileHost: PokemonFileHost = {
  pick: async () => {
    const picked = await invoke<{ name: string; bytes: number[] } | null>("pokemon_file_pick");
    return picked && { name: picked.name, bytes: new Uint8Array(picked.bytes) };
  },
};

export const iosExportHost: ExportHost = {
  saveFile: async ({ bytes, fileName }) => {
    await invoke("export_share", bytes, { headers: { name: encodeURIComponent(fileName) } });
    return undefined;
  },
  saveFiles: async (files) => {
    await invoke("export_share_files", { files: files.map(({ bytes, fileName }) => ({ name: fileName, bytes: Array.from(bytes) })) });
    return undefined;
  },
};
