import { vi } from "vitest";
import type { FolderScan } from "./folder";
import type { ExistingSave, ImportHost, PickedFolder } from "./importFiles";
import type { ImportFile } from "./match";

export function fakeImport({
  picked = [],
  opened = [],
  sha1s = {},
  saves = {},
  folders = [],
  scans = {},
  onCopy = () => {},
}: {
  picked?: ImportFile[];
  opened?: ImportFile[];
  sha1s?: Record<string, string>;
  saves?: Record<string, ExistingSave>;
  folders?: (PickedFolder | null)[];
  scans?: Record<string, FolderScan>;
  onCopy?(path: string): void | Promise<void>;
} = {}): ImportHost & { open(files: ImportFile[]): void } {
  const toPick = [...folders];
  let toOpen = [...opened];
  const listeners = new Set<() => void>();
  return {
    pick: vi.fn(async () => picked),
    opened: vi.fn(async () => toOpen.splice(0)),
    onOpened: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    open: (files) => {
      toOpen = [...toOpen, ...files];
      listeners.forEach((listener) => listener());
    },
    sha1s: vi.fn(async () => sha1s),
    copyRom: vi.fn(async (_folder: string, _file: string, path: string) => onCopy(path)),
    copyDemo: vi.fn(async () => {
      const path = "gbc/Tobu Tobu Girl Deluxe.gbc";
      await onCopy(path);
      return path;
    }),
    existingSave: vi.fn(async (_folder: string, rom: string) => saves[rom] ?? null),
    copySave: vi.fn(async () => {}),
    pickFolder: vi.fn(async () => toPick.shift() ?? null),
    scan: vi.fn(async (folder: string, hash: boolean) => {
      const found = scans[folder] ?? { files: [], other: 0 };
      return hash ? found : { ...found, files: found.files.map(({ sha1: _, ...file }) => file) };
    }),
  };
}
