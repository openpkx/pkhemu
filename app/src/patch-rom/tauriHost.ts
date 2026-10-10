import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { patchOrigins } from "@/preferences/gameSettings";
import { tauriGameSettingsHost } from "@/preferences/gameSettingsTauriHost";
import type { PatchRomHost } from "./patchRom";

export const androidPatchRomHost: PatchRomHost = {
  ...patchOrigins(tauriGameSettingsHost),
  baseBuild: (folder, path) => invoke("patch_base_build", { folder, path }),
  pick: () => invoke("patch_pick"),
  dropped: (file) => invoke("patch_dropped", { file }),
  checkName: (folder, system, name) => invoke("patch_check_name", { folder, system, name }),
  create: (folder, path, system, name, patch) => invoke("patch_rom", { folder, path, system, name, patch }),
};

export const tauriPatchRomHost: PatchRomHost = {
  ...androidPatchRomHost,
  watchDrops: (listener) => {
    const unlisten = getCurrentWindow().onDragDropEvent(({ payload }) => {
      if (payload.type === "enter") listener.hover(true);
      else if (payload.type === "leave") listener.hover(false);
      else if (payload.type === "drop") listener.drop(payload.paths);
    });
    return () => void unlisten.then((stop) => stop());
  },
};
