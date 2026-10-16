import { vi } from "vitest";
import type { JitHelper, JitHost } from "./jit";

export function fakeJit({ on: initial = false, pairingFile: paired = false, helper = "ready" as JitHelper } = {}) {
  let on = initial;
  let pairingFile = paired;
  const host = {
    on: vi.fn(async () => on),
    enable: vi.fn(async () => {}),
    helper: vi.fn(async () => helper),
    turnOn: vi.fn(async () => {
      on = true;
      return true;
    }),
    pairingFile: vi.fn(async () => pairingFile),
    importPairingFile: vi.fn(async () => {
      pairingFile = true;
      return true;
    }),
    removePairingFile: vi.fn(async () => {
      pairingFile = false;
    }),
  } satisfies JitHost;
  return {
    host,
    turnOn: () => {
      on = true;
    },
  };
}
