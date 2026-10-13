import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useVisible } from "@/visible";

export type Gravity = { x: number; y: number; z: number };

export type GravityHost = { start(): void; stop(): void; read(): Gravity | undefined };

const noHost: GravityHost = { start() {}, stop() {}, read: () => undefined };

const GravityContext = createContext<GravityHost>(noHost);

export function GravityProvider({ host, children }: { host: GravityHost; children: ReactNode }) {
  return <GravityContext.Provider value={host}>{children}</GravityContext.Provider>;
}

export function useGravity(playing: boolean): GravityHost["read"] {
  const host = useContext(GravityContext);
  const visible = useVisible();

  useEffect(() => {
    if (!playing || !visible) return;
    host.start();
    return () => host.stop();
  }, [host, playing, visible]);

  return host.read;
}
