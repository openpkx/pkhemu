import { useMemo } from "react";
import { ago } from "@/game-page/details";
import { byName, gameName } from "@/library/scan";
import { useSync, type Download, type GameSync, type SyncRun, type SyncStage, type WaitReason } from "./sync";

export type SyncBadgeState =
  | { kind: "ring"; percent: number; label: string }
  | { kind: "wifi"; label: string }
  | { kind: "conflict"; label: string }
  | { kind: "attention"; label: string };

const stages: Record<SyncStage, string> = {
  uploadingSaves: "Uploading saves",
  downloadingSaves: "Downloading saves",
  uploadingRom: "Uploading ROM",
  uploadingUpdate: "Uploading update",
  downloadingUpdate: "Downloading update",
};

const waits: Record<WaitReason, string> = {
  offline: "Waiting for a connection",
  mobileData: "Waiting for Wi-Fi",
  playing: "Waiting for the game to close",
  stopped: "Sync stopped",
};

const percent = ({ done, total }: { done: number; total: number }) =>
  total > 0 ? Math.min(100, Math.floor((done / total) * 100)) : 0;

export function gameStage(game: GameSync) {
  switch (game.state) {
    case "transferring":
      return `${stages[game.stage]} · ${percent(game)}%`;
    case "queued":
      return "Waiting to sync";
    case "waiting":
      return waits[game.reason];
    case "conflict":
      return "Changed on another device";
    case "error":
      return game.message;
  }
}

const lastSyncedLine = (lastSynced: number | undefined, now: number) =>
  lastSynced === undefined ? "Not synced yet" : `Last synced ${ago(Math.max(0, now - lastSynced) / 1000)}`;

export function gameSyncLine(game: GameSync | undefined, lastSynced: number | undefined, now: number) {
  return (game && gameStage(game)) || lastSyncedLine(lastSynced, now);
}

const waitingForWifi = (game: GameSync | undefined) => game?.state === "waiting" && game.reason === "mobileData";

function tileBadge(game: GameSync | undefined, download: Download | undefined): SyncBadgeState | undefined {
  if (download) {
    const at = percent(download);
    return { kind: "ring", percent: at, label: `Downloading ROM · ${at}%` };
  }
  if (!game) return;
  if (game.state === "conflict") return { kind: "conflict", label: "Changed on another device" };
  if (game.state === "error") return { kind: "attention", label: game.message };
  if (waitingForWifi(game)) return { kind: "wifi", label: waits.mobileData };
}

// A cloud-only game shows only its ROM download, since its saves wait for the ROM.
export function useTileSync(path: string, cloudOnly: boolean) {
  const sync = useSync();
  const download = cloudOnly ? sync.downloads[path] : undefined;
  const game = cloudOnly ? undefined : sync.gameSync[path];
  return useMemo(() => tileBadge(game, download), [game, download]);
}

export type RunRingState =
  | { kind: "spinning"; label: string }
  | { kind: "ring"; percent: number; label: string }
  | { kind: "wifi"; label: string }
  | { kind: "warning"; label: string };

export type RunProgress = { line: string; percent?: number };

function runProgress(run: SyncRun | undefined): RunProgress {
  if (run?.phase === "checking")
    return { line: `Checking · ${run.done} of ${run.total} ${run.total === 1 ? "game" : "games"}`, percent: percent(run) };
  if (run && run.total > 0) {
    const at = percent(run);
    return { line: `Syncing · ${at}%`, percent: at };
  }
  return { line: "Syncing…" };
}

export function syncStatus(syncing: boolean, run: SyncRun | undefined, lastSynced: number | undefined, now: number): RunProgress {
  return syncing ? runProgress(run) : { line: lastSyncedLine(lastSynced, now) };
}

const wifiRing: RunRingState = { kind: "wifi", label: waits.mobileData };

function runRing(
  syncing: boolean,
  run: SyncRun | undefined,
  accountError: string | undefined,
  wifi: boolean,
  importing: boolean,
): RunRingState | undefined {
  if (syncing) {
    const { line, percent } = runProgress(run);
    if (run?.phase === "transferring" && percent !== undefined) return { kind: "ring", percent, label: line };
    if (wifi && !importing) return wifiRing;
    return { kind: "spinning", label: line };
  }
  if (accountError) return { kind: "warning", label: accountError };
  if (importing) return { kind: "spinning", label: "Adding games" };
  if (wifi) return wifiRing;
}

export function runGames(gameSync: Record<string, GameSync>, run: SyncRun | undefined) {
  const stages = new Map<string, string>();
  for (const [path, game] of Object.entries(gameSync)) {
    const stage = gameStage(game);
    if (stage) stages.set(path, stage);
  }
  if (run?.phase === "transferring")
    for (const path of run.waitingRoms) if (!stages.has(path)) stages.set(path, "ROM waiting for Wi-Fi");
  const games = [...stages].map(([path, stage]) => ({ path, name: gameName(path), stage }));
  return games.sort((a, b) => byName.compare(a.name, b.name));
}

export function useRunRing(importing: boolean) {
  const { syncing, run, accountError, gameSync } = useSync();
  const wifi = useMemo(() => Object.values(gameSync).some(waitingForWifi), [gameSync]);
  return useMemo(
    () => runRing(syncing, run, accountError, wifi, importing),
    [syncing, run, accountError, wifi, importing],
  );
}
