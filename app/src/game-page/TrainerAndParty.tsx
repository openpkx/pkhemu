import type { ReactNode } from "react";
import { Crossfade } from "@/motion/motion";
import { PokemonArt, summaryArt } from "@/game-art/gameArt";
import { ProgressStats } from "./ProgressStats";
import { genderSymbols, type SaveSummary } from "./saveSummary";

export function TrainerAndParty({ summary: { trainer, party, progress }, children }: { summary: SaveSummary; children?: ReactNode }) {
  return (
    <>
      <div className="grid gap-1">
        {/* pr-8 keeps the money clear of the card's ⋯ menu. */}
        <div className="flex items-baseline justify-between gap-2 pr-8">
          <Crossfade value={`${trainer.name} ${trainer.gender}`}>
            <h2 className="font-heading text-lg font-medium break-words">
              {trainer.name} {trainer.gender && genderSymbols[trainer.gender]}
            </h2>
          </Crossfade>
          {trainer.money !== null && (
            <Crossfade value={trainer.money}>
              <span className="text-sm tabular-nums">₽{trainer.money.toLocaleString("en")}</span>
            </Crossfade>
          )}
        </div>
        {children}
        <ProgressStats progress={progress} pixel />
      </div>
      {party.length > 0 && (
        <ul aria-label="Party" className="grid grid-cols-6 gap-1">
          {party.map((pokemon, slot) => (
            <li key={slot} className="grid justify-items-center gap-0.5">
              <Crossfade value={`${pokemon.speciesId}-${pokemon.form.id}-${pokemon.isShiny}`}>
                <PokemonArt pokemon={summaryArt(pokemon)} size={12} />
              </Crossfade>
              <Crossfade value={pokemon.level}>
                <span className="text-xs text-muted-foreground">Lv. {pokemon.level}</span>
              </Crossfade>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
