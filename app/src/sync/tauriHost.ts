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
  syncAll: (folder) => invoke("sync_all", { folder }),
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
  syncGames: () => invoke("sync_games"),
  setSyncGames: (on) => invoke("sync_set_games", { on }),
  setMobileData: (mobileData) => invoke("sync_set_mobile_data", { mobileData }),
  cloudGames: (folder) => invoke("sync_cloud_games", { folder }),
  mobileDownloadSize: (folder, path) => invoke("sync_mobile_download_size", { folder, path }),
  downloadRom: (folder, path) => invoke("sync_download_rom", { folder, path }),
  onDownload: (listener) => {
    const unlisten = listen<Download>("sync-download", (event) => listener(event.payload));
    return () => void unlisten.then((stop) => stop());
  },
  removeFromDevice: (folder, path) => invoke("sync_remove_from_device", { folder, path }),
};
