import { invoke } from "@tauri-apps/api/core";
import type { CheatsHost } from "./CheatsScreen";

export const tauriCheatsHost: CheatsHost = {
  listCheats: (folder, path) => invoke("list_cheats", { folder, path }),
  addCheat: (folder, path, name, code) => invoke("add_cheat", { folder, path, name, code }),
  editCheat: (folder, path, id, name, code) => invoke("edit_cheat", { folder, path, id, name, code }),
  deleteCheat: (folder, path, id) => invoke("delete_cheat", { folder, path, id }),
  toggleCheat: (folder, path, id, on) => invoke("toggle_cheat", { folder, path, id, on }),
};
