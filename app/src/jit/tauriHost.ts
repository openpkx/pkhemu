import { invoke } from "@tauri-apps/api/core";
import type { JitHost } from "./jit";

export const tauriJitHost: JitHost = {
  on: () => invoke("jit_on"),
  enable: () => invoke("jit_enable"),
  helper: () => invoke("jit_helper"),
  turnOn: () => invoke("jit_turn_on"),
  pairingFile: () => invoke("jit_pairing_file"),
  importPairingFile: () => invoke("jit_pairing_file_import"),
  removePairingFile: () => invoke("jit_pairing_file_remove"),
};
