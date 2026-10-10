import { settings } from "@/settings";
import { saveFormats, type GameSettings, type GameSettingsHost } from "./gameSettings";

type Games = Record<string, Partial<GameSettings>>;

export const tauriGameSettingsHost: GameSettingsHost = {
  load: async (path) => (await settings.get<Games>("games"))?.[path] ?? {},
  save: async (path, game) => {
    await settings.set("games", { ...(await settings.get<Games>("games")), [path]: game });
    await settings.save();
  },
};

export const tauriSaveFormatHost = saveFormats(tauriGameSettingsHost);
