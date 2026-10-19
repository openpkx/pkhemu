import { vi } from "vitest";
import type { SaveFile } from "@/game-page/saveSummary";
import type { Choice, Cloud, Conflict, Download, GameSyncEvent, SyncHost, SyncRun, SyncStatus } from "./sync";

export function fakeSync({
  available = true,
  clouds = (available ? ["google", "dropbox"] : []) as Cloud[],
  account = null as string | null,
  signsInAs = "player@example.com",
  lastSynced = null as number | null,
  gamesLastSynced = {} as Record<string, number>,
  error = undefined as string | undefined,
  gameSync = "answers" as "answers" | "never" | "fails",
  conflicts: initialConflicts = [] as Conflict[],
  cloudSave = null as SaveFile | null,
  cloudScreenshots = {} as Record<string, number[]>,
  mobileData = null as boolean | null,
  metered = false,
  cloudGames = [] as string[],
  cloudSizes = {} as Record<string, number>,
} = {}) {
  let conflicts = initialConflicts;
  const listeners = new Set<(status: SyncStatus) => void>();
  const report = (status: SyncStatus) => listeners.forEach((listener) => listener(status));
  const downloadListeners = new Set<(download: Download) => void>();
  const progress = (download: Download) => downloadListeners.forEach((listener) => listener(download));
  const gameListeners = new Set<(game: GameSyncEvent) => void>();
  const game = (event: GameSyncEvent) => gameListeners.forEach((listener) => listener(event));
  const runListeners = new Set<(run: SyncRun) => void>();
  const runProgress = (run: SyncRun) => runListeners.forEach((listener) => listener(run));
  const catalogListeners = new Set<() => void>();
  const catalog = () => catalogListeners.forEach((listener) => listener());
  const downloads: { path: string; finish(): void; fail(reason: string): void }[] = [];
  const run = async () => {
    report({ syncing: true });
    lastSynced = Date.now();
    report({ syncing: false, error, lastSynced });
  };
  const host = {
    available: vi.fn(async () => clouds),
    account: vi.fn(async () => account),
    lastSynced: vi.fn(async () => lastSynced),
    gamesLastSynced: vi.fn(async () => gamesLastSynced),
    signIn: vi.fn(async (_cloud: Cloud) => (account = signsInAs)),
    signOut: vi.fn(async () => {
      account = null;
      lastSynced = null;
      gamesLastSynced = {};
    }),
    syncAll: vi.fn(async (_folder: string, _now: boolean) => run()),
    syncGame: vi.fn(async (_folder: string, _path: string) => {
      if (gameSync === "never") return new Promise<never>(() => {});
      if (gameSync === "fails") throw new Error("No connection. pkhemu will try again");
      await run();
      return { conflicts: conflicts.map(({ file }) => file) };
    }),
    conflicts: vi.fn(async (_folder: string, _path: string) => conflicts),
    resolve: vi.fn(async (_folder: string, _path: string, file: string, _choice: Choice) => {
      conflicts = conflicts.filter((conflict) => conflict.file !== file);
    }),
    cloudSave: vi.fn(async (_folder: string, _path: string) => cloudSave),
    cloudScreenshot: vi.fn(async (_folder: string, _path: string, file: string) => cloudScreenshots[file] ?? null),
    onStatus: (listener: (status: SyncStatus) => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    onGame: (listener: (game: GameSyncEvent) => void) => {
      gameListeners.add(listener);
      return () => void gameListeners.delete(listener);
    },
    onRun: (listener: (run: SyncRun) => void) => {
      runListeners.add(listener);
      return () => void runListeners.delete(listener);
    },
    onCatalog: (listener: () => void) => {
      catalogListeners.add(listener);
      return () => void catalogListeners.delete(listener);
    },
    mobileData: vi.fn(async () => mobileData),
    setMobileData: vi.fn(async (on: boolean) => void (mobileData = on)),
    mobileDownloadSize: vi.fn(async (_folder: string, path: string) => (metered ? (cloudSizes[path] ?? null) : null)),
    cloudGames: vi.fn(async (_folder: string) => cloudGames),
    downloadRom: vi.fn(
      (_folder: string, path: string) =>
        new Promise<void>((resolve, reject) =>
          downloads.push({
            path,
            finish: () => {
              cloudGames = cloudGames.filter((game) => game !== path);
              resolve();
            },
            fail: (reason) => reject(new Error(reason)),
          }),
        ),
    ),
    onDownload: (listener: (download: Download) => void) => {
      downloadListeners.add(listener);
      return () => void downloadListeners.delete(listener);
    },
    removeFromDevice: vi.fn(async (_folder: string, path: string) => void (cloudGames = [...cloudGames, path])),
  } satisfies SyncHost;
  return { host, report, progress, game, runProgress, catalog, downloads };
}
