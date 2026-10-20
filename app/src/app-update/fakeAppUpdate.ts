import { vi } from "vitest";
import type { AppUpdateHost, InstallState, UpdateCheck } from "./appUpdate";

export function fakeAppUpdate({ check = { available: false, downloaded: false } as UpdateCheck | Error } = {}) {
  const listeners = new Set<(state: InstallState) => void>();
  const host = {
    check: vi.fn(async () => {
      if (check instanceof Error) throw check;
      return check;
    }),
    start: vi.fn(async () => {}),
    complete: vi.fn(async () => {}),
    onInstallState: (listener: (state: InstallState) => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  } satisfies AppUpdateHost;
  const report = (state: InstallState) => listeners.forEach((listener) => listener(state));
  return {
    host,
    downloading: (bytesDownloaded: number, totalBytesToDownload: number) =>
      report({ status: "downloading", bytesDownloaded, totalBytesToDownload }),
    download: () => report({ status: "downloaded" }),
    stop: () => report({ status: "stopped" }),
  };
}
