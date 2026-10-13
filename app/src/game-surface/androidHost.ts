import type { GameSurfaceHost } from "./gameSurface";

declare global {
  interface Window {
    androidGameSurface?: { setPlaying(playing: boolean): void };
  }
}

export const androidGameSurfaceHost: GameSurfaceHost = {
  renderers: ["native", "compatible"],
  setPlaying: (playing) => window.androidGameSurface?.setPlaying(playing),
};
