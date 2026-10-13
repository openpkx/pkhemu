import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type UpdateCheck = { available: boolean; versionCode?: number; downloaded: boolean };

export type AppUpdateHost = {
  check(): Promise<UpdateCheck>;
  start(): Promise<void>;
  complete(): Promise<void>;
  onDownloaded(listener: () => void): () => void;
};

export type AppUpdateState = "none" | "available" | "downloaded";

export type AppUpdate = {
  state: AppUpdateState;
  versionCode?: number;
  start(): void;
  complete(): void;
  toasted: Set<AppUpdateState>;
};

const AppUpdateContext = createContext<AppUpdate>({ state: "none", start: () => {}, complete: () => {}, toasted: new Set() });

export function AppUpdateProvider({ host, children }: { host: AppUpdateHost; children: ReactNode }) {
  const [checked, setChecked] = useState<UpdateCheck>();
  const [downloaded, setDownloaded] = useState(false);
  const [toasted] = useState(() => new Set<AppUpdateState>());

  useEffect(() => host.onDownloaded(() => setDownloaded(true)), [host]);

  useEffect(() => {
    let current = true;
    host
      .check()
      .then((answer) => current && setChecked(answer))
      .catch((reason) => console.error(reason));
    return () => {
      current = false;
    };
  }, [host]);

  const start = useCallback(() => void host.start().catch((reason) => console.error(reason)), [host]);
  const complete = useCallback(() => void host.complete().catch((reason) => console.error(reason)), [host]);

  const state: AppUpdateState = downloaded || checked?.downloaded ? "downloaded" : checked?.available ? "available" : "none";
  const versionCode = checked?.versionCode;
  const update = useMemo<AppUpdate>(
    () => ({ state, versionCode, start, complete, toasted }),
    [state, versionCode, start, complete, toasted],
  );

  return <AppUpdateContext.Provider value={update}>{children}</AppUpdateContext.Provider>;
}

export function useAppUpdate() {
  return useContext(AppUpdateContext);
}
