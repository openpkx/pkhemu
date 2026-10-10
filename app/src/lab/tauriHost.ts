import { settings } from "@/settings";
import type { ExperimentsHost } from "./lab";

export const tauriExperimentsHost: ExperimentsHost = {
  load: () => settings.get("experiments"),
  save: async (values) => {
    await settings.set("experiments", values);
    await settings.save();
  },
};
