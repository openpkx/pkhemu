import { invoke } from "@tauri-apps/api/core";
import type { Entitlement, MemoryNoticeHost } from "./memoryNotice";

let missing: Promise<Entitlement[]> | undefined;

export const tauriMemoryNoticeHost: MemoryNoticeHost = {
  missingEntitlements: () => (missing ??= invoke<Entitlement[]>("missing_memory_entitlements")),
};
