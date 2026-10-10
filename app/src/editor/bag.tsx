import { useId, useState } from "react";
import { useInventory } from "@pkhex-everywhere/react";
import { Plus } from "lucide-react";
import type { AddableItem, OwnedItem } from "@pkhex-everywhere/engine";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ItemArt } from "@/game-art/gameArt";
import type { Page } from "./EditorScreen";

const pocketOrder = ["Items", "Medicine", "Balls", "TMHMs", "Berries", "MailItems", "BattleItems", "KeyItems", "PCItems"];

const pocketLabels: Record<string, string> = { TMHMs: "TMs & HMs", MailItems: "Mail", PCItems: "PC" };

const pocketLabel = (name: string) =>
  pocketLabels[name] ?? name.replace(/([a-z])([A-Z])/g, (_, end: string, start: string) => `${end} ${start.toLowerCase()}`);

const rank = (name: string) => {
  const index = pocketOrder.indexOf(name);
  return index === -1 ? pocketOrder.length : index;
};

type SetCount = (itemId: number, count: number) => Promise<boolean>;

function ItemRow({ item, setCount }: { item: OwnedItem; setCount: SetCount }) {
  const id = useId();

  const commit = async (input: HTMLInputElement) => {
    const count = /^\d+$/.test(input.value) ? Math.min(Number(input.value), item.maxCount) : item.count;
    input.value = String(count);
    if (count !== item.count && !(await setCount(item.id, count))) input.value = String(item.count);
  };

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <ItemArt item={item} size={8} decorative />
      <label htmlFor={id} className="min-w-0 flex-1 truncate">
        {item.name}
      </label>
      <Input
        key={item.count}
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={item.maxCount}
        defaultValue={item.count}
        onBlur={(event) => void commit(event.currentTarget)}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
        className="w-20 text-right"
      />
    </li>
  );
}

function AddItem({ addable, setCount }: { addable: AddableItem[]; setCount: SetCount }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const matches = addable
    .filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const add = (itemId: number) => {
    void setCount(itemId, 1);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(opened) => {
        setOpen(opened);
        setSearch("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="justify-self-start">
          <Plus />
          Add item
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[80dvh] flex-col">
        <DialogHeader>
          <DialogTitle>Add item</DialogTitle>
        </DialogHeader>
        <Input type="search" placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <ul className="-mx-2 min-h-0 overflow-y-auto">
          {matches.map((item) => (
            <li key={item.id}>
              <Button variant="ghost" className="w-full justify-start rounded-lg" onClick={() => add(item.id)}>
                {item.name}
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function Bag() {
  const { inventory, setItem } = useInventory();
  const [error, setError] = useState<string>();
  const pouches = [...inventory].sort((a, b) => rank(a.name) - rank(b.name));
  const [picked, setPicked] = useState<string>();
  const pouch = pouches.find((pouch) => pouch.name === picked) ?? pouches[0];

  if (!pouch) return <p className="p-4 text-sm text-muted-foreground">This save has no bag.</p>;

  const setCount: SetCount = (itemId, count) =>
    setItem({ pouch: pouch.name, itemId }, count).then(
      () => {
        setError(undefined);
        return true;
      },
      (reason) => {
        setError(String(reason));
        return false;
      },
    );

  return (
    <>
      <div className="sticky top-0 z-10 grid gap-2 bg-background p-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <ToggleGroup
          type="single"
          variant="outline"
          value={pouch.name}
          onValueChange={(name) => name && setPicked(name)}
          className="w-full flex-wrap"
        >
          {pouches.map(({ name }) => (
            <ToggleGroupItem key={name} value={name}>
              {pocketLabel(name)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {pouch.addable.length > 0 && <AddItem addable={pouch.addable} setCount={setCount} />}
      </div>
      <div className="px-4 pb-4">
        {pouch.items.length ? (
          <ul className="divide-y rounded-lg border">
            {pouch.items.map((item) => (
              <ItemRow key={item.id} item={item} setCount={setCount} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">This pocket is empty.</p>
        )}
      </div>
    </>
  );
}

export const bagPage: Page = { title: "Bag", content: <Bag /> };
