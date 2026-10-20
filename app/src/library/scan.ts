import { systems, type System } from "@/systems";

export type DirEntry = { name: string; isDirectory: boolean };
export type ListDir = (path: string) => Promise<DirEntry[]>;

export type Game = { system: System; name: string; path: string; cloudOnly?: boolean };
export type LibrarySection = { system: System; folder?: string; games: Game[] };
export type Library = { sections: LibrarySection[]; outsideSystemFolders: number };

const romExtensions = [".gb", ".gbc", ".gba", ".nds", ".z64", ".n64", ".v64", ".3ds", ".3dsx", ".cci", ".cxi", ".app", ".iso", ".gcm", ".rvz", ".ciso", ".gcz", ".zip", ".7z"];

const hidden = (entry: DirEntry) => entry.name.startsWith(".");

function romName(entry: DirEntry) {
  if (entry.isDirectory || hidden(entry)) return null;
  const dot = entry.name.lastIndexOf(".");
  if (dot <= 0 || !romExtensions.includes(entry.name.slice(dot).toLowerCase())) return null;
  return entry.name.slice(0, dot);
}

export const gameName = (path: string) => romName({ name: path.slice(path.lastIndexOf("/") + 1), isDirectory: false }) ?? path;

export const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

async function scanFolder(listDir: ListDir, path: string, system: System) {
  const entries = await listDir(path).catch(() => []);
  const games: Game[] = [];
  for (const entry of entries) {
    const name = romName(entry);
    if (name !== null) games.push({ system, name, path: `${path}/${entry.name}` });
  }
  games.sort((a, b) => byName.compare(a.name, b.name));
  const dataFolders = new Set(games.map((game) => game.name.toLowerCase()));
  const subfolders = entries
    .filter((entry) => entry.isDirectory && !hidden(entry) && !dataFolders.has(entry.name.toLowerCase()))
    .map((entry) => entry.name)
    .sort(byName.compare);
  return { games, subfolders };
}

export async function scanLibrary(listDir: ListDir): Promise<Library> {
  const sections: LibrarySection[] = [];
  for (const system of systems) {
    const { games, subfolders } = await scanFolder(listDir, system, system);
    if (games.length) sections.push({ system, games });
    for (const folder of subfolders) {
      const sub = await scanFolder(listDir, `${system}/${folder}`, system);
      if (sub.games.length) sections.push({ system, folder, games: sub.games });
    }
  }
  const rootEntries = await listDir("");
  const outsideSystemFolders = rootEntries.filter((entry) => romName(entry) !== null).length;
  return { sections, outsideSystemFolders };
}

const bySection = (a: LibrarySection, b: LibrarySection) =>
  systems.indexOf(a.system) - systems.indexOf(b.system) ||
  Number(!!a.folder) - Number(!!b.folder) ||
  byName.compare(a.folder ?? "", b.folder ?? "");

export function withCloudGames(library: Library, paths: string[]): Library {
  if (!paths.length) return library;
  const sections = library.sections.map((section) => ({ ...section, games: [...section.games] }));
  const known = new Set(sections.flatMap((section) => section.games.map((game) => game.path)));
  for (const path of paths) {
    const parts = path.split("/");
    const system = systems.find((system) => system === parts[0]);
    const name = romName({ name: parts[parts.length - 1], isDirectory: false });
    if (known.has(path) || !system || name === null || parts.length < 2 || parts.length > 3) continue;
    const folder = parts.length === 3 ? parts[1] : undefined;
    let section = sections.find((section) => section.system === system && section.folder === folder);
    if (!section) {
      section = folder ? { system, folder, games: [] } : { system, games: [] };
      sections.push(section);
    }
    section.games.push({ system, name, path, cloudOnly: true });
  }
  for (const section of sections) section.games.sort((a, b) => byName.compare(a.name, b.name));
  return { ...library, sections: sections.sort(bySection) };
}
