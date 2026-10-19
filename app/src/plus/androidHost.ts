import type { PlusHost } from "./plus";
import { tauriPlusHost } from "./tauriHost";

export const androidPlusHost: PlusHost = { ...tauriPlusHost, offersRestore: false };
