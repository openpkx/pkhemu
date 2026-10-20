import { useId, useState } from "react";
import { Check } from "lucide-react";
import { useBack } from "@/back/back";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ScreenHeader } from "@/plugin-kit/ScreenHeader";
import { sectionHeading } from "@/plugin-kit/sectionHeading";
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
import type { Input } from "@/input/input";
import type { Game } from "@/library/scan";
import { moveFocusWithArrows, PadNavigation } from "@/pad-navigation/PadNavigation";
import { cartName, carts, type Cart } from "./setting";

const line = "The Game Boy game plugged into the controller.";

export function TransferPakCard({ games, chosen, onChoose }: { games: Game[]; chosen: string | null; onChoose(game: string | null): void }) {
  const headingId = useId();
  const items = carts(games, chosen);
  return (
    <section aria-labelledby={headingId} className="grid content-start gap-3 rounded-xl border p-4">
      <h2 id={headingId} className={sectionHeading}>
        Transfer Pak
      </h2>
      <Combobox
        items={items}
        value={items.find((cart) => cart.path === chosen) ?? null}
        onValueChange={(cart: Cart | null) => cart && cart.path !== chosen && onChoose(cart.path)}
        itemToStringLabel={(cart: Cart) => cart.name}
        isItemEqualToValue={(cart: Cart, other: Cart) => cart.path === other.path}
      >
        <ComboboxTrigger
          aria-labelledby={headingId}
          render={<Button variant="outline" className="w-full min-w-0 shrink justify-between rounded-lg font-normal" />}
        >
          <span className="truncate">
            <ComboboxValue />
          </span>
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxInput showTrigger={false} placeholder="Search" aria-label="Search" />
          <ComboboxEmpty>No matches</ComboboxEmpty>
          <ComboboxList>
            {(cart: Cart) => (
              <ComboboxItem key={cart.path ?? ""} value={cart}>
                {cart.name}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <p className="text-sm text-muted-foreground">{line}</p>
    </section>
  );
}

export function TransferPakScreen({
  games,
  chosen,
  input,
  onRestart,
  onBack,
}: {
  games: Game[];
  chosen: string | null;
  input: Input;
  onRestart(game: string | null): void;
  onBack(): void;
}) {
  const [asking, setAsking] = useState<Cart>();
  const items = carts(games, chosen);
  const pick = (cart: Cart) => (cart.path === chosen ? onBack() : setAsking(cart));
  useBack(() => (asking ? setAsking(undefined) : onBack()));

  return (
    <div className="fixed inset-0 px-safe pb-safe z-20 overflow-y-auto bg-background">
      <PadNavigation input={input} />
      <ScreenHeader title="Transfer Pak" onBack={onBack} />
      <main className="mx-auto grid max-w-2xl gap-3 p-4" onKeyDown={moveFocusWithArrows}>
        <p className="text-muted-foreground">{line}</p>
        <div role="radiogroup" aria-label="Transfer Pak" className="grid gap-1">
          {items.map((cart) => (
            <Button
              key={cart.path ?? ""}
              role="radio"
              aria-checked={cart.path === chosen}
              variant="ghost"
              autoFocus={cart.path === chosen}
              className="h-11 justify-start gap-3 rounded-lg px-3 text-base"
              onClick={() => pick(cart)}
            >
              <Check className={cart.path === chosen ? undefined : "invisible"} />
              <span className="truncate">{cart.name}</span>
            </Button>
          ))}
        </div>
      </main>
      <ConfirmDialog
        title="Restart the game?"
        action="Restart"
        open={!!asking}
        onConfirm={() => asking && onRestart(asking.path)}
        onCancel={() => setAsking(undefined)}
      >
        {asking?.path
          ? `The game restarts with ${cartName(asking.path)} in the Transfer Pak. Play since your last save is lost.`
          : "The game restarts with a Controller Pak in place of the Transfer Pak. Play since your last save is lost."}
      </ConfirmDialog>
    </div>
  );
}
