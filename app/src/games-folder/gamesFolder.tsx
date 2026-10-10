import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { systems } from "@/systems";

export type GamesFolderHost = {
  pickFolder(): Promise<string | null>;
  ensureFolder(parent: string, name: string): Promise<void>;
  folderExists(path: string): Promise<boolean>;
  loadSaved(): Promise<string | null>;
  save(folder: string): Promise<void>;
  label(folder: string): string;
  openFolder?(): Promise<void>;
};

export type GamesFolderState = (
  | { status: "loading" }
  | { status: "none" }
  | { status: "ready"; folder: string; label: string; openFolder?(): Promise<void> }
) & { error?: string; choose(): Promise<void> };

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

  const choose = useCallback(async () => {
    try {
      const picked = await host.pickFolder();
      if (!picked) return;
      await createSystemFolders(host, picked);
      await host.save(picked);
      setFolder(picked);
      setError(undefined);
    } catch (reason) {
      setError(String(reason));
    }
  }, [host]);

  const state =
    folder === undefined
      ? { status: "loading" as const }
      : folder === null
        ? { status: "none" as const }
        : { status: "ready" as const, folder, label: host.label(folder), openFolder: host.openFolder };

  return (
    <GamesFolderContext.Provider value={{ ...state, error, choose }}>{children}</GamesFolderContext.Provider>
  );
}

export function useGamesFolder() {
  const value = useContext(GamesFolderContext);
  if (!value) throw new Error("useGamesFolder needs a GamesFolderProvider");
  return value;
}
