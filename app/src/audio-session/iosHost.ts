import { invoke } from "@tauri-apps/api/core";
import type { AudioSessionHost } from "./audioSession";

export const iosAudioSessionHost: AudioSessionHost = {
  silentSwitch: true,
  playInSilentMode: (on) => invoke("audio_play_in_silent_mode", { on }),
};
