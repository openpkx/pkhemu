import { settings } from "@/settings";
import type { CalibrationsHost } from "./calibrations";

export const tauriCalibrationsHost: CalibrationsHost = {
  load: () => settings.get("calibrations"),
  save: async (calibrations) => {
    await settings.set("calibrations", calibrations);
    await settings.save();
  },
};
