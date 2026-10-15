import type { ShadersHost } from "./shaders";

export const desktopShadersHost: ShadersHost = {
  offered: async () => true,
  onLine: "New scenes load without freezing.",
};
