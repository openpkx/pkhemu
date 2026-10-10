import { useEffect, useId, useState } from "react";
import { useEngine } from "@pkhex-everywhere/react";
import type { OfferedPokemon, TransferChange, TransferChangeReason, TransferField, TransferOffer, TransferPreview, TransferSaveChange, TransferSide } from "@pkhex-everywhere/engine";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { useBack } from "@/back/back";
import { BottomBar } from "@/components/BottomBar";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { inTurn } from "@/lib/engineTurn";
import { GameArtFor, PokemonArt, summaryArt } from "@/game-art/gameArt";
import type { Names } from "./TransferScreen";
import { LegalityDetails, UnofficialAlert, ambiguousCopies } from "@/components/UnofficialAlert";
import { noteFor, type CopyNote } from "./keptCopies";

type Paths = { mine: string; partner: string };

const fields: Record<TransferField, string> = {
  species: "Species",
  form: "Form",
  heldItem: "Held item",
  moves: "Moves",
  metLocation: "Met at",
  metLevel: "Met at level",
  ball: "Ball",
  friendship: "Friendship",
  nickname: "Nickname",
  ability: "Ability",
  level: "Level",
  nature: "Nature",
  gender: "Gender",
  shiny: "Shiny",
  language: "Language",
  originalTrainer: "Original trainer",
  trainerId: "Trainer ID",
  originGame: "Original game",
  metDate: "Met on",
};

const reasons: Record<TransferChangeReason, (names: Names) => string> = {
  hmRemoved: () => "HM moves can't transfer",
  itemRemapped: ({ destination }) => `Named differently in ${destination}`,
  itemRemoved: ({ destination }) => `${destination} doesn't have this item`,
  link: () => "Set by the link trade",
  timeCapsule: () => "Moved through the Time Capsule",
  palPark: () => "Moved through Pal Park",
  pokeTransfer: () => "Moved through Poké Transfer",
  received: () => "Set on receipt",
  tradeEvolution: () => "Evolved by trade",
  itemUsed: () => "Used to evolve",
  formReverted: () => "Forms revert when traded",
  notInGame: ({ destination }) => `${destination} doesn't have this`,
  unofficial: () => "Not possible in the real games",
};

function reasonFor(change: TransferChange, names: Names, note?: CopyNote) {
  const restored = note?.restored;
  if (restored && !restored.patched.includes(change.field)) return `Restored from its ${restored.game} copy`;
  return reasons[change.reason](names);
}

const saveChangeText: Record<TransferSaveChange["kind"], (label: string) => string> = {
  pokedexCaught: (species) => `${species} registered as caught`,
  itemReturned: (item) => `${item} returned to the bag`,
  eventVar: (event) => event,
};

function beforeAfter({ before, after }: TransferChange) {
  if (after === null) return `${before} removed`;
  if (before === null) return `${after} added`;
  return `${before} → ${after}`;
}

function SaveChanges({ name, changes }: { name: string; changes: TransferSaveChange[] }) {
  const titleId = useId();
  if (!changes.length) return null;
  return (
    <section aria-labelledby={titleId} className="grid gap-1 border-t pt-3">
      <h3 id={titleId} className="font-medium">
        In {name}
      </h3>
      <ul className="grid gap-0.5 text-muted-foreground">
        {changes.map((change, index) => (
          <li key={index} className="break-words">
            {saveChangeText[change.kind](change.label)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function OfferCard({ offer, names, paths, notes }: { offer: OfferedPokemon; names: Names; paths: Paths; notes: CopyNote[] }) {
  const titleId = useId();
  const { from, arrives, changes, legality } = offer;
  const note = offer.direction === "send" ? noteFor(notes, from.at) : undefined;
  const changesIn = (side: TransferSide) => offer.saveChanges.filter(({ save }) => save === side);
  const [fromPath, arrivesPath] = offer.direction === "send" ? [paths.mine, paths.partner] : [paths.partner, paths.mine];
  const looksDifferent = from.speciesId !== arrives.speciesId || from.form.id !== arrives.form.id || from.isShiny !== arrives.isShiny;
  return (
    <Card role="article" aria-labelledby={titleId} className="min-w-0">
      <CardHeader className="justify-items-start gap-2">
        <div className="flex items-center gap-2">
          <GameArtFor path={fromPath}>
            <PokemonArt pokemon={summaryArt(from)} size={16} />
          </GameArtFor>
          {looksDifferent && (
            <>
              <ArrowRight aria-hidden className="size-4 text-muted-foreground" />
              <GameArtFor path={arrivesPath}>
                <PokemonArt pokemon={summaryArt(arrives)} size={16} />
              </GameArtFor>
            </>
          )}
        </div>
        <CardTitle id={titleId} className="break-words">
          {from.nickname} · Lv. {from.level}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {offer.route === "unofficial" ? (
          <UnofficialAlert destination={names.destination} keptFrom={note?.keptFrom} ambiguous={note?.ambiguous} legality={legality} />
        ) : (
          <>
            {!legality.valid && (
              <Alert>
                <TriangleAlert />
                <AlertTitle>Fails the legality check</AlertTitle>
                <AlertDescription>
                  <LegalityDetails messages={legality.messages} />
                </AlertDescription>
              </Alert>
            )}
            {note?.ambiguous && <p>{ambiguousCopies}</p>}
          </>
        )}
        {changes.length ? (
          <ul aria-label="Changes" className="grid gap-2">
            {changes.map((change, index) => (
              <li key={index} className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)] gap-x-3">
                <span className="break-words text-muted-foreground">{fields[change.field]}</span>
                <span className="grid min-w-0">
                  <span className="break-words">{beforeAfter(change)}</span>
                  <span className="break-words text-xs text-muted-foreground">{reasonFor(change, names, note)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No changes</p>
        )}
        <SaveChanges name={names.destination} changes={changesIn("receiver")} />
        <SaveChanges name={names.source} changes={changesIn("sender")} />
      </CardContent>
    </Card>
  );
}

export function ReviewScreen({
  offer,
  names,
  paths,
  notes = [],
  onBack,
  onSend,
}: {
  offer: TransferOffer;
  names: Names;
  paths: Paths;
  notes?: CopyNote[];
  onBack(): void;
  onSend(preview: TransferPreview): Promise<void>;
}) {
  const engine = useEngine();
  const [preview, setPreview] = useState<TransferPreview>();
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  useBack(onBack);

  useEffect(() => {
    let current = true;
    inTurn(() => engine.transfer.preview(offer))
      .then((found) => current && setPreview(found))
      .catch((reason) => current && setError(String(reason)));
    return () => {
      current = false;
    };
  }, [engine, offer]);

  const count = preview?.offers.length ?? offer.send.length + offer.receive.length;
  const canSend = !!preview && preview.offers.length > 0 && !preview.refused.length;

  const send = () => {
    if (!preview) return;
    setSending(true);
    void onSend(preview).finally(() => setSending(false));
  };

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-background">
      <ScreenHeader title="Review transfer" onBack={onBack} />
      <main className="min-h-0 flex-1 overflow-y-auto p-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!preview && !error && <p className="text-sm text-muted-foreground">Loading…</p>}
        {preview && (
          <div className="grid items-start gap-4 md:grid-cols-[repeat(auto-fill,minmax(20rem,1fr))]">
            {preview.offers.map((offered) => (
              <OfferCard key={offered.from.id} offer={offered} names={names} paths={paths} notes={notes} />
            ))}
          </div>
        )}
      </main>
      <BottomBar className="justify-end gap-2">
        <Button size="lg" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button size="lg" className="h-auto min-h-11 whitespace-normal" disabled={!canSend || sending} onClick={send}>
          Send {count} to {names.destination}
        </Button>
      </BottomBar>
    </div>
  );
}
