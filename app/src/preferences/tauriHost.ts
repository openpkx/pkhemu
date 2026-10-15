import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { settings } from "@/settings";
import type { System } from "@/systems";
import type { PreferencesHost } from "./preferences";

export const tauriPreferencesHost: PreferencesHost = {
  load: async () => ({
    touchControls: await settings.get("touchControls"),
    fastForwardSpeed: await settings.get("fastForwardSpeed"),
    stickSensitivity: await settings.get("stickSensitivity"),
    showFps: await settings.get("showFps"),
    theme: await settings.get("theme"),
    eventsNoticeDismissed: await settings.get("eventsNoticeDismissed"),
    updateDismissedVersion: await settings.get("updateDismissedVersion"),
    gameClockOffset: await settings.get("gameClockOffset"),
    restoreBackupsKept: await settings.get("restoreBackupsKept"),
    playInSilentMode: await settings.get("playInSilentMode"),
    renderer: await settings.get("renderer"),
    skins: await invoke("skins"),
    skinHintSeen: await settings.get("skinHintSeen"),
    screenDepth: await settings.get("screenDepth"),
    screenGlass: await settings.get("screenGlass"),
    asyncShaders: await settings.get("asyncShaders"),
  }),
  save: async ({
    touchControls,
    fastForwardSpeed,
    stickSensitivity,
    showFps,
    theme,
    eventsNoticeDismissed,
    updateDismissedVersion,
    gameClockOffset,
    restoreBackupsKept,
    playInSilentMode,
    renderer,
    skinHintSeen,
    screenDepth,
    screenGlass,
    asyncShaders,
  }) => {
    await settings.set("touchControls", touchControls);
    await settings.set("fastForwardSpeed", fastForwardSpeed);
    await settings.set("stickSensitivity", stickSensitivity);
    await settings.set("showFps", showFps);
    await settings.set("theme", theme);
    await settings.set("eventsNoticeDismissed", eventsNoticeDismissed);
    await settings.set("updateDismissedVersion", updateDismissedVersion);
    await settings.set("gameClockOffset", gameClockOffset);
    await settings.set("restoreBackupsKept", restoreBackupsKept);
    await settings.set("playInSilentMode", playInSilentMode);
    await settings.set("renderer", renderer);
    await settings.set("skinHintSeen", skinHintSeen);
    await settings.set("screenDepth", screenDepth);
    await settings.set("screenGlass", screenGlass);
    await settings.set("asyncShaders", asyncShaders);
    await settings.save();
  },
  chooseSkin: (system, { skin, look }) => invoke("choose_skin", { system, skin, look }),
  onSkinsChanged: (listener) => {
    const unlisten = listen<Partial<Record<System, unknown>>>("skins-changed", (event) => listener(event.payload));
    return () => void unlisten.then((stop) => stop());
  },
};
