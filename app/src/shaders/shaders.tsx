import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePreferences } from "@/preferences/preferences";

export type ShadersHost = { offered(): Promise<boolean>; onLine: string };

const ShadersContext = createContext<{ offered: Promise<boolean>; onLine: string }>({
  offered: Promise.resolve(false),
  onLine: "",
});

export function ShadersProvider({ host, children }: { host: ShadersHost; children: ReactNode }) {
  const value = useMemo(() => ({ offered: host.offered(), onLine: host.onLine }), [host]);
  return <ShadersContext.Provider value={value}>{children}</ShadersContext.Provider>;
}

export function useAsyncShadersOffered() {
  const { offered: answer, onLine } = useContext(ShadersContext);
  const [offered, setOffered] = useState(false);

  useEffect(() => {
    let current = true;
    void answer.then((yes) => current && setOffered(yes));
    return () => {
      current = false;
    };
  }, [answer]);

  return { offered, onLine };
}

export function useAsyncShaders() {
  const { offered } = useContext(ShadersContext);
  const on = usePreferences().preferences.asyncShaders;
  return useMemo(() => offered.then((yes) => yes && on), [offered, on]);
}
