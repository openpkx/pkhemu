import { useEffect, useId, useState, type ComponentProps, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { useEngine, usePokemonDetails, useQuery } from "@pkhex-everywhere/react";
import {
  draftHandle,
  type Choice,
  type EditablePokemon,
  type Legality,
  type MoveSlot,
  type PokemonHandle,
  type PokemonOptions,
  type PokemonPatch,
  type PokemonSummary,
  type StatValues,
} from "@pkhex-everywhere/engine";
import { cn } from "@/lib/utils";
import { BottomBar } from "@/components/BottomBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { dexNumber, ItemArt, PokemonArt, useHasItemIcons } from "@/game-art/gameArt";
import { typeColor } from "@/game-art/typeColors";
import { ChoiceSelect } from "./choiceSelect";
import { useDrafts, type Page } from "./EditorScreen";
import { ExportMenu } from "./exportFile";

type Pokemon = { details: EditablePokemon; options: PokemonOptions };

function useDraft(at: PokemonHandle) {
  const { view, ...drafts } = useDrafts();
  return { ...drafts, view: view?.at === at ? view : undefined };
}

function Title({ at, fallback }: { at: PokemonHandle; fallback: string }) {
  return useDraft(at).view?.pokemon?.details.nickname ?? fallback;
}

function Field({ label, children }: { label: string; children(id: string): ReactNode }) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
    </div>
  );
}

function SwitchField({ label, checked, onChange }: { label: string; checked: boolean; onChange(checked: boolean): void }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function TextInput({
  value,
  onCommit,
  ...props
}: { value: string | number; onCommit(text: string): Promise<void> } & Omit<ComponentProps<"input">, "value" | "onChange">) {
  const [text, setText] = useState<string>();
  const commit = async () => {
    if (text !== undefined && text !== String(value)) await onCommit(text);
    setText(undefined);
  };
  return (
    <Input
      {...props}
      value={text ?? value}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
    />
  );
}

function NumberInput({
  value,
  onCommit,
  ...props
}: { value: number; onCommit(value: number): Promise<void> } & ComponentProps<"input">) {
  return (
    <TextInput
      {...props}
      inputMode="numeric"
      value={value}
      onCommit={async (text) => {
        if (/^\d+$/.test(text.trim())) await onCommit(Number(text));
      }}
    />
  );
}

function Basics({ at, pokemon: { details, options } }: { at: PokemonHandle; pokemon: Pokemon }) {
  const { update } = useDraft(at);
  const natures = useQuery("game.natures");
  const hasItemIcons = useHasItemIcons();
  return (
    <>
      <Field label="Species">
        {(id) => (
          <ChoiceSelect
            id={id}
            choices={options.species}
            value={details.species}
            icon={(choice) => <PokemonArt pokemon={{ speciesId: choice.id, species: choice.name }} size={8} decorative />}
            onChange={(species) => update({ species })}
          />
        )}
      </Field>
      <Field label="Level">{(id) => <NumberInput id={id} value={details.level} onCommit={(level) => update({ level })} />}</Field>
      {natures.length > 0 && (
        <Field label="Nature">
          {(id) => (
            <ChoiceSelect
              id={id}
              choices={natures}
              value={details.nature}
              disabled={options.locked.includes("nature")}
              onChange={(nature) => update({ nature })}
            />
          )}
        </Field>
      )}
      {options.abilities.length > 0 && (
        <Field label="Ability">
          {(id) => (
            <ChoiceSelect
              id={id}
              choices={options.abilities}
              value={details.ability}
              disabled={options.locked.includes("ability")}
              onChange={(ability) => update({ ability })}
            />
          )}
        </Field>
      )}
      {options.heldItems.length > 1 && (
        <Field label="Held item">
          {(id) => (
            <ChoiceSelect
              id={id}
              choices={options.heldItems}
              value={details.heldItem}
              icon={hasItemIcons ? (choice) => choice.index > 0 && <ItemArt item={choice} size={8} decorative /> : undefined}
              onChange={(heldItem) => update({ heldItem })}
            />
          )}
        </Field>
      )}
    </>
  );
}

const noMove: Choice = { id: 0, name: "(None)" };

function moveChoices(slots: MoveSlot[], offered: Choice[]): (slot: MoveSlot) => Choice[] {
  const known = new Set(slots.map((slot) => slot.id));
  const available = offered.filter((move) => !known.has(move.id));
  return (slot) => [...(slot.id === noMove.id ? [] : [{ id: slot.id, name: slot.name }]), ...available, noMove];
}

function AllMoves({ children }: { children(moves: Choice[]): ReactNode }) {
  return children(useQuery("game.moves"));
}

function Moves({ at, pokemon: { details, options } }: { at: PokemonHandle; pokemon: Pokemon }) {
  const { update } = useDraft(at);
  const [showAll, setShowAll] = useState(false);
  const change = (index: number, id: number) =>
    update((current) => ({ moves: current.moves.map((move, i) => (i === index ? id : move.id)) }));
  const slots = (offered: Choice[]) => {
    const choicesFor = moveChoices(details.moves, offered);
    return details.moves.map((slot, index) => (
      <Field key={index} label={`Move ${index + 1}`}>
        {(id) => (
          <div className="flex items-center gap-3">
            <ChoiceSelect id={id} choices={choicesFor(slot)} value={slot.id} onChange={(move) => change(index, move)} />
            <span className="w-16 shrink-0 text-right text-sm text-muted-foreground">
              {slot.id ? `${slot.pp}/${slot.maxPp} PP` : ""}
            </span>
          </div>
        )}
      </Field>
    ));
  };
  return (
    <>
      <SwitchField label="Show all moves" checked={showAll} onChange={setShowAll} />
      {showAll ? <AllMoves>{slots}</AllMoves> : slots(options.moves)}
    </>
  );
}

const stats: { key: keyof StatValues; label: string }[] = [
  { key: "health", label: "HP" },
  { key: "attack", label: "Attack" },
  { key: "defense", label: "Defense" },
  { key: "specialAttack", label: "Sp. Atk" },
  { key: "specialDefense", label: "Sp. Def" },
  { key: "speed", label: "Speed" },
];

function Stats({ at, pokemon: { details } }: { at: PokemonHandle; pokemon: Pokemon }) {
  const { update } = useDraft(at);
  return (
    <div className="grid grid-cols-[1fr_5rem_5rem] items-center gap-x-3 gap-y-2">
      <span />
      <span className="text-center text-sm font-medium">IV</span>
      <span className="text-center text-sm font-medium">EV</span>
      {stats.map(({ key, label }) => (
        <div key={key} className="contents">
          <span className="text-sm">
            {label} <span className="text-muted-foreground">{details.stats[key]}</span>
          </span>
          <NumberInput
            aria-label={`${label} IV`}
            className="text-center"
            value={details.ivs[key]}
            onCommit={(value) => update({ ivs: { [key]: value } })}
          />
          <NumberInput
            aria-label={`${label} EV`}
            className="text-center"
            value={details.evs[key]}
            onCommit={(value) => update({ evs: { [key]: value } })}
          />
        </div>
      ))}
    </div>
  );
}

const speciesName = ({ details, options }: Pokemon) =>
  options.species.find((species) => species.id === details.species)?.name;

const genderSymbols = { male: "♂", female: "♀", genderless: "" };

const issueLabel = (count: number) => (count === 0 ? "Not legal" : `${count} ${count === 1 ? "issue" : "issues"}`);

function LegalityChip({ legality }: { legality: Legality }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  if (legality.valid) return <Badge variant="secondary">Legal</Badge>;
  return (
    <div className="grid justify-items-center gap-2 @md:justify-items-start">
      <Badge variant="destructive" asChild>
        <button type="button" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)}>
          {issueLabel(legality.messages.length)}
          <ChevronRight className={open ? "rotate-90" : undefined} />
        </button>
      </Badge>
      {open && (
        <ul id={listId} className="grid list-disc gap-1 pl-5 text-left text-sm text-muted-foreground">
          {legality.messages.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TypePills({ types }: { types: number[] }) {
  const choices = useQuery("game.types");
  const pills = types.flatMap((id) => {
    const name = choices.find((type) => type.id === id)?.name;
    return name ? [{ id, name }] : [];
  });
  if (pills.length === 0) return null;
  return (
    <ul aria-label="Types" className="flex gap-1">
      {pills.map(({ id, name }) => (
        <li key={id}>
          <Badge className="border-transparent text-white" style={{ backgroundColor: typeColor(id) }}>
            {name}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function PokemonMenu({ at }: { at: PokemonHandle }) {
  const engine = useEngine();
  return <ExportMenu file={() => engine.pokemon.export(at)} />;
}

function Hero({
  details,
  species,
  form,
  exportAt,
  update,
}: {
  details: EditablePokemon;
  species?: string;
  form?: string;
  exportAt: PokemonHandle;
  update?(patch: PokemonPatch): Promise<void>;
}) {
  const color = typeColor(details.types[0]);
  const dex = !details.isUnknown && dexNumber(details.species);
  return (
    <section
      aria-label={details.nickname}
      className="@container relative overflow-hidden rounded-xl border bg-card"
      style={{ backgroundImage: `linear-gradient(135deg, ${color}40, transparent 60%)` }}
    >
      <div
        className="pointer-events-none absolute -top-12 -right-12 size-56 rounded-full opacity-15 blur-3xl dark:opacity-30"
        style={{ background: color }}
      />
      <div className="absolute top-2 right-2 z-10">
        <PokemonMenu at={exportAt} />
      </div>
      <div className="relative flex flex-col items-center gap-4 p-4 @md:flex-row">
        <PokemonArt
          pokemon={{ ...details, speciesId: details.species, species: species ?? details.nickname }}
          size={40}
          integerScale
          animate
          className="drop-shadow-xl"
        />
        <div className="grid w-full min-w-0 flex-1 justify-items-center gap-1 text-center @md:justify-items-start @md:text-left">
          {dex && <span className="font-mono text-xs text-muted-foreground">{dex}</span>}
          <div className="flex max-w-full items-center gap-2 text-3xl font-bold tracking-tight">
            {update ? (
              <TextInput
                aria-label="Nickname"
                className="h-auto min-w-0 border-transparent bg-transparent px-1 text-center text-3xl font-bold tracking-tight shadow-none hover:border-input md:text-3xl dark:bg-transparent @md:text-left"
                value={details.nickname}
                onCommit={(nickname) => update({ nickname })}
              />
            ) : (
              <span className="truncate">{details.nickname}</span>
            )}
            {update ? (
              <button
                type="button"
                aria-label="Shiny"
                aria-pressed={details.isShiny}
                title="Shiny"
                onClick={() => void update({ isShiny: !details.isShiny })}
                className={cn(
                  "rounded-md px-1 text-2xl transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  details.isShiny ? "text-warning" : "text-muted-foreground/40 hover:text-muted-foreground",
                )}
              >
                ★
              </button>
            ) : (
              details.isShiny && (
                <span className="text-2xl text-warning" title="Shiny">
                  ★<span className="sr-only">Shiny</span>
                </span>
              )
            )}
            {details.isEgg && <Badge variant="outline">Egg</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {[species, form, `Lv. ${details.level}`, genderSymbols[details.gender]].filter(Boolean).join(" · ")}
          </p>
          <TypePills types={details.types} />
          {details.legality && <LegalityChip legality={details.legality} />}
        </div>
      </div>
    </section>
  );
}

function EditorCard({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <Card role="region" aria-labelledby={titleId}>
      <CardHeader>
        <CardTitle id={titleId}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid content-start gap-4">{children}</CardContent>
    </Card>
  );
}

function SaveBar({ at, changes, legality }: { at: PokemonHandle; changes: number; legality: Legality | null }) {
  const { save, discard } = useDraft(at);
  const [saving, setSaving] = useState(false);
  const saveDraft = async () => {
    setSaving(true);
    await save();
    setSaving(false);
  };
  return (
    <div role="region" aria-label="Unsaved changes" className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-sm font-medium">
        {changes} {changes === 1 ? "change" : "changes"}
      </span>
      {legality && (
        <span className={cn("text-sm", legality.valid ? "text-muted-foreground" : "text-destructive")}>
          {legality.valid ? "✓ Legal" : `⚠ ${issueLabel(legality.messages.length)}`}
        </span>
      )}
      <div className="ml-auto flex gap-2">
        <Button variant="outline" size="lg" disabled={saving} onClick={discard}>
          Discard
        </Button>
        <Button size="lg" disabled={saving} onClick={() => void saveDraft()}>
          Save
        </Button>
      </div>
    </div>
  );
}

function PokemonEditor({ at }: { at: PokemonHandle }) {
  const { open, close } = useDrafts();
  const { view, update } = useDraft(at);

  useEffect(() => {
    open(at);
    return close;
  }, [at, open, close]);

  if (!view) return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;
  if (!view.pokemon) return <p className="p-4 text-sm text-destructive">{view.error}</p>;
  const pokemon = view.pokemon;
  const { details, options } = pokemon;
  return (
    <div className="@container flex min-h-full flex-col">
      <div className="grid gap-4 p-4">
        <Hero
          details={details}
          species={speciesName(pokemon)}
          form={options.forms.find((form) => form.id === details.form)?.name}
          exportAt={view.changes > 0 ? draftHandle : at}
          update={update}
        />
        <div className="grid items-start gap-4 @3xl:grid-cols-2">
          <EditorCard title="Basics">
            <Basics at={at} pokemon={pokemon} />
          </EditorCard>
          <EditorCard title="Moves">
            <Moves at={at} pokemon={pokemon} />
          </EditorCard>
          <EditorCard title="Stats">
            <Stats at={at} pokemon={pokemon} />
          </EditorCard>
        </div>
      </div>
      <BottomBar open={!!view.error || view.changes > 0} className="mt-auto grid gap-2">
        {view.error && <p className="text-sm text-destructive">{view.error}</p>}
        {view.changes > 0 && <SaveBar at={at} changes={view.changes} legality={details.legality} />}
      </BottomBar>
    </div>
  );
}

function ReadOnlyPokemon({ summary }: { summary: PokemonSummary }) {
  const { details } = usePokemonDetails(summary.at);
  return (
    <div className="p-4">
      <Hero details={details} species={summary.species} form={summary.form.name} exportAt={summary.at} />
    </div>
  );
}

export function pokemonPage(pokemon: PokemonSummary): Page {
  if (!pokemon.editable)
    return {
      title: pokemon.nickname,
      sidebar: true,
      content: <ReadOnlyPokemon summary={pokemon} />,
    };
  return {
    title: <Title at={pokemon.at} fallback={pokemon.nickname} />,
    sidebar: true,
    content: <PokemonEditor at={pokemon.at} />,
  };
}
