import { settings } from "@/settings";
import type { PreferencesHost } from "./preferences";

export const tauriPreferencesHost: PreferencesHost = {
  load: async () => ({
    touchControls: await settings.get("touchControls"),
    fastForwardSpeed: await settings.get("fastForwardSpeed"),
    showFps: await settings.get("showFps"),
    theme: await settings.get("theme"),
    eventsNoticeDismissed: await settings.get("eventsNoticeDismissed"),
    gameClockOffset: await settings.get("gameClockOffset"),
    restoreBackupsKept: await settings.get("restoreBackupsKept"),
  }),
  save: async ({ touchControls, fastForwardSpeed, showFps, theme, eventsNoticeDismissed, gameClockOffset, restoreBackupsKept }) => {
    await settings.set("touchControls", touchControls);
    await settings.set("fastForwardSpeed", fastForwardSpeed);
    await settings.set("showFps", showFps);
    await settings.set("theme", theme);
    await settings.set("eventsNoticeDismissed", eventsNoticeDismissed);
    await settings.set("gameClockOffset", gameClockOffset);
    await settings.set("restoreBackupsKept", restoreBackupsKept);
    await settings.save();
  },
};
