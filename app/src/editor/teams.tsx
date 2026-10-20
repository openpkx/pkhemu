import { useId, useState } from "react";
import { X } from "lucide-react";
import { useBox, useEngine, useQuery } from "@pkhex-everywhere/react";
import type { PokemonSummary, TeamEntry } from "@pkhex-everywhere/engine";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { sectionHeading } from "@/plugin-kit/sectionHeading";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { messageOf } from "@/lib/utils";
import { ApplyBar, useEditorNav, type Page } from "./EditorScreen";
import { pokemonPage } from "./pokemonEditor";
import { BoxesSection, PokemonSlot } from "./saveHome";

type Nav = ReturnType<typeof useEditorNav>;
type Team = { entry: TeamEntry; label: string };

function Member({ pokemon, team }: { pokemon: PokemonSummary; team: Team }) {
  const engine = useEngine();
  const { open, closeAbove } = useEditorNav();
  const [tileId, removeId] = [useId(), useId()];
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const remove = async () => {
    setConfirming(false);
    closeAbove();
    try {
      await engine.team.clear({ team: team.entry.team, slot: pokemon.at.slot });
    } catch (reason) {
      setError(messageOf(reason));
    }
  };
  return (
    <div className="relative grid">
      <PokemonSlot id={tileId} focusRight={removeId} pokemon={pokemon} onClick={() => open(pokemonPage(pokemon))} />
      <Button
        id={removeId}
        data-focus-left={tileId}
        variant="secondary"
        size="icon-sm"
        aria-label={`Remove ${pokemon.nickname}`}
        className="absolute top-1.5 right-1.5"
        onClick={() => setConfirming(true)}
      >
        <X />
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ConfirmDialog
        title={`Remove ${pokemon.nickname} from ${team.label}?`}
        action="Remove"
        destructive
        open={confirming}
        onConfirm={() => void remove()}
        onCancel={() => setConfirming(false)}
      >
        The Pokémon after it move up a slot.
      </ConfirmDialog>
    </div>
  );
}

function Members({ team }: { team: Team }) {
  const members = useQuery("team.get", team.entry.team);
  return (
    <div className="grid grid-cols-2 gap-2 @sm:grid-cols-3">
      {members.map((pokemon) => (
        <Member key={pokemon.at.slot} pokemon={pokemon} team={team} />
      ))}
    </div>
  );
}

function PickFromBox({ team, home }: { team: TeamEntry; home: Nav }) {
  const engine = useEngine();
  const { box } = useBox();
  const boxList = useQuery("box.list");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string>();
  const place = async (pokemon: PokemonSummary) => {
    setPlacing(true);
    setError(undefined);
    try {
      await engine.team.place(pokemon.at, { team: team.team, slot: team.filled });
      home.closeAbove();
    } catch (reason) {
      setError(messageOf(reason));
      setPlacing(false);
    }
  };
  return (
    <div className="@container grid gap-6 p-4">
      <BoxesSection
        box={box}
        boxNumbers={boxList.map((entry) => entry.box)}
        slot={(pokemon) => <PokemonSlot pokemon={pokemon} disabled={placing} onClick={() => void place(pokemon)} />}
        error={error}
      />
    </div>
  );
}

function TeamCard({ team }: { team: Team }) {
  const home = useEditorNav();
  const titleId = useId();
  const { entry, label } = team;
  return (
    <Card role="region" aria-labelledby={titleId}>
      <CardHeader>
        <CardTitle id={titleId} role="heading" aria-level={3}>
          {label}
        </CardTitle>
        {entry.name && <CardDescription>{entry.name}</CardDescription>}
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            disabled={entry.filled >= entry.slots}
            onClick={() => home.open({ title: `Add to ${label}`, content: <PickFromBox team={entry} home={home} /> })}
          >
            Add from box
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {entry.filled > 0 ? <Members team={team} /> : <p className="text-sm text-muted-foreground">No Pokémon yet.</p>}
      </CardContent>
    </Card>
  );
}

function Cup({ cup, teams }: { cup: string | null; teams: TeamEntry[] }) {
  const titleId = useId();
  return (
    <section aria-labelledby={cup ? titleId : undefined} className="grid gap-3">
      {cup && (
        <h2 id={titleId} className={sectionHeading}>
          {cup}
        </h2>
      )}
      {teams.map((entry, index) => (
        <TeamCard key={entry.team} team={{ entry, label: `Team ${index + 1}` }} />
      ))}
    </section>
  );
}

function byCup(teams: TeamEntry[]) {
  const cups = new Map<string | null, TeamEntry[]>();
  for (const team of teams) cups.set(team.cup, [...(cups.get(team.cup) ?? []), team]);
  return [...cups];
}

function Teams() {
  const teams = useQuery("team.list");
  return (
    <div className="flex min-h-full flex-col">
      <div className="@container grid gap-6 p-4">
        {byCup(teams).map(([cup, inCup]) => (
          <Cup key={cup ?? ""} cup={cup} teams={inCup} />
        ))}
      </div>
      <ApplyBar />
    </div>
  );
}

export const teamsPage: Page = { title: "Teams", sidebar: true, content: <Teams /> };
