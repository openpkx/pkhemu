import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { OfferedPokemon, PokemonHandle, PokemonId, PokemonSummary, TransferOffer } from "@pkhex-everywhere/engine";
import { EngineProvider } from "@pkhex-everywhere/react";
import { afterEach, expect, it, vi } from "vitest";
import { BackProvider } from "@/back/back";
import { fakeEngine, type FakeTransfer } from "@/editor/fakeEngine";
import { FakeGameArt, fakeGameArt } from "@/game-art/fakeGameArt";
import type { CopyNote } from "./keptCopies";
import { ReviewScreen } from "./ReviewScreen";

afterEach(cleanup);

const png = (byte: number) => new Uint8Array([byte]);
const dataUrl = (byte: number) => `data:image/png;base64,${btoa(String.fromCharCode(byte))}`;
const platinum = "1".repeat(40);
const fireRed = "2".repeat(40);

const inBox = (box: number, slot: number): PokemonHandle => ({ source: "box", box, slot });

function pokemon(species: string, speciesId: number, at: PokemonHandle, overrides: Partial<PokemonSummary> = {}): PokemonSummary {
  return {
    id: `${species}:${JSON.stringify(at)}` as PokemonId,
    at,
    speciesId,
    speciesIndex: speciesId,
    species,
    isUnknown: false,
    editable: true,
    form: { id: 0, name: "" },
    nickname: species,
    level: 36,
    isShiny: false,
    gender: "male",
    isEgg: false,
    types: [],
    ...overrides,
  };
}

const kadabra = pokemon("Kadabra", 64, inBox(0, 0));
const onix = pokemon("Onix", 95, inBox(0, 1));
const alakazam = pokemon("Alakazam", 65, inBox(0, 0));
const partyKadabra = pokemon("Kadabra", 64, { source: "party", slot: 0 });

async function launch({
  offered,
  offer = { send: [], receive: [kadabra.at] },
  onSend = vi.fn(async () => {}),
  notes = [],
}: {
  offered?: FakeTransfer["offered"];
  offer?: TransferOffer;
  onSend?: () => Promise<void>;
  notes?: CopyNote[];
} = {}) {
  const fake = fakeEngine({
    party: [partyKadabra],
    transfer: {
      partners: {
        "FireRed.sav": { version: "FireRed", routes: { send: "link", receive: "link" }, room: { mine: 4, partner: 12 }, pokemon: [kadabra, onix] },
      },
      offered,
    },
  });
  await fake.engine.game.load(new Uint8Array([1]), "Platinum.sav");
  await fake.engine.transfer.open(new Uint8Array([1]), "FireRed.sav");
  const art = fakeGameArt({
    games: { "Platinum.nds": platinum, "FireRed.gba": fireRed },
    art: {
      [fireRed]: { "sprite-64-0": png(1), "sprite-64-0-shiny": png(2), "sprite-65-0": png(4), "sprite-95-0": png(1), "sprite-487-1": png(1) },
      [platinum]: { "sprite-64-0": png(3), "sprite-65-0": png(3), "sprite-487-0": png(3) },
    },
  });
  const onBack = vi.fn();
  render(
    <EngineProvider engine={fake.engine}>
      <FakeGameArt art={art}>
        <BackProvider>
          <ReviewScreen
            offer={offer}
            names={{ source: "FireRed", destination: "Platinum" }}
            paths={{ mine: "Platinum.nds", partner: "FireRed.gba" }}
            notes={notes}
            onBack={onBack}
            onSend={onSend}
          />
        </BackProvider>
      </FakeGameArt>
    </EngineProvider>,
  );
  return { onBack };
}

const card = (name: string | RegExp) => screen.findByRole("article", { name });

it("titles the screen Review transfer", async () => {
  await launch();

  expect(screen.getByRole("heading", { name: "Review transfer" })).toBeTruthy();
});

it("shows one card per Pokémon headed by its name and level", async () => {
  await launch({ offer: { send: [], receive: [kadabra.at, onix.at] } });

  expect(await card("Kadabra · Lv. 36")).toBeTruthy();
  expect(await card("Onix · Lv. 36")).toBeTruthy();
});

const sources = async (name: RegExp) => {
  const images = within(await card(name)).getAllByRole("img");
  return images.map((image) => image.getAttribute("src"));
};

it("shows one sprite when the species stays the same", async () => {
  await launch();

  await waitFor(async () => expect(await sources(/Kadabra/)).toEqual([dataUrl(1)]));
});

it("shows the sprite before and after when it evolves", async () => {
  await launch({ offered: (from) => ({ arrives: { ...alakazam, at: from.at } }) });

  await waitFor(async () => expect(await sources(/Kadabra/)).toEqual([dataUrl(1), dataUrl(3)]));
});

it("shows the sprite before and after when its form reverts", async () => {
  const giratina = pokemon("Giratina", 487, inBox(0, 0), { form: { id: 1, name: "Origin" } });
  await launch({ offered: () => ({ from: giratina, arrives: { ...giratina, form: { id: 0, name: "Altered" } } }) });

  await waitFor(async () => expect(await sources(/Giratina/)).toEqual([dataUrl(1), dataUrl(3)]));
});

it("shows the shiny sprite for a shiny Pokémon", async () => {
  const shiny = { ...kadabra, isShiny: true };
  await launch({ offered: () => ({ from: shiny, arrives: shiny }) });

  await waitFor(async () => expect(await sources(/Kadabra/)).toEqual([dataUrl(2)]));
});

it("shows a Pokémon it sends in the loaded save's game art and as it arrives in the partner's", async () => {
  await launch({
    offer: { send: [partyKadabra.at], receive: [] },
    offered: (from) => ({ arrives: { ...alakazam, at: from.at } }),
  });

  await waitFor(async () => expect(await sources(/Kadabra/)).toEqual([dataUrl(3), dataUrl(4)]));
});

it("lists a row per change with before and after", async () => {
  const offered = (): Partial<OfferedPokemon> => ({
    arrives: alakazam,
    changes: [
      { field: "species", before: "Kadabra", after: "Alakazam", reason: "tradeEvolution" },
      { field: "moves", before: "Flash", after: null, reason: "hmRemoved" },
      { field: "friendship", before: "220", after: "70", reason: "received" },
    ],
  });
  await launch({ offered });

  const rows = within(within(await card(/Kadabra/)).getByRole("list", { name: "Changes" })).getAllByRole("listitem");
  expect(rows).toHaveLength(3);
  expect(within(rows[0]).getByText("Kadabra → Alakazam")).toBeTruthy();
  expect(within(rows[1]).getByText("Flash removed")).toBeTruthy();
  expect(within(rows[2]).getByText("220 → 70")).toBeTruthy();
});

it("says when nothing changes", async () => {
  await launch();

  expect(within(await card(/Kadabra/)).getByText("No changes")).toBeTruthy();
});

it("lists what changes in each save", async () => {
  await launch({
    offered: () => ({
      saveChanges: [
        { kind: "pokedexCaught", save: "receiver", label: "Alakazam" },
        { kind: "itemReturned", save: "sender", label: "Griseous Orb" },
      ],
    }),
  });

  const kadabraCard = await card(/Kadabra/);
  expect(within(within(kadabraCard).getByRole("region", { name: "In Platinum" })).getByRole("listitem")).toBeTruthy();
  expect(within(within(kadabraCard).getByRole("region", { name: "In FireRed" })).getByRole("listitem")).toBeTruthy();
});

it("warns when the Pokémon fails the legality check, without blocking Send", async () => {
  const onSend = vi.fn(async () => {});
  await launch({ onSend, offered: () => ({ legality: { valid: false, messages: ["Met Location: Invalid."] } }) });

  const kadabraCard = await card(/Kadabra/);
  expect(within(within(kadabraCard).getByRole("alert")).getByText("Fails the legality check")).toBeTruthy();
  expect(within(kadabraCard).queryByText("Met Location: Invalid.")).toBeNull();
  fireEvent.click(within(kadabraCard).getByRole("button", { expanded: false }));
  expect(within(kadabraCard).getByText("Met Location: Invalid.")).toBeTruthy();

  const send = screen.getByRole<HTMLButtonElement>("button", { name: "Send 1 to Platinum" });
  expect(send.disabled).toBe(false);
  fireEvent.click(send);
  expect(onSend).toHaveBeenCalled();
});

it("shows a removed move with its reason", async () => {
  await launch({ offered: () => ({ route: "unofficial", changes: [{ field: "moves", before: "Shadow Claw", after: null, reason: "notInGame" }] }) });

  const row = within(within(await card(/Kadabra/)).getByRole("list", { name: "Changes" })).getByRole("listitem");
  expect(within(row).getByText("Moves")).toBeTruthy();
  expect(within(row).getByText("Shadow Claw removed")).toBeTruthy();
  expect(within(row).getByText("Platinum doesn't have this")).toBeTruthy();
});

it("shows one alert for an unofficial transfer in place of the legality warning", async () => {
  await launch({ offered: () => ({ route: "unofficial", legality: { valid: false, messages: ["Met Location: Invalid."] } }) });

  const kadabraCard = await card(/Kadabra/);
  const alert = within(kadabraCard).getByRole("alert");
  expect(within(alert).getByText("Not possible in the real games")).toBeTruthy();
  expect(within(alert).getByText(/anything Platinum can't hold is lost/)).toBeTruthy();
  expect(within(kadabraCard).queryByText("Fails the legality check")).toBeNull();
  expect(within(kadabraCard).queryByText("Met Location: Invalid.")).toBeNull();
  fireEvent.click(within(alert).getByRole("button", { name: "Details", expanded: false }));
  expect(within(alert).getByText("Met Location: Invalid.")).toBeTruthy();
});

const sentKadabra = { offer: { send: [partyKadabra.at], receive: [] } };

it("says a field the player didn't change came from the Pokémon's kept copy", async () => {
  const offered = (): Partial<OfferedPokemon> => ({
    route: "unofficial",
    changes: [
      { field: "ball", before: "Poké Ball", after: "Dusk Ball", reason: "unofficial" },
      { field: "moves", before: "Tackle", after: null, reason: "notInGame" },
    ],
  });
  const notes: CopyNote[] = [{ at: partyKadabra.at, restored: { game: "Black", patched: ["moves"] } }];
  await launch({ ...sentKadabra, offered, notes });

  const [ball, moves] = within(within(await card(/Kadabra/)).getByRole("list", { name: "Changes" })).getAllByRole("listitem");
  expect(within(ball).getByText("Poké Ball → Dusk Ball")).toBeTruthy();
  expect(within(ball).getByText("Restored from its Black copy")).toBeTruthy();
  expect(within(moves).getByText("Platinum doesn't have this")).toBeTruthy();
});

it("says nothing is restored when kept copies can't tell Pokémon apart, in the unofficial alert", async () => {
  const notes: CopyNote[] = [{ at: partyKadabra.at, ambiguous: true }];
  await launch({ ...sentKadabra, offered: () => ({ route: "unofficial" }), notes });

  const alert = within(await card(/Kadabra/)).getByRole("alert");
  expect(within(alert).getByText(/more than one Pokémon that could be this one/)).toBeTruthy();
});

it("says nothing is restored when kept copies can't tell Pokémon apart, on an official card", async () => {
  const notes: CopyNote[] = [{ at: partyKadabra.at, ambiguous: true }];
  await launch({ ...sentKadabra, notes });

  const kadabraCard = await card(/Kadabra/);
  expect(within(kadabraCard).queryByRole("alert")).toBeNull();
  expect(within(kadabraCard).getByText(/more than one Pokémon that could be this one/)).toBeTruthy();
});

it("says pkhemu keeps the data an unofficial transfer drops when it keeps a copy", async () => {
  const notes: CopyNote[] = [{ at: partyKadabra.at, keptFrom: "FireRed" }];
  await launch({ ...sentKadabra, offered: () => ({ route: "unofficial" }), notes });

  const alert = within(await card(/Kadabra/)).getByRole("alert");
  expect(within(alert).getByText(/keeps its FireRed data and puts it back/)).toBeTruthy();
  expect(within(alert).queryByText(/is lost/)).toBeNull();
});

it("hides Details on an unofficial transfer that passes the legality check", async () => {
  await launch({ offered: () => ({ route: "unofficial" }) });

  const alert = within(await card(/Kadabra/)).getByRole("alert");
  expect(within(alert).getByText("Not possible in the real games")).toBeTruthy();
  expect(within(alert).queryByRole("button", { name: "Details" })).toBeNull();
});

it("shows no warning for a legal Pokémon", async () => {
  await launch();

  expect(within(await card(/Kadabra/)).queryByRole("alert")).toBeNull();
});

it("goes back from the bottom bar", async () => {
  const { onBack } = await launch();

  fireEvent.click(screen.getAllByRole("button", { name: "Back" }).at(-1)!);

  expect(onBack).toHaveBeenCalled();
});

it("disables Send while sending", async () => {
  let finish = () => {};
  const onSend = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
  await launch({ onSend });
  const send = await screen.findByRole("button", { name: "Send 1 to Platinum" });

  fireEvent.click(send);
  expect((send as HTMLButtonElement).disabled).toBe(true);

  await act(async () => finish());
  expect((send as HTMLButtonElement).disabled).toBe(false);
});
