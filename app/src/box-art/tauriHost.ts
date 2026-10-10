import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { BoxArtHost, ChosenBoxArt, Listing } from "./boxArt";

export const tauriBoxArtHost: BoxArtHost = {
  chosen: async (folder, path) => (await invoke<ChosenBoxArt | null>("box_art_chosen", { folder, path })) ?? undefined,
  onChanged: (listener) => {
    const unlisten = listen<string>("box-art-changed", (event) => listener(event.payload));
    return () => void unlisten.then((stop) => stop());
  },
  read: (system, name) =>
    invoke<ArrayBuffer>("box_art_read", { system, name }).then(
      (bytes) => new Uint8Array(bytes),
      () => undefined,
    ),
  write: (system, name, bytes) =>
    invoke("box_art_write", bytes, { headers: { system, name: encodeURIComponent(name) } }),
  readListing: (system, kind) => invoke<Listing | null>("box_art_listing_read", { system, kind }).then((listing) => listing ?? undefined),
  writeListing: (system, kind, listing) => invoke("box_art_listing_write", { system, kind, listing }),
  download: (url) =>
    invoke<ArrayBuffer>("box_art_download", { url }).then((bytes) => (bytes.byteLength ? new Uint8Array(bytes) : undefined)),
  choose: (folder, path, image) =>
    invoke("box_art_choose", image, { headers: { folder: encodeURIComponent(folder), path: encodeURIComponent(path) } }),
  chooseUrl: (folder, path, url) => invoke("box_art_choose_url", { folder, path, url }),
  chooseFile: (folder, path) => invoke<boolean>("box_art_choose_file", { folder, path }),
  chooseNone: (folder, path) => invoke("box_art_choose_none", { folder, path }),
  chooseDefault: (folder, path) => invoke("box_art_use_default", { folder, path }),
};
