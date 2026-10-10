import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { systems } from "@/systems";

export type GamesFolderHost = {
  pickFolder(): Promise<string | null>;
  makeFolder(): Promise<string | null>;
  findFolder(): Promise<string | null>;
  listFolders(folder: string): Promise<string[]>;
  ensureFolder(parent: string, name: string): Promise<void>;
  folderExists(path: string): Promise<boolean>;
  loadSaved(): Promise<string | null>;
  save(folder: string): Promise<void>;
  label(folder: string): string;
  device: "phone" | "Mac";
  openFolder?(): Promise<void>;
};

export type UnfamiliarFolder = { folder: string; label: string };

export type GamesFolderState = (
  | { status: "loading" }
  | { status: "none" }
  | { status: "ready"; folder: string; label: string; openFolder?(): Promise<void> }
) & {
  error?: string;
  device: GamesFolderHost["device"];
  choose(): Promise<string | null>;
  make(): Promise<string | null>;
  pickPrevious(): Promise<UnfamiliarFolder | null>;
  keep(folder: string): Promise<string | null>;
};

async function createSystemFolders(host: GamesFolderHost, folder: string) {
  for (const system of systems) await host.ensureFolder(folder, system);
}

async function restore(host: GamesFolderHost) {
  const folder = await host.loadSaved();
  if (!folder || !(await host.folderExists(folder).catch(() => false))) return null;
  await createSystemFolders(host, folder);
  return folder;
}

const GamesFolderContext = createContext<GamesFolderState | null>(null);

export function GamesFolderProvider({ host, children }: { host: GamesFolderHost; children: ReactNode }) {
  const [folder, setFolder] = useState<string | null>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let current = true;
    restore(host).then(
      (restored) => current && setFolder(restored),
      (reason) => {
        if (!current) return;
        setFolder(null);
        setError(String(reason));
      },
    );
    return () => {
      current = false;
    };
  }, [host]);

  const keep = useCallback(
    async (picked: string) => {
      try {
        await createSystemFolders(host, picked);
        await host.save(picked);
        setFolder(picked);
        setError(undefined);
        return picked;
      } catch (reason) {
        setError(String(reason));
        return null;
      }
    },
    [host],
  );
  const adopt = useCallback(
    async (pick: () => Promise<string | null>) => {
      try {
        const picked = await pick();
        return picked ? keep(picked) : null;
      } catch (reason) {
        setError(String(reason));
        return null;
      }
    },
    [keep],
  );
  const choose = useCallback(() => adopt(host.pickFolder), [adopt, host]);
  const make = useCallback(() => adopt(host.makeFolder), [adopt, host]);
  const pickPrevious = useCallback(async () => {
    try {
      const picked = await host.findFolder();
      if (!picked) return null;
      const names = await host.listFolders(picked);
      if (systems.some((system) => names.includes(system))) {
        await keep(picked);
        return null;
      }
      setError(undefined);
      return { folder: picked, label: host.label(picked) };
    } catch (reason) {
      setError(String(reason));
      return null;
    }
  }, [host, keep]);

  const state =
    folder === undefined
      ? { status: "loading" as const }
      : folder === null
        ? { status: "none" as const }
        : { status: "ready" as const, folder, label: host.label(folder), openFolder: host.openFolder };

  return (
    <GamesFolderContext.Provider value={{ ...state, error, device: host.device, choose, make, pickPrevious, keep }}>{children}</GamesFolderContext.Provider>
  );
}

export function useGamesFolder() {
  const value = useContext(GamesFolderContext);
  if (!value) throw new Error("useGamesFolder needs a GamesFolderProvider");
  return value;
}
