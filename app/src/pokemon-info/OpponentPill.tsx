import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/ui/button";
import type { GameMemory } from "@/game-memory/gameMemory";
import type { Input } from "@/input/input";
import type { BattleInfo, Reading } from "./pokemonInfo";
import { ivNames, unreadable } from "./PokemonCard";
import { Opponents } from "./PokemonInfoPanel";
import { usePokemonInfo } from "./usePokemonInfo";

function summary(reading: Reading) {
  if (reading.state === "unreadable") return unreadable;
  const { species, isShiny, nature, ivs } = reading.pokemon;
  const firstIvs = ivNames.slice(0, 3).map(([stat]) => ivs[stat]);
  return [species, isShiny && "Shiny", nature, `${firstIvs.join("/")}/…`].filter(Boolean).join(" · ");
}

export function OpponentPill({
  memory,
  formatId,
  active,
  randomized,
  open,
  input,
  onOpen,
  onClose,
}: {
  memory: GameMemory;
  formatId?: string;
  active: boolean;
  randomized: boolean;
  open: boolean;
  input: Input;
  onOpen(): void;
  onClose(): void;
}) {
  const battle = usePokemonInfo(memory, active, "battle", formatId)?.battle;
  return (
    <>
      {battle && battle.opponents.length > 0 && !open && (
        <Button
          variant="ghost"
          onClick={onOpen}
          className="pointer-events-auto h-auto flex-col gap-0 rounded-full bg-overlay/70 px-3 py-1 text-sm font-normal text-white hover:bg-overlay/80 hover:text-white"
        >
          {battle.opponents.map((reading, slot) => (
            <span key={slot}>{summary(reading)}</span>
          ))}
        </Button>
      )}
      <OpponentSheet open={open} battle={battle} randomized={randomized} input={input} onClose={onClose} />
    </>
  );
}

function OpponentSheet({
  open,
  battle,
  randomized,
  input,
  onClose,
}: {
  open: boolean;
  battle: BattleInfo | null | undefined;
  randomized: boolean;
  input: Input;
  onClose(): void;
}) {
  return (
    <BottomSheet open={open} title={battle && battle.opponents.length > 1 ? "Opponents" : "Opponent"} input={input} onClose={onClose}>
      {battle && <Opponents battle={battle} randomized={randomized} />}
    </BottomSheet>
  );
}
