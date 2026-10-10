import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PokemonArt } from "@/game-art/gameArt";
import type { GameMemory } from "@/game-memory/gameMemory";
import type { BattleInfo, Reading } from "./pokemonInfo";
import { PokemonCard } from "./PokemonCard";
import { usePokemonInfo } from "./usePokemonInfo";

export function PokemonInfoPanel({
  memory,
  formatId,
  active,
  randomized,
}: {
  memory: GameMemory;
  formatId?: string;
  active: boolean;
  randomized: boolean;
}) {
  const info = usePokemonInfo(memory, active, "all", formatId);
  return (
    <aside aria-label="Pokémon info" className="grid w-72 shrink-0 content-start gap-3 overflow-y-auto border-l bg-background p-3 lg:w-80">
      {!info ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : info.battle ? (
        <>
          <Opponents battle={info.battle} randomized={randomized} />
          <PartyRow party={info.party} />
        </>
      ) : (
        <PartyList party={info.party} randomized={randomized} />
      )}
    </aside>
  );
}

export function Opponents({ battle, randomized }: { battle: BattleInfo; randomized: boolean }) {
  return (
    <section aria-label="Opponents" className="grid gap-2">
      {battle.opponents.map((reading, slot) => (
        <PokemonCard key={slot} reading={reading} randomized={randomized} />
      ))}
      {battle.kind === "trainer" && <p className="text-sm text-muted-foreground">{battle.left} left</p>}
    </section>
  );
}

function PartyRow({ party }: { party: Reading[] }) {
  return (
    <ul aria-label="Party" className="grid grid-cols-6 gap-1">
      {party.map((reading, slot) => (
        <li key={slot} className="grid justify-items-center gap-0.5">
          {reading.state === "read" ? (
            <>
              <PokemonArt pokemon={reading.pokemon} size={10} />
              <span className="text-xs text-muted-foreground">Lv. {reading.pokemon.level}</span>
            </>
          ) : (
            <span className="flex size-10 items-center justify-center text-muted-foreground">?</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function PartyList({ party, randomized }: { party: Reading[]; randomized: boolean }) {
  return (
    <ul aria-label="Party" className="grid gap-1">
      {party.map((reading, slot) => (
        <li key={slot}>
          {reading.state === "read" ? (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="group h-auto w-full justify-start gap-3 rounded-lg px-2 py-1">
                  <PokemonArt pokemon={reading.pokemon} size={10} decorative />
                  <span className="break-words">{reading.pokemon.species}</span>
                  <span className="ml-auto text-muted-foreground">Lv. {reading.pokemon.level}</span>
                  <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-1">
                <PokemonCard reading={reading} randomized={randomized} />
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <PokemonCard reading={reading} randomized={randomized} />
          )}
        </li>
      ))}
    </ul>
  );
}
