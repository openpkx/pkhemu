import { afterEach, expect, it, vi } from "vitest";
import { androidGameSurfaceHost } from "./androidHost";

afterEach(() => {
  delete window.androidGameSurface;
});

it("does nothing where the bridge doesn't exist", () => {
  androidGameSurfaceHost.setPlaying(true);
});

it("tells the bridge when a game starts and stops", () => {
  const setPlaying = vi.fn();
  window.androidGameSurface = { setPlaying };

  androidGameSurfaceHost.setPlaying(true);
  androidGameSurfaceHost.setPlaying(false);

  expect(setPlaying.mock.calls).toEqual([[true], [false]]);
});
