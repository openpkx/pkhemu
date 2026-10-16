import { invoke } from "@tauri-apps/api/core";
import { settings } from "@/settings";
import { koFi, type CoffeeHost } from "./coffee";

export const tauriCoffeeHost: CoffeeHost = {
  load: async () => ({ secondsPlayed: await settings.get("secondsPlayed"), asked: await settings.get("coffeeAsked") }),
  save: async ({ secondsPlayed, asked }) => {
    await settings.set("secondsPlayed", secondsPlayed);
    await settings.set("coffeeAsked", asked);
    await settings.save();
  },
  openKoFi: () => invoke("plugin:opener|open_url", { url: koFi }),
};
