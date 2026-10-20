import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createEngine, wasmHost, type Engine } from "@pkhex-everywhere/engine";
import { EngineProvider } from "@pkhex-everywhere/react";
import { afterEach, beforeEach, expect, it, vi, type TestContext } from "vitest";
import { BackProvider } from "@/back/back";
import { FakeGameArt } from "@/game-art/fakeGameArt";
import { inTurn } from "@/lib/engineTurn";
import type { Game } from "@/library/scan";
import { exportLoadable } from "./blankSaveFixture";
import type { StoredCopy } from "./keptCopies";
import { exportBlankCard, isGameCube } from "./memoryCardFixture";
import { TransferScreen, type TransferHost, type TransferWrite } from "./TransferScreen";

// jsdom serves test modules over http, and the .NET runtime only loads from file URLs.
const dotnet = pathToFileURL(`${process.cwd()}/node_modules/@pkhex-everywhere/engine/_framework/dotnet.js`).href;

const newEngine = () => createEngine({ host: wasmHost({ dotnetUrl: dotnet, load: (url) => import(/* @vite-ignore */ url) }) });

const versions = { red: 35, crystal: 41, black: 21, x: 24, omegaRuby: 27, sun: 30, ultraMoon: 33, box: 61, colosseum: 62, xd: 63 };

// Blank Gen 3 saves don't export yet (pkhex-web/issue-tracker#277).
const emeraldSave = `${process.cwd()}/../data/saves/emerald.sav`;

function needsEmerald(skip: TestContext["skip"]) {
  if (!existsSync(emeraldSave)) skip("needs data/saves/emerald.sav");
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function saveFor(engine: Engine, version: number | "emerald", species?: number) {
  if (version === "emerald") return new Uint8Array(readFileSync(emeraldSave));
  if (isGameCube(version)) return exportBlankCard(engine, version);
  await engine.game.loadBlank(version);
  if (species) {
    const encounter = (await engine.encounters.search(version, species)).find(({ isEgg }) => !isEgg);
    await engine.box.addEncounter(encounter!.index);
  }
  const bytes = await exportLoadable(engine);
  await engine.game.close();
  return bytes;
}

function memoryHost(saves: Map<string, Uint8Array>) {
  const kept = new Map<string, StoredCopy>();
  return {
    readSave: vi.fn(async (_folder: string, path: string) => {
      const bytes = saves.get(path);
      return bytes ? { bytes: [...bytes], modified: 0, sha256: path } : null;
    }),
    saveFormat: vi.fn(async () => null),
    hasResumeState: vi.fn(async () => false),
    resumeInfo: vi.fn(async () => ({ playSinceSave: null })),
    writeTransfer: vi.fn(async (_folder: string, destination: TransferWrite, source: TransferWrite) => {
      saves.set(destination.path, destination.save);
      saves.set(source.path, source.save);
    }),
    keptCopies: vi.fn(async (keys: string[]) => keys.flatMap((key) => kept.get(key) ?? [])),
    keepCopies: vi.fn(async (copies: StoredCopy[]) => {
      for (const copy of copies) kept.set(copy.identityKey, copy);
    }),
  } satisfies TransferHost;
}

const slow = { timeout: 30_000 };

const chikorita = 152;

const games: Record<string, Game> = {
  Red: { system: "gb", name: "Red", path: "gb/Red.gb" },
  Crystal: { system: "gbc", name: "Crystal", path: "gbc/Crystal.gbc" },
  Emerald: { system: "gba", name: "Emerald", path: "gba/Emerald.gba" },
  Black: { system: "nds", name: "Black", path: "nds/Black.nds" },
  Colosseum: { system: "gc", name: "Colosseum", path: "gc/Colosseum.rvz" },
  XD: { system: "gc", name: "XD", path: "gc/XD.rvz" },
  Box: { system: "gc", name: "Box", path: "gc/Box.iso" },
  X: { system: "3ds", name: "X", path: "3ds/X.3ds" },
  "Omega Ruby": { system: "3ds", name: "Omega Ruby", path: "3ds/Omega Ruby.3ds" },
  Sun: { system: "3ds", name: "Sun", path: "3ds/Sun.3ds" },
  "Ultra Moon": { system: "3ds", name: "Ultra Moon", path: "3ds/Ultra Moon.3ds" },
};

function renderTransfer(engine: Engine, host: TransferHost, from: string, to: string) {
  render(
    <EngineProvider engine={engine}>
      <FakeGameArt>
        <BackProvider>
          <TransferScreen
            host={host}
            folder="/games"
            game={games[from]}
            name={from}
            partners={[{ game: games[to], name: to }]}
            onPlay={vi.fn()}
            onBack={vi.fn()}
          />
        </BackProvider>
      </FakeGameArt>
    </EngineProvider>,
  );
}

async function pickPartner(from: string, to: string, name: string) {
  const [mine] = await within(screen.getByRole("region", { name: from })).findAllByRole("button", { name: new RegExp(name) }, slow);
  fireEvent.click(mine);
  const pick = await within(screen.getByRole("region", { name: "Send to" })).findByRole("button", { name: new RegExp(`^${to}`) }, slow);
  await waitFor(() => expect((pick as HTMLButtonElement).disabled).toBe(false), slow);
  fireEvent.click(pick);
  await waitFor(() => expect((screen.getByRole("button", { name: "Review 1" }) as HTMLButtonElement).disabled).toBe(false), slow);
  fireEvent.click(screen.getByRole("button", { name: "Review 1" }));
}

it.each([
  { from: "X", to: "Omega Ruby", versions: [versions.x, versions.omegaRuby], species: 1, name: "Bulbasaur" },
  { from: "Sun", to: "Ultra Moon", versions: [versions.sun, versions.ultraMoon], species: 722, name: "Rowlet" },
])("trades a Pokémon from $from to $to", { timeout: 300_000 }, async ({ from, to, versions: [mine, theirs], species, name }) => {
  const engine = newEngine();
  const saves = new Map([
    [games[from].path, await saveFor(engine, mine, species)],
    [games[to].path, await saveFor(engine, theirs)],
  ]);
  const host = memoryHost(saves);
  renderTransfer(engine, host, from, to);

  await pickPartner(from, to, name);
  const send = await screen.findByRole("button", { name: `Send 1 to ${to}` }, slow);
  await waitFor(() => expect((send as HTMLButtonElement).disabled).toBe(false), slow);
  fireEvent.click(send);
  await waitFor(() => expect(host.keepCopies).toHaveBeenCalled(), slow);
  cleanup();

  const boxOf = (path: string) =>
    inTurn(async () => {
      await engine.game.load(saves.get(path)!);
      return (await engine.box.get()).map(({ species }) => species);
    });
  expect(await boxOf(games[to].path)).toEqual([name]);
  expect(await boxOf(games[from].path)).toEqual([]);
});

it.for([
  { from: "Emerald", to: "Black", versions: ["emerald", versions.black] as const, status: "official" },
  { from: "Black", to: "X", versions: [versions.black, versions.x], status: "official" },
  { from: "Black", to: "Sun", versions: [versions.black, versions.sun], status: "official" },
  { from: "X", to: "Sun", versions: [versions.x, versions.sun], status: "official" },
  { from: "Sun", to: "X", versions: [versions.sun, versions.x], status: "unofficial" },
  { from: "Red", to: "Sun", versions: [versions.red, versions.sun], status: "official" },
  { from: "Crystal", to: "Sun", versions: [versions.crystal, versions.sun], status: "official" },
  { from: "Crystal", to: "X", versions: [versions.crystal, versions.x], status: "unofficial" },
  { from: "Colosseum", to: "Emerald", versions: [versions.colosseum, "emerald"], status: "official" },
  { from: "Emerald", to: "XD", versions: ["emerald", versions.xd], status: "official" },
  { from: "Box", to: "Emerald", versions: [versions.box, "emerald"], status: "official" },
  { from: "Emerald", to: "Box", versions: ["emerald", versions.box], status: "official" },
] as const)("shows the route from $from to $to as $status", { timeout: 300_000 }, async ({ from, to, versions: [mine, theirs], status }, { skip }) => {
  if (mine === "emerald" || theirs === "emerald") needsEmerald(skip);
  const engine = newEngine();
  const saves = new Map([
    [games[from].path, await saveFor(engine, mine)],
    [games[to].path, await saveFor(engine, theirs)],
  ]);
  renderTransfer(engine, memoryHost(saves), from, to);

  const partner = await within(screen.getByRole("region", { name: "Send to" })).findByRole("button", { name: new RegExp(`^${to}`) }, slow);
  await waitFor(() => expect(partner.querySelector("[data-status]")?.getAttribute("data-status")).toBe(status), slow);
});

it("reviews the changes from each hop from Emerald to Sun", { timeout: 300_000 }, async ({ skip }) => {
  needsEmerald(skip);
  const engine = newEngine();
  const saves = new Map([
    [games.Emerald.path, await saveFor(engine, "emerald")],
    [games.Sun.path, await saveFor(engine, versions.sun)],
  ]);
  const { route, changes } = await inTurn(async () => {
    await engine.game.load(saves.get(games.Emerald.path)!);
    await engine.transfer.open(saves.get(games.Sun.path)!);
    const wingull = (await engine.party.get()).find(({ species }) => species === "Wingull");
    const { offers } = wingull ? await engine.transfer.preview({ send: [wingull.at], receive: [] }) : { offers: [] };
    await engine.transfer.close();
    await engine.game.close();
    return offers[0] ?? skip("needs a Wingull in data/saves/emerald.sav's party");
  });
  expect(route).toEqual(["palPark", "pokeTransfer", "transporter", "bank"]);
  expect(changes.map(({ reason }) => reason)).toEqual(expect.arrayContaining(["palPark", "pokeTransfer", "transporter"]));
  renderTransfer(engine, memoryHost(saves), "Emerald", "Sun");

  await pickPartner("Emerald", "Sun", "Wingull");

  const review = await screen.findByRole("article", { name: /Wingull/i }, slow);
  expect(within(within(review).getByRole("list", { name: "Changes" })).getAllByRole("listitem")).toHaveLength(changes.length);
});

it("sends a Pokémon from Crystal to Sun that passes the legality check", { timeout: 300_000 }, async () => {
  const engine = newEngine();
  const saves = new Map([
    [games.Crystal.path, await saveFor(engine, versions.crystal, chikorita)],
    [games.Sun.path, await saveFor(engine, versions.sun)],
  ]);
  const host = memoryHost(saves);
  renderTransfer(engine, host, "Crystal", "Sun");

  await pickPartner("Crystal", "Sun", "Chikorita");
  const send = await screen.findByRole("button", { name: "Send 1 to Sun" }, slow);
  await waitFor(() => expect((send as HTMLButtonElement).disabled).toBe(false), slow);
  fireEvent.click(send);
  await waitFor(() => expect(host.writeTransfer).toHaveBeenCalled(), slow);
  cleanup();

  const arrived = await inTurn(async () => {
    await engine.game.load(saves.get(games.Sun.path)!);
    const [arrival] = await engine.box.get();
    return engine.pokemon.details(arrival.at);
  });
  expect(arrived.species).toBe(chikorita);
  expect(arrived.legality).toEqual({ valid: true, messages: [] });
});
