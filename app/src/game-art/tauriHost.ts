import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { GameArtHost, GameArtProgress } from "./gameArt";

type Art = { status: string; manifest: { keys: string[] } | null };

export const tauriGameArtHost: GameArtHost = {
  sha1: (path) => invoke<string | null>("game_art_sha1", { path }),
  keys: async (sha1) => (await invoke<Art | null>("game_art_manifest", { sha1 }))?.manifest?.keys ?? [],
  image: async (sha1, key) => new Uint8Array(await invoke<ArrayBuffer>("game_art_image", { sha1, key })),
  lenders: () => invoke("game_art_lenders"),
  onChanged: (listener) => {
    const unlisten = listen<string>("game-art-changed", (event) => listener(event.payload));
    return () => void unlisten.then((stop) => stop());
  },
  status: (path) => invoke("game_art_status", { path }),
  reextract: (folder, path) => invoke("game_art_reextract", { folder, path }),
  reextractAll: () => invoke("game_art_reextract_all"),
  progress: () => invoke("game_art_progress"),
  onProgress: (listener) => {
    const unlisten = listen<GameArtProgress | null>("game-art-progress", (event) => listener(event.payload));
    return () => void unlisten.then((stop) => stop());
  },
};
