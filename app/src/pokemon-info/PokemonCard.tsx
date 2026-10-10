import { useId } from "react";
import type { StatValues } from "@pkhex-everywhere/engine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PokemonArt } from "@/game-art/gameArt";
import type { Reading } from "./pokemonInfo";

export const ivNames: [keyof StatValues, string][] = [
  ["health", "HP"],
  ["attack", "Atk"],
  ["defense", "Def"],
  ["specialAttack", "SpA"],
  ["specialDefense", "SpD"],
  ["speed", "Spe"],
];

export const unreadable = "Can't read this game";

export function PokemonCard({ reading, randomized }: { reading: Reading; randomized: boolean }) {
  const titleId = useId();
  if (reading.state === "unreadable")
    return (
      <Card role="article" size="sm">
        <CardContent className="text-muted-foreground">{unreadable}</CardContent>
      </Card>
    );
  const { pokemon } = reading;
  const traits = [pokemon.nature, !randomized && pokemon.ability].filter(Boolean).join(" · ");
  return (
    <Card role="article" aria-labelledby={titleId} size="sm" className="min-w-0">
      <CardHeader className="grid-cols-[auto_1fr] items-center gap-x-3">
        <PokemonArt pokemon={pokemon} size={14} className="row-span-3" />
        <CardTitle id={titleId} className="flex flex-wrap items-center gap-x-2 break-words">
          {pokemon.species} · Lv. {pokemon.level}
          {pokemon.isShiny && <Badge variant="secondary">Shiny</Badge>}
        </CardTitle>
        <p className="text-muted-foreground">{pokemon.heldItem ?? "No item"}</p>
        {traits && <p className="text-muted-foreground">{traits}</p>}
      </CardHeader>
      <CardContent className="grid gap-3">
        <dl aria-label="IVs" className="grid grid-cols-6 text-center">
          {ivNames.map(([stat, name]) => (
            <div key={stat} className="grid">
              <dt className="text-xs text-muted-foreground">{name}</dt>
              <dd className="tabular-nums">{pokemon.ivs[stat]}</dd>
            </div>
          ))}
        </dl>
        {pokemon.moves.length > 0 && (
          <ul aria-label="Moves" className="grid grid-cols-2 gap-1">
            {pokemon.moves.map((move, slot) => (
              <li key={slot} className="rounded-md bg-muted px-2 py-1 break-words">
                {move}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
