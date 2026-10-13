import { impactFeedback } from "@tauri-apps/plugin-haptics";
import type { HapticsHost } from "./haptics";

export const iosHapticsHost: HapticsHost = {
  tap: () => void impactFeedback("light").catch((error) => console.error(error)),
};
