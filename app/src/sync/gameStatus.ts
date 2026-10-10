import { useEffect, useMemo, useState } from "react";
import { ago } from "@/game-page/details";
import { byName, gameName } from "@/library/scan";
import { useSync, type Download, type GameSync, type SyncRun, type SyncStage, type WaitReason } from "./sync";

export type SyncBadgeState =
  | { kind: "ring"; percent: number; label: string }
  | { kind: "done"; label: string }
  | { kind: "waiting"; label: string }
  | { kind: "attention"; label: string };

export const TICK_MS = 1500;

const stages: Record<SyncStage, string> = {
  uploadingSaves: "Uploading saves",
  downloadingSaves: "Downloading saves",
  uploadingRom: "Uploading ROM",
};

const waits: Record<WaitReason, string> = {
  offline: "Waiting for a connection",
  mobileData: "Waiting for Wi-Fi",
  playing: "Waiting for the game to close",
};

const percent = ({ done, total }: { done: number; total: number }) =>
  total > 0 ? Math.min(100, Math.floor((done / total) * 100)) : 0;

const ring = (stage: string, progress: { done: number; total: number }): SyncBadgeState => {
  const at = percent(progress);
  return { kind: "ring", percent: at, label: `${stage} · ${at}%` };
};

function liveBadge(game: GameSync | undefined, download: Download | undefined): SyncBadgeState | undefined {
  if (download) return ring("Downloading ROM", download);
  switch (game?.state) {
    case "transferring":
      return ring(stages[game.stage], game);
    case "queued":
      return { kind: "waiting", label: "Waiting to sync" };
    case "waiting":
      return { kind: "waiting", label: waits[game.reason] };
    case "conflict":
      return { kind: "attention", label: "Changed on another device. Open the game to choose a version" };
    case "error":
      return { kind: "attention", label: game.message };
  }
}

export const gameStage = (game: GameSync) => liveBadge(game, undefined)?.label;

export function gameSyncLine(game: GameSync | undefined, lastSynced: number | undefined, now: number) {
  const stage = game && gameStage(game);
  if (stage) return stage;
  return lastSynced === undefined ? "Not synced yet" : `Last synced ${ago(Math.max(0, now - lastSynced) / 1000)}`;
}

const done: SyncBadgeState = { kind: "done", label: "Synced" };

// A cloud-only game shows only its ROM download, since its saves wait for the ROM.
export function useTileSync(path: string, cloudOnly: boolean) {
  const sync = useSync();
  const download = cloudOnly ? sync.downloads[path] : undefined;
  const game = cloudOnly ? undefined : sync.gameSync[path];
  const live = useMemo(() => liveBadge(game, download), [game, download]);
  const transfer = download ?? (game?.state === "transferring" ? game : undefined);
  const [moving, setMoving] = useState<Download | GameSync>();
  const [ticking, setTicking] = useState(false);

  if (transfer) {
    if (moving !== transfer) setMoving(transfer);
    if (ticking) setTicking(false);
  } else if (moving) {
    setMoving(undefined);
    const finished = "path" in moving ? moving.done >= moving.total : game?.state === "synced";
    if (finished) setTicking(true);
  }

  useEffect(() => {
    if (!ticking) return;
    const timer = setTimeout(() => setTicking(false), TICK_MS);
    return () => clearTimeout(timer);
  }, [ticking]);

  return live ?? (ticking ? done : undefined);
}

export type RunRingState =
  | { kind: "spinning"; label: string }
  | { kind: "ring"; percent: number; label: string }
  | { kind: "warning"; label: string };

export type RunProgress = { line: string; percent?: number };

export function runProgress(run: SyncRun | undefined): RunProgress {
  if (run?.phase === "checking")
    return { line: `Checking · ${run.done} of ${run.total} ${run.total === 1 ? "game" : "games"}`, percent: percent(run) };
  if (run && run.total > 0) {
    const at = percent(run);
    return { line: `Syncing · ${at}%`, percent: at };
  }
  return { line: "Syncing…" };
}

function runRing(syncing: boolean, run: SyncRun | undefined, accountError: string | undefined): RunRingState | undefined {
  if (!syncing) return accountError ? { kind: "warning", label: accountError } : undefined;
  const { line, percent } = runProgress(run);
  if (run?.phase === "transferring" && percent !== undefined) return { kind: "ring", percent, label: line };
  return { kind: "spinning", label: line };
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

export function useRunRing() {
  const { syncing, run, accountError } = useSync();
  return useMemo(() => runRing(syncing, run, accountError), [syncing, run, accountError]);
}
