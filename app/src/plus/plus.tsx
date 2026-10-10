import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type PlusStatus =
  { state: "unlocked" } | { state: "owned" } | { state: "notOwned"; price: string } | { state: "unavailable" };

export type Bought = "purchased" | "pending" | "cancelled";

export type PlusHost = {
  status(): Promise<PlusStatus>;
  buy(): Promise<Bought>;
  restore(): Promise<PlusStatus>;
  onStatus(listener: (status: PlusStatus) => void): () => void;
};

export type Plus = {
  status?: PlusStatus;
  buy(): Promise<Bought>;
  restore(): Promise<void>;
};

const unlocked: Plus = {
  status: { state: "unlocked" },
  buy: async () => "cancelled",
  restore: async () => {},
};

const PlusContext = createContext<Plus>(unlocked);

export function PlusProvider({ host, children }: { host: PlusHost; children: ReactNode }) {
  const [status, setStatus] = useState<PlusStatus>();
  const asked = useRef(0);

  const settle = useCallback((answer: PlusStatus) => {
    asked.current++;
    setStatus(answer);
  }, []);

  useEffect(() => host.onStatus(settle), [host, settle]);

  useEffect(() => {
    let current = true;
    host
      .status()
      .then((answer) => current && setStatus((known) => known ?? answer))
      .catch((reason) => console.error(reason));
    return () => {
      current = false;
    };
  }, [host]);

  useEffect(() => {
    const returned = () => {
      if (document.visibilityState !== "visible") return;
      const ask = ++asked.current;
      host
        .status()
        .then((answer) => ask === asked.current && setStatus(answer))
        .catch((reason) => console.error(reason));
    };
    document.addEventListener("visibilitychange", returned);
    return () => document.removeEventListener("visibilitychange", returned);
  }, [host]);

  const buy = useCallback(() => host.buy(), [host]);

  const restore = useCallback(async () => settle(await host.restore()), [host, settle]);

  const plus = useMemo<Plus>(() => ({ status, buy, restore }), [status, buy, restore]);

  return <PlusContext.Provider value={plus}>{children}</PlusContext.Provider>;
}

export function usePlus() {
  return useContext(PlusContext);
}
