import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronRight, FileUp, Gift, Plus } from "lucide-react";
import { useBox, useEngine, useLoadedGame, useQuery } from "@pkhex-everywhere/react";
import type { AddFromFileOptions, EncounterRow, ErrorCode, EventRow, FilePreview, SpeciesEntry } from "@pkhex-everywhere/engine";
import { cn } from "@/lib/utils";
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
import { Input } from "@/components/ui/input";
import { PokemonArt, summaryArt } from "@/game-art/gameArt";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { UnofficialAlert } from "@/components/UnofficialAlert";
import { useEditorNav, type Page } from "./EditorScreen";
import { mysteryGiftPage } from "./mysteryGift";
import { usePokemonFiles } from "./pokemonFile";
import { pokemonPage } from "./pokemonEditor";
import { useSeen } from "./useSeen";

// The home page's nav: opening from it replaces every page above home, so the add pages close when the editor opens.
type Home = { open(page: Page): void; closeAsFull(): void };

export const rowClass = "h-auto min-h-14 w-full justify-start gap-3 rounded-none px-3 py-2 text-left font-normal whitespace-normal";

function SpeciesRow({ entry, onPick }: { entry: SpeciesEntry; onPick(): void }) {
  const { ref, seen } = useSeen<HTMLButtonElement>();

  return (
    <Button ref={ref} variant="ghost" className={rowClass} onClick={onPick}>
      <span className="size-10 shrink-0">
        {seen && <PokemonArt pokemon={{ speciesId: entry.id, species: entry.name }} size={10} decorative />}
      </span>
      <span className="min-w-0 flex-1">{entry.name}</span>
      <span className="text-xs text-muted-foreground">#{entry.id}</span>
    </Button>
  );
}

const errorCode = (reason: unknown) => (reason as { code?: ErrorCode } | null)?.code;

const noRoom = (reason: unknown) => errorCode(reason) === "box-full" || errorCode(reason) === "no-slot";

const wonderCard = /\.(pgt|pcd|wc4|pgf)$/i;

const fileFailures: Partial<Record<ErrorCode, string>> = {
  unparseable: "That file isn't a Pokémon",
  "conversion-failed": "That Pokémon can't come into this game",
  "not-in-game": "This game doesn't have that species",
};

type UnofficialFile = { bytes: Uint8Array; preview: FilePreview };

function useAddFromFile(home: Home, onError: (message?: string) => void) {
  const files = usePokemonFiles();
  const engine = useEngine();
  const { game } = useLoadedGame();
  const { addFromFile } = useBox();
  const [adding, setAdding] = useState(false);
  const [unofficial, setUnofficial] = useState<UnofficialFile>();
  const [card, setCard] = useState<Uint8Array>();

  const add = async (bytes: Uint8Array, options?: AddFromFileOptions) => {
    const { at } = await addFromFile(bytes, options);
    home.open(pokemonPage(await engine.pokemon.get(at)));
  };

  const fail = (reason: unknown) => {
    if (noRoom(reason)) return home.closeAsFull();
    const code = errorCode(reason);
    onError((code && fileFailures[code]) ?? String(reason));
  };

  const pick = async () => {
    setAdding(true);
    onError(undefined);
    try {
      const file = await files.pick();
      if (!file) return;
      if (wonderCard.test(file.name)) {
        if (game?.hasMysteryGift) return setCard(file.bytes);
        return onError("Wonder Cards only go in Gen 4 and Gen 5 saves.");
      }
      const preview = await engine.box.previewFile(file.bytes);
      if (preview.unofficial) return setUnofficial({ bytes: file.bytes, preview });
      await add(file.bytes);
    } catch (reason) {
      fail(reason);
    } finally {
      setAdding(false);
    }
  };

  const confirm = async (file: UnofficialFile) => {
    setAdding(true);
    try {
      await add(file.bytes, { allowUnofficial: true });
    } catch (reason) {
      fail(reason);
    } finally {
      setUnofficial(undefined);
      setAdding(false);
    }
  };

  const { pokemon, legality } = unofficial?.preview ?? {};
  const dialog = (
    <>
      <ConfirmDialog
        title="That's a Wonder Card"
        action="Open in Mystery Gift"
        open={!!card}
        onConfirm={() => {
          if (card) home.open(mysteryGiftPage(card));
          setCard(undefined);
        }}
        onCancel={() => setCard(undefined)}
      >
        It goes in the Mystery Gift album.
      </ConfirmDialog>
      <ConfirmAddDialog open={!!unofficial} adding={adding} onAdd={() => unofficial && void confirm(unofficial)} onCancel={() => setUnofficial(undefined)}>
        {pokemon && (
          <>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <PokemonArt pokemon={summaryArt(pokemon)} size={14} decorative />
              <span className="min-w-0 flex-1 text-sm font-medium break-words">
                {pokemon.species} · Lv. {pokemon.level}
              </span>
            </div>
            <UnofficialAlert destination={game?.version ?? "this game"} legality={legality ?? null} />
          </>
        )}
      </ConfirmAddDialog>
    </>
  );

  return { adding, pick: () => void pick(), dialog };
}

function SpeciesPicker({ home }: { home: Home }) {
  const { open } = useEditorNav();
  const { game } = useLoadedGame();
  const species = useQuery("species.list");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string>();
  const fromFile = useAddFromFile(home, setError);
  const shown = useMemo(() => {
    const text = search.trim().toLowerCase();
    return species.filter((entry) => entry.name.toLowerCase().includes(text));
  }, [species, search]);

  return (
    <>
      <div className="sticky top-0 z-10 grid gap-2 bg-background p-4">
        <div className="flex gap-2">
          <Input
            type="search"
            aria-label="Search species"
            placeholder="Search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setError(undefined);
            }}
          />
          <Button variant="outline" disabled={fromFile.adding} onClick={fromFile.pick}>
            <FileUp />
            From a file
          </Button>
          {fromFile.dialog}
        </div>
        {error && (
          <p role="status" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="px-4 pb-4">
        {!!game && game.generation <= 3 && (
          <div className="mb-4 rounded-lg border">
            <Button variant="ghost" className={rowClass} onClick={() => open(eventsPage(home))}>
              <span className="flex size-10 shrink-0 items-center justify-center">
                <Gift />
              </span>
              <span className="min-w-0 flex-1">Events</span>
              <ChevronRight className="text-muted-foreground" />
            </Button>
          </div>
        )}
        {!shown.length && <p className="text-sm text-muted-foreground">Nothing matches.</p>}
        <ul aria-label="Species" className={cn("rounded-lg", shown.length > 0 && "border")}>
          {shown.map((entry, index) => (
            <li key={entry.id} className={cn(index > 0 && "border-t")}>
              <SpeciesRow entry={entry} onPick={() => open(encountersPage(entry, home))} />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

type Encounter = EncounterRow & Partial<Pick<EventRow, "trainerName" | "language">>;

const levelRange = (row: Encounter) => row.levelRange.replace("-", "–");

const encounterLabel = (row: Encounter) =>
  `${row.trainerName ? `${row.trainerName} ` : ""}${row.species} · Lv. ${levelRange(row)}`;

function EncounterTags({ row, className }: { row: Encounter; className?: string }) {
  if (!row.isEgg && !row.ball && !row.language) return null;
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {row.isEgg && <Badge variant="outline">Egg</Badge>}
      {row.ball && <Badge variant="outline">{row.ball}</Badge>}
      {row.language && <Badge variant="outline">{row.language}</Badge>}
    </span>
  );
}

const formName = (row: Encounter) => (row.form.id !== 0 ? row.form.name : "");

function EncounterButton({ row, disabled, onPick }: { row: EncounterRow; disabled: boolean; onPick(): void }) {
  const form = formName(row);
  return (
    <Button variant="ghost" className={rowClass} disabled={disabled} onClick={onPick}>
      <span className="grid min-w-0 flex-1">
        <span>
          {row.location} · Lv. {levelRange(row)}
        </span>
        {form && <span className="text-xs text-muted-foreground">{form}</span>}
      </span>
      <EncounterTags row={row} className="justify-end" />
    </Button>
  );
}

function ConfirmAddDialog({
  open,
  adding,
  onAdd,
  onCancel,
  children,
}: {
  open: boolean;
  adding: boolean;
  onAdd(): void;
  onCancel(): void;
  children: ReactNode;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && !adding && onCancel()}>
      <AlertDialogContent onOverlayClick={() => !adding && onCancel()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Add this Pokémon?</AlertDialogTitle>
        </AlertDialogHeader>
        {children}
        <AlertDialogDescription>It goes in the first empty box slot.</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={adding}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={adding}
            onClick={(event) => {
              // Keep the dialog up while the add runs; it closes when the editor opens or the add fails.
              event.preventDefault();
              onAdd();
            }}
          >
            Add to box
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ConfirmEncounterDialog({
  row,
  adding,
  onAdd,
  onCancel,
}: {
  row?: Encounter;
  adding: boolean;
  onAdd(row: Encounter): void;
  onCancel(): void;
}) {
  const form = row && formName(row);
  return (
    <ConfirmAddDialog open={!!row} adding={adding} onAdd={() => row && onAdd(row)} onCancel={onCancel}>
      {row && (
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <PokemonArt pokemon={{ speciesId: row.speciesId, species: row.species, form: row.form.id }} size={14} decorative />
          <div className="grid min-w-0 flex-1 gap-1 text-sm">
            <span className="font-medium">{encounterLabel(row)}</span>
            <span>{row.location}</span>
            {form && <span>{form}</span>}
            <span className="text-xs text-muted-foreground">{row.name}</span>
            <EncounterTags row={row} />
          </div>
        </div>
      )}
    </ConfirmAddDialog>
  );
}

// Not useQuery: a cached result can outlive the engine's latest search, and only that search's indexes are valid.
function useLatestSearch<T>(search: () => Promise<T[]>) {
  const [rows, setRows] = useState<T[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let current = true;
    search().then(
      (found) => current && setRows(found),
      (reason) => current && setError(String(reason)),
    );
    return () => {
      current = false;
    };
  }, [search]);

  return { rows, error };
}

function useAddEncounter(home: Home) {
  const engine = useEngine();
  const { addEncounter } = useBox();
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Encounter>();
  const [error, setError] = useState<string>();

  const add = async (row: Encounter) => {
    setAdding(true);
    setError(undefined);
    try {
      const { at } = await addEncounter(row.index);
      home.open(pokemonPage(await engine.pokemon.get(at)));
    } catch (reason) {
      if (noRoom(reason)) return home.closeAsFull();
      setError(String(reason));
      setPicked(undefined);
      setAdding(false);
    }
  };

  const dialog = (
    <ConfirmEncounterDialog row={picked} adding={adding} onAdd={(row) => void add(row)} onCancel={() => setPicked(undefined)} />
  );

  return { adding, error, pick: setPicked, dialog };
}

function Encounters({ species, home }: { species: SpeciesEntry; home: Home }) {
  const engine = useEngine();
  const { game } = useLoadedGame();
  const version = useQuery("encounters.versions").default;
  const search = useCallback(() => engine.encounters.search(version, species.id), [engine, version, species.id]);
  const found = useLatestSearch(search);
  const { rows } = found;
  const adder = useAddEncounter(home);
  const error = adder.error ?? found.error;

  return (
    <div className="grid gap-4 p-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!rows ? (
        !error && <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !rows.length ? (
        <p className="text-sm text-muted-foreground">
          No {species.name} encounters in {game?.version}
        </p>
      ) : (
        <ul aria-label="Encounters" className="rounded-lg border">
          {rows.map((row, index) => (
            <li key={row.index} className={cn(index > 0 && "border-t")}>
              <EncounterButton row={row} disabled={adder.adding} onPick={() => adder.pick(row)} />
            </li>
          ))}
        </ul>
      )}
      {adder.dialog}
    </div>
  );
}

function encountersPage(species: SpeciesEntry, home: Home): Page {
  return { title: species.name, content: <Encounters species={species} home={home} /> };
}

function EventButton({ row, disabled, onPick }: { row: EventRow; disabled: boolean; onPick(): void }) {
  const { ref, seen } = useSeen<HTMLButtonElement>();
  return (
    <Button ref={ref} variant="ghost" className={rowClass} disabled={disabled} onClick={onPick}>
      <span className="size-10 shrink-0">
        {seen && <PokemonArt pokemon={{ speciesId: row.speciesId, species: row.species, form: row.form.id }} size={10} decorative />}
      </span>
      <span className="min-w-0 flex-1">{encounterLabel(row)}</span>
      {row.language && <Badge variant="outline">{row.language}</Badge>}
    </Button>
  );
}

const eventMatches = (row: EventRow, text: string) =>
  [row.species, row.trainerName, row.language].some((field) => field?.toLowerCase().includes(text));

function Events({ home }: { home: Home }) {
  const engine = useEngine();
  const list = useCallback(() => engine.encounters.events(), [engine]);
  const found = useLatestSearch(list);
  const { rows } = found;
  const adder = useAddEncounter(home);
  const [search, setSearch] = useState("");
  const error = adder.error ?? found.error;
  const shown = useMemo(() => {
    const text = search.trim().toLowerCase();
    return rows?.filter((row) => eventMatches(row, text)) ?? [];
  }, [rows, search]);

  return (
    <>
      <div className="sticky top-0 z-10 grid gap-2 bg-background p-4">
        <Input type="search" aria-label="Search events" placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <div className="px-4 pb-4">
        {!rows ? (
          !error && <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          !shown.length && <p className="text-sm text-muted-foreground">{rows.length ? "Nothing matches." : "No events for this game."}</p>
        )}
        <ul aria-label="Events" className={cn("rounded-lg", shown.length > 0 && "border")}>
          {shown.map((row, index) => (
            <li key={row.index} className={cn(index > 0 && "border-t")}>
              <EventButton row={row} disabled={adder.adding} onPick={() => adder.pick(row)} />
            </li>
          ))}
        </ul>
      </div>
      {adder.dialog}
    </>
  );
}

function eventsPage(home: Home): Page {
  return { title: "Events", content: <Events home={home} /> };
}

function speciesPage(home: Home): Page {
  return { title: "Add a Pokémon", sidebar: true, content: <SpeciesPicker home={home} /> };
}

export function AddPokemonButton({
  full,
  onFull,
  onFileError,
}: {
  full: boolean;
  onFull(): void;
  onFileError(message?: string): void;
}) {
  const nav = useEditorNav();
  const { game } = useLoadedGame();
  const home: Home = {
    open: nav.open,
    closeAsFull: () => {
      onFull();
      nav.closeAbove();
    },
  };
  const fromFile = useAddFromFile(home, onFileError);
  const encounters = !!game?.capabilities.includes("encounters");
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Add a Pokémon"
        disabled={full || fromFile.adding}
        onClick={encounters ? () => nav.open(speciesPage(home)) : fromFile.pick}
      >
        <Plus />
      </Button>
      {fromFile.dialog}
    </>
  );
}
