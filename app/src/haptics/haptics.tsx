import { createContext, useContext, type ReactNode } from "react";

export type HapticsHost = { tap(): void };

const noHost: HapticsHost = { tap() {} };

const HapticsContext = createContext<HapticsHost>(noHost);

export function HapticsProvider({ host, children }: { host: HapticsHost; children: ReactNode }) {
  return <HapticsContext.Provider value={host}>{children}</HapticsContext.Provider>;
}

export function useHaptics(): HapticsHost {
  return useContext(HapticsContext);
}
