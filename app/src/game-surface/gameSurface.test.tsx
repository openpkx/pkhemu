import { act, render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it } from "vitest";
import { PreferencesProvider, type Preferences, type RendererChoice } from "@/preferences/preferences";
import { GameSurfaceProvider, rendererFor, useGameSurface, useRenderer, type GameSurfaceHost } from "./gameSurface";

function Playing({ playing }: { playing: boolean }) {
  useGameSurface(playing);
  return null;
}

it("asks for the surface while a game plays and lets it go after", () => {
  const calls: boolean[] = [];
  const host: GameSurfaceHost = { renderers: ["native", "compatible"], setPlaying: (playing) => void calls.push(playing) };
  const shown = (playing: boolean) => (
    <GameSurfaceProvider host={host}>
      <Playing playing={playing} />
    </GameSurfaceProvider>
  );
  const { rerender, unmount } = render(shown(false));
  expect(calls).toEqual([]);

  rerender(shown(true));
  unmount();

  expect(calls).toEqual([true, false]);
});

it.each([
  ["automatic", false, "native"],
  ["automatic", true, "compatible"],
  ["native", false, "native"],
  ["native", true, "native"],
  ["compatible", false, "compatible"],
] as const)("picks the renderer for %s when Native failed is %s", (choice, nativeFailed, picked) => {
  expect(rendererFor(choice, ["native", "compatible"], nativeFailed)).toBe(picked);
});

it.each(["automatic", "native", "compatible"] as const)("draws with Compatible for %s where it's the only renderer", (choice) => {
  expect(rendererFor(choice, ["compatible"], false)).toBe("compatible");
});

const defaults: Preferences = { touchControls: false, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, updateDismissedVersion: 0, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1, playInSilentMode: false, renderer: "automatic" };

async function withRenderer(renderer: RendererChoice) {
  const host: GameSurfaceHost = { renderers: ["native", "compatible"], setPlaying() {} };
  const preferences = { load: async () => ({ renderer }), save: async () => {} };
  const hook = renderHook(useRenderer, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <GameSurfaceProvider host={host}>
        <PreferencesProvider host={preferences} defaults={defaults}>
          {children}
        </PreferencesProvider>
      </GameSurfaceProvider>
    ),
  });
  await act(async () => {});
  return hook;
}

it("switches Automatic to Compatible once Native fails", async () => {
  const { result } = await withRenderer("automatic");
  expect(result.current.automatic).toBe("native");

  act(() => void result.current.reportNativeFailure());

  expect(result.current.automatic).toBe("compatible");
  expect(result.current.renderer).toBe("compatible");
});

it("tells a player who picked Native only the first time it fails", async () => {
  const { result } = await withRenderer("native");

  let told: boolean[] = [];
  act(() => void (told = [result.current.reportNativeFailure(), result.current.reportNativeFailure()]));

  expect(told).toEqual([true, false]);
});

it("doesn't tell a player on Automatic that Native failed", async () => {
  const { result } = await withRenderer("automatic");

  let told = true;
  act(() => void (told = result.current.reportNativeFailure()));

  expect(told).toBe(false);
});
