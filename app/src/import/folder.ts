import { byName, gameName } from "@/library/scan";
import type { System } from "@/systems";
import { isClock, isSave, type ImportFile, type ImportPlan } from "./match";

export type FolderScan = { files: ImportFile[]; other: number };
export type FolderGame = { path: string; name: string; system: System; save: boolean };
export type FolderSummary = { games: FolderGame[]; withSave: number; size: number; leftOut: number; known: number };

export function addSaves(found: FolderScan, saves: FolderScan): FolderScan {
  const taken = saves.files.filter((file) => isSave(file.name) || isClock(file.name));
  return { files: [...found.files, ...taken], other: found.other + saves.other + saves.files.length - taken.length };
}

export function summarize(plan: ImportPlan, found: FolderScan): FolderSummary {
  const saved = new Set(plan.saves.map((save) => save.game));
  const games = plan.roms
    .map(({ path }) => ({ path, name: gameName(path), system: path.split("/")[0] as System, save: saved.has(path) }))
    .sort((a, b) => byName.compare(a.name, b.name));
  const copied = [...plan.roms.map((rom) => rom.file), ...plan.saves.flatMap((save) => (save.clock ? [save.file, save.clock] : [save.file]))];
  return {
    games,
    withSave: games.filter((game) => game.save).length,
    size: copied.reduce((size, file) => size + (file.size ?? 0), 0),
    leftOut: found.other + found.files.length - copied.length - plan.known,
    known: plan.known,
  };
}

export const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

export function folderImportToast({
  games,
  roms,
  saves,
  found,
  failed,
}: {
  games: number;
  roms: number;
  saves: number;
  found: boolean;
  failed: string[];
}) {
  const copied = [
    roms < games ? `${roms} of ${count(games, "game")}` : roms > 0 && count(roms, "game"),
    saves > 0 && count(saves, "save"),
  ].filter(Boolean);
  const done = copied.length ? `Copied ${copied.join(" and ")}` : found ? "Already in pkhemu" : failed.length ? "" : "Nothing copied";
  const problem = failed.length > 1 ? `Couldn't copy ${failed.length} files` : failed[0];
  return [done, problem].filter(Boolean).join(". ");
}

const MB = 1024 * 1024;

export const megabytes = (bytes: number) => `${bytes > 0 && bytes < 10 * MB ? (bytes / MB).toFixed(1) : Math.round(bytes / MB)} MB`;
