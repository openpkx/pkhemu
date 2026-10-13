import { createContext, useContext, useEffect, type ReactNode } from "react";

export type SystemBarsHost = { setHidden(hidden: boolean): void; setLight(light: boolean): void; splashHidden(): void };

const noHost: SystemBarsHost = { setHidden() {}, setLight() {}, splashHidden() {} };

const SystemBarsContext = createContext<SystemBarsHost>(noHost);

export function SystemBarsProvider({ host, children }: { host: SystemBarsHost; children: ReactNode }) {
  return <SystemBarsContext.Provider value={host}>{children}</SystemBarsContext.Provider>;
}

export function useSystemBars(): SystemBarsHost {
  return useContext(SystemBarsContext);
}

export function useHiddenSystemBars() {
  const host = useSystemBars();

  useEffect(() => {
    host.setHidden(true);
    return () => host.setHidden(false);
  }, [host]);
}
