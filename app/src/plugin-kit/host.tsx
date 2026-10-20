import { createContext, useContext, type ReactNode } from "react";

export type KitHost = {
  useBack(onBack: (() => void) | undefined): void;
};

const KitContext = createContext<KitHost | null>(null);

export function KitProvider({ host, children }: { host: KitHost; children: ReactNode }) {
  return <KitContext.Provider value={host}>{children}</KitContext.Provider>;
}

export function useBack(onBack: (() => void) | undefined) {
  const host = useContext(KitContext);
  if (!host) throw new Error("useBack needs a KitProvider");
  host.useBack(onBack);
}
