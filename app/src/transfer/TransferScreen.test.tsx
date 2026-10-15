import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { PokemonHandle, PokemonId, PokemonSummary, TransferOffer } from "@pkhex-everywhere/engine";
import { EngineProvider } from "@pkhex-everywhere/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider } from "@/back/back";
import { fakePads, padButtons } from "@/input/fakePads";
import { createInput } from "@/input/input";
import { PadNavigation } from "@/pad-navigation/PadNavigation";
import { fakeEngine, type FakeEngineSave, type FakeTransfer } from "@/editor/fakeEngine";
import type { Game } from "@/library/scan";
import type { SaveFormat } from "@/preferences/gameSettings";
import { FakeGameArt } from "@/game-art/fakeGameArt";
import type { StoredCopy } from "./keptCopies";
import { TransferScreen, type TransferHost, type TransferWrite } from "./TransferScreen";

const emerald: Game = { system: "gba", name: "Pokemon - Emerald Version (USA, Europe)", path: "gba/Emerald.gba" };
const fireRed: Game = { system: "gba", name: "Pokemon - FireRed Version (USA)", path: "gba/FireRed.gba" };
const crystal: Game = { system: "gbc", name: "Pokemon - Crystal Version (USA)", path: "gbc/Crystal.gbc" };
const leafGreen: Game = { system: "gba", name: "Pokemon - LeafGreen Version (USA)", path: "gba/LeafGreen.gba" };
const pokemonX: Game = { system: "3ds", name: "Pokemon X (USA)", path: "3ds/X.3ds" };
const stadium: Game = { system: "n64", name: "Pokemon Stadium (USA)", path: "n64/Stadium.z64" };

let pads: ReturnType<typeof fakePads>;

beforeEach(() => {
  pads = fakePads();
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const inParty = (slot: number): PokemonHandle => ({ source: "party", slot });
const inBox = (box: number, slot: number): PokemonHandle => ({ source: "box", box, slot });

function pokemon(species: string, at: PokemonHandle): PokemonSummary {
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
    level: 20,
    isShiny: false,
    gender: "male",
    isEgg: false,
    types: [],
  };
}

const mine = {
  party: [pokemon("Combusken", inParty(0)), pokemon("Wingull", inParty(1))],
  box: [pokemon("Bidoof", inBox(0, 0)), pokemon("Zigzagoon", inBox(0, 1))],
};
const theirs = [pokemon("Charmander", inParty(0)), pokemon("Kadabra", inBox(0, 0)), pokemon("Onix", inBox(0, 1))];

const defaultTransfer: FakeTransfer = {
  partners: {
    "FireRed.sav": { version: "FireRed", routes: { send: ["link"], receive: ["link"] }, room: { mine: 4, partner: 12 }, pokemon: theirs },
    "Crystal.sav": { version: "Crystal", routes: { send: null, receive: null }, room: { mine: 4, partner: 20 } },
  },
};

function fakeHost({ unsaved = [] as string[], formats = {} as Record<string, SaveFormat> } = {}) {
  const kept = new Map<string, StoredCopy>();
  return {
    readSave: vi.fn(async (_folder: string, path: string) => ({ bytes: [...new TextEncoder().encode(path)], modified: 0, sha256: "abc" })),
    saveFormat: vi.fn(async (path: string) => formats[path] ?? null),
    hasResumeState: vi.fn(async (_folder: string, path: string) => unsaved.includes(path)),
    resumeInfo: vi.fn(async () => ({ playSinceSave: null })),
    writeTransfer: vi.fn(async (_folder: string, _destination: TransferWrite, _source: TransferWrite) => {}),
    keptCopies: vi.fn(async (keys: string[]) => keys.flatMap((key) => kept.get(key) ?? [])),
    keepCopies: vi.fn(async (copies: StoredCopy[]) => {
      for (const copy of copies) kept.set(copy.identityKey, copy);
    }),
  } satisfies TransferHost;
}

const defaultPartners = [
  { game: fireRed, name: "FireRed" },
  { game: crystal, name: "Crystal" },
];

async function launch({ transfer = defaultTransfer, host = fakeHost(), save = {} as FakeEngineSave, partners = defaultPartners } = {}) {
  const fake = fakeEngine({ ...mine, transfer, ...save });
  const props = { onPlay: vi.fn(), onBack: vi.fn() };
  render(
    <EngineProvider engine={fake.engine}>
      <FakeGameArt>
        <BackProvider>
          <PadNavigation input={createInput(pads.gamepads)} />
          <TransferScreen
            host={host}
            folder="/games"
            game={emerald}
            name="Emerald"
            partners={partners}
            {...props}
          />
        </BackProvider>
      </FakeGameArt>
    </EngineProvider>,
  );
  pads.hold();
  await act(async () => {});
  return { ...props, fake, host };
}

const side = (name: string) => screen.findByRole("region", { name });
const button = (name: string | RegExp) => screen.queryByRole("button", { name });
const slot = async (sideName: string, name: string) => within(await side(sideName)).findByRole("button", { name: new RegExp(name) });

async function pickGame(name: string) {
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(`^${name}`) }));
  await within(await side("Send to")).findByText(new RegExp(`empty slots? in ${name}`));
  await act(async () => {});
}

const pickFireRed = () => pickGame("FireRed");

async function tap(element: HTMLElement) {
  fireEvent.click(element);
  await act(async () => {});
}

it("titles the screen Transfer", async () => {
  await launch();

  expect(screen.getByRole("heading", { name: "Transfer" })).toBeTruthy();
});

it("shows this game's party and boxes", async () => {
  await launch();

  expect(await slot("Emerald", "COMBUSKEN")).toBeTruthy();
  expect(await slot("Emerald", "BIDOOF")).toBeTruthy();
});

it("lists only the boxes of a Stadium save", async () => {
  await launch({ save: { party: [], teams: [{ name: null, cup: "Poké Cup", members: [] }] } });

  const bidoof = await slot("Emerald", "BIDOOF");
  expect(within(await side("Emerald")).queryByRole("heading", { name: "Party" })).toBeNull();
  await waitFor(() => expect(document.activeElement).toBe(bidoof));
});

it("disables a game the saves can't transfer with", async () => {
  await launch();

  const crystalButton = await screen.findByRole("button", { name: /^Crystal/ });
  await waitFor(() => expect((crystalButton as HTMLButtonElement).disabled).toBe(true));
  expect(crystalButton.textContent).toContain("Can't send to Crystal");
  expect((button(/^FireRed/) as HTMLButtonElement).disabled).toBe(false);
});

it("disables a game that can only send here", async () => {
  const transfer: FakeTransfer = {
    partners: { ...defaultTransfer.partners, "Crystal.sav": { ...defaultTransfer.partners["Crystal.sav"], routes: { send: null, receive: ["link"] } } },
  };
  await launch({ transfer });

  const crystalButton = await screen.findByRole("button", { name: /^Crystal/ });
  await waitFor(() => expect((crystalButton as HTMLButtonElement).disabled).toBe(true));
  expect(crystalButton.textContent).toContain("Can't send to Crystal");
});

const unofficialCrystal: FakeTransfer = {
  partners: {
    ...defaultTransfer.partners,
    "Crystal.sav": { ...defaultTransfer.partners["Crystal.sav"], routes: { send: ["unofficial"], receive: ["unofficial"] } },
  },
};

it("lets the player pick a game only an unofficial transfer reaches, and says so", async () => {
  await launch({ transfer: unofficialCrystal });

  const crystalButton = await screen.findByRole("button", { name: /^Crystal/ });
  await waitFor(() => expect((crystalButton as HTMLButtonElement).disabled).toBe(false));
  expect(crystalButton.textContent).toContain("Not possible in the real games");
  expect(button(/^FireRed/)!.textContent).not.toContain("Not possible in the real games");
});

it("says the games only moved Pokémon forward when an unofficial transfer goes to an older generation", async () => {
  const transfer: FakeTransfer = {
    partners: { "Emerald.sav": { version: "Emerald", generation: 3, routes: { send: ["unofficial"], receive: ["palPark", "pokeTransfer"] }, room: { mine: 4, partner: 20 } } },
  };
  await launch({ transfer, save: { generation: 5, version: "Black" }, partners: [{ game: emerald, name: "Emerald" }] });

  const emeraldButton = await screen.findByRole("button", { name: /^Emerald/ });
  await waitFor(() => expect(emeraldButton.textContent).toContain("The games only moved Pokémon forward"));
  expect(emeraldButton.textContent).not.toContain("Not possible in the real games");
});

it("keeps saying an unofficial transfer forward wasn't possible in the real games", async () => {
  const transfer: FakeTransfer = {
    partners: { "X.sav": { version: "X", generation: 6, routes: { send: ["unofficial"], receive: ["unofficial"] }, room: { mine: 4, partner: 20 } } },
  };
  await launch({ transfer, save: { generation: 2, version: "Crystal" }, partners: [{ game: pokemonX, name: "X" }] });

  const xButton = await screen.findByRole("button", { name: /^X/ });
  await waitFor(() => expect(xButton.textContent).toContain("Not possible in the real games"));
  expect(xButton.textContent).not.toContain("only moved Pokémon forward");
});

it("notes what an unofficial transfer may lose under the status line", async () => {
  await launch({ transfer: unofficialCrystal });

  fireEvent.click(await screen.findByRole("button", { name: /^Crystal/ }));

  const sendTo = await side("Send to");
  expect(await within(sendTo).findByText("20 empty slots in Crystal")).toBeTruthy();
  expect(within(sendTo).getByText(/lose what Crystal can't hold/)).toBeTruthy();
});

it("adds no note for a game the real games reach", async () => {
  await launch();

  await pickFireRed();

  expect(within(await side("Send to")).queryByText(/may fail the legality check/)).toBeNull();
});

let release = () => {};

afterEach(() => release());

function holdingSave(path: string) {
  const host = fakeHost();
  const read = host.readSave.getMockImplementation()!;
  const held = new Promise<void>((resolve) => (release = resolve));
  host.readSave.mockImplementation(async (folder, asked) => {
    if (asked === path) await held;
    return read(folder, asked);
  });
  return host;
}

it("tells apart two games of the same version by file name", async () => {
  const japanese: Game = { system: "gba", name: "Pocket Monsters - FireRed (Japan)", path: "gba/FireRed (Japan).gba" };
  await launch({
    transfer: { partners: { ...defaultTransfer.partners, "FireRed (Japan).sav": defaultTransfer.partners["FireRed.sav"] } },
    partners: [
      { game: fireRed, name: "FireRed" },
      { game: japanese, name: "FireRed" },
    ],
  });

  const [us, jp] = await screen.findAllByRole("button", { name: /^FireRed/ });
  expect(within(us).getByText("Pokemon - FireRed Version (USA)")).toBeTruthy();
  expect(within(jp).getByText("Pocket Monsters - FireRed (Japan)")).toBeTruthy();
});

it("shows a game's name once when it is its file name", async () => {
  const hack: Game = { system: "gba", name: "Radical Red", path: "gba/Radical Red.gba" };
  await launch({
    transfer: { partners: { "Radical Red.sav": defaultTransfer.partners["FireRed.sav"] } },
    partners: [{ game: hack, name: "Radical Red" }],
  });

  const hackButton = await screen.findByRole("button", { name: /^Radical Red/ });
  expect(within(hackButton).getAllByText(/Radical Red/)).toHaveLength(1);
});

it("shows a game as checking and disabled until its check finishes", async () => {
  await launch({ host: holdingSave(fireRed.path) });

  const fireRedButton = await screen.findByRole("button", { name: /^FireRed/ });
  expect((fireRedButton as HTMLButtonElement).disabled).toBe(true);
  expect(within(fireRedButton).getByLabelText("Checking")).toBeTruthy();
});

it("enables a checked game while the next one is still checking", async () => {
  await launch({ host: holdingSave(crystal.path) });

  const fireRedButton = await screen.findByRole("button", { name: /^FireRed/ });
  await waitFor(() => expect((fireRedButton as HTMLButtonElement).disabled).toBe(false));
  expect(within(fireRedButton).queryByLabelText("Checking")).toBeNull();
  expect(within(button(/^Crystal/)!).getByLabelText("Checking")).toBeTruthy();
});

const status = (element: HTMLElement) => element.querySelector("[data-status]")?.getAttribute("data-status");

it("marks a game the real games reach as official", async () => {
  await launch();

  const fireRedButton = await screen.findByRole("button", { name: /^FireRed/ });
  await waitFor(() => expect(status(fireRedButton)).toBe("official"));
});

it("marks a game only an unofficial transfer reaches as unofficial", async () => {
  await launch({ transfer: unofficialCrystal });

  const crystalButton = await screen.findByRole("button", { name: /^Crystal/ });
  await waitFor(() => expect(status(crystalButton)).toBe("unofficial"));
});

it("marks a game that can only send here as blocked", async () => {
  const transfer: FakeTransfer = {
    partners: { ...defaultTransfer.partners, "Crystal.sav": { ...defaultTransfer.partners["Crystal.sav"], routes: { send: null, receive: ["link"] } } },
  };
  await launch({ transfer });

  const crystalButton = await screen.findByRole("button", { name: /^Crystal/ });
  await waitFor(() => expect(status(crystalButton)).toBe("blocked"));
});

it("marks a game whose save can't be read as blocked", async () => {
  const host = fakeHost();
  const read = host.readSave.getMockImplementation()!;
  host.readSave.mockImplementation(async (folder, path) => {
    if (path === crystal.path) throw new Error("unreadable");
    return read(folder, path);
  });
  await launch({ host });

  const crystalButton = await screen.findByRole("button", { name: /^Crystal/ });
  await waitFor(() => expect(status(crystalButton)).toBe("blocked"));
});

it("marks a game as checking until its check finishes", async () => {
  await launch({ host: holdingSave(fireRed.path) });

  const fireRedButton = await screen.findByRole("button", { name: /^FireRed/ });
  expect(status(fireRedButton)).toBe("checking");

  release();
  await waitFor(() => expect(status(fireRedButton)).toBe("official"));
});

it("opens the transfer on the picked game", async () => {
  const { fake } = await launch();

  await pickFireRed();

  expect(fake.transfersOpened().at(-1)).toBe("FireRed.sav");
});

it("shows the room in the picked game", async () => {
  await launch();

  await pickFireRed();

  expect(within(await side("Send to")).getByText("12 empty slots in FireRed")).toBeTruthy();
});

it("doesn't show the other game's Pokémon", async () => {
  await launch();

  await pickFireRed();

  await expect(screen.findAllByRole("button", { name: /CHARMANDER|KADABRA|ONIX/ }, { timeout: 300 })).rejects.toThrow();
});

it("asks to save in game first when the picked game has play that isn't in its save", async () => {
  const { fake, onPlay } = await launch({ host: fakeHost({ unsaved: [fireRed.path] }) });

  fireEvent.click(await screen.findByRole("button", { name: /^FireRed/ }));

  const dialog = await screen.findByRole("alertdialog", { name: "Save in game first?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Resume and save first" }));
  expect(onPlay).toHaveBeenCalledWith(fireRed);
  expect(fake.transfersOpened().at(-1)).not.toBe("FireRed.sav");
});

it("opens the transfer anyway after the warning", async () => {
  await launch({ host: fakeHost({ unsaved: [fireRed.path] }) });

  fireEvent.click(await screen.findByRole("button", { name: /^FireRed/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Continue anyway" }));

  expect(await screen.findByText("12 empty slots in FireRed")).toBeTruthy();
});

it("selects with the gamepad, then picks a game", async () => {
  await launch();
  const combusken = await slot("Emerald", "COMBUSKEN");
  await waitFor(() => expect(document.activeElement).toBe(combusken));

  pads.press(padButtons.a);
  await act(async () => {});
  expect(combusken.getAttribute("aria-pressed")).toBe("true");

  await pickFireRed();
  expect(combusken.getAttribute("aria-pressed")).toBe("true");
  expect((button("Review 1") as HTMLButtonElement).disabled).toBe(false);
});

it("goes back with B", async () => {
  const { onBack } = await launch();

  pads.press(padButtons.b);

  expect(onBack).toHaveBeenCalled();
});

it("selects a Pokémon before a game is picked", async () => {
  const { fake } = await launch();
  const bidoof = await slot("Emerald", "BIDOOF");

  await tap(bidoof);

  expect(bidoof.getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("status").textContent).toBe("Pick a game to send to");
  expect((button("Review 1") as HTMLButtonElement).disabled).toBe(true);
  expect(fake.transferOffers()).toEqual([]);
});

it("keeps the selection when a game is picked", async () => {
  await launch();
  const bidoof = await slot("Emerald", "BIDOOF");
  await tap(bidoof);
  await tap(await slot("Emerald", "ZIGZAGOON"));

  await pickFireRed();

  expect(bidoof.getAttribute("aria-pressed")).toBe("true");
  expect((button("Review 2") as HTMLButtonElement).disabled).toBe(false);
});

const refusesBidoof =
  (partner: string) =>
  (offer: TransferOffer, fileName: string) =>
    fileName === partner
      ? offer.send
          .filter((at) => at.source === "box" && at.slot === 0)
          .map((at) => ({ direction: "send" as const, at, reason: "speciesNotInGame" as const }))
      : [];

async function selectBidoofAndZigzagoon() {
  await launch({
    transfer: {
      partners: { ...defaultTransfer.partners, "LeafGreen.sav": { ...defaultTransfer.partners["FireRed.sav"], version: "LeafGreen" } },
      refuse: refusesBidoof("FireRed.sav"),
    },
    partners: [...defaultPartners, { game: leafGreen, name: "LeafGreen" }],
  });
  const bidoof = await slot("Emerald", "BIDOOF");
  await tap(bidoof);
  await tap(await slot("Emerald", "ZIGZAGOON"));
  return bidoof;
}

it("unchecks and greys out a selected Pokémon the picked game refuses", async () => {
  const bidoof = await selectBidoofAndZigzagoon();

  await pickFireRed();

  expect(bidoof.getAttribute("aria-pressed")).toBe("false");
  expect(bidoof.getAttribute("aria-disabled")).toBe("true");
  expect(screen.getByRole("status").textContent).toBe("FireRed doesn't have Bidoof");
  expect((button("Review 1") as HTMLButtonElement).disabled).toBe(false);
});

it("checks a refused Pokémon again when another game takes it", async () => {
  const bidoof = await selectBidoofAndZigzagoon();
  await pickFireRed();

  await pickGame("LeafGreen");

  expect(bidoof.getAttribute("aria-pressed")).toBe("true");
  expect(bidoof.getAttribute("aria-disabled")).toBeNull();
  expect((button("Review 2") as HTMLButtonElement).disabled).toBe(false);
});

it("toggles a check mark when tapping a Pokémon", async () => {
  await launch();
  await pickFireRed();
  const bidoof = await slot("Emerald", "BIDOOF");

  await tap(bidoof);
  expect(bidoof.getAttribute("aria-pressed")).toBe("true");
  expect(button("Review 1")).toBeTruthy();

  await tap(bidoof);
  expect(bidoof.getAttribute("aria-pressed")).toBe("false");
});

it("won't select a refused Pokémon and shows why", async () => {
  const refuse = (offer: TransferOffer) =>
    offer.send
      .filter((at) => at.source === "box" && at.slot === 0)
      .map((at) => ({ direction: "send" as const, at, reason: "speciesNotInGame" as const }));
  await launch({ transfer: { ...defaultTransfer, refuse } });
  await pickFireRed();
  const bidoof = await slot("Emerald", "BIDOOF");

  await tap(bidoof);

  expect(bidoof.getAttribute("aria-pressed")).toBe("false");
  expect(bidoof.getAttribute("aria-disabled")).toBe("true");
  expect(screen.getByRole("status").textContent).toBe("FireRed doesn't have Bidoof");
  expect((button(/^Review/) as HTMLButtonElement).disabled).toBe(true);
});

it.each([
  ["eggAcrossGenerations", "Eggs can't move to another generation"],
  ["languageMismatch", "Japanese and international games can't trade"],
  ["lastPartyMember", "Keep one Pokémon in the party"],
  ["conversionFailed", "FireRed can't take this Pokémon"],
] as const)("explains a %s refusal", async (reason, message) => {
  const refuse = (offer: TransferOffer) => offer.send.map((at) => ({ direction: "send" as const, at, reason }));
  await launch({ transfer: { ...defaultTransfer, refuse } });
  await pickFireRed();

  await tap(await slot("Emerald", "COMBUSKEN"));

  expect(screen.getByRole("status").textContent).toBe(message);
});

it("explains when a Pokémon picked earlier is dropped", async () => {
  const refuse = (offer: TransferOffer) =>
    offer.send.length > 1
      ? [{ direction: "send" as const, at: offer.send[0], reason: "lastPartyMember" as const }]
      : [];
  await launch({ transfer: { ...defaultTransfer, refuse } });
  await pickFireRed();
  const combusken = await slot("Emerald", "COMBUSKEN");
  const wingull = await slot("Emerald", "WINGULL");

  await tap(combusken);
  await tap(wingull);

  expect(combusken.getAttribute("aria-pressed")).toBe("false");
  expect(wingull.getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("status").textContent).toBe("Keep one Pokémon in the party");
});

it("shows the reason again when tapping a refused Pokémon", async () => {
  const refuse = (offer: TransferOffer) =>
    offer.send.map((at) => ({ direction: "send" as const, at, reason: "eggAcrossGenerations" as const }));
  await launch({ transfer: { ...defaultTransfer, refuse } });
  await pickFireRed();
  const bidoof = await slot("Emerald", "BIDOOF");
  await tap(bidoof);
  await tap(await slot("Emerald", "ZIGZAGOON"));

  await tap(bidoof);

  expect(screen.getByRole("status").textContent).toBe("Eggs can't move to another generation");
});

it("disables Review when the other game has no room", async () => {
  const transfer: FakeTransfer = {
    partners: {
      "FireRed.sav": { ...defaultTransfer.partners["FireRed.sav"], room: { mine: 4, partner: 1 } },
    },
  };
  await launch({ transfer });
  await pickFireRed();

  await tap(await slot("Emerald", "BIDOOF"));
  expect((button("Review 1") as HTMLButtonElement).disabled).toBe(false);

  await tap(await slot("Emerald", "ZIGZAGOON"));
  expect((button("Review 2") as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("status").textContent).toBe("Not enough room in FireRed");
});

it("reviews the selection and keeps it when going back", async () => {
  const { fake, onBack } = await launch();
  const preview = vi.spyOn(fake.engine.transfer, "preview");
  await pickFireRed();
  await tap(await slot("Emerald", "BIDOOF"));

  fireEvent.click(button("Review 1")!);

  expect(await screen.findByRole("article", { name: "BIDOOF · Lv. 20" })).toBeTruthy();
  expect(preview).toHaveBeenLastCalledWith({ send: [inBox(0, 0)], receive: [], arrivals: [] });
  expect(button("Send 1 to FireRed")).toBeTruthy();

  pads.press(padButtons.b);

  expect(screen.queryByRole("heading", { name: "Review transfer" })).toBeNull();
  expect((await slot("Emerald", "BIDOOF")).getAttribute("aria-pressed")).toBe("true");
  expect(button("Review 1")).toBeTruthy();
  expect(onBack).not.toHaveBeenCalled();
});

it("disables Review with nothing selected", async () => {
  await launch();
  await pickFireRed();

  expect((button("Review") as HTMLButtonElement).disabled).toBe(true);
});

it("closes the transfer and the save when leaving", async () => {
  const { fake, onBack } = await launch();
  await pickFireRed();

  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(onBack).toHaveBeenCalled();
  cleanup();

  await waitFor(() => expect(fake.loaded()).toBeUndefined());
  expect(await fake.engine.transfer.get()).toBeNull();
});

const written = (path: string, note: string) => ({ path, save: [...new TextEncoder().encode(path)], note });

const writes = (host: ReturnType<typeof fakeHost>) =>
  host.writeTransfer.mock.calls.map(([folder, ...games]) => [folder, ...games.map((game) => ({ ...game, save: [...game.save] }))]);

async function review(...names: string[]) {
  await pickFireRed();
  for (const name of names) await tap(await slot("Emerald", name));
  fireEvent.click(button(`Review ${names.length}`)!);
  await screen.findByRole("article", { name: `${names[0]} · Lv. 20` });
}

it("writes the other game first when sending from this one", async () => {
  const { host } = await launch();
  await pickFireRed();
  await tap(await slot("Emerald", "BIDOOF"));
  fireEvent.click(button("Review 1")!);
  await screen.findByRole("article", { name: "BIDOOF · Lv. 20" });

  await tap(button("Send 1 to FireRed")!);

  expect(writes(host)).toEqual([
    ["/games", written("gba/FireRed.gba", "Received BIDOOF from Emerald"), written("gba/Emerald.gba", "Sent BIDOOF to FireRed")],
  ]);
});

it("writes a Stadium save it sends to", async () => {
  const transfer: FakeTransfer = {
    partners: { "Stadium.sav": { version: "Red", routes: { send: ["link"], receive: ["link"] }, room: { mine: 4, partner: 240 } } },
  };
  const { host } = await launch({ transfer, partners: [{ game: stadium, name: "Stadium" }] });
  await pickGame("Stadium");
  await tap(await slot("Emerald", "BIDOOF"));
  fireEvent.click(button("Review 1")!);
  await screen.findByRole("article", { name: "BIDOOF · Lv. 20" });

  await tap(button("Send 1 to Stadium")!);

  expect(writes(host)).toEqual([
    ["/games", written("n64/Stadium.z64", "Received BIDOOF from Emerald"), written("gba/Emerald.gba", "Sent BIDOOF to Stadium")],
  ]);
});

it("reads each save with its own game's stored format", async () => {
  const formats = { [emerald.path]: { id: "radicalred", chosen: true }, [fireRed.path]: { id: "unbound", chosen: false } };
  const save = { candidates: [{ id: "radicalred", name: "Radical Red" }], detected: "unbound" };
  const { fake } = await launch({ host: fakeHost({ formats }), save });

  await pickFireRed();

  expect(fake.loads()).toEqual(["radicalred", "radicalred"]);
  expect(fake.partnerFormats()).toEqual(["unbound", null, "unbound"]);
});

it("returns to Pick with both games reloaded and a toast after sending", async () => {
  const { fake, host } = await launch();
  await review("BIDOOF");
  host.readSave.mockClear();

  await tap(button("Send 1 to FireRed")!);

  expect(await screen.findByText("Sent 1 to FireRed")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Review transfer" })).toBeNull();
  expect(host.readSave).toHaveBeenCalledWith("/games", emerald.path);
  expect(host.readSave).toHaveBeenCalledWith("/games", fireRed.path);
  expect(fake.transfersOpened().at(-1)).toBe("FireRed.sav");
  expect((await slot("Emerald", "BIDOOF")).getAttribute("aria-pressed")).toBe("false");
});

it("checks no Pokémon after sending", async () => {
  await launch();
  await review("BIDOOF", "ZIGZAGOON");

  await tap(button("Send 2 to FireRed")!);
  await screen.findByText("Sent 2 to FireRed");
  await act(async () => {});

  expect(within(await side("Emerald")).queryAllByRole("button", { pressed: true })).toEqual([]);
  expect((button("Review") as HTMLButtonElement).disabled).toBe(true);
});

it("writes nothing and returns to Pick when the transfer is refused", async () => {
  const { fake, host } = await launch();
  await review("BIDOOF");
  vi.spyOn(fake.engine.transfer, "commit").mockRejectedValueOnce(Object.assign(new Error("Refused"), { code: "transfer-refused" }));
  host.readSave.mockClear();

  await tap(button("Send 1 to FireRed")!);

  expect(host.writeTransfer).not.toHaveBeenCalled();
  expect(screen.queryByRole("heading", { name: "Review transfer" })).toBeNull();
  expect(host.readSave).toHaveBeenCalledWith("/games", fireRed.path);
  expect(screen.queryByText("Sent 1 to FireRed")).toBeNull();
});

it("shows why sending failed when a save can't be written", async () => {
  const host = fakeHost();
  host.writeTransfer.mockRejectedValueOnce("disk full");
  await launch({ host });
  await review("BIDOOF");

  await tap(button("Send 1 to FireRed")!);

  expect(await screen.findByText(/disk full/)).toBeTruthy();
  expect(screen.queryByText("Sent 1 to FireRed")).toBeNull();
});

const toCrystal: FakeTransfer = {
  partners: {
    ...defaultTransfer.partners,
    "Crystal.sav": { version: "Crystal", generation: 2, routes: { send: ["unofficial"], receive: ["unofficial"] }, room: { mine: 4, partner: 20 } },
  },
};

async function reviewForCrystal(name: string) {
  await pickGame("Crystal");
  await tap(await slot("Emerald", name));
  fireEvent.click(button("Review 1")!);
  await screen.findByRole("article", { name: `${name} · Lv. 20` });
}

it("keeps a copy of a Pokémon sent to an older game once both saves are written", async () => {
  const { host } = await launch({ transfer: toCrystal });
  await reviewForCrystal("BIDOOF");

  await tap(button("Send 1 to Crystal")!);

  expect(host.keepCopies).toHaveBeenCalledWith([
    { identityKey: "00000000-12345-00000", generation: 3, game: "Emerald", bytes: new Uint8Array([20]), aliases: ["GB-12345-415348-0000"] },
  ]);
  expect(host.keepCopies.mock.invocationCallOrder[0]).toBeGreaterThan(host.writeTransfer.mock.invocationCallOrder[0]);
});

it("says pkhemu keeps the Pokémon's data when it goes to an older game", async () => {
  await launch({ transfer: toCrystal });
  await reviewForCrystal("BIDOOF");

  expect(within(await screen.findByRole("alert")).getByText(/keeps its Emerald data/)).toBeTruthy();
});

it("sends a Pokémon with a kept copy as the copy, in the preview and the commit", async () => {
  const host = fakeHost();
  const copy = { identityKey: "00000000-12345-00000", generation: 4, game: "Platinum", bytes: new Uint8Array([20]) };
  host.keptCopies.mockResolvedValue([copy]);
  const { fake } = await launch({ host });
  await review("BIDOOF");

  await tap(button("Send 1 to FireRed")!);

  const [preview, commit] = fake.transferOffers().slice(-2);
  expect(preview.offer.arrivals).toEqual([{ at: inBox(0, 0), bytes: copy.bytes, patch: expect.anything() }]);
  expect(commit.offer).toEqual(preview.offer);
});

it("sends anyway when keeping the copy fails", async () => {
  const host = fakeHost();
  host.keepCopies.mockRejectedValueOnce("disk full");
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  await launch({ transfer: toCrystal, host });
  await reviewForCrystal("BIDOOF");

  await tap(button("Send 1 to Crystal")!);

  expect(await screen.findByText("Sent 1 to Crystal")).toBeTruthy();
  expect(screen.queryByText(/disk full/)).toBeNull();
  expect(logged).toHaveBeenCalledWith("disk full");
  logged.mockRestore();
});
