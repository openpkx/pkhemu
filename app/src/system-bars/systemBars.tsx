import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

export type SystemBarsHost = { setHidden(hidden: boolean): void; setLight(light: boolean): void; splashHidden(): void };

type SystemBars = SystemBarsHost & { setTone(light: boolean | undefined): void };

const noHost: SystemBarsHost = { setHidden() {}, setLight() {}, splashHidden() {} };

// The app's theme sets the bars' light, and a tone asked for over it wins until it's dropped.
function withTone(host: SystemBarsHost): SystemBars {
  let app: boolean | undefined;
  let tone: boolean | undefined;
  const apply = () => {
    const light = tone ?? app;
    if (light !== undefined) host.setLight(light);
  };
  return {
    setHidden: (hidden) => host.setHidden(hidden),
    splashHidden: () => host.splashHidden(),
    setLight(light) {
      app = light;
      apply();
    },
    setTone(light) {
      tone = light;
      apply();
    },
  };
}

const SystemBarsContext = createContext<SystemBars>(withTone(noHost));

export function SystemBarsProvider({ host, children }: { host: SystemBarsHost; children: ReactNode }) {
  const bars = useMemo(() => withTone(host), [host]);
  return <SystemBarsContext.Provider value={bars}>{children}</SystemBarsContext.Provider>;
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

export function useBarsTone(light: boolean | undefined) {
  const bars = useContext(SystemBarsContext);

  useEffect(() => bars.setTone(light), [bars, light]);
  useEffect(() => () => bars.setTone(undefined), [bars]);
}
