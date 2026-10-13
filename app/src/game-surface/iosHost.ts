import { invoke } from "@tauri-apps/api/core";
import type { GameSurfaceHost } from "./gameSurface";

export const iosGameSurfaceHost: GameSurfaceHost = {
  renderers: ["native", "compatible"],
  setPlaying: (playing) => void invoke("screen_set_playing", { playing }).catch((error) => console.error(error)),
};
