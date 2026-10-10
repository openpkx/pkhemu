import { createContext, useContext, type ReactNode } from "react";

export type ClipboardHost = { writeText(text: string): Promise<void> };

const noHost: ClipboardHost = {
  writeText: () => Promise.reject(new Error("Copying needs a ClipboardProvider")),
};

const ClipboardContext = createContext<ClipboardHost>(noHost);

export function ClipboardProvider({ host, children }: { host: ClipboardHost; children: ReactNode }) {
  return <ClipboardContext.Provider value={host}>{children}</ClipboardContext.Provider>;
}

export function useClipboard(): ClipboardHost {
  return useContext(ClipboardContext);
}
