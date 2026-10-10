import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EngineProvider } from "@pkhex-everywhere/react";
import type { PokemonHandle, PokemonId, PokemonSummary } from "@pkhex-everywhere/engine";
import { afterEach, expect, it } from "vitest";
import { FakeGameArt, fakeGameArt } from "@/game-art/fakeGameArt";
import { EditorScreen } from "./EditorScreen";
import { ExportProvider } from "./exportFile";
import { fakeEngine, type FakeEngineSave, type FakeTeam } from "./fakeEngine";
import { saveHome } from "./saveHome";

afterEach(cleanup);

function pokemon(species: string, at: PokemonHandle = { source: "team", team: 0, slot: 0 }, level = 50): PokemonSummary {
  return {
    id: `${species}:${JSON.stringify(at)}` as PokemonId,
    at,
    speciesId: 1,
    speciesIndex: 1,
    species,
    isUnknown: false,
    editable: true,
    form: { id: 0, name: "" },
    nickname: species.toUpperCase(),
    level,
    isShiny: false,
    gender: "male",
    isEgg: false,
    types: [],
  };
}

const team = (cup: string | null, members: string[], name: string | null = null): FakeTeam => ({
  name,
  cup,
  members: members.map((species) => pokemon(species)),
});

function launch(save: FakeEngineSave) {
  const fake = fakeEngine(save);
  const host = { read: async () => new Uint8Array([1]), apply: async () => {}, playTimeSinceSave: async () => 0 };
  render(
    <EngineProvider engine={fake.engine}>
      <FakeGameArt art={fakeGameArt()}>
        <ExportProvider host={{ saveFile: async () => undefined, saveFiles: async () => undefined }}>
          <EditorScreen host={host} home={saveHome} onBackGesture={() => () => {}} onClose={() => {}} onSaveFirst={() => {}} />
        </ExportProvider>
      </FakeGameArt>
    </EngineProvider>,
  );
  return fake;
}

const stadium: FakeEngineSave = {
  generation: 1,
  teams: [
    team("Poké Cup", ["Pikachu", "Onix"], "ASH"),
    team("Poké Cup", []),
    team("Prime Cup", ["Mew"]),
  ],
  box: [pokemon("Rattata", { source: "box", box: 0, slot: 0 }, 5), pokemon("Zubat", { source: "box", box: 0, slot: 3 }, 9)],
};

const openTeams = async () => fireEvent.click(await screen.findByRole("button", { name: "Teams" }));
const cup = (name: string) => screen.findByRole("region", { name });
const teamCard = async (inCup: string, name: string) => within(await cup(inCup)).getByRole("region", { name });

it("lists the teams by cup, numbered in their cup with the trainer who registered them", async () => {
  launch(stadium);
  await openTeams();

  const pokeCup = await cup("Poké Cup");
  const primeCup = await cup("Prime Cup");

  expect(within(pokeCup).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["Team 1", "Team 2"]);
  expect(within(await teamCard("Poké Cup", "Team 1")).getByText("ASH")).toBeTruthy();
  expect(within(primeCup).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["Team 1"]);
  await waitFor(() => expect(within(pokeCup).getByRole("button", { name: /PIKACHU.*Lv/ })).toBeTruthy());
  expect(within(pokeCup).getByRole("button", { name: /ONIX.*Lv/ })).toBeTruthy();
  expect(within(primeCup).getByRole("button", { name: /MEW.*Lv/ })).toBeTruthy();
});

it("opens a team member in the Pokémon editor on its team handle", async () => {
  const fake = launch(stadium);
  await openTeams();

  fireEvent.click(await within(await teamCard("Prime Cup", "Team 1")).findByRole("button", { name: /MEW.*Lv/ }));
  fireEvent.change(await screen.findByLabelText("Level"), { target: { value: "60" } });
  fireEvent.blur(screen.getByLabelText("Level"));
  fireEvent.click(await screen.findByRole("button", { name: "Save" }));

  await waitFor(() => expect(fake.stored({ source: "team", team: 2, slot: 0 }).level).toBe(60));
});

it("adds a box Pokémon to the team's first empty slot", async () => {
  const fake = launch(stadium);
  await openTeams();

  fireEvent.click(within(await teamCard("Poké Cup", "Team 1")).getByRole("button", { name: "Add from box" }));
  fireEvent.click(await within(await screen.findByRole("region", { name: "Boxes" })).findByRole("button", { name: /ZUBAT.*Lv/ }));

  await waitFor(() =>
    expect(fake.teamCalls()).toEqual([{ call: "place", from: { source: "box", box: 0, slot: 3 }, to: { team: 0, slot: 2 } }]),
  );
  expect(await within(await teamCard("Poké Cup", "Team 1")).findByRole("button", { name: /ZUBAT.*Lv/ })).toBeTruthy();
});

it("can't add to a full team", async () => {
  launch({ ...stadium, teams: [team("Poké Cup", ["Pikachu", "Onix", "Mew", "Abra", "Jynx", "Lapras"])] });
  await openTeams();

  const add = within(await teamCard("Poké Cup", "Team 1")).getByRole("button", { name: "Add from box" }) as HTMLButtonElement;

  expect(add.disabled).toBe(true);
});

it("removes a team member after asking first", async () => {
  const fake = launch(stadium);
  await openTeams();
  const first = await teamCard("Poké Cup", "Team 1");

  fireEvent.click(await within(first).findByRole("button", { name: "Remove PIKACHU" }));
  expect(fake.teamCalls()).toEqual([]);
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Remove" }));

  await waitFor(() => expect(fake.teamCalls()).toEqual([{ call: "clear", to: { team: 0, slot: 0 } }]));
  await waitFor(() => expect(within(first).queryByRole("button", { name: /PIKACHU.*Lv/ })).toBeNull());
});

it("counts a team change as a change to apply", async () => {
  launch(stadium);
  await openTeams();

  fireEvent.click(await within(await teamCard("Poké Cup", "Team 1")).findByRole("button", { name: "Remove ONIX" }));
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Remove" }));

  expect(await screen.findAllByRole("button", { name: "Apply and restart" })).not.toHaveLength(0);
});

it("hides the party, trainer and bag for a Stadium save", async () => {
  launch(stadium);

  expect(await screen.findByRole("button", { name: "Teams" })).toBeTruthy();
  expect(await screen.findByRole("region", { name: "Boxes" })).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Party" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Trainer" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Bag" })).toBeNull();
});

it("shows no teams for a save without them", async () => {
  launch({ party: [pokemon("Pikachu", { source: "party", slot: 0 })] });

  expect(await screen.findByRole("region", { name: "Party" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Trainer" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Teams" })).toBeNull();
});
