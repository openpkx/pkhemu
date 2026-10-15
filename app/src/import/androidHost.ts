import type { ImportHost } from "./importFiles";
import { tauriImportHost } from "./tauriHost";

export const androidImportHost: ImportHost = {
  ...tauriImportHost,
  emulatorHint:
    "Pick your emulator's folder, like RetroArch, Pizza Boy or My Boy!, or the folder with your ROMs.",
};
