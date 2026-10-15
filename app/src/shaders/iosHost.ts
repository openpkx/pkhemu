import type { ShadersHost } from "./shaders";

// Without the ubershader fallback, a draw whose shaders are still compiling is skipped.
export const iosShadersHost: ShadersHost = {
  offered: async () => true,
  onLine: "New scenes freeze less, but may flicker for a moment.",
};
