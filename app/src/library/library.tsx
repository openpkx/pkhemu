import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PlayHistory } from "@/game-page/details";
import type { Start } from "@/game-page/GamePage";
import { pngDataUrl } from "@/lib/utils";
import { useSync } from "@/sync/sync";
import { scanLibrary, withCloudGames, type DirEntry, type Game, type Library } from "./scan";

const recentLimit = 10;

function mergeRecent(first: string[], rest: string[]) {
  return [...new Set([...first, ...rest])].slice(0, recentLimit);
}

export type LibraryHost = {
  listDir(folder: string, path: string): Promise<DirEntry[]>;
  recentlyPlayed(limit: number): Promise<string[]>;
  scanGameArt(folder: string, paths: string[]): Promise<void>;
  resumeScreenshot(folder: string, path: string): Promise<number[] | null>;
  hasResumeState(folder: string, path: string): Promise<boolean>;
  playHistory(path: string): Promise<PlayHistory>;
};

export type OpenedFrom = { tile: string; screenshot?: string };

export type LastPlay = Pick<PlayHistory, "lastPlayed"> & { resume: boolean };

export type LibraryState = {
  library?: Library;
  recent: Game[];
  error?: string;
  refresh(): Promise<void>;
  hide(path: string): void;
  unhide(path: string): void;
  open(game: Game, from?: OpenedFrom): void;
  play(game: Game, start: Start, from: OpenedFrom): void;
  resumeScreenshot(path: string): Promise<string | undefined>;
  knownScreenshot(path: string): string | undefined;
  lastPlay(path: string): Promise<LastPlay>;
  knownLastPlay(path: string): LastPlay | undefined;
};

const LibraryContext = createContext<LibraryState | null>(null);

export function LibraryProvider({
  host,
  folder,
  onOpen,
  onPlay,
  children,
}: {
  host: LibraryHost;
  folder: string;
  onOpen(game: Game, from?: OpenedFrom): void;
  onPlay(game: Game, start: Start, from: OpenedFrom): void;
  children: ReactNode;
}) {
  const [scanned, setScanned] = useState<Library>();
  const { cloudGames } = useSync();
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const library = useMemo(() => {
    if (!scanned) return;
    const all = withCloudGames(scanned, cloudGames);
    if (!hidden.size) return all;
    return {
      ...all,
      sections: all.sections
        .map((section) => ({ ...section, games: section.games.filter((game) => !hidden.has(game.path)) }))
        .filter((section) => section.games.length),
    };
  }, [scanned, cloudGames, hidden]);
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const latestScan = useRef(0);
  const [screenshots, setScreenshots] = useState(() => new Map<string, Promise<string | undefined>>());
  const [known] = useState(() => new Map<string, string | undefined>());
  const [knownPlays] = useState(() => new Map<string, LastPlay>());

  const refresh = useCallback(async () => {
    const scan = ++latestScan.current;
    setScreenshots(new Map());
    try {
      const scanned = await scanLibrary((path) => host.listDir(folder, path));
      if (scan !== latestScan.current) return;
      setScanned(scanned);
      const paths = scanned.sections.flatMap((section) => section.games.map((game) => game.path));
      host.scanGameArt(folder, paths).catch((reason) => console.error("scanning game art", reason));
      setError(undefined);
    } catch (reason) {
      if (scan === latestScan.current) setError(String(reason));
    }
  }, [host, folder]);

  useEffect(() => {
    setScanned(undefined);
    known.clear();
    knownPlays.clear();
    void refresh();
    const onFocus = () => void refresh();
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      latestScan.current++;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, known, knownPlays]);

  const seenCloudGames = useRef(cloudGames);
  useEffect(() => {
    if (seenCloudGames.current === cloudGames) return;
    seenCloudGames.current = cloudGames;
    void refresh();
  }, [cloudGames, refresh]);

  useEffect(() => {
    let current = true;
    host.recentlyPlayed(recentLimit).then(
      (paths) => current && setRecentPaths((opened) => mergeRecent(opened, paths)),
      () => {},
    );
    return () => {
      current = false;
    };
  }, [host]);

  const open = useCallback(
    (game: Game, from?: OpenedFrom) => {
      screenshots.delete(game.path);
      // Joins the screen change's transition, so the recent row doesn't reorder before the view transition snapshots the tile.
      startTransition(() => setRecentPaths((paths) => mergeRecent([game.path], paths)));
      onOpen(game, from);
    },
    [onOpen, screenshots],
  );

  const play = useCallback(
    (game: Game, start: Start, from: OpenedFrom) => {
      screenshots.delete(game.path);
      onPlay(game, start, from);
    },
    [onPlay, screenshots],
  );

  const resumeScreenshot = useCallback(
    (path: string) => {
      let screenshot = screenshots.get(path);
      if (!screenshot) {
        screenshot = host.resumeScreenshot(folder, path).then(
          (bytes) => {
            const url = bytes ? pngDataUrl(bytes) : undefined;
            known.set(path, url);
            return url;
          },
          () => undefined,
        );
        screenshots.set(path, screenshot);
      }
      return screenshot;
    },
    [host, folder, screenshots, known],
  );

  const knownScreenshot = useCallback((path: string) => known.get(path), [known]);

  const lastPlay = useCallback(
    async (path: string) => {
      // Waits for the resume state a game just quit is still writing, which also closes its play session.
      const resume = await host.hasResumeState(folder, path).catch(() => false);
      const history = await host.playHistory(path).catch(() => undefined);
      const played = { resume, lastPlayed: history?.lastPlayed ?? null };
      knownPlays.set(path, played);
      return played;
    },
    [host, folder, knownPlays],
  );

  const hide = useCallback((path: string) => setHidden((hidden) => new Set(hidden).add(path)), []);
  const unhide = useCallback(
    (path: string) =>
      setHidden((hidden) => {
        const shown = new Set(hidden);
        shown.delete(path);
        return shown;
      }),
    [],
  );

  const knownLastPlay = useCallback((path: string) => knownPlays.get(path), [knownPlays]);

  const recent = useMemo(() => {
    const games = new Map(library?.sections.flatMap((section) => section.games.map((game) => [game.path, game])));
    return recentPaths.flatMap((path) => games.get(path) ?? []);
  }, [library, recentPaths]);

  return (
    <LibraryContext.Provider
      value={{
        library,
        recent,
        error,
        refresh,
        hide,
        unhide,
        open,
        play,
        resumeScreenshot,
        knownScreenshot,
        lastPlay,
        knownLastPlay,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const value = useContext(LibraryContext);
  if (!value) throw new Error("useLibrary needs a LibraryProvider");
  return value;
}
