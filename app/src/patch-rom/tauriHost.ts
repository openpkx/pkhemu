import { invoke } from "@tauri-apps/api/core";
import { patchOrigins } from "@/preferences/gameSettings";
import { tauriGameSettingsHost } from "@/preferences/gameSettingsTauriHost";
import type { PatchRomHost } from "./patchRom";

export const tauriPatchRomHost: PatchRomHost = {
  ...patchOrigins(tauriGameSettingsHost),
  baseBuild: (folder, path) => invoke("patch_base_build", { folder, path }),
  pick: () => invoke("patch_pick"),
  bases: (folder, patch, games) => invoke("patch_bases", { folder, patch, games }),
  dropped: (file) => invoke("patch_dropped", { file }),
  checkName: (folder, system, name) => invoke("patch_check_name", { folder, system, name }),
  create: (folder, path, system, name, patch) => invoke("patch_rom", { folder, path, system, name, patch }),
};
