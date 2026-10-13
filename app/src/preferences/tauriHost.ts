import { settings } from "@/settings";
import type { PreferencesHost } from "./preferences";

export const tauriPreferencesHost: PreferencesHost = {
  load: async () => ({
    touchControls: await settings.get("touchControls"),
    fastForwardSpeed: await settings.get("fastForwardSpeed"),
    showFps: await settings.get("showFps"),
    theme: await settings.get("theme"),
    eventsNoticeDismissed: await settings.get("eventsNoticeDismissed"),
    updateDismissedVersion: await settings.get("updateDismissedVersion"),
    gameClockOffset: await settings.get("gameClockOffset"),
    restoreBackupsKept: await settings.get("restoreBackupsKept"),
    playInSilentMode: await settings.get("playInSilentMode"),
    renderer: await settings.get("renderer"),
  }),
  save: async ({
    touchControls,
    fastForwardSpeed,
    showFps,
    theme,
    eventsNoticeDismissed,
    updateDismissedVersion,
    gameClockOffset,
    restoreBackupsKept,
    playInSilentMode,
    renderer,
  }) => {
    await settings.set("touchControls", touchControls);
    await settings.set("fastForwardSpeed", fastForwardSpeed);
    await settings.set("showFps", showFps);
    await settings.set("theme", theme);
    await settings.set("eventsNoticeDismissed", eventsNoticeDismissed);
    await settings.set("updateDismissedVersion", updateDismissedVersion);
    await settings.set("gameClockOffset", gameClockOffset);
    await settings.set("restoreBackupsKept", restoreBackupsKept);
    await settings.set("playInSilentMode", playInSilentMode);
    await settings.set("renderer", renderer);
    await settings.save();
  },
};
