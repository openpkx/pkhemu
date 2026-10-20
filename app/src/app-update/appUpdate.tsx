import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type UpdateCheck = { available: boolean; versionCode?: number; downloaded: boolean; downloading?: boolean };

export type InstallState =
  | { status: "downloading"; bytesDownloaded: number; totalBytesToDownload: number }
  | { status: "downloaded" }
  | { status: "stopped" };

export type AppUpdateHost = {
  check(): Promise<UpdateCheck>;
  start(): Promise<void>;
  complete(): Promise<void>;
  onInstallState(listener: (state: InstallState) => void): () => void;
};

export type AppUpdateState = "none" | "available" | "downloading" | "downloaded";

export type AppUpdate = {
  state: AppUpdateState;
  versionCode?: number;
  percent?: number;
  start(): void;
  complete(): void;
  toasted: Set<AppUpdateState>;
};

const AppUpdateContext = createContext<AppUpdate>({ state: "none", start: () => {}, complete: () => {}, toasted: new Set() });

export function AppUpdateProvider({ host, children }: { host: AppUpdateHost; children: ReactNode }) {
  const [checked, setChecked] = useState<UpdateCheck>();
  const [install, setInstall] = useState<InstallState>();
  const [toasted] = useState(() => new Set<AppUpdateState>());

  useEffect(
    () => host.onInstallState((next) => setInstall((last) => (last?.status === "downloaded" ? last : next))),
    [host],
  );

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

  const state = stateOf(checked, install);
  const percent =
    state === "downloading" && install?.status === "downloading" && install.totalBytesToDownload > 0
      ? Math.floor((100 * install.bytesDownloaded) / install.totalBytesToDownload)
      : undefined;
  const versionCode = checked?.versionCode;
  const update = useMemo<AppUpdate>(
    () => ({ state, versionCode, percent, start, complete, toasted }),
    [state, versionCode, percent, start, complete, toasted],
  );

  return <AppUpdateContext.Provider value={update}>{children}</AppUpdateContext.Provider>;
}

function stateOf(checked: UpdateCheck | undefined, install: InstallState | undefined): AppUpdateState {
  if (install?.status === "downloaded" || checked?.downloaded) return "downloaded";
  if (install) return install.status === "downloading" ? "downloading" : "available";
  if (checked?.downloading) return "downloading";
  return checked?.available ? "available" : "none";
}

export function useAppUpdate() {
  return useContext(AppUpdateContext);
}
