import type { Game } from "@/library/scan";
import type { PatchFormat } from "@/patch-rom/patchRom";
import type { System } from "@/systems";

export type ImportFile = {
  file: string;
  name: string;
  modified: number;
  folder?: string | null;
  size?: number;
  inner?: string | null;
  sha1?: string | null;
  title?: string | null;
  patch?: PatchFormat | null;
  archive?: string | null;
  error?: string | null;
  titleId?: string | null;
};
export type PatchImport = ImportFile & { patch: PatchFormat };
export type RomImport = { file: ImportFile; path: string };
export type SaveImport = { file: ImportFile; game: string; clock?: ImportFile };
export type ImportPlan = {
  roms: RomImport[];
  saves: SaveImport[];
  unmatched: ImportFile[];
  patches: PatchImport[];
  morePatches: boolean;
  known: number;
};
export type ImportLibrary = { games: Game[]; sha1s: Record<string, string>; titleIds?: Record<string, string> };

const romSystems: Record<string, System> = {
  ".gb": "gb",
  ".gbc": "gbc",
  ".gba": "gba",
  ".nds": "nds",
  ".z64": "n64",
  ".n64": "n64",
  ".v64": "n64",
  ".3ds": "3ds",
  ".cci": "3ds",
  ".cxi": "3ds",
  ".app": "3ds",
  ".3dsx": "3ds",
  ".cia": "3ds",
};
const importedAs: Record<string, string> = { ".cia": ".cxi" };
const archives = [".zip", ".7z"];
const saveExtensions = [".sav", ".sav2", ".srm", ".dsv"];

function split(path: string) {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? { base: name, extension: "" } : { base: name.slice(0, dot), extension: name.slice(dot) };
}

const key = (path: string) => split(path).base.toLowerCase();

// Manic EMU before 1.5.3 kept a ROM extension in a save's name, as in Crystal.gb.sav, even for a GBC game.
const saveKey = (path: string) => {
  const { base, extension } = split(split(path).base);
  return romSystems[extension.toLowerCase()] ? base.toLowerCase() : key(path);
};
const clockKey = (file: ImportFile) => `${file.folder ?? ""}/${saveKey(file.name)}`;

export function romSystem({ name, inner }: Pick<ImportFile, "name" | "inner">): System | null {
  const extension = split(name).extension.toLowerCase();
  if (archives.includes(extension)) return inner ? (romSystems[split(inner).extension.toLowerCase()] ?? null) : null;
  return romSystems[extension] ?? null;
}

// An Azahar save is known by the title ID in its folder's path, not its name.
const isAzaharSave = (name: string) => name === "main";
export const isSave = (name: string) => saveExtensions.includes(split(name).extension.toLowerCase()) || isAzaharSave(name);
export const isClock = (name: string) => split(name).extension.toLowerCase() === ".rtc";

export function newestPerGame(saves: SaveImport[]): SaveImport[] {
  const newest = new Map<string, SaveImport>();
  for (const save of saves) {
    const kept = newest.get(save.game);
    if (!kept || save.file.modified > kept.file.modified) newest.set(save.game, save);
  }
  return [...newest.values()];
}

export function planImport(files: ImportFile[], { games, sha1s, titleIds = {} }: ImportLibrary): ImportPlan {
  const local = games.filter((game) => !game.cloudOnly);
  const bySha1 = new Map(Object.entries(sha1s).map(([path, sha1]) => [sha1, path]));
  const known = new Set(Object.values(sha1s));
  const taken = new Set(games.filter((game) => game.path.split("/").length === 2).map((game) => `${game.system}/${game.name.toLowerCase()}`));
  const picked = new Map<string, string>();
  const titles = new Map<string, string>();
  const roms: RomImport[] = [];
  let skipped = 0;

  for (const file of files) {
    const system = romSystem(file);
    if (!system) continue;
    let path = file.sha1 ? bySha1.get(file.sha1) : undefined;
    if (path && known.has(file.sha1!)) skipped++;
    if (!path) {
      const { base: fileBase, extension } = split(file.name);
      const base = file.title ?? fileBase;
      let name = base;
      for (let n = 2; taken.has(`${system}/${name.toLowerCase()}`); n++) name = `${base} (${n})`;
      taken.add(`${system}/${name.toLowerCase()}`);
      path = `${system}/${name}${importedAs[extension.toLowerCase()] ?? extension}`;
      roms.push({ file, path });
      if (file.sha1) bySha1.set(file.sha1, path);
    }
    for (const name of [file.name, file.inner]) if (name && !picked.has(key(name))) picked.set(key(name), path);
    if (file.titleId && !titles.has(file.titleId)) titles.set(file.titleId, path);
  }
  for (const [path, titleId] of Object.entries(titleIds)) if (!titles.has(titleId)) titles.set(titleId, path);

  const library = new Map<string, string>();
  for (const game of local) if (!library.has(game.name.toLowerCase())) library.set(game.name.toLowerCase(), game.path);

  const clocks = new Map(files.filter((file) => isClock(file.name)).map((file) => [clockKey(file), file]));
  const saves: SaveImport[] = [];
  const unmatched: ImportFile[] = [];
  for (const file of files) {
    if (!isSave(file.name)) continue;
    const game = isAzaharSave(file.name)
      ? file.titleId && titles.get(file.titleId)
      : (picked.get(saveKey(file.name)) ?? library.get(saveKey(file.name)));
    const clock = clocks.get(clockKey(file));
    if (game) saves.push(clock ? { file, game, clock } : { file, game });
    else unmatched.push(file);
  }

  const found = files.filter((file): file is PatchImport => !!file.patch);
  const first = found[0];
  const patches = first?.archive ? found.filter((patch) => patch.archive === first.archive) : found.slice(0, 1);
  return { roms, saves: newestPerGame(saves), unmatched, patches, morePatches: found.length > patches.length, known: skipped };
}
