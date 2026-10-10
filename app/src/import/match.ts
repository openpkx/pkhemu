import type { Game } from "@/library/scan";
import type { System } from "@/systems";

export type ImportFile = { file: string; name: string; modified: number; size?: number; inner?: string | null; sha1?: string | null };
export type RomImport = { file: ImportFile; path: string };
export type SaveImport = { file: ImportFile; game: string };
export type ImportPlan = { roms: RomImport[]; saves: SaveImport[]; unmatched: ImportFile[]; known: number };
export type ImportLibrary = { games: Game[]; sha1s: Record<string, string> };

const romSystems: Record<string, System> = {
  ".gb": "gb",
  ".gbc": "gbc",
  ".gba": "gba",
  ".nds": "nds",
  ".z64": "n64",
  ".n64": "n64",
  ".v64": "n64",
};
const archives = [".zip", ".7z"];
const saveExtensions = [".sav", ".srm", ".dsv"];

function split(path: string) {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? { base: name, extension: "" } : { base: name.slice(0, dot), extension: name.slice(dot) };
}

const key = (path: string) => split(path).base.toLowerCase();

export function romSystem({ name, inner }: Pick<ImportFile, "name" | "inner">): System | null {
  const extension = split(name).extension.toLowerCase();
  if (archives.includes(extension)) return inner ? (romSystems[split(inner).extension.toLowerCase()] ?? null) : null;
  return romSystems[extension] ?? null;
}

export const isSave = (name: string) => saveExtensions.includes(split(name).extension.toLowerCase());

export function newestPerGame(saves: SaveImport[]): SaveImport[] {
  const newest = new Map<string, SaveImport>();
  for (const save of saves) {
    const kept = newest.get(save.game);
    if (!kept || save.file.modified > kept.file.modified) newest.set(save.game, save);
  }
  return [...newest.values()];
}

export function planImport(files: ImportFile[], { games, sha1s }: ImportLibrary): ImportPlan {
  const local = games.filter((game) => !game.cloudOnly);
  const bySha1 = new Map(Object.entries(sha1s).map(([path, sha1]) => [sha1, path]));
  const known = new Set(Object.values(sha1s));
  const taken = new Set(games.filter((game) => game.path.split("/").length === 2).map((game) => `${game.system}/${game.name.toLowerCase()}`));
  const picked = new Map<string, string>();
  const roms: RomImport[] = [];
  let skipped = 0;

  for (const file of files) {
    const system = romSystem(file);
    if (!system) continue;
    let path = file.sha1 ? bySha1.get(file.sha1) : undefined;
    if (path && known.has(file.sha1!)) skipped++;
    if (!path) {
      const { base, extension } = split(file.name);
      let name = base;
      for (let n = 2; taken.has(`${system}/${name.toLowerCase()}`); n++) name = `${base} (${n})`;
      taken.add(`${system}/${name.toLowerCase()}`);
      path = `${system}/${name}${extension}`;
      roms.push({ file, path });
      if (file.sha1) bySha1.set(file.sha1, path);
    }
    for (const name of [file.name, file.inner]) if (name && !picked.has(key(name))) picked.set(key(name), path);
  }

  const library = new Map<string, string>();
  for (const game of local) if (!library.has(game.name.toLowerCase())) library.set(game.name.toLowerCase(), game.path);

  const saves: SaveImport[] = [];
  const unmatched: ImportFile[] = [];
  for (const file of files) {
    if (!isSave(file.name)) continue;
    const game = picked.get(key(file.name)) ?? library.get(key(file.name));
    if (game) saves.push({ file, game });
    else unmatched.push(file);
  }

  return { roms, saves: newestPerGame(saves), unmatched, known: skipped };
}
