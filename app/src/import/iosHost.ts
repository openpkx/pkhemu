import type { GamesFolderHost } from "@/games-folder/gamesFolder";
import { iosGamesFolderHost } from "@/games-folder/iosHost";
import type { ImportHost } from "./importFiles";
import { tauriImportHost } from "./tauriHost";

export const iosEmulatorHint = (device: GamesFolderHost["device"]) =>
  `Pick your emulator's folder in On My ${device}, like Delta, Provenance, RetroArch or Manic EMU.`;

export const iosImportHost: ImportHost = {
  ...tauriImportHost,
  emulatorHint: iosEmulatorHint(iosGamesFolderHost.device),
};
