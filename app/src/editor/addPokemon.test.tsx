import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EngineProvider } from "@pkhex-everywhere/react";
import type { EditablePokemon, ErrorCode, SaveCapability } from "@pkhex-everywhere/engine";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EditorScreen } from "./EditorScreen";
import { ExportProvider } from "./exportFile";
import { fakeCardFile, fakeEngine, type FakeEncounter, type FakeEventEncounter, type FakeMysteryGift } from "./fakeEngine";
import { PokemonFileProvider, type PickedFile } from "./pokemonFile";
import { saveHome } from "./saveHome";
import { FakeGameArt } from "@/game-art/fakeGameArt";

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const species = [
  { id: 252, name: "Treecko" },
  { id: 255, name: "Torchic" },
  { id: 258, name: "Mudkip" },
  { id: 261, name: "Poochyena" },
];

const encounter = (overrides: Partial<FakeEncounter> = {}): FakeEncounter => ({
  speciesId: 261,
  species: "Poochyena",
  form: { id: 0, name: "" },
  name: "Wild encounter",
  isEgg: false,
  ball: null,
  levelRange: "2-3",
  location: "Route 101",
  ...overrides,
});

const pokemonFile = (speciesId: number, name = "pokemon.pk3"): PickedFile => ({
  name,
  bytes: new Uint8Array([speciesId & 0xff, speciesId >> 8]),
});

function launch({
  capabilities = ["encounters", "legality"],
  generation,
  encounters = [],
  eventEncounters,
  details = {},
  refuseAdd,
  unofficialFiles,
  mysteryGift,
  picked = [],
}: {
  capabilities?: SaveCapability[];
  generation?: number;
  encounters?: FakeEncounter[];
  eventEncounters?: FakeEventEncounter[];
  details?: Record<string, Partial<EditablePokemon>>;
  refuseAdd?: ErrorCode;
  unofficialFiles?: number[];
  mysteryGift?: FakeMysteryGift;
  picked?: (PickedFile | null)[];
} = {}) {
  const fake = fakeEngine({ capabilities, generation, species, encounters, eventEncounters, details, refuseAdd, unofficialFiles, mysteryGift });
  const host = { read: async () => new Uint8Array([1]), apply: async () => {}, playTimeSinceSave: async () => 0 };
  const files = { pick: vi.fn(async () => picked.shift() ?? null) };
  render(
    <EngineProvider engine={fake.engine}>
      <FakeGameArt>
        <ExportProvider host={{ saveFile: async () => undefined, saveFiles: async () => undefined }}>
          <PokemonFileProvider host={files}>
            <EditorScreen host={host} home={saveHome} onBackGesture={() => () => {}} onClose={() => {}} onSaveFirst={() => {}} />
          </PokemonFileProvider>
        </ExportProvider>
      </FakeGameArt>
    </EngineProvider>,
  );
  return { ...fake, files };
}

const boxes = () => screen.findByRole("region", { name: "Boxes" });
const addButton = async () => within(await boxes()).findByRole("button", { name: /add/i });

async function pickSpecies(name: string) {
  fireEvent.click(await addButton());
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(name) }));
}

const encounterRows = async () => within(await screen.findByRole("list", { name: /encounters/i })).getAllByRole("button");

async function confirmAdd() {
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: /add/i }));
}

it("goes straight to the file picker when the save can't look up encounters", async () => {
  const fake = launch({ capabilities: ["legality"], picked: [pokemonFile(261)] });

  fireEvent.click(await addButton());

  expect(await screen.findByRole("region", { name: "Basics" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "POOCHYENA" })).toBeTruthy();
  expect(fake.files.pick).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("list", { name: /species/i })).toBeNull();
  expect((await addButton()).hasAttribute("disabled")).toBe(false);
});

it("shows a failed file add under the Boxes header when the save can't look up encounters", async () => {
  launch({ capabilities: ["legality"], picked: [pokemonFile(999)] });

  fireEvent.click(await addButton());

  expect((await within(await boxes()).findByRole("status")).textContent).not.toBe("");
  expect(screen.queryByRole("region", { name: "Basics" })).toBeNull();
});

it("shows the add button when the save can look up encounters", async () => {
  launch();

  expect(await addButton()).toBeTruthy();
});

it("narrows the species list as you search", async () => {
  launch();
  fireEvent.click(await addButton());
  const list = await screen.findByRole("list", { name: /species/i });
  expect(within(list).getAllByRole("button")).toHaveLength(4);

  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "to" } });

  expect(within(list).getAllByRole("button").map((row) => row.textContent)).toEqual([expect.stringContaining("Torchic")]);
});

it("says so when a species has no encounters in the game", async () => {
  launch({ encounters: [encounter()] });

  await pickSpecies("Mudkip");

  expect(await screen.findByText(/Mudkip.*Emerald/)).toBeTruthy();
  expect(screen.queryByRole("list", { name: /encounters/i })).toBeNull();
});

it("lists each encounter's location, levels, form and tags", async () => {
  launch({
    encounters: [
      encounter(),
      encounter({ location: "Route 102", levelRange: "5", form: { id: 1, name: "Striped" }, isEgg: true, ball: "Poké Ball" }),
    ],
  });

  await pickSpecies("Poochyena");
  const rows = within(await screen.findByRole("list", { name: /encounters/i })).getAllByRole("button");

  expect(rows[0].textContent).toMatch(/Route 101.*2.*3/);
  expect(rows[0].textContent).not.toMatch(/Egg|Poké Ball/);
  expect(rows[1].textContent).toMatch(/Route 102.*5/);
  expect(rows[1].textContent).toMatch(/Striped/);
  expect(rows[1].textContent).toMatch(/Egg/);
  expect(rows[1].textContent).toMatch(/Poké Ball/);
});

it("adds the tapped encounter and opens it in the editor", async () => {
  const fake = launch({ encounters: [encounter(), encounter({ location: "Route 102" })] });

  await pickSpecies("Poochyena");
  fireEvent.click((await encounterRows())[1]);
  await confirmAdd();

  await waitFor(() => expect(fake.addedEncounters()).toEqual([1]));
  expect(await screen.findByRole("heading", { name: "POOCHYENA" })).toBeTruthy();
  expect(screen.queryByRole("list", { name: /encounters|species/i })).toBeNull();
  expect(await screen.findByRole("region", { name: "Basics" })).toBeTruthy();
});

it("shows the added Pokémon in the boxes with the save marked as changed", async () => {
  launch({ encounters: [encounter()] });

  await pickSpecies("Poochyena");
  fireEvent.click((await encounterRows())[0]);
  await confirmAdd();
  await screen.findByRole("region", { name: "Basics" });
  fireEvent.click(screen.getByRole("button", { name: "Back" }));

  expect(await within(await boxes()).findByRole("button", { name: /POOCHYENA/ })).toBeTruthy();
  expect(screen.getByRole("region", { name: /not in the game/i })).toBeTruthy();
});

it("opens an added Pokémon that isn't legal, with the invalid chip", async () => {
  launch({
    encounters: [encounter()],
    details: { POOCHYENA: { legality: { valid: false, messages: ["Invalid met location."] } } },
  });

  await pickSpecies("Poochyena");
  fireEvent.click((await encounterRows())[0]);
  await confirmAdd();

  expect(await screen.findByRole("region", { name: "Basics" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /1 issue/ })).toBeTruthy();
});

it("asks before adding the tapped encounter", async () => {
  const fake = launch({ encounters: [encounter(), encounter({ location: "Route 102" })] });

  await pickSpecies("Poochyena");
  fireEvent.click((await encounterRows())[1]);
  const dialog = await screen.findByRole("alertdialog");

  expect(dialog.textContent).toMatch(/Poochyena/);
  expect(dialog.textContent).toMatch(/Route 102/);
  expect(dialog.textContent).not.toMatch(/Route 101/);
  expect(fake.addedEncounters()).toEqual([]);
});

it("adds nothing when the pick is cancelled", async () => {
  const fake = launch({ encounters: [encounter()] });

  await pickSpecies("Poochyena");
  fireEvent.click((await encounterRows())[0]);
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: /cancel/i }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(fake.addedEncounters()).toEqual([]);
  expect(screen.getByRole("list", { name: /encounters/i })).toBeTruthy();
});

it("adds nothing when the player taps outside the dialog", async () => {
  const fake = launch({ encounters: [encounter()] });

  await pickSpecies("Poochyena");
  fireEvent.click((await encounterRows())[0]);
  await screen.findByRole("alertdialog");
  fireEvent.click(document.querySelector("[data-slot=alert-dialog-overlay]")!);

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(fake.addedEncounters()).toEqual([]);
});

it("shows the encounter's form and tags in the dialog only when it has them", async () => {
  launch({
    encounters: [encounter(), encounter({ form: { id: 1, name: "Striped" }, isEgg: true, ball: "Poké Ball" })],
  });
  await pickSpecies("Poochyena");

  fireEvent.click((await encounterRows())[0]);
  const plain = await screen.findByRole("alertdialog");
  expect(plain.textContent).toMatch(/Wild encounter/);
  expect(plain.textContent).not.toMatch(/Striped|Egg|Poké Ball/);
  fireEvent.click(within(plain).getByRole("button", { name: /cancel/i }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

  fireEvent.click((await encounterRows())[1]);
  const tagged = await screen.findByRole("alertdialog");
  expect(tagged.textContent).toMatch(/Striped/);
  expect(tagged.textContent).toMatch(/Egg/);
  expect(tagged.textContent).toMatch(/Poké Ball/);
});

it("closes the dialog and shows the reason on the encounters page when the add fails", async () => {
  launch({ encounters: [encounter()], refuseAdd: "not-in-game" });

  await pickSpecies("Poochyena");
  fireEvent.click((await encounterRows())[0]);
  await confirmAdd();

  expect(await screen.findByText(/not-in-game/)).toBeTruthy();
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(screen.getByRole("list", { name: /encounters/i })).toBeTruthy();
});

const eventEncounter = (overrides: Partial<FakeEventEncounter> = {}): FakeEventEncounter => ({
  speciesId: 385,
  species: "Jirachi",
  form: { id: 0, name: "" },
  name: "Event Gift",
  isEgg: false,
  ball: "Poké Ball",
  levelRange: "5",
  location: "Fateful encounter",
  version: "Ruby",
  trainerName: "WISHMKR",
  trainerId: 20043,
  language: "ENG",
  ...overrides,
});

const giftEvents = [
  eventEncounter(),
  eventEncounter({ speciesId: 151, species: "Mew", levelRange: "10", trainerName: null, trainerId: null, language: null }),
  eventEncounter({ speciesId: 251, species: "Celebi", levelRange: "10", trainerName: "10ANIV", language: "JPN" }),
];

async function openEvents() {
  fireEvent.click(await addButton());
  fireEvent.click(await screen.findByRole("button", { name: /^Events/ }));
  return within(await screen.findByRole("list", { name: "Events" }));
}

it("lists the events a Gen 3 save can hold from an entry above the species", async () => {
  launch({ eventEncounters: giftEvents });

  const events = await openEvents();

  expect(events.getAllByRole("button")).toHaveLength(3);
});

it("has no Events entry on a DS save", async () => {
  launch({ generation: 4, eventEncounters: giftEvents });
  fireEvent.click(await addButton());

  await screen.findByRole("list", { name: /species/i });
  expect(screen.queryByRole("button", { name: /^Events/ })).toBeNull();
});

it("labels each event with its trainer, species, level and language", async () => {
  launch({ eventEncounters: giftEvents });

  const rows = (await openEvents()).getAllByRole("button").map((row) => row.textContent);

  expect(rows[0]).toMatch(/WISHMKR Jirachi · Lv\. 5/);
  expect(rows[0]).toMatch(/ENG/);
  expect(rows[1]).toMatch(/\dMew · Lv\. 10$/);
});

it.each([
  ["species", "mew", "Mew"],
  ["trainer name", "wishmkr", "Jirachi"],
  ["language", "jpn", "Celebi"],
])("narrows the events by %s", async (_, search, species) => {
  launch({ eventEncounters: giftEvents });
  const events = await openEvents();

  fireEvent.change(screen.getByRole("searchbox", { name: /events/i }), { target: { value: search } });

  expect(events.getAllByRole("button").map((row) => row.textContent)).toEqual([expect.stringContaining(species)]);
});

it("asks before adding the tapped event, then adds it and opens it in the editor", async () => {
  const fake = launch({ eventEncounters: giftEvents });
  const events = await openEvents();

  fireEvent.click(events.getAllByRole("button")[2]);
  expect((await screen.findByRole("alertdialog")).textContent).toMatch(/10ANIV Celebi/);
  expect(fake.addedEncounters()).toEqual([]);
  await confirmAdd();

  await waitFor(() => expect(fake.addedEncounters()).toEqual([2]));
  expect(await screen.findByRole("heading", { name: "CELEBI" })).toBeTruthy();
  expect(screen.queryByRole("list", { name: /events|species/i })).toBeNull();
});

const fromFileButton = () => screen.findByRole("button", { name: /file/i });
const status = () => screen.findByRole("status");

async function addFromFile() {
  fireEvent.click(await addButton());
  fireEvent.click(await fromFileButton());
}

it("adds a Pokémon from a file and opens it in the editor", async () => {
  const fake = launch({ picked: [pokemonFile(255, "torchic.pk3")] });

  await addFromFile();

  expect(await screen.findByRole("region", { name: "Basics" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "TORCHIC" })).toBeTruthy();
  expect(fake.filesAdded()).toEqual([pokemonFile(255).bytes]);
  expect(screen.queryByRole("list", { name: /species/i })).toBeNull();
});

it("adds a file the real games could move here without asking", async () => {
  const fake = launch({ unofficialFiles: [258], picked: [pokemonFile(255)] });

  await addFromFile();

  expect(await screen.findByRole("region", { name: "Basics" })).toBeTruthy();
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(fake.filesAdded()).toEqual([pokemonFile(255).bytes]);
});

it("asks before adding a file the real games couldn't move here, with its preview and the alert", async () => {
  const fake = launch({
    unofficialFiles: [258],
    details: { MUDKIP: { legality: { valid: false, messages: ["Met Location: Invalid."] } } },
    picked: [pokemonFile(258)],
  });

  await addFromFile();
  const dialog = await screen.findByRole("alertdialog");

  expect(dialog.textContent).toMatch(/Mudkip.*Lv\. 5/);
  const alert = within(dialog).getByRole("alert");
  expect(alert.textContent).toMatch(/Emerald/);
  fireEvent.click(within(alert).getByRole("button", { name: "Details", expanded: false }));
  expect(within(alert).getByText("Met Location: Invalid.")).toBeTruthy();
  expect(fake.filesAdded()).toEqual([]);
});

it("adds a file the real games couldn't move here once confirmed, and opens it in the editor", async () => {
  const fake = launch({ unofficialFiles: [258], picked: [pokemonFile(258)] });

  await addFromFile();
  await confirmAdd();

  expect(await screen.findByRole("region", { name: "Basics" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "MUDKIP" })).toBeTruthy();
  expect(fake.filesAdded()).toEqual([pokemonFile(258).bytes]);
  expect(screen.queryByRole("list", { name: /species/i })).toBeNull();
});

it("adds nothing when the dialog for a file the real games couldn't move here is cancelled", async () => {
  const fake = launch({ unofficialFiles: [258], picked: [pokemonFile(258)] });

  await addFromFile();
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: /cancel/i }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(fake.filesAdded()).toEqual([]);
  expect(screen.getByRole("list", { name: /species/i })).toBeTruthy();
  expect((await fromFileButton()).hasAttribute("disabled")).toBe(false);
});

it("asks before adding a file the real games couldn't move here when the save can't look up encounters", async () => {
  const fake = launch({ capabilities: ["legality"], unofficialFiles: [258], picked: [pokemonFile(258)] });

  fireEvent.click(await addButton());
  await confirmAdd();

  expect(await screen.findByRole("heading", { name: "MUDKIP" })).toBeTruthy();
  expect(fake.filesAdded()).toEqual([pokemonFile(258).bytes]);
});

it("shows an unparseable file's error without asking", async () => {
  const fake = launch({ unofficialFiles: [258], picked: [pokemonFile(999)] });

  await addFromFile();

  expect((await status()).textContent).not.toBe("");
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(fake.filesAdded()).toEqual([]);
});

it("says why the engine couldn't add a file, a different reason for each failure", async () => {
  const messages = new Set<string>();
  for (const refuseAdd of ["unparseable", "conversion-failed", "not-in-game"] as const) {
    launch({ refuseAdd, picked: [pokemonFile(255)] });
    await addFromFile();
    messages.add((await status()).textContent ?? "");
    expect(screen.getByRole("list", { name: /species/i })).toBeTruthy();
    cleanup();
  }

  expect(messages.size).toBe(3);
});

const album: FakeMysteryGift = {
  unlocked: true,
  slots: 3,
  events: [{ id: "pcd-3", title: "Member Card", kind: "item", species: null, item: { id: 467, name: "Member Card" }, language: null, cardId: 3 }],
};
const cardFile = (name: string): PickedFile => ({ name, bytes: fakeCardFile("pcd-3") });

async function openInMysteryGift() {
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: /mystery gift/i }));
  return within(await screen.findByRole("alertdialog", { name: "Member Card" }));
}

it.each(["card.pgt", "card.PCD", "card.wc4", "card.pgf"])("opens the Wonder Card %s in Mystery Gift", async (name) => {
  const fake = launch({ mysteryGift: album, picked: [cardFile(name)] });

  await addFromFile();
  const preview = await openInMysteryGift();
  fireEvent.click(preview.getByRole("button", { name: "Review" }));

  await screen.findByRole("article");
  fireEvent.click(screen.getByRole("button", { name: "Add card" }));

  expect(await screen.findByRole("list", { name: "Events" })).toBeTruthy();
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(fake.filesAdded()).toEqual([]);
});

it("offers Mystery Gift for a Wonder Card when the save can't look up encounters", async () => {
  launch({ capabilities: ["legality"], mysteryGift: album, picked: [cardFile("card.pcd")] });

  fireEvent.click(await addButton());

  expect(await openInMysteryGift()).toBeTruthy();
});

it("stays put when the Wonder Card offer is cancelled", async () => {
  const fake = launch({ mysteryGift: album, picked: [cardFile("card.pcd")] });

  await addFromFile();
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: /cancel/i }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(screen.getByRole("list", { name: /species/i })).toBeTruthy();
  expect(fake.filesAdded()).toEqual([]);
});

it("says where Wonder Cards go when the save has no card album", async () => {
  const fake = launch({ picked: [cardFile("card.pcd")] });

  await addFromFile();

  expect((await status()).textContent).not.toBe("");
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(fake.filesAdded()).toEqual([]);
});

it("clears a failure on the next search or pick", async () => {
  launch({ picked: [pokemonFile(999), pokemonFile(999), null] });
  await addFromFile();
  await status();

  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "to" } });
  expect(screen.queryByRole("status")).toBeNull();

  fireEvent.click(await fromFileButton());
  await status();
  fireEvent.click(await fromFileButton());
  await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
});

it("changes nothing when the pick is cancelled", async () => {
  const fake = launch({ picked: [null] });

  await addFromFile();

  await waitFor(() => expect(fake.files.pick).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("list", { name: /species/i })).toBeTruthy();
  expect(screen.queryByRole("status")).toBeNull();
  expect(fake.filesAdded()).toEqual([]);
});

it("returns to the boxes when the engine finds them full during a file add", async () => {
  launch({ refuseAdd: "box-full", picked: [pokemonFile(255)] });

  await addFromFile();

  await waitFor(() => expect(screen.queryByRole("list", { name: /species/i })).toBeNull());
  expect((await addButton()).hasAttribute("disabled")).toBe(true);
});
