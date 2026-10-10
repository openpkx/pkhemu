import { invoke } from "@tauri-apps/api/core";
import type { TransferPakHost } from "./setting";

export const tauriTransferPakHost: TransferPakHost = {
  transferPak: (folder, path) => invoke("transfer_pak", { folder, path }),
  chooseTransferPak: (folder, path, game) => invoke("choose_transfer_pak", { folder, path, game }),
};
