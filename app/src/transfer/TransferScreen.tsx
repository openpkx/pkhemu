import { Suspense, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useBox, useEngine, useParty, useQuery } from "@pkhex-everywhere/react";
import type {
  Engine,
  PokemonHandle,
  PokemonSummary,
  TransferOffer,
  TransferPreview,
  TransferRefusal,
  TransferRoutes,
  TransferSummary,
} from "@pkhex-everywhere/engine";
import { useBack } from "@/back/back";
import { BottomBar } from "@/components/BottomBar";
import { ScreenHeader } from "@/plugin-kit/ScreenHeader";
import { Toast, useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WithSkeleton } from "@/components/WithSkeleton";
import { BoxesSection, PartySection, PokemonSlot, useHasParty } from "@/editor/saveHome";
import type { SaveSummaryHost } from "@/game-page/saveSummary";
import { findUnsavedPlay, UnsavedResumeDialog, type ResumeCheckHost, type UnsavedPlay } from "@/game-page/unsavedResume";
import { inTurn } from "@/lib/engineTurn";
import { cn } from "@/lib/utils";
import type { Game } from "@/library/scan";
import { storedFormatId } from "@/preferences/gameSettings";
import { navigate, Screen } from "@/plugin-kit/motion";
import { commitTransfer, planTransfer, type KeptCopyHost, type KeptCopyPlan } from "./keptCopies";
import type { Partner } from "./partners";
import { ReviewScreen } from "./ReviewScreen";

export type TransferWrite = { path: string; save: Uint8Array; note: string };

export type TransferHost = Pick<SaveSummaryHost, "readSave" | "saveFormat"> &
  ResumeCheckHost &
  KeptCopyHost & {
    writeTransfer(folder: string, destination: TransferWrite, source: TransferWrite): Promise<void>;
  };

type Selection = { pokemon: PokemonSummary[]; noRoom: boolean };

export type Names = { source: string; destination: string };

type Refused = { reason: TransferRefusal; message: string };

const nothingSelected: Selection = { pokemon: [], noRoom: false };

const refusals: Record<TransferRefusal, (names: Names, pokemon: PokemonSummary) => string> = {
  noRoute: ({ source, destination }) => `${destination} can't receive from ${source}`,
  slotLocked: () => "This slot is locked",
  eggAcrossGenerations: () => "Eggs can't move to another generation",
  languageMismatch: () => "Japanese and international games can't trade",
  speciesNotInGame: ({ destination }, pokemon) => `${destination} doesn't have ${pokemon.species}`,
  notInGame: ({ destination }, pokemon) => `${pokemon.species} has a move, item or ability ${destination} doesn't have`,
  lastPartyMember: () => "Keep one Pokémon in the party",
  noRoom: ({ destination }) => `Not enough room in ${destination}`,
  bagFull: ({ source }) => `${source}'s bag is full`,
  conversionFailed: ({ destination }) => `${destination} can't take this Pokémon`,
  fused: ({ destination }, pokemon) => `Separate ${pokemon.species} before sending it to ${destination}`,
  holdingItem: ({ destination }, pokemon) => `Take ${pokemon.species}'s held item before sending it to ${destination}`,
  shadow: (_, pokemon) => `Purify ${pokemon.species} before trading it`,
};

const saveName = (game: Game) => `${game.path.slice(game.path.lastIndexOf("/") + 1).replace(/\.[^.]+$/, "")}.sav`;

const sameSlot = (a: PokemonHandle, b: PokemonHandle) => a.source === b.source && a.slot === b.slot && (a.box ?? null) === (b.box ?? null);

const keyOf = (at: PokemonHandle) => `${at.source}:${at.box ?? ""}:${at.slot}`;

const offerOf = (pokemon: PokemonSummary[]): TransferOffer => ({ send: pokemon.map(({ at }) => at), receive: [] });

type PartnerRoutes = { routes: TransferRoutes; generation: number };

function blockedReason(routes: Map<string, PartnerRoutes | null>, partner: Partner) {
  const found = routes.get(partner.game.path);
  if (found === null) return "Can't read this save";
  if (found && !found.routes.send) return `Can't send to ${partner.name}`;
}

type RouteStatus = "official" | "unofficial" | "blocked" | "checking";

const statusDots: Record<RouteStatus, string> = {
  official: "bg-success",
  unofficial: "bg-warning",
  blocked: "bg-destructive",
  checking: "bg-muted-foreground/40",
};

function routeStatus(routes: Map<string, PartnerRoutes | null>, partner: Partner): RouteStatus {
  if (!routes.has(partner.game.path)) return "checking";
  if (blockedReason(routes, partner)) return "blocked";
  return routes.get(partner.game.path)?.routes.send?.includes("unofficial") ? "unofficial" : "official";
}

function unofficialHint(routes: Map<string, PartnerRoutes | null>, partner: Partner, myGeneration?: number) {
  const found = routes.get(partner.game.path);
  return found && myGeneration !== undefined && found.generation < myGeneration
    ? "The games only moved Pokémon forward"
    : "Not possible in the real games";
}

const listFormat = new Intl.ListFormat("en-GB", { type: "conjunction" });

const refusedByEngine = (reason: unknown) => (reason as { code?: string } | null)?.code === "transfer-refused";

const emptySlots = (count: number) => `${count} empty ${count === 1 ? "slot" : "slots"}`;

function useSelection(engine: Engine, names: Names) {
  const [selection, setSelection] = useState(nothingSelected);
  const [refused, setRefused] = useState(() => new Map<string, Refused>());
  const [notice, setNotice] = useState<string>();
  const latest = useRef({ picks: [] as PokemonSummary[], selection, refused });
  const destination = useRef<Names>(undefined);
  const queue = useRef(Promise.resolve());
  const round = useRef(0);

  const show = (picks: PokemonSummary[], next: Selection, nextRefused: Map<string, Refused>, nextNotice?: string) => {
    latest.current = { picks, selection: next, refused: nextRefused };
    setSelection(next);
    setRefused(nextRefused);
    setNotice(nextNotice);
  };

  const preview = (pokemon: PokemonSummary[]) => inTurn(() => engine.transfer.preview(offerOf(pokemon)));

  const noRoomFor = async (pokemon: PokemonSummary[]) =>
    pokemon.length > 0 && (await preview(pokemon)).refused.some(({ reason }) => reason === "noRoom");

  const settle = async (
    started: number,
    names: Names,
    picks: PokemonSummary[],
    chosen: PokemonSummary[],
    nextRefused: Map<string, Refused>,
    tapped?: PokemonSummary,
  ) => {
    if (!chosen.length) return show(picks, nothingSelected, nextRefused);
    const previewed = await preview(chosen);
    const newlyRefused: string[] = [];
    for (const { reason, at } of previewed.refused) {
      const pokemon = chosen.find((pokemon) => sameSlot(pokemon.at, at));
      if (reason !== "noRoom" && pokemon) {
        const message = refusals[reason](names, pokemon);
        nextRefused.set(keyOf(at), { reason, message });
        newlyRefused.push(message);
      }
    }
    const kept = chosen.filter(({ at }) => !nextRefused.has(keyOf(at)));
    const noRoom = kept.length === chosen.length ? previewed.refused.some(({ reason }) => reason === "noRoom") : await noRoomFor(kept);
    if (round.current !== started) return;
    show(picks, { pokemon: kept, noRoom }, nextRefused, (tapped && nextRefused.get(keyOf(tapped.at))?.message) ?? newlyRefused[0]);
  };

  const toggle = async (tapped: PokemonSummary) => {
    const { picks, selection, refused } = latest.current;
    const known = refused.get(keyOf(tapped.at));
    if (known) {
      setNotice(known.message);
      return;
    }
    const wasChosen = selection.pokemon.some(({ at }) => sameSlot(at, tapped.at));
    const chosen = wasChosen ? selection.pokemon.filter(({ at }) => !sameSlot(at, tapped.at)) : [...selection.pokemon, tapped];
    const names = destination.current;
    if (!names) return show(chosen, { pokemon: chosen, noRoom: false }, refused);
    // Whether the party keeps a Pokémon depends on the rest of the selection, so that refusal holds only until it shrinks.
    const nextRefused = new Map(wasChosen ? [...refused].filter(([, { reason }]) => reason !== "lastPartyMember") : refused);
    const nextPicks = wasChosen
      ? picks.filter(({ at }) => !sameSlot(at, tapped.at) && (nextRefused.has(keyOf(at)) || !refused.has(keyOf(at))))
      : [...picks, tapped];
    latest.current = { ...latest.current, picks: nextPicks };
    await settle(round.current, names, nextPicks, chosen, nextRefused, tapped);
  };

  const enqueue = (task: () => Promise<void>) => {
    queue.current = queue.current.then(task).catch((error) => console.error(error));
  };

  return {
    selection,
    notice: notice ?? (selection.noRoom ? refusals.noRoom(names, selection.pokemon[0]) : undefined),
    isChecked: (at: PokemonHandle) => selection.pokemon.some((pokemon) => sameSlot(pokemon.at, at)),
    isRefused: (at: PokemonHandle) => refused.has(keyOf(at)),
    tap(pokemon: PokemonSummary) {
      enqueue(() => toggle(pokemon));
    },
    forget() {
      round.current++;
      destination.current = undefined;
      const { picks } = latest.current;
      show(picks, { pokemon: picks, noRoom: false }, new Map());
    },
    check(names: Names) {
      const started = round.current;
      destination.current = names;
      enqueue(async () => {
        if (round.current !== started) return;
        const { picks } = latest.current;
        await settle(started, names, picks, picks, new Map());
      });
    },
    clear() {
      round.current++;
      show([], nothingSelected, new Map());
    },
  };
}

function MySlots({ slot }: { slot(pokemon: PokemonSummary): ReactNode }) {
  const { party } = useParty();
  const { box } = useBox();
  const boxNumbers = useQuery("box.list").map((entry) => entry.box);
  const hasParty = useHasParty();
  return (
    <>
      {hasParty && <PartySection party={party} slot={slot} />}
      <BoxesSection box={box} boxNumbers={boxNumbers} slot={slot} />
    </>
  );
}

function Side({
  name,
  status,
  note,
  className,
  children,
}: {
  name: string;
  status?: string;
  note?: string;
  className?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={cn("@container grid content-start gap-6 p-4", className)}>
      <div className="grid gap-0.5">
        <h2 id={titleId} className="font-heading text-lg font-medium">
          {name}
        </h2>
        {status && <p className="text-sm text-muted-foreground">{status}</p>}
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

const loading = <p className="text-sm text-muted-foreground">Loading…</p>;

export function TransferScreen({
  host,
  folder,
  game,
  name,
  partners,
  onPlay,
  onBack,
}: {
  host: TransferHost;
  folder: string;
  game: Game;
  name: string;
  partners: Partner[];
  onPlay(game: Game): void;
  onBack(): void;
}) {
  const engine = useEngine();
  const [loaded, setLoaded] = useState(false);
  const [routes, setRoutes] = useState(new Map<string, PartnerRoutes | null>());
  const [generation, setGeneration] = useState<number>();
  const [picked, setPicked] = useState<Partner>();
  const [transfer, setTransfer] = useState<TransferSummary>();
  const [warning, setWarning] = useState<UnsavedPlay & { partner: Partner }>();
  const [error, setError] = useState<string>();
  const [reviewing, setReviewing] = useState<KeptCopyPlan>();
  const [toast, setToast] = useToast();
  const reviewButton = useRef<HTMLButtonElement>(null);
  const focusReviewButton = useRef(false);
  const focusedFirstSlot = useRef(false);
  const opening = useRef<Partner>(undefined);
  const live = useRef(true);
  const partnerName = picked?.name ?? "Other game";
  const names: Names = { source: name, destination: partnerName };
  const selection = useSelection(engine, names);

  const back = () => {
    if (warning) setWarning(undefined);
    else onBack();
  };
  useBack(back);

  useEffect(() => {
    let current = true;
    live.current = true;
    const bytesOf = async (path: string) => {
      const file = await host.readSave(folder, path);
      if (!file) throw new Error("This game has no save yet.");
      return new Uint8Array(file.bytes);
    };
    inTurn(async () => {
      await engine.game.load(await bytesOf(game.path), saveName(game), await storedFormatId(host, game.path));
      const loadedSave = await engine.game.get();
      if (!current) return;
      setLoaded(true);
      setGeneration(loadedSave?.generation);
      setRoutes(new Map());
      const found = new Map<string, PartnerRoutes | null>();
      for (const partner of partners) {
        if (!current) return;
        const opened = await bytesOf(partner.game.path)
          .then(async (bytes) => engine.transfer.open(bytes, saveName(partner.game), await storedFormatId(host, partner.game.path)))
          .catch(() => null);
        found.set(partner.game.path, opened ? { routes: opened.routes, generation: opened.partner.generation } : null);
        if (current) setRoutes(new Map(found));
      }
      await engine.transfer.close();
    }).catch((reason) => current && setError(String(reason)));
    return () => {
      current = false;
      live.current = false;
      inTurn(async () => {
        await engine.transfer.close();
        await engine.game.close();
      }).catch((reason) => console.error(reason));
    };
  }, [engine, host, folder, game, partners]);

  const closeReview = () => {
    focusReviewButton.current = true;
    navigate("back", () => setReviewing(undefined));
  };

  useEffect(() => {
    if (reviewing || !focusReviewButton.current) return;
    focusReviewButton.current = false;
    reviewButton.current?.focus({ preventScroll: true });
  }, [reviewing]);

  const open = (partner: Partner) => {
    opening.current = partner;
    setPicked(partner);
    setTransfer(undefined);
    setError(undefined);
    selection.forget();
    inTurn(async () => {
      const [mine, theirs, myFormat, theirFormat] = await Promise.all([
        host.readSave(folder, game.path),
        host.readSave(folder, partner.game.path),
        storedFormatId(host, game.path),
        storedFormatId(host, partner.game.path),
      ]);
      if (!mine || !theirs) throw new Error("A save is missing.");
      if (!live.current || opening.current !== partner) return;
      await engine.game.load(new Uint8Array(mine.bytes), saveName(game), myFormat);
      const opened = await engine.transfer.open(new Uint8Array(theirs.bytes), saveName(partner.game), theirFormat);
      if (opening.current !== partner) return;
      setTransfer(opened);
      selection.check({ source: name, destination: partner.name });
    }).catch((reason) => live.current && opening.current === partner && setError(String(reason)));
  };

  const send = async (plan: KeptCopyPlan, preview: TransferPreview) => {
    if (!picked) return;
    const { source, destination } = names;
    const moved = listFormat.format(preview.offers.map(({ from }) => from.nickname));
    let failed: string | undefined;
    let sent: string | undefined;
    try {
      const { result, keep } = await inTurn(() => commitTransfer(engine, host, plan));
      await host.writeTransfer(
        folder,
        { path: picked.game.path, save: result.partner.bytes, note: `Received ${moved} from ${source}` },
        { path: game.path, save: result.save.bytes, note: `Sent ${moved} to ${destination}` },
      );
      await keep();
      await inTurn(() => engine.transfer.close());
      sent = `Sent ${preview.offers.length} to ${destination}`;
    } catch (reason) {
      if (!refusedByEngine(reason)) failed = String(reason);
    }
    if (!live.current) return;
    closeReview();
    selection.clear();
    open(picked);
    setError(failed);
    setToast(sent);
  };

  const review = async (pokemon: PokemonSummary[]) => {
    await inTurn(() => planTransfer(engine, host, pokemon.map(({ at }) => at), name))
      .then((plan) => navigate("forward", () => setReviewing(plan)))
      .catch((reason) => setError(String(reason)));
  };

  const pick = async (partner: Partner) => {
    const found = await findUnsavedPlay(host, folder, partner.game.path).catch(() => undefined);
    if (found) setWarning({ ...found, partner });
    else open(partner);
  };

  const count = selection.selection.pokemon.length;
  const focusFirstSlot = (element: HTMLButtonElement | null) => {
    if (!element || focusedFirstSlot.current) return;
    focusedFirstSlot.current = true;
    element.focus({ preventScroll: true });
  };
  const slot = (pokemon: PokemonSummary) => (
    <PokemonSlot
      ref={focusFirstSlot}
      pokemon={pokemon}
      disabled={!loaded}
      checked={selection.isChecked(pokemon.at)}
      dimmed={selection.isRefused(pokemon.at)}
      onClick={() => selection.tap(pokemon)}
    />
  );

  return (
    <>
      <Screen hidden={!!reviewing}>
        <div className="fixed inset-0 px-safe pb-safe z-20 flex flex-col bg-background">
          <ScreenHeader title="Transfer" onBack={back} />
          {error && <p className="border-b px-4 py-2 text-sm text-destructive">{error}</p>}
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto md:grid md:grid-cols-2">
            <Side name={name}>
              {loaded && <Suspense fallback={loading}><MySlots slot={slot} /></Suspense>}
            </Side>
            <Side
              name="Send to"
              status={transfer && picked ? `${emptySlots(transfer.room.partner)} in ${picked.name}` : undefined}
              note={
                transfer?.routes.send?.includes("unofficial") && picked
                  ? `Pokémon may fail the legality check, and lose what ${picked.name} can't hold.`
                  : undefined
              }
              className="md:border-l"
            >
              <div className="grid gap-2">
                {partners.map((partner) => {
                  const reason = blockedReason(routes, partner);
                  const status = routeStatus(routes, partner);
                  const hint = reason ?? (status === "unofficial" ? unofficialHint(routes, partner, generation) : undefined);
                  const checking = status === "checking";
                  return (
                    <Button
                      key={partner.game.path}
                      variant="outline"
                      aria-pressed={picked === partner}
                      disabled={checking || !!reason}
                      className="h-auto items-start justify-start gap-2 rounded-lg py-2 text-left aria-pressed:border-primary"
                      onClick={() => void pick(partner)}
                    >
                      <span aria-hidden data-status={status} className={cn("mt-1.5 size-2 shrink-0 rounded-full", statusDots[status])} />
                      <span className="flex flex-col items-start gap-0.5">
                        {partner.name}
                        {partner.game.name !== partner.name && (
                          <span className="text-xs font-normal text-muted-foreground">{partner.game.name}</span>
                        )}
                        <WithSkeleton loading={checking} skeleton={<Skeleton aria-label="Checking" className="my-0.5 h-3 w-32" />}>
                          {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
                        </WithSkeleton>
                      </span>
                    </Button>
                  );
                })}
              </div>
            </Side>
          </main>
          <BottomBar open={!!transfer || count > 0}>
            <p role="status" className="text-sm font-medium">
              {transfer ? selection.notice : "Pick a game to send to"}
            </p>
            <Button
              ref={reviewButton}
              size="lg"
              className="ml-auto"
              disabled={!transfer || !count || selection.selection.noRoom}
              onClick={() => void review(selection.selection.pokemon)}
            >
              {count ? `Review ${count}` : "Review"}
            </Button>
          </BottomBar>
          <Toast>{toast}</Toast>
          <UnsavedResumeDialog
            unsaved={warning}
            consequence="Transferring starts from the save."
            onResume={() => warning && onPlay(warning.partner.game)}
            onContinue={() => {
              setWarning(undefined);
              if (warning) open(warning.partner);
            }}
            onCancel={() => setWarning(undefined)}
          />
        </div>
      </Screen>
      {reviewing && picked && (
        <Screen>
          <ReviewScreen
            offer={reviewing.offer}
            names={names}
            paths={{ mine: game.path, partner: picked.game.path }}
            notes={reviewing.notes}
            onBack={closeReview}
            onSend={(preview) => send(reviewing, preview)}
          />
        </Screen>
      )}
    </>
  );
}
