import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePreferences, type RendererChoice } from "@/preferences/preferences";

export type Renderer = "native" | "compatible";

export type GameSurfaceHost = { renderers: readonly Renderer[]; setPlaying(playing: boolean): void };

export const noGameSurfaceHost: GameSurfaceHost = { renderers: ["compatible"], setPlaying() {} };

export function rendererFor(choice: RendererChoice, renderers: readonly Renderer[], nativeFailed: boolean): Renderer {
  if (!renderers.includes("native")) return "compatible";
  if (choice === "automatic") return nativeFailed ? "compatible" : "native";
  return choice;
}

type GameSurface = { host: GameSurfaceHost; nativeFailed: boolean; failNative(pickedNative: boolean): boolean };

const GameSurfaceContext = createContext<GameSurface>({
  host: noGameSurfaceHost,
  nativeFailed: false,
  failNative: () => false,
});

export function GameSurfaceProvider({ host, children }: { host: GameSurfaceHost; children: ReactNode }) {
  const [nativeFailed, setNativeFailed] = useState(false);
  const told = useRef(false);
  const failNative = useCallback((pickedNative: boolean) => {
    setNativeFailed(true);
    if (!pickedNative || told.current) return false;
    told.current = true;
    return true;
  }, []);

  return <GameSurfaceContext.Provider value={{ host, nativeFailed, failNative }}>{children}</GameSurfaceContext.Provider>;
}

export function useGameSurface(playing: boolean) {
  const { host } = useContext(GameSurfaceContext);

  useEffect(() => {
    if (!playing) return;
    host.setPlaying(true);
    return () => host.setPlaying(false);
  }, [host, playing]);
}

export function useRenderer() {
  const { host, nativeFailed, failNative } = useContext(GameSurfaceContext);
  const choice = usePreferences().preferences.renderer;
  return {
    renderers: host.renderers,
    renderer: rendererFor(choice, host.renderers, nativeFailed),
    automatic: rendererFor("automatic", host.renderers, nativeFailed),
    reportNativeFailure: () => failNative(choice === "native"),
  };
}
