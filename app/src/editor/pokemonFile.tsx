import { createContext, useContext, type ReactNode } from "react";

export type PickedFile = { name: string; bytes: Uint8Array };

export type PokemonFileHost = { pick(): Promise<PickedFile | null> };

const noHost: PokemonFileHost = {
  pick: () => Promise.reject(new Error("Picking a file needs a PokemonFileProvider")),
};

const PokemonFileContext = createContext<PokemonFileHost>(noHost);

export function PokemonFileProvider({ host, children }: { host: PokemonFileHost; children: ReactNode }) {
  return <PokemonFileContext.Provider value={host}>{children}</PokemonFileContext.Provider>;
}

export function usePokemonFiles(): PokemonFileHost {
  return useContext(PokemonFileContext);
}
