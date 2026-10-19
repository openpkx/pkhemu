import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Download, GameSyncEvent, SyncHost, SyncRun, SyncStatus } from "./sync";

export const tauriSyncHost: SyncHost = {
  available: () => invoke("sync_available"),
  account: () => invoke("sync_account"),
  lastSynced: () => invoke("sync_last_synced"),
  gamesLastSynced: () => invoke("sync_games_last_synced"),
  signIn: (cloud) => invoke("sync_sign_in", { cloud }),
  signOut: () => invoke("sync_sign_out"),
  syncAll: (folder, now) => invoke("sync_all", { folder, now }),
  syncGame: (folder, path) => invoke("sync_game", { folder, path }),
  conflicts: (folder, path) => invoke("sync_conflicts", { folder, path }),
  resolve: (folder, path, file, choice) => invoke("sync_resolve", { folder, path, file, choice }),
  cloudSave: (folder, path) => invoke("sync_cloud_save", { folder, path }),
  cloudScreenshot: (folder, path, file) => invoke("sync_cloud_screenshot", { folder, path, file }),
  onStatus: (listener) => {
    const unlisten = listen<SyncStatus>("sync-status", (event) => listener(event.payload));
    return () => void unlisten.then((stop) => stop());
  },
  onGame: (listener) => {
    const unlisten = listen<GameSyncEvent>("sync-game", (event) => listener(event.payload));
    return () => void unlisten.then((stop) => stop());
  },
  onRun: (listener) => {
    const unlisten = listen<SyncRun>("sync-run", (event) => listener(event.payload));
    return () => void unlisten.then((stop) => stop());
  },
  onCatalog: (listener) => {
    const unlisten = listen("sync-catalog", () => listener());
    return () => void unlisten.then((stop) => stop());
  },
  mobileData: () => invoke("sync_mobile_data"),
  setMobileData: (on) => invoke("sync_set_mobile_data", { on }),
  cloudGames: (folder) => invoke("sync_cloud_games", { folder }),
  mobileDownloadSize: (folder, path) => invoke("sync_mobile_download_size", { folder, path }),
  downloadRom: (folder, path) => invoke("sync_download_rom", { folder, path }),
  onDownload: (listener) => {
    const unlisten = listen<Download>("sync-download", (event) => listener(event.payload));
    return () => void unlisten.then((stop) => stop());
  },
  removeFromDevice: (folder, path) => invoke("sync_remove_from_device", { folder, path }),
};
