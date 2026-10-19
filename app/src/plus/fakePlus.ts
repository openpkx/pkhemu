import { vi } from "vitest";
import type { Bought, PlusHost, PlusStatus } from "./plus";

export function fakePlus({
  status: initial = { state: "notOwned", price: "$3.99" } as PlusStatus,
  buys = "purchased" as Bought,
  owned = false,
  offersRestore = true,
} = {}) {
  let status = initial;
  const listeners = new Set<(status: PlusStatus) => void>();
  const report = (next: PlusStatus) => {
    status = next;
    listeners.forEach((listener) => listener(next));
  };
  const host = {
    status: vi.fn(async () => status),
    buy: vi.fn(async () => {
      if (buys === "purchased") report({ state: "owned" });
      return buys;
    }),
    restore: vi.fn(async () => (owned ? { state: "owned" } : status) as PlusStatus),
    onStatus: (listener: (status: PlusStatus) => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    offersRestore,
  } satisfies PlusHost;
  return { host, report };
}
