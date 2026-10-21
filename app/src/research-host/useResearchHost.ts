import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { useBackGesture } from "@/back/back";
import { useExportHost } from "@/editor/exportFile";
import { usePokemonFiles } from "@/editor/pokemonFile";
import { useSavesWritten } from "@/editor/saveFirst";
import { tauriSaveHost } from "@/editor/tauriHost";
import { tauriImportHost } from "@/import/tauriHost";
import { buttons, type Input } from "@/input/input";
import { usePadPresses } from "@/input/padPresses";
import type { Game } from "@/library/scan";
import type { Overlay } from "@/pause-menu/overlay";
import { navigate } from "@/plugin-kit/motion";
import { patchOrigins } from "@/preferences/gameSettings";
import { tauriGameSettingsHost } from "@/preferences/gameSettingsTauriHost";
import type { HostEvent, ResearchHost } from "@/research/host";
import { pickLayout } from "@/research/layout";
import type { System } from "@/systems";
import { researchStorage } from "./storage";

const researched: System[] = ["gb", "gbc", "gba", "nds", "3ds", "gc"];

export function useResearchHost({
  folder,
  game,
  on,
  running,
  build,
  input,
  overlay,
  show,
  notify,
}: {
  folder: string;
  game: Game;
  on: boolean;
  running: boolean;
  build?: string;
  input: Input;
  overlay?: Overlay;
  show(overlay: Overlay | undefined): void;
  notify(message: string): void;
}) {
  const exportHost = useExportHost();
  const files = usePokemonFiles();
  const [found, setFound] = useState(false);
  const [status, setStatus] = useState<string>();
  const [listeners] = useState(() => new Set<(event: HostEvent) => void>());
  const latest = useRef({ build, show, notify });
  latest.current = { build, show, notify };
  const menuOpen = overlay === "menu";
  const panelOpen = overlay === "research";
  const looking = on && researched.includes(game.system) && running && !found && (menuOpen || !overlay);

  const rom = useCallback(
    () =>
      Promise.all([
        tauriImportHost.sha1s(folder, [game.path]).catch((): Record<string, string> => ({})),
        patchOrigins(tauriGameSettingsHost).patchedFrom(game.path),
      ]).then(([sha1s, patchedFrom]) => ({ romSha1: sha1s[game.path] ?? null, romHack: !!patchedFrom })),
    [folder, game.path],
  );

  // A game with no save yet, or a save no layout reads yet, gets looked at again on the next pause.
  useEffect(() => {
    if (!looking) return;
    let current = true;
    void (async () => {
      const [save, played] = await Promise.all([tauriSaveHost.read(), rom()]);
      const picked = await pickLayout(save, played);
      if (current && picked) setFound(true);
    })().catch(() => {});
    return () => {
      current = false;
    };
  }, [looking, menuOpen, rom]);

  const emit = useCallback((event: HostEvent) => listeners.forEach((listener) => listener(event)), [listeners]);
  // Research may not be listening yet, as when a launch loads a slot before the save format is known.
  const stateLoadPending = useRef(false);
  const stateLoaded = useCallback(() => {
    stateLoadPending.current = !listeners.size;
    emit({ kind: "state-loaded" });
  }, [listeners, emit]);

  const shown = on && found;
  useSavesWritten(tauriSaveHost, shown, (since) => {
    const writtenAt = Date.now() - since * 1000;
    tauriSaveHost.read().then(
      (bytes) => emit({ kind: "save-written", save: { bytes, writtenAt } }),
      (error) => console.error(error),
    );
  });

  const onBackGesture = useBackGesture();
  useEffect(() => {
    if (panelOpen) return onBackGesture(() => emit({ kind: "back" }));
  }, [panelOpen, onBackGesture, emit]);
  usePadPresses(input, (button) => button === buttons.b && emit({ kind: "back" }), panelOpen);

  const host = useMemo<ResearchHost>(
    () => ({
      context: async () => {
        const [played, app] = await Promise.all([rom(), getVersion()]);
        return { game: game.name, build: latest.current.build ?? null, ...played, app };
      },
      saveFile: async () => {
        const [bytes, modified] = await Promise.all([tauriSaveHost.read(), invoke<number | null>("save_modified", { folder, path: game.path })]);
        return { bytes, writtenAt: modified ?? Date.now() };
      },
      load: async <T,>(key: string) => (await researchStorage.load(game.path, key)) as T | undefined,
      store: (key, value) => researchStorage.store(game.path, key, value),
      exportFile: async ({ name, text }) => {
        if (!exportHost) throw new Error("Exporting a file needs an ExportProvider");
        return exportHost.saveFile({ fileName: name, bytes: new TextEncoder().encode(text) });
      },
      importFile: async () => {
        const picked = await files.pick();
        return picked ? { name: picked.name, text: new TextDecoder().decode(picked.bytes) } : undefined;
      },
      setStatus: async (status) => setStatus(status),
      notify: async (message) => latest.current.notify(message),
      close: async () => navigate("back", () => latest.current.show("menu")),
      resume: async () => latest.current.show(undefined),
      listen: (listener) => {
        listeners.add(listener);
        if (stateLoadPending.current)
          queueMicrotask(() => {
            if (!stateLoadPending.current) return;
            stateLoadPending.current = false;
            emit({ kind: "state-loaded" });
          });
        return () => void listeners.delete(listener);
      },
    }),
    [folder, game.name, game.path, rom, listeners, emit, exportHost, files],
  );

  const open = useCallback(
    () =>
      navigate("forward", () => {
        latest.current.show("research");
        emit({ kind: "open" });
      }),
    [emit],
  );

  return { host: shown ? host : undefined, status: shown ? status : undefined, open, stateLoaded };
}
