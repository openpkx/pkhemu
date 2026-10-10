import { vi } from "vitest";
import type { FolderScan } from "./folder";
import type { ExistingSave, ImportHost, PickedFolder } from "./importFiles";
import type { ImportFile } from "./match";

export function fakeImport({
  picked = [],
  sha1s = {},
  saves = {},
  folders = [],
  scans = {},
  onCopy = () => {},
}: {
  picked?: ImportFile[];
  sha1s?: Record<string, string>;
  saves?: Record<string, ExistingSave>;
  folders?: (PickedFolder | null)[];
  scans?: Record<string, FolderScan>;
  onCopy?(path: string): void | Promise<void>;
} = {}): ImportHost {
  const toPick = [...folders];
  return {
    pick: vi.fn(async () => picked),
    sha1s: vi.fn(async () => sha1s),
    copyRom: vi.fn(async (_folder: string, _file: string, path: string) => onCopy(path)),
    existingSave: vi.fn(async (_folder: string, rom: string) => saves[rom] ?? null),
    copySave: vi.fn(async () => {}),
    pickFolder: vi.fn(async () => toPick.shift() ?? null),
    scan: vi.fn(async (folder: string, hash: boolean) => {
      const found = scans[folder] ?? { files: [], other: 0 };
      return hash ? found : { ...found, files: found.files.map(({ sha1: _, ...file }) => file) };
    }),
  };
}
