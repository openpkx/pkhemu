import { invoke } from "@tauri-apps/api/core";
import type { ShadersHost } from "./shaders";

// Azahar's OpenGL renderer can't compile shaders in the background.
export const androidShadersHost: ShadersHost = {
  offered: () =>
    invoke<string>("three_ds_renderer").then(
      (renderer) => renderer === "Vulkan",
      () => false,
    ),
  onLine: "New scenes load without freezing, but the game may run slower for a few seconds.",
};
