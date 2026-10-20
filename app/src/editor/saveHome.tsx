import { Fragment, useId, useState, type ReactNode, type Ref } from "react";
import { Backpack, Check, ChevronLeft, ChevronRight, Copy, Flag, Gift, IdCard, Users, type LucideIcon } from "lucide-react";
import { useBox, useEngine, useLoadedGame, useParty, useQuery } from "@pkhex-everywhere/react";
import type { PokemonSummary } from "@pkhex-everywhere/engine";
import { cn } from "cn";
import { Toast, useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { PokemonArt, summaryArt } from "@/game-art/gameArt";
import { boxRubySapphire } from "@/game-page/saveSummary";
import { AddPokemonButton } from "./addPokemon";
import { useClipboard } from "./clipboard";
import { ApplyBar, useEditorNav, type Page } from "./EditorScreen";
import { bagPage } from "./bag";
import { eventsPage } from "./events";
import { mysteryGiftPage } from "./mysteryGift";
import { pokemonPage } from "./pokemonEditor";
import { teamsPage } from "./teams";
import { trainerPage } from "./trainer";

export function PokemonSlot({
  pokemon,
  onClick,
  checked,
  dimmed,
  disabled,
  id,
  focusRight,
  ref,
}: {
  pokemon: PokemonSummary;
  onClick(): void;
  checked?: boolean;
  dimmed?: boolean;
  disabled?: boolean;
  id?: string;
  focusRight?: string;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      id={id}
      data-focus-right={focusRight}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={checked}
      aria-disabled={dimmed || undefined}
      className={cn(
        "relative flex min-w-0 flex-col items-start gap-1 rounded-lg border p-3 text-left motion-press hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none",
        checked && "border-primary bg-primary/5",
        dimmed && "opacity-50 grayscale",
      )}
    >
      <PokemonArt pokemon={summaryArt(pokemon)} size={14} />
      <span className="w-full truncate font-medium">{pokemon.nickname}</span>
      <span className="text-xs text-muted-foreground">Lv. {pokemon.level}</span>
      {checked && (
        <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-4" />
        </span>
      )}
    </button>
  );
}

type RenderSlot = (pokemon: PokemonSummary) => ReactNode;

function Slots({ pokemon, slot }: { pokemon: PokemonSummary[]; slot: RenderSlot }) {
  return (
    <div className="grid grid-cols-2 gap-2 @sm:grid-cols-3">
      {pokemon.map((pokemon) => (
        <Fragment key={`${pokemon.at.box}:${pokemon.at.slot}`}>{slot(pokemon)}</Fragment>
      ))}
    </div>
  );
}

function Section({
  title,
  action,
  status,
  error,
  children,
}: {
  title: string;
  action?: ReactNode;
  status?: string;
  error?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="grid gap-3">
      <div className="grid gap-0.5">
        <div className="flex h-8 items-center justify-between gap-2">
          <h2 id={titleId} className="font-heading font-medium">
            {title}
          </h2>
          {action}
        </div>
        {(status || error) && (
          <p role="status" className={cn("text-sm", status ? "text-muted-foreground" : "text-destructive")}>
            {status || error}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

export function PartySection({ party, slot, action }: { party: PokemonSummary[]; slot: RenderSlot; action?: ReactNode }) {
  return (
    <Section title="Party" action={action}>
      {party.length ? <Slots pokemon={party} slot={slot} /> : <p className="text-sm text-muted-foreground">The party is empty.</p>}
    </Section>
  );
}

export function BoxesSection({
  box,
  boxNumbers,
  slot,
  addButton,
  status,
  error,
}: {
  box: PokemonSummary[];
  boxNumbers: number[];
  slot: RenderSlot;
  addButton?: ReactNode;
  status?: string;
  error?: string;
}) {
  const [pickedBox, setPickedBox] = useState<number>();
  const currentBox = pickedBox !== undefined && boxNumbers.includes(pickedBox) ? pickedBox : boxNumbers[0];
  const index = boxNumbers.indexOf(currentBox);
  const inCurrentBox = box.filter((pokemon) => pokemon.at.box === currentBox).sort((a, b) => a.at.slot - b.at.slot);

  const switcher = boxNumbers.length > 0 && (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Previous box"
        disabled={index === 0}
        onClick={() => setPickedBox(boxNumbers[index - 1])}
      >
        <ChevronLeft />
      </Button>
      <span className="w-14 text-center text-sm">Box {currentBox + 1}</span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Next box"
        disabled={index === boxNumbers.length - 1}
        onClick={() => setPickedBox(boxNumbers[index + 1])}
      >
        <ChevronRight />
      </Button>
    </div>
  );

  return (
    <Section
      title="Boxes"
      status={status}
      error={error}
      action={
        <div className="flex items-center gap-1">
          {addButton}
          {switcher}
        </div>
      }
    >
      {!box.length ? (
        <p className="text-sm text-muted-foreground">The boxes are empty.</p>
      ) : inCurrentBox.length ? (
        <Slots pokemon={inCurrentBox} slot={slot} />
      ) : (
        <p className="text-sm text-muted-foreground">This box is empty.</p>
      )}
    </Section>
  );
}

function EditableSlot({ pokemon }: { pokemon: PokemonSummary }) {
  const { open } = useEditorNav();
  return <PokemonSlot pokemon={pokemon} onClick={() => open(pokemonPage(pokemon))} />;
}

const editableSlot: RenderSlot = (pokemon) => <EditableSlot pokemon={pokemon} />;

function PageTile({ page, icon: Icon }: { page: Page; icon: LucideIcon }) {
  const { open } = useEditorNav();
  return (
    <button
      type="button"
      onClick={() => open(page)}
      className="flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border p-3 text-sm font-medium motion-press hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Icon className="size-5 text-muted-foreground" />
      <span className="line-clamp-2 w-full text-center leading-tight break-words">{page.title}</span>
    </button>
  );
}

function EventsTile() {
  const { game } = useLoadedGame();
  return game?.hasEvents ? <PageTile page={eventsPage} icon={Flag} /> : null;
}

function MysteryGiftTile() {
  const { game } = useLoadedGame();
  return game?.hasMysteryGift ? <PageTile page={mysteryGiftPage()} icon={Gift} /> : null;
}

function CopyTeamButton({ count }: { count: number }) {
  const engine = useEngine();
  const clipboard = useClipboard();
  const [toast, setToast] = useToast();
  const [copying, setCopying] = useState(false);
  const copy = async () => {
    setCopying(true);
    try {
      await clipboard.writeText(await engine.party.showdown());
      setToast(`Copied ${count} Pokémon`);
    } catch {
      setToast("Couldn't copy the team");
    } finally {
      setCopying(false);
    }
  };
  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Copy as Showdown text" disabled={!count || copying} onClick={() => void copy()}>
        <Copy />
      </Button>
      <Toast>{toast}</Toast>
    </>
  );
}

function Party() {
  const { party } = useParty();
  const { game } = useLoadedGame();
  const canCopy = !!game?.capabilities.includes("showdown");
  return <PartySection party={party} slot={editableSlot} action={canCopy ? <CopyTeamButton count={party.length} /> : null} />;
}

function Boxes() {
  const { box } = useBox();
  const boxList = useQuery("box.list");
  const [fullAt, setFullAt] = useState<PokemonSummary[]>();
  const [fileError, setFileError] = useState<string>();
  const full = fullAt === box || boxList.every((entry) => box.filter((pokemon) => pokemon.at.box === entry.box).length >= entry.slots);
  return (
    <BoxesSection
      box={box}
      boxNumbers={boxList.map((entry) => entry.box)}
      slot={editableSlot}
      addButton={<AddPokemonButton full={full} onFull={() => setFullAt(box)} onFileError={setFileError} />}
      status={full ? "Your boxes are full" : undefined}
      error={fileError}
    />
  );
}

const useStadium = () => useQuery("team.list").length > 0;

// Stadium saves have teams in place of a party, trainer and bag, and Box saves have only boxes.
export function useHasParty() {
  const stadium = useStadium();
  const version = useQuery("game.version");
  return !stadium && version?.versionId !== boxRubySapphire;
}

function SaveHome() {
  const stadium = useStadium();
  const hasParty = useHasParty();
  return (
    <div className="flex min-h-full flex-col">
      <div className="@container grid gap-6 p-4">
        <div className="grid auto-cols-fr grid-flow-col gap-2">
          {stadium ? (
            <PageTile page={teamsPage} icon={Users} />
          ) : (
            hasParty && (
              <>
                <PageTile page={trainerPage} icon={IdCard} />
                <PageTile page={bagPage} icon={Backpack} />
              </>
            )
          )}
          <EventsTile />
          <MysteryGiftTile />
        </div>
        {hasParty && <Party />}
        <Boxes />
      </div>
      <ApplyBar />
    </div>
  );
}

export const saveHome: Page = { title: "Edit save", sidebar: true, content: <SaveHome /> };
