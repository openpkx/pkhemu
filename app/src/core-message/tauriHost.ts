import { listen } from "@tauri-apps/api/event";
import type { CoreMessage, CoreMessages } from "./CoreMessage";

export const tauriCoreMessages: CoreMessages = (listener) => {
  const unlisten = listen<CoreMessage>("core-message", (event) => listener(event.payload));
  return () => void unlisten.then((stop) => stop());
};
