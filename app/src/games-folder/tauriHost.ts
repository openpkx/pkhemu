import { settings } from "@/settings";
import type { GamesFolderHost } from "./gamesFolder";

export const tauriGamesFolderHost: Pick<GamesFolderHost, "loadSaved" | "save"> = {
  loadSaved: async () => (await settings.get<string>("gamesFolder")) ?? null,
  save: async (folder) => {
    await settings.set("gamesFolder", folder);
    await settings.save();
  },
};
