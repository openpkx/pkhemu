import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { settings } from "@/settings";
import type { Achievement, AchievementEvent, RetroAchievementsHost, Summary } from "./retroAchievements";

export const tauriRetroAchievementsHost: RetroAchievementsHost = {
  turn: (on) => invoke("retro_achievements_turn", { on }),
  account: () => invoke("retro_achievements_account"),
  signIn: (user, password) => invoke("retro_achievements_sign_in", { user, password }),
  signOut: () => invoke("retro_achievements_sign_out"),
  createAccount: () => invoke("retro_achievements_create_account"),
  openProfile: () => invoke("retro_achievements_open_profile"),
  onEvent: (listener) => {
    const unlisten = listen<AchievementEvent>("retro-achievements", (event) => listener(event.payload));
    return () => void unlisten.then((stop) => stop());
  },
  badge: (name) =>
    invoke<ArrayBuffer>("retro_achievements_badge", { name }).then(
      (bytes) => new Uint8Array(bytes),
      () => undefined,
    ),
  playing: () => invoke<Achievement[] | null>("retro_achievements_playing"),
  game: (folder, path) => invoke<Achievement[] | null>("retro_achievements_game", { folder, path }),
  summary: () => invoke<Summary | null>("retro_achievements_summary"),
  hardcore: async () => (await settings.get<boolean>("retroAchievementsHardcore")) ?? false,
  setHardcore: async (on) => {
    await settings.set("retroAchievementsHardcore", on);
    await settings.save();
  },
  leaveHardcore: () => invoke("leave_hardcore"),
  edited: (folder, path) => invoke<boolean>("edited_mark", { folder, path }),
  settleEdited: (folder, path, { trainer, sha256 }) => invoke<boolean>("settle_edited_mark", { folder, path, trainer, sha256 }),
};
