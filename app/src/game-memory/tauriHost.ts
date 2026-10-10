import { invoke } from "@tauri-apps/api/core";
import type { ReadMemory } from "./builds";

export const tauriReadMemory: ReadMemory = async (ranges) => new Uint8Array(await invoke<ArrayBuffer>("read_memory", { ranges }));
