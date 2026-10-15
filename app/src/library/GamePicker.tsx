import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import type { Game } from "./scan";

export function GamePicker({
  games,
  value,
  labelledBy,
  onPick,
}: {
  games: Game[];
  value: Game | null;
  labelledBy: string;
  onPick(game: Game | null): void;
}) {
  return (
    <Combobox
      items={games}
      value={value}
      onValueChange={(picked: Game | null) => onPick(picked)}
      itemToStringLabel={(game: Game) => game.name}
      isItemEqualToValue={(game: Game, other: Game) => game.path === other.path}
    >
      <ComboboxTrigger
        aria-labelledby={labelledBy}
        render={<Button variant="outline" className="w-full min-w-0 shrink justify-between rounded-lg font-normal" />}
      >
        <span className="truncate">
          <ComboboxValue placeholder="Choose a game" />
        </span>
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput showTrigger={false} placeholder="Search" aria-label="Search" />
        <ComboboxEmpty>No matches</ComboboxEmpty>
        <ComboboxList>
          {(game: Game) => (
            <ComboboxItem key={game.path} value={game}>
              {game.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
