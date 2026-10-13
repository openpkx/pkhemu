import { listen } from "@tauri-apps/api/event";

export type PauseRequests = (listener: () => void) => () => void;

export const tauriPauseRequests: PauseRequests = (listener) => {
  const unlisten = listen("pause-game", () => listener());
  return () => void unlisten.then((stop) => stop());
};
