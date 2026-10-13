import { getCurrentWindow } from "@tauri-apps/api/window";
import type { PatchRomHost } from "./patchRom";
import { tauriPatchRomHost } from "./tauriHost";

export const desktopPatchRomHost: PatchRomHost = {
  ...tauriPatchRomHost,
  watchDrops: (listener) => {
    const unlisten = getCurrentWindow().onDragDropEvent(({ payload }) => {
      if (payload.type === "enter") listener.hover(true);
      else if (payload.type === "leave") listener.hover(false);
      else if (payload.type === "drop") listener.drop(payload.paths);
    });
    return () => void unlisten.then((stop) => stop());
  },
};
