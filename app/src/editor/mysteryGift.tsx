import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, FileUp, Gift, TriangleAlert, X } from "lucide-react";
import { useEngine, useLoadedGame, useMysteryGift, useQuery } from "@pkhex-everywhere/react";
import type { ErrorCode, GiftAlbum, GiftEvent, GiftItem, SpeciesEntry, WonderCardEntry, WonderCardPreview } from "@pkhex-everywhere/engine";
import { cn, messageOf } from "@/lib/utils";
import { BottomBar } from "@/components/BottomBar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ItemArt, PokemonArt, summaryArt } from "@/game-art/gameArt";
import { rowClass } from "./addPokemon";
import { useEditorNav, type Page } from "./EditorScreen";
import { usePokemonFiles } from "./pokemonFile";
import { useSeen } from "./useSeen";

type Nav = ReturnType<typeof useEditorNav>;
type Source = { event: string } | { file: Uint8Array };
type Filter = "pokemon" | "item";

const errorCode = (reason: unknown) => (reason as { code?: ErrorCode } | null)?.code;

const failures: Partial<Record<ErrorCode, string>> = {
  unparseable: "That file isn't a Wonder Card",
  "wrong-generation": "That card is for another generation",
  "not-supported": "That card doesn't go in the album",
  "no-slot": "Eight gifts already wait for the delivery person. Collect one in the game first.",
};

const failure = (reason: unknown) => {
  const code = errorCode(reason);
  return (code && failures[code]) ?? messageOf(reason);
};

function GiftArt({ species, item, size }: { species: SpeciesEntry | null; item: GiftItem | null; size: number }) {
  if (species) return <PokemonArt pokemon={{ speciesId: species.id, species: species.name }} size={size} decorative />;
  if (item) return <ItemArt item={{ index: item.id, name: item.name }} size={size} decorative />;
  return (
    <span className="grid size-full place-items-center text-muted-foreground">
      <Gift className="size-5" />
    </span>
  );
}

function PreviewArt({ preview, size }: { preview: WonderCardPreview; size: number }) {
  if (preview.pokemon) return <PokemonArt pokemon={summaryArt(preview.pokemon)} size={size} decorative />;
  return <GiftArt species={null} item={preview.item} size={size} />;
}

function Tags({ language, received }: { language: string | null; received?: boolean }) {
  if (!language && !received) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {language && <Badge variant="outline">{language}</Badge>}
      {received && <Badge variant="secondary">Received</Badge>}
    </span>
  );
}

function AlbumCard({ card, slot, onRemove }: { card: WonderCardEntry; slot: number; onRemove(slot: number): void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className={cn("flex min-h-14 items-center gap-3 px-3 py-2", slot > 0 && "border-t")}>
      <span className="size-10 shrink-0">
        <GiftArt species={card.species} item={card.item} size={10} />
      </span>
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="break-words">{card.title}</span>
        <Tags language={card.language} />
      </span>
      <Button variant="ghost" size="icon" aria-label={`Remove ${card.title}`} onClick={() => setConfirming(true)}>
        <X />
      </Button>
      <ConfirmDialog
        title={`Remove ${card.title}?`}
        action="Remove"
        destructive
        open={confirming}
        onConfirm={() => {
          setConfirming(false);
          onRemove(slot);
        }}
        onCancel={() => setConfirming(false)}
      >
        A gift you haven't collected goes with it. The cards after it move up.
      </ConfirmDialog>
    </li>
  );
}

function Album() {
  const { album, remove } = useMysteryGift();
  const [error, setError] = useState<string>();
  const titleId = useId();
  const cards = album.slots.flatMap(({ index, card }) => (card ? [{ index, card }] : []));
  const full = cards.length === album.slots.length;

  const removeAt = (slot: number) => {
    setError(undefined);
    remove(slot).catch((reason) => setError(failure(reason)));
  };

  return (
    <section aria-labelledby={titleId} className="grid gap-3 p-4 pb-0">
      <div className="grid gap-0.5">
        <h2 id={titleId} className="font-heading font-medium">
          In the save
        </h2>
        {(full || error) && (
          <p role="status" className={cn("text-sm", error ? "text-destructive" : "text-muted-foreground")}>
            {error ?? "The album is full. A new card replaces one."}
          </p>
        )}
      </div>
      {cards.length ? (
        <ul aria-label="Cards" className="rounded-lg border">
          {cards.map(({ index, card }) => (
            <AlbumCard key={index} card={card} slot={index} onRemove={removeAt} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No cards yet.</p>
      )}
    </section>
  );
}

function EventRow({ event, disabled, onPick }: { event: GiftEvent; disabled: boolean; onPick(): void }) {
  const { ref, seen } = useSeen<HTMLButtonElement>();
  return (
    <Button ref={ref} variant="ghost" className={rowClass} disabled={disabled} onClick={onPick}>
      <span className="size-10 shrink-0">{seen && <GiftArt species={event.species} item={event.item} size={10} />}</span>
      <span className="grid min-w-0 flex-1 gap-1">
        <span>{event.title}</span>
        <Tags language={event.language} received={event.received} />
      </span>
    </Button>
  );
}

function matches(event: GiftEvent, search: string) {
  const text = search.trim().toLowerCase();
  return [event.title, event.species?.name, event.item?.name].some((name) => name?.toLowerCase().includes(text));
}

function PreviewDetails({ preview }: { preview: WonderCardPreview }) {
  const { pokemon, item } = preview;
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <span className="size-14 shrink-0">
          <PreviewArt preview={preview} size={14} />
        </span>
        <div className="grid min-w-0 flex-1 gap-1 text-sm">
          {pokemon && (
            <span className="font-medium break-words">
              {pokemon.species} · Lv. {pokemon.level}
            </span>
          )}
          {pokemon && pokemon.form.id !== 0 && <span>{pokemon.form.name}</span>}
          {item && <span className="font-medium break-words">{item.name}</span>}
          {!pokemon && !item && <span className="text-muted-foreground">Not a Pokémon or an item</span>}
          {(pokemon?.isEgg || pokemon?.isShiny || preview.language) && (
            <span className="flex flex-wrap gap-1">
              {pokemon?.isEgg && <Badge variant="outline">Egg</Badge>}
              {pokemon?.isShiny && <Badge variant="outline">Shiny</Badge>}
              {preview.language && <Badge variant="outline">{preview.language}</Badge>}
            </span>
          )}
        </div>
      </div>
      {!preview.known && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Not a known event</AlertTitle>
        </Alert>
      )}
    </div>
  );
}

function PreviewDialog({ preview, onReview, onCancel }: { preview?: WonderCardPreview; onReview(): void; onCancel(): void }) {
  return (
    <AlertDialog open={!!preview} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent onOverlayClick={onCancel} onEscapeKeyDown={(event) => event.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{preview?.title}</AlertDialogTitle>
          <AlertDialogDescription>The card goes in the album, and you collect its gift in the game.</AlertDialogDescription>
        </AlertDialogHeader>
        {preview && <PreviewDetails preview={preview} />}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onReview}>Review</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Events({ file }: { file?: Uint8Array }) {
  const engine = useEngine();
  const nav = useEditorNav();
  const files = usePokemonFiles();
  const events = useQuery("mysteryGift.events");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [picked, setPicked] = useState<{ source: Source; preview: WonderCardPreview }>();
  const shown = useMemo(
    () => events.filter((event) => (!filter || event.kind === filter) && matches(event, search)),
    [events, filter, search],
  );

  const openPreview = async (pick: () => Promise<{ source: Source; preview: WonderCardPreview } | undefined>) => {
    setBusy(true);
    setError(undefined);
    try {
      setPicked(await pick());
    } catch (reason) {
      setError(failure(reason));
    } finally {
      setBusy(false);
    }
  };

  const pickEvent = (id: string) =>
    void openPreview(async () => ({ source: { event: id }, preview: await engine.mysteryGift.previewEvent(id) }));

  const previewFile = async (bytes: Uint8Array) => ({ source: { file: bytes }, preview: await engine.mysteryGift.previewFile(bytes) });

  const pickFile = () =>
    void openPreview(async () => {
      const picked = await files.pick();
      return picked ? previewFile(picked.bytes) : undefined;
    });

  // Once per page: StrictMode reruns the effect, and the preview mustn't come back after Review closes.
  const opened = useRef(false);
  useEffect(() => {
    if (!file || opened.current) return;
    opened.current = true;
    void openPreview(() => previewFile(file));
  }, [file]);

  const review = () => {
    if (!picked) return;
    setPicked(undefined);
    nav.open(reviewPage(picked.source, picked.preview, nav));
  };

  return (
    <>
      <h2 className="px-4 pt-6 font-heading font-medium">Events</h2>
      <div className="sticky top-0 z-10 grid gap-2 bg-background p-4">
        <div className="flex gap-2">
          <Input
            type="search"
            aria-label="Search events"
            placeholder="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button variant="outline" disabled={busy} onClick={pickFile}>
            <FileUp />
            From a file
          </Button>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={filter}
          onValueChange={(value) => setFilter(value as Filter | "")}
          className="justify-start"
        >
          <ToggleGroupItem value="pokemon">Pokémon</ToggleGroupItem>
          <ToggleGroupItem value="item">Item</ToggleGroupItem>
        </ToggleGroup>
        {error && (
          <p role="status" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="px-4 pb-4">
        {!shown.length && <p className="text-sm text-muted-foreground">{events.length ? "Nothing matches." : "No events for this game."}</p>}
        <ul aria-label="Events" className={cn("rounded-lg", shown.length > 0 && "border")}>
          {shown.map((event, index) => (
            <li key={event.id} className={cn(index > 0 && "border-t")}>
              <EventRow event={event} disabled={busy} onPick={() => pickEvent(event.id)} />
            </li>
          ))}
        </ul>
      </div>
      <PreviewDialog preview={picked?.preview} onReview={review} onCancel={() => setPicked(undefined)} />
    </>
  );
}

function MysteryGift({ file }: { file?: Uint8Array }) {
  return (
    <div className="flex min-h-full flex-col">
      <Album />
      <Events file={file} />
    </div>
  );
}

function Review({ source, preview, home }: { source: Source; preview: WonderCardPreview; home: Nav }) {
  const gift = useMysteryGift();
  const { insertEvent, insertFile, setUnlocked } = gift;
  const { game } = useLoadedGame();
  const titleId = useId();
  const [replace, setReplace] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string>();
  // The insert changes the album while the page closes, so it keeps showing the album it reviewed.
  const [reviewed, setReviewed] = useState<GiftAlbum>();
  const inserted = useRef(false);
  const album = reviewed ?? gift.album;
  const free = album.slots.find((slot) => !slot.card)?.index;
  const slot = free ?? (replace ? Number(replace) : undefined);
  const replaced = slot === undefined ? undefined : album.slots[slot].card;
  const where = game?.generation === 4 ? "any Poké Mart" : "any Pokémon Center";

  const add = async () => {
    if (slot === undefined) return;
    setAdding(true);
    setReviewed(album);
    setError(undefined);
    try {
      if (!inserted.current) await ("event" in source ? insertEvent(source.event, slot) : insertFile(source.file, slot));
      inserted.current = true;
      if (album.unlocked === false) await setUnlocked(true);
      home.closeAbove();
    } catch (reason) {
      setError(failure(reason));
      setAdding(false);
      if (!inserted.current) setReviewed(undefined);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="grid gap-4 p-4">
        {error && (
          <p role="status" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {free === undefined && (
          <section aria-labelledby={titleId} className="grid gap-2">
            <h2 id={titleId} className="text-sm font-medium">
              The album is full. Pick a card to replace.
            </h2>
            <ToggleGroup
              type="single"
              variant="outline"
              orientation="vertical"
              spacing={2}
              aria-labelledby={titleId}
              value={replace}
              onValueChange={setReplace}
              className="w-full"
            >
              {album.slots.map(({ index, card }) => (
                <ToggleGroupItem
                  key={index}
                  value={String(index)}
                  className="h-auto min-h-11 justify-start py-2 text-left whitespace-normal"
                >
                  <span className="min-w-0 flex-1 break-words">{card?.title}</span>
                  {replace === String(index) && <Check />}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>
        )}
        <Card role="article" aria-labelledby={`${titleId}-card`} className="min-w-0 md:max-w-md">
          <CardHeader className="justify-items-start gap-2">
            <span className="size-16">
              <PreviewArt preview={preview} size={16} />
            </span>
            <CardTitle id={`${titleId}-card`} className="break-words">
              {preview.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {slot !== undefined && (
              <div className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)] gap-x-3">
                <span className="break-words text-muted-foreground">Slot {slot + 1}</span>
                <span className="grid min-w-0">
                  <span className="break-words">
                    {replaced?.title ?? "Empty"} → {preview.title}
                  </span>
                  <span className="break-words text-xs text-muted-foreground">Collect the gift from the delivery person in {where}</span>
                </span>
              </div>
            )}
            {album.unlocked === false && (
              <p className={cn(slot !== undefined && "border-t pt-3")}>Also unlocks Mystery Gift in the menu</p>
            )}
          </CardContent>
        </Card>
      </div>
      <BottomBar className="mt-auto justify-end gap-2">
        <Button size="lg" variant="outline" disabled={adding} onClick={home.closeAbove}>
          Back
        </Button>
        <Button size="lg" disabled={slot === undefined || adding} onClick={() => void add()}>
          Add card
        </Button>
      </BottomBar>
    </div>
  );
}

function reviewPage(source: Source, preview: WonderCardPreview, home: Nav): Page {
  return { title: "Review card", content: <Review source={source} preview={preview} home={home} /> };
}

export function mysteryGiftPage(file?: Uint8Array): Page {
  return { title: "Mystery Gift", sidebar: true, content: <MysteryGift file={file} /> };
}
