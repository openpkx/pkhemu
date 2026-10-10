import { useEffect, useMemo, useState } from "react";
import { useEngine } from "@pkhex-everywhere/react";
import type { GameMemory } from "@/game-memory/gameMemory";
import { createPokemonInfo, type PokemonInfo, type Scope } from "./pokemonInfo";

export const READ_EVERY_MS = 300;

export function usePokemonInfo(memory: GameMemory, active: boolean, scope: Scope, formatId?: string) {
  const engine = useEngine();
  const reader = useMemo(() => createPokemonInfo(memory, engine, formatId), [memory, engine, formatId]);
  const [info, setInfo] = useState<PokemonInfo>();

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const read = await reader.read(scope);
        if (!stopped) setInfo(read);
      } catch {
        // A read can fail while the core is stopping or the engine is still booting; the next tick tries again.
      }
      if (!stopped) timer = setTimeout(tick, READ_EVERY_MS);
    };
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [reader, active, scope]);

  return info;
}
