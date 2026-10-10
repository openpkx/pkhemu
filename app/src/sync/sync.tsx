import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { GamePageHost } from "@/game-page/GamePage";
import type { SaveFile } from "@/game-page/saveSummary";
import { useGamesFolder } from "@/games-folder/gamesFolder";
import { usePlus } from "@/plus/plus";

export type SyncStatus = { syncing: boolean; error?: string; accountError?: string; lastSynced?: number };

export type Cloud = "google" | "dropbox";

export type Choice = "device" | "cloud";
export type ConflictVersion = { savedOn: string; modified: number | null; cheats: boolean };
export type Conflict = { file: string; device: ConflictVersion; cloud: ConflictVersion };

export type ConflictsHost = {
  resolve(folder: string, path: string, file: string, choice: Choice): Promise<void>;
  cloudSave(folder: string, path: string): Promise<SaveFile | null>;
  cloudScreenshot(folder: string, path: string, file: string): Promise<number[] | null>;
};

export type MobileData = { on: boolean; roms: boolean };
export type SyncGames = { on: boolean; mobileData?: MobileData };
export type Download = { path: string; done: number; total: number };

export type SyncStage = "uploadingSaves" | "downloadingSaves" | "uploadingRom";
export type WaitReason = "offline" | "mobileData" | "playing";
export type GameSync =
  | { state: "queued" }
  | { state: "transferring"; done: number; total: number; stage: SyncStage }
  | { state: "waiting"; reason: WaitReason }
  | { state: "conflict" }
  | { state: "error"; message: string }
  | { state: "synced"; lastSynced: number };
export type GameSyncEvent = { path: string } & GameSync;
export type SyncRun =
  | { phase: "checking"; done: number; total: number }
  | { phase: "transferring"; done: number; total: number; waitingRoms: string[] };

export type SyncHost = {
  available(): Promise<Cloud[]>;
  account(): Promise<string | null>;
  lastSynced(): Promise<number | null>;
  gamesLastSynced(): Promise<Record<string, number>>;
  signIn(cloud: Cloud): Promise<string>;
  signOut(): Promise<void>;
  syncAll(folder: string): Promise<unknown>;
  syncGame(folder: string, path: string): Promise<{ conflicts: string[] }>;
  conflicts(folder: string, path: string): Promise<Conflict[]>;
  onStatus(listener: (status: SyncStatus) => void): () => void;
  onGame(listener: (game: GameSyncEvent) => void): () => void;
  onRun(listener: (run: SyncRun) => void): () => void;
  syncGames(): Promise<SyncGames>;
  setSyncGames(on: boolean): Promise<void>;
  setMobileData(mobileData: MobileData): Promise<void>;
  cloudGames(folder: string): Promise<string[]>;
  mobileDownloadSize(folder: string, path: string): Promise<number | null>;
  downloadRom(folder: string, path: string): Promise<void>;
  onDownload(listener: (download: Download) => void): () => void;
  removeFromDevice(folder: string, path: string): Promise<void>;
} & ConflictsHost;

export type Checked = { checked: boolean; conflicts: Conflict[] };

export const OPEN_WAIT_MS = 5000;

export type Sync = {
  available: boolean;
  clouds: Cloud[];
  account: string | null;
  syncing: boolean;
  error?: string;
  accountError?: string;
  lastSynced?: number;
  gameSync: Record<string, GameSync>;
  gameLastSynced: Record<string, number>;
  run?: SyncRun;
  connect(cloud: Cloud): Promise<void>;
  signOut(): Promise<void>;
  syncNow(): void;
  beforeOpen(folder: string, path: string): Promise<Checked>;
  synced(folder: string, paths: string[]): Promise<void>;
  conflictHost: ConflictsHost;
  syncGames: SyncGames;
  setSyncGames(on: boolean): Promise<void>;
  setMobileData(mobileData: MobileData): Promise<void>;
  cloudGames: string[];
  mobileDownloadSize(folder: string, path: string): Promise<number | null>;
  downloads: Record<string, Download>;
  download(folder: string, path: string): Promise<void>;
  removeFromDevice(folder: string, path: string): Promise<void>;
};

const off: Sync = {
  available: false,
  clouds: [],
  account: null,
  syncing: false,
  gameSync: {},
  gameLastSynced: {},
  connect: async () => {},
  signOut: async () => {},
  syncNow: () => {},
  beforeOpen: async () => ({ checked: true, conflicts: [] }),
  synced: async () => {},
  conflictHost: {
    resolve: async () => {},
    cloudSave: async () => null,
    cloudScreenshot: async () => null,
  },
  syncGames: { on: false },
  setSyncGames: async () => {},
  setMobileData: async () => {},
  cloudGames: [],
  mobileDownloadSize: async () => null,
  downloads: {},
  download: async () => {},
  removeFromDevice: async () => {},
};

const noGames: string[] = [];
const noGameSync: Record<string, GameSync> = {};
const noTimes: Record<string, number> = {};

// An error or a conflict stays on a game until it next syncs cleanly.
function nextGameSync(current: GameSync | undefined, next: GameSync) {
  const stays = current?.state === "error" || current?.state === "conflict";
  return stays && (next.state === "queued" || next.state === "waiting" || next.state === "transferring") ? current : next;
}

function settled(games: Record<string, GameSync>) {
  return Object.fromEntries(
    Object.entries(games).filter(([, game]) => game.state !== "queued" && game.state !== "transferring"),
  );
}

const SyncContext = createContext<Sync>(off);

const logError = (reason: unknown) => console.error(reason);

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

export function SyncProvider({ host, children }: { host: SyncHost; children: ReactNode }) {
  const gamesFolder = useGamesFolder();
  const folder = gamesFolder.status === "ready" ? gamesFolder.folder : undefined;
  const [clouds, setClouds] = useState<Cloud[]>([]);
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>({ syncing: false });
  const [lastSynced, setLastSynced] = useState<number>();
  const [gameSync, setGameSync] = useState(noGameSync);
  const [gameLastSynced, setGameLastSynced] = useState(noTimes);
  const [run, setRun] = useState<SyncRun>();
  const [loaded] = useState(deferred);
  // Read by callbacks that must see a sign-in before React renders it.
  const signedIn = useRef<string | null>(null);
  const currentFolder = useRef(folder);
  currentFolder.current = folder;
  const startedFor = useRef<string>(undefined);
  const [syncGames, setSyncGamesState] = useState<SyncGames>({ on: false });
  const [cloudGames, setCloudGames] = useState<string[]>(noGames);
  const [downloads, setDownloads] = useState<Record<string, Download>>({});
  const [downloading] = useState(() => new Map<string, Promise<void>>());
  // A store build hides the account while Plus is missing, and shows it again once the player buys Plus.
  const plus = usePlus().status?.state;

  const signedInAs = useCallback((account: string | null) => {
    signedIn.current = account;
    setAccount(account);
  }, []);

  const readCloudGames = useCallback(async () => {
    const folder = currentFolder.current;
    const games = folder && signedIn.current ? await host.cloudGames(folder).catch(logError) : undefined;
    setCloudGames((known) => {
      const next = games ?? noGames;
      return next.length === known.length && next.every((path, at) => path === known[at]) ? known : next;
    });
  }, [host]);

  useEffect(
    () =>
      host.onStatus((status) => {
        setStatus(status);
        if (status.lastSynced !== undefined) setLastSynced(status.lastSynced);
        if (!status.syncing) {
          setRun(undefined);
          setGameSync(settled);
          void readCloudGames();
        }
      }),
    [host, readCloudGames],
  );

  useEffect(
    () =>
      host.onGame(({ path, ...game }) => {
        setGameSync((games) => ({ ...games, [path]: nextGameSync(games[path], game) }));
        if (game.state === "synced") setGameLastSynced((times) => ({ ...times, [path]: game.lastSynced }));
      }),
    [host],
  );

  useEffect(() => host.onRun(setRun), [host]);

  useEffect(
    () => host.onDownload((download) => setDownloads((downloads) => ({ ...downloads, [download.path]: download }))),
    [host],
  );

  useEffect(() => {
    let current = true;
    void (async () => {
      const clouds = await host.available();
      const account = clouds.length > 0 ? await host.account() : null;
      const lastSynced = account ? await host.lastSynced() : null;
      const gameLastSynced = account ? await host.gamesLastSynced() : noTimes;
      const syncGames = clouds.length > 0 ? await host.syncGames() : undefined;
      if (!current) return;
      setClouds(clouds);
      signedInAs(account);
      if (!account) startedFor.current = undefined;
      setLastSynced(lastSynced ?? undefined);
      setGameLastSynced(gameLastSynced);
      if (syncGames) setSyncGamesState(syncGames);
    })()
      .catch(logError)
      .finally(() => current && loaded.resolve());
    return () => {
      current = false;
    };
  }, [host, loaded, signedInAs, plus]);

  const syncAll = useCallback(() => {
    const folder = currentFolder.current;
    if (folder && signedIn.current) host.syncAll(folder).catch(logError);
  }, [host]);

  useEffect(() => {
    void readCloudGames();
    if (!folder || !account || startedFor.current === `${account}\n${folder}`) return;
    startedFor.current = `${account}\n${folder}`;
    syncAll();
  }, [folder, account, syncAll, readCloudGames]);

  useEffect(() => {
    const returned = () => document.visibilityState === "visible" && syncAll();
    document.addEventListener("visibilitychange", returned);
    return () => document.removeEventListener("visibilitychange", returned);
  }, [syncAll]);

  const beforeOpen = useCallback(
    async (folder: string, path: string) => {
      await loaded.promise;
      if (!signedIn.current) return { checked: true, conflicts: [] };
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timedOut = new Promise<Checked>(
        (resolve) => (timer = setTimeout(() => resolve({ checked: false, conflicts: [] }), OPEN_WAIT_MS)),
      );
      const checked = host
        .syncGame(folder, path)
        .then(async ({ conflicts }) => ({ checked: true, conflicts: conflicts.length ? await host.conflicts(folder, path) : [] }))
        .catch((reason) => {
          logError(reason);
          return { checked: false, conflicts: [] };
        });
      return Promise.race([checked, timedOut]).finally(() => clearTimeout(timer));
    },
    [host, loaded],
  );

  const synced = useCallback(
    (folder: string, paths: string[]) => {
      if (!signedIn.current) return Promise.resolve();
      return Promise.all([...new Set(paths)].map((path) => host.syncGame(folder, path).catch(logError))).then(() => {});
    },
    [host],
  );

  const connect = useCallback(async (cloud: Cloud) => signedInAs(await host.signIn(cloud)), [host, signedInAs]);

  const setSyncGames = useCallback(
    async (on: boolean) => {
      await host.setSyncGames(on);
      setSyncGamesState((syncGames) => ({ ...syncGames, on }));
      await readCloudGames();
      if (on) syncAll();
    },
    [host, readCloudGames, syncAll],
  );

  const setMobileData = useCallback(
    async (mobileData: MobileData) => {
      await host.setMobileData(mobileData);
      setSyncGamesState((syncGames) => ({ ...syncGames, mobileData }));
      if (mobileData.on) syncAll();
    },
    [host, syncAll],
  );

  // A download already running was asked about when it started.
  const mobileDownloadSize = useCallback(
    async (folder: string, path: string) => (downloading.has(path) ? null : host.mobileDownloadSize(folder, path)),
    [host, downloading],
  );

  // One download per game, so opening a game again while it downloads waits for the same one.
  const download = useCallback(
    (folder: string, path: string) => {
      let running = downloading.get(path);
      if (!running) {
        setDownloads(({ [path]: _, ...others }) => others);
        running = host
          .downloadRom(folder, path)
          .then(() => {
            synced(folder, [path]);
            return readCloudGames();
          })
          .finally(() => {
            downloading.delete(path);
            setDownloads(({ [path]: _, ...others }) => others);
          });
        downloading.set(path, running);
      }
      return running;
    },
    [host, downloading, readCloudGames, synced],
  );

  const removeFromDevice = useCallback(
    async (folder: string, path: string) => {
      await host.removeFromDevice(folder, path);
      await readCloudGames();
    },
    [host, readCloudGames],
  );

  const signOut = useCallback(async () => {
    await host.signOut();
    startedFor.current = undefined;
    signedInAs(null);
    setCloudGames(noGames);
    setLastSynced(undefined);
    setGameSync(noGameSync);
    setGameLastSynced(noTimes);
    setRun(undefined);
    setStatus({ syncing: false });
  }, [host, signedInAs]);

  const sync = useMemo<Sync>(
    () => ({
      available: clouds.length > 0,
      clouds,
      account,
      syncing: status.syncing,
      error: account ? status.error : undefined,
      accountError: account ? status.accountError : undefined,
      lastSynced: account ? lastSynced : undefined,
      gameSync: account ? gameSync : noGameSync,
      gameLastSynced: account ? gameLastSynced : noTimes,
      run: account ? run : undefined,
      connect,
      signOut,
      syncNow: syncAll,
      beforeOpen,
      synced,
      conflictHost: host,
      syncGames,
      setSyncGames,
      setMobileData,
      cloudGames: account ? cloudGames : noGames,
      mobileDownloadSize,
      downloads,
      download,
      removeFromDevice,
    }),
    [
      clouds,
      account,
      status,
      lastSynced,
      gameSync,
      gameLastSynced,
      run,
      connect,
      signOut,
      syncAll,
      beforeOpen,
      synced,
      host,
      syncGames,
      setSyncGames,
      setMobileData,
      cloudGames,
      mobileDownloadSize,
      downloads,
      download,
      removeFromDevice,
    ],
  );

  return <SyncContext.Provider value={sync}>{children}</SyncContext.Provider>;
}

export function useSync() {
  return useContext(SyncContext);
}

export function syncingWrites<Host extends Pick<GamePageHost, "applyEdit" | "writeTransfer">>(host: Host, synced: Sync["synced"]): Host {
  return {
    ...host,
    applyEdit: async (folder, path, edited) => {
      await host.applyEdit(folder, path, edited);
      synced(folder, [path]);
    },
    writeTransfer: async (folder, destination, source) => {
      await host.writeTransfer(folder, destination, source);
      synced(folder, [destination.path, source.path]);
    },
  };
}
