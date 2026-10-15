import type { ImportHost } from "./importFiles";
import { tauriImportHost } from "./tauriHost";

export const desktopImportHost: ImportHost = {
  ...tauriImportHost,
  emulatorHint: "Pick your emulator's folder, like RetroArch.",
};
