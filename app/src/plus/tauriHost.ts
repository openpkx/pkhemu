import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { PlusHost, PlusStatus } from "./plus";

export const tauriPlusHost: PlusHost = {
  status: () => invoke("plus_status"),
  buy: () => invoke("plus_buy"),
  restore: () => invoke("plus_restore"),
  onStatus: (listener) => {
    const unlisten = listen<PlusStatus>("plus-status", (event) => listener(event.payload));
    return () => void unlisten.then((stop) => stop());
  },
};
