import { vi } from "vitest";
import type { AppUpdateHost, UpdateCheck } from "./appUpdate";

export function fakeAppUpdate({ check = { available: false, downloaded: false } as UpdateCheck | Error } = {}) {
  const listeners = new Set<() => void>();
  const host = {
    check: vi.fn(async () => {
      if (check instanceof Error) throw check;
      return check;
    }),
    start: vi.fn(async () => {}),
    complete: vi.fn(async () => {}),
    onDownloaded: (listener: () => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  } satisfies AppUpdateHost;
  return { host, download: () => listeners.forEach((listener) => listener()) };
}
