import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EngineProvider } from "@pkhex-everywhere/react";
import type { PokemonHandle, PokemonId, PokemonSummary } from "@pkhex-everywhere/engine";
import { afterEach, expect, it, vi } from "vitest";
import { EditorScreen } from "./EditorScreen";
import { ExportProvider } from "./exportFile";
import { fakeEngine, type FakeEngineSave } from "./fakeEngine";
import { ClipboardProvider, type ClipboardHost } from "./clipboard";
import { saveHome } from "./saveHome";
import { FakeGameArt, fakeGameArt, gameWithArt } from "@/game-art/fakeGameArt";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function pokemon(
  species: string,
  at: PokemonHandle,
  { nickname = species.toUpperCase(), level = 5, speciesId = 1 } = {},
): PokemonSummary {
  return {
    id: `${species}:${JSON.stringify(at)}` as PokemonId,
    at,
    speciesId,
    speciesIndex: speciesId,
    species,
    isUnknown: false,
    editable: true,
    form: { id: 0, name: "" },
    nickname,
    level,
    isShiny: false,
    gender: "male",
    isEgg: false,
    types: [],
  };
}

const inParty = (slot: number) => ({ source: "party" as const, slot });
const inBox = (box: number, slot: number) => ({ source: "box" as const, box, slot });

function launch(save: FakeEngineSave, art = fakeGameArt(), clipboard: ClipboardHost = { writeText: async () => {} }) {
  const { engine } = fakeEngine(save);
  const host = { read: async () => new Uint8Array([1]), apply: async () => {}, playTimeSinceSave: async () => 0 };
  render(
    <EngineProvider engine={engine}>
      <FakeGameArt art={art}>
        <ExportProvider host={{ saveFile: async () => undefined, saveFiles: async () => undefined }}>
          <ClipboardProvider host={clipboard}>
            <EditorScreen host={host} home={saveHome} onBackGesture={() => () => {}} onClose={() => {}} onSaveFirst={() => {}} />
          </ClipboardProvider>
        </ExportProvider>
      </FakeGameArt>
    </EngineProvider>,
  );
}

const party = () => screen.findByRole("region", { name: "Party" });
const boxes = () => screen.findByRole("region", { name: "Boxes" });

it("lists the party with each Pokémon's species, nickname and level", async () => {
  launch({
    party: [pokemon("Pikachu", inParty(0), { nickname: "SPARKY", level: 12 }), pokemon("Bulbasaur", inParty(1))],
  });

  const slots = within(await party()).getAllByRole("button");

  await waitFor(() =>
    expect(slots.map((slot) => slot.textContent)).toEqual([
      expect.stringMatching(/Pikachu.*SPARKY.*12/),
      expect.stringMatching(/Bulbasaur.*BULBASAUR.*5/),
    ]),
  );
});

it("shows each Pokémon's sprite, or a placeholder when there's none", async () => {
  const art = gameWithArt({ "sprite-25-0": new Uint8Array([1]) });
  launch(
    {
      party: [
        pokemon("Pikachu", inParty(0), { speciesId: 25 }),
        pokemon("Bulbasaur", inParty(1), { nickname: "BULBY", speciesId: 1 }),
      ],
    },
    art,
  );

  const slots = within(await party()).getAllByRole("button");

  await waitFor(() => expect(within(slots[0]).getByRole("img", { name: "Pikachu" }).tagName).toBe("IMG"));
  expect((await within(slots[1]).findByRole("img", { name: "Bulbasaur" })).tagName).not.toBe("IMG");
});

it("shows the first box's Pokémon in slot order", async () => {
  launch({
    box: [pokemon("Onix", inBox(1, 0)), pokemon("Zubat", inBox(0, 4)), pokemon("Rattata", inBox(0, 1))],
  });

  const box = await boxes();

  expect(within(box).getByText("Box 1")).toBeTruthy();
  expect(within(box).getAllByRole("button", { name: /RATTATA|ZUBAT|ONIX/ }).map((slot) => slot.textContent)).toEqual([
    expect.stringContaining("RATTATA"),
    expect.stringContaining("ZUBAT"),
  ]);
});

it("steps through every box, empty ones included", async () => {
  launch({ boxCount: 14, box: [pokemon("Rattata", inBox(0, 0)), pokemon("Mew", inBox(13, 0))] });
  const box = await boxes();
  const next = () => within(box).getByRole("button", { name: "Next box" }) as HTMLButtonElement;

  expect((within(box).getByRole("button", { name: "Previous box" }) as HTMLButtonElement).disabled).toBe(true);

  fireEvent.click(next());
  expect(within(box).getByText("Box 2")).toBeTruthy();
  expect(within(box).getByText(/box is empty/i)).toBeTruthy();

  for (let i = 0; i < 12; i++) fireEvent.click(next());
  expect(within(box).getByText("Box 14")).toBeTruthy();
  expect(within(box).getByRole("button", { name: /MEW/ })).toBeTruthy();
  expect(next().disabled).toBe(true);

  fireEvent.click(within(box).getByRole("button", { name: "Previous box" }));
  expect(within(box).getByText("Box 13")).toBeTruthy();
});

it("says so when the boxes are empty, and still shows the switcher", async () => {
  launch({ party: [pokemon("Pikachu", inParty(0))] });
  const box = await boxes();

  expect(within(box).getByText(/boxes are empty/i)).toBeTruthy();
  expect(within(box).getByText("Box 1")).toBeTruthy();
});

it("opens a Pokémon when it's tapped", async () => {
  launch({ party: [pokemon("Pikachu", inParty(0), { nickname: "SPARKY" })], box: [pokemon("Onix", inBox(0, 0))] });

  fireEvent.click(within(await party()).getByRole("button", { name: /SPARKY/ }));
  expect(screen.getByRole("heading", { name: "SPARKY" })).toBeTruthy();

  fireEvent.click(within(await boxes()).getByRole("button", { name: /ONIX/ }));
  expect(await screen.findByRole("heading", { name: "ONIX" })).toBeTruthy();
});

it.each(["Trainer", "Bag"])("opens the %s page from its tile", async (title) => {
  launch({});

  fireEvent.click(await screen.findByRole("button", { name: title }));
  expect(await screen.findByRole("heading", { name: title })).toBeTruthy();
});

const fullBox = (taken: number) => Array.from({ length: taken }, (_, slot) => pokemon(`Zubat${slot}`, inBox(0, slot)));
const addable = { capabilities: ["encounters" as const], boxCount: 1 };
const addButton = async () => within(await boxes()).getByRole("button", { name: "Add a Pokémon" }) as HTMLButtonElement;

it("disables adding when every box slot is taken", async () => {
  launch({ ...addable, box: fullBox(30) });

  expect((await addButton()).disabled).toBe(true);
  expect(within(await boxes()).getByText("Your boxes are full")).toBeTruthy();
});

it("allows adding while a box slot is empty", async () => {
  launch({ ...addable, box: fullBox(29) });

  expect((await addButton()).disabled).toBe(false);
  expect(within(await boxes()).queryByText("Your boxes are full")).toBeNull();
});

it("returns to the boxes and disables adding when the engine finds them full", async () => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  launch({
    ...addable,
    box: fullBox(29),
    species: [{ id: 261, name: "Poochyena" }],
    encounters: [
      {
        speciesId: 261,
        species: "Poochyena",
        form: { id: 0, name: "" },
        name: "Wild encounter",
        isEgg: false,
        ball: null,
        levelRange: "2-3",
        location: "Route 101",
      },
    ],
    refuseAdd: "box-full",
  });

  fireEvent.click(await addButton());
  fireEvent.click(await screen.findByRole("button", { name: /Poochyena/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Route 101/ }));
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: /add/i }));

  await waitFor(async () => expect((await addButton()).disabled).toBe(true));
  expect(screen.getByRole("heading", { name: "Edit save" })).toBeTruthy();
  expect(within(await boxes()).getByText("Your boxes are full")).toBeTruthy();
  expect(screen.queryByRole("alertdialog")).toBeNull();
});

const showdown = { capabilities: ["showdown" as const] };
const copyButton = async () =>
  within(await party()).findByRole("button", { name: "Copy as Showdown text" }) as Promise<HTMLButtonElement>;

it("copies the party as Showdown text and says how many were copied", async () => {
  const writeText = vi.fn(async () => {});
  launch(
    { ...showdown, party: [pokemon("Pikachu", inParty(0), { nickname: "SPARKY" }), pokemon("Bulbasaur", inParty(1))] },
    undefined,
    { writeText },
  );

  fireEvent.click(await copyButton());

  expect(await screen.findByRole("status")).toHaveProperty("textContent", expect.stringContaining("2"));
  expect(writeText).toHaveBeenCalledWith("SPARKY (Pikachu)\n\nBULBASAUR (Bulbasaur)");
});

it("says so when the team can't be copied", async () => {
  launch({ ...showdown, party: [pokemon("Pikachu", inParty(0))] }, undefined, {
    writeText: () => Promise.reject(new Error("denied")),
  });

  fireEvent.click(await copyButton());

  expect(await screen.findByRole("status")).toHaveProperty("textContent", expect.stringMatching(/couldn't copy/i));
});

it("disables copying when the party is empty", async () => {
  launch({ ...showdown, box: [pokemon("Onix", inBox(0, 0))] });

  expect((await copyButton()).disabled).toBe(true);
});

it("hides copying when the save can't write Showdown text", async () => {
  launch({ party: [pokemon("Pikachu", inParty(0))] });

  await within(await party()).findByRole("button", { name: /PIKACHU/ });
  expect(within(await party()).queryByRole("button", { name: "Copy as Showdown text" })).toBeNull();
});
