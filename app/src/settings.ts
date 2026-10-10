import { LazyStore } from "@tauri-apps/plugin-store";

export const settings = new LazyStore("settings.json");
