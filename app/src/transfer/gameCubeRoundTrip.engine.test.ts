// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { createEngine, wasmHost, type Engine, type PokemonHandle } from "@pkhex-everywhere/engine";
import { expect, it, type TestContext } from "vitest";
import { commitTransfer, planTransfer, type KeptCopyHost, type StoredCopy } from "./keptCopies";
import { exportBlankCard } from "./memoryCardFixture";

const dotnet = new URL("../../node_modules/@pkhex-everywhere/engine/_framework/dotnet.js", import.meta.url).href;

const newEngine = () => createEngine({ host: wasmHost({ dotnetUrl: dotnet, load: (url) => import(/* @vite-ignore */ url) }) });

// Blank Gen 3 saves don't export yet (pkhex-web/issue-tracker#277).
const emeraldSave = new URL("../../../data/saves/emerald.sav", import.meta.url);
const versions = { box: 61, colosseum: 62 };
const espeon = 196;
const colosseumAndXd = 15;

function emerald(skip: TestContext["skip"]) {
  if (!existsSync(emeraldSave)) skip("needs data/saves/emerald.sav");
  return new Uint8Array(readFileSync(emeraldSave));
}

function memoryHost(): KeptCopyHost {
  const kept = new Map<string, StoredCopy>();
  return {
    keptCopies: async (keys) => keys.flatMap((key) => kept.get(key) ?? []),
    keepCopies: async (copies) => {
      for (const copy of copies) kept.set(copy.identityKey, copy);
    },
  };
}

type Moved = { save: Uint8Array; at: PokemonHandle };

// The blank save's trainer is PKHeXWeb, one letter longer than Gen 3 names go.
async function colosseumCard(engine: Engine): Promise<Moved> {
  await engine.game.load(await exportBlankCard(engine, versions.colosseum));
  await engine.trainer.setName("Wes");
  const [gift] = await engine.encounters.search(colosseumAndXd, espeon);
  const { at } = await engine.box.addEncounter(gift.index);
  return { save: (await engine.game.export()).bytes, at };
}

async function send(engine: Engine, host: KeptCopyHost, { save, at }: Moved, partner: Uint8Array, game: string) {
  await engine.game.load(save);
  const { routes } = await engine.transfer.open(partner);
  const plan = await planTransfer(engine, host, [at], game);
  expect((await engine.transfer.preview(plan.offer)).refused).toEqual([]);
  const { result, keep } = await commitTransfer(engine, host, plan);
  await keep();
  await engine.transfer.close();
  return { routes, emptied: result.save.bytes, moved: { save: result.partner.bytes, at: result.arrived[0].at } };
}

async function roundTrip(engine: Engine, start: Moved, partner: Uint8Array, [game, other]: [string, string]) {
  const host = memoryHost();
  await engine.game.load(start.save);
  const before = await engine.pokemon.details(start.at);
  const there = await send(engine, host, start, partner, game);
  await engine.game.load(there.moved.save);
  const arrived = await engine.pokemon.details(there.moved.at);
  const back = await send(engine, host, there.moved, there.emptied, other);
  await engine.game.load(back.moved.save);
  const version = (await engine.game.version())?.version;
  return { before, arrived, routes: [there.routes.send, back.routes.send], version, back };
}

it("trades a Pokémon from a Colosseum card to an Emerald save and back", { timeout: 300_000 }, async ({ skip }) => {
  const partner = emerald(skip);
  const engine = newEngine();
  const start = await colosseumCard(engine);

  const { before, arrived, routes, version, back } = await roundTrip(engine, start, partner, ["Colosseum", "Emerald"]);

  expect(routes).toEqual([["link"], ["link"]]);
  expect(arrived).toMatchObject({ species: espeon, legality: { valid: true, messages: [] } });
  expect(back.moved.save).toHaveLength(start.save.length);
  expect(version).toBe("Colosseum");
  expect(await engine.pokemon.details(back.moved.at)).toEqual(before);
});

it("moves a Pokémon from an Emerald save into a Box card and back", { timeout: 300_000 }, async ({ skip }) => {
  const save = emerald(skip);
  const engine = newEngine();
  const card = await exportBlankCard(engine, versions.box);
  await engine.game.load(save);
  const [first] = await engine.party.get();

  const { before, arrived, routes, version, back } = await roundTrip(engine, { save, at: first.at }, card, ["Emerald", "Box"]);

  expect(routes).toEqual([["link"], ["link"]]);
  expect(arrived).toMatchObject({ species: before.species, level: before.level, friendship: before.friendship });
  expect(version).toBe("Emerald");
  expect(await engine.pokemon.details(back.moved.at)).toMatchObject({ species: before.species, friendship: before.friendship, pid: before.pid });
});
