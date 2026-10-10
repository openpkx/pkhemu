import { invoke } from "@tauri-apps/api/core";
import type { StatesHost } from "./StatesScreen";

export const tauriStatesHost: StatesHost = {
  listStates: (folder, path) => invoke("list_states", { folder, path }),
  stateScreenshot: (folder, path, slot) => invoke("state_screenshot", { folder, path, slot }),
  saveState: (slot) => invoke("save_state", { slot }),
  loadState: (folder, path, slot) => invoke("load_state", { folder, path, slot }),
  undoLoadState: (folder, path) => invoke("undo_load_state", { folder, path }),
  deleteState: (folder, path, slot) => invoke("delete_state", { folder, path, slot }),
};
