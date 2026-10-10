// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createEngine, wasmHost, type Engine, type PokemonHandle } from "@pkhex-everywhere/engine";
import { expect, it, type TestContext } from "vitest";
import { commitTransfer, copyKey, noteFor, planTransfer, type KeptCopyHost, type StoredCopy } from "./keptCopies";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const saves = {
  black2: `${repo}data/saves/black2.sav`,
  red: `${repo}data/saves/pksav-pokemon_red.sav`,
  crystal: `${repo}data/saves/crystal.sav`,
};
const dotnet = new URL("../../node_modules/@pkhex-everywhere/engine/_framework/dotnet.js", import.meta.url).href;

function needs(skip: TestContext["skip"], ...paths: string[]) {
  const missing = paths.filter((path) => !existsSync(path)).map((path) => path.slice(repo.length));
  if (missing.length) skip(`needs ${missing.join(", ")}`);
}

const newEngine = () => createEngine({ host: wasmHost({ dotnetUrl: dotnet, load: (url) => import(/* @vite-ignore */ url) }) });

function memoryHost() {
  const kept = new Map<string, StoredCopy>();
  const host: KeptCopyHost = {
    keptCopies: async (keys) => keys.flatMap((key) => kept.get(key) ?? []),
    keepCopies: async (copies) => {
      for (const copy of copies) for (const key of [copy.identityKey, ...(copy.aliases ?? [])]) kept.set(key, copy);
    },
  };
  return { ...host, kept };
}

type Moved = { bytes: Uint8Array; at: PokemonHandle };

async function send(engine: Engine, host: KeptCopyHost, { bytes, at }: Moved, partner: string, game: string) {
  await engine.game.load(bytes);
  await engine.transfer.open(readFileSync(partner));
  const plan = await planTransfer(engine, host, [at], game);
  expect((await engine.transfer.preview(plan.offer)).refused).toEqual([]);
  const { result, keep } = await commitTransfer(engine, host, plan);
  await keep();
  await engine.transfer.close();
  return { plan, moved: { bytes: result.partner.bytes, at: result.arrived[0].at } };
}

async function kantoPokemon(engine: Engine) {
  const black2 = readFileSync(saves.black2);
  await engine.game.load(black2);
  const picked = (await engine.box.get()).find(({ isEgg, speciesId }) => !isEgg && speciesId !== null && speciesId >= 1 && speciesId <= 151);
  expect(picked).toBeDefined();
  return { bytes: black2, at: picked!.at };
}

const moveIds = (moves: { id: number }[]) => moves.map(({ id }) => id);

it("keys a Gen 5 Pokémon by its PID, trainer ID and secret ID as the engine did", { timeout: 300_000 }, async ({ skip }) => {
  needs(skip, saves.black2);
  const engine = newEngine();
  const { at } = await kantoPokemon(engine);

  const file = new DataView((await engine.pokemon.export(at)).bytes.buffer);
  const pid = file.getUint32(0x00, true).toString(16).toUpperCase().padStart(8, "0");
  const tid = String(file.getUint16(0x0c, true)).padStart(5, "0");
  const sid = String(file.getUint16(0x0e, true)).padStart(5, "0");
  expect(copyKey(await engine.pokemon.details(at), 5)).toBe(`${pid}-${tid}-${sid}`);
});

it("keys a Gen 1 Pokémon by its trainer, OT name and DVs", { timeout: 300_000 }, async ({ skip }) => {
  needs(skip, saves.red);
  const engine = newEngine();
  await engine.game.load(readFileSync(saves.red));
  const [first] = await engine.party.get();

  expect(copyKey(await engine.pokemon.details(first.at), 1)).toMatch(/^GB-\d{5}-([0-9A-F]{2})+-[0-9A-F]{4}$/);
});

it("keeps a copy under its PID key and its Gen 1 key when Black 2 sends it to Red", { timeout: 300_000 }, async ({ skip }) => {
  needs(skip, saves.black2, saves.red);
  const engine = newEngine();
  const host = memoryHost();
  const start = await kantoPokemon(engine);
  const original = await engine.pokemon.details(start.at);
  const exported = await engine.pokemon.export(start.at);

  const { plan, moved } = await send(engine, host, start, saves.red, "Black 2");

  await engine.game.load(moved.bytes);
  const alias = copyKey(await engine.pokemon.details(moved.at), 1);
  const copy = { identityKey: copyKey(original, 5), generation: 5, game: "Black 2", bytes: exported.bytes, aliases: [alias] };
  expect(host.kept.get(copy.identityKey)).toEqual(copy);
  expect(host.kept.get(alias)).toEqual(copy);
  expect(noteFor(plan.notes, start.at)?.keptFrom).toBe("Black 2");
});

it("restores what Crystal holds from the copy when the Pokémon moves on from Red untouched", { timeout: 300_000 }, async ({ skip }) => {
  needs(skip, saves.black2, saves.red, saves.crystal);
  const engine = newEngine();
  const host = memoryHost();
  const start = await kantoPokemon(engine);
  const copy = (await engine.pokemon.export(start.at)).bytes;
  const { moved: inRed } = await send(engine, host, start, saves.red, "Black 2");

  const { plan, moved } = await send(engine, host, inRed, saves.crystal, "Red");

  await engine.game.load(inRed.bytes);
  await engine.transfer.open(readFileSync(saves.crystal));
  const expected = await engine.transfer.convert({ bytes: copy, generation: 5 }, "partner");
  await engine.game.load(moved.bytes);
  expect(moveIds((await engine.pokemon.details(moved.at)).moves)).toEqual(moveIds(expected.pokemon.moves));
  expect(noteFor(plan.notes, inRed.at)?.restored).toEqual({ game: "Black 2", patched: [] });
});

it("keeps a move taught in Red and restores the rest from the copy", { timeout: 300_000 }, async ({ skip }) => {
  needs(skip, saves.black2, saves.red, saves.crystal);
  const engine = newEngine();
  const host = memoryHost();
  const start = await kantoPokemon(engine);
  const copy = (await engine.pokemon.export(start.at)).bytes;
  const { moved: sent } = await send(engine, host, start, saves.red, "Black 2");
  await engine.game.load(sent.bytes);
  const known = moveIds((await engine.pokemon.details(sent.at)).moves);
  const taught = [known.includes(33) ? 1 : 33, 0, 0, 0];
  await engine.pokemon.update(sent.at, { moves: taught });
  const inRed = { bytes: (await engine.game.export()).bytes, at: sent.at };

  const { plan, moved } = await send(engine, host, inRed, saves.crystal, "Red");

  await engine.game.load(inRed.bytes);
  await engine.transfer.open(readFileSync(saves.crystal));
  const { pokemon: expected } = await engine.transfer.convert({ bytes: copy, generation: 5 }, "partner");
  await engine.game.load(moved.bytes);
  const arrived = await engine.pokemon.details(moved.at);
  expect(moveIds(arrived.moves)).toEqual(taught);
  const { species, form, level, nickname, heldItem, friendship, ivs, evs, originalTrainerName, trainerId } = expected;
  expect(arrived).toMatchObject({ species, form, level, nickname, heldItem, friendship, ivs, evs, originalTrainerName, trainerId });
  expect(noteFor(plan.notes, inRed.at)?.restored?.patched).toEqual(["moves"]);
});

it("restores nothing through an ambiguous marker and flags the card", { timeout: 300_000 }, async ({ skip }) => {
  needs(skip, saves.red, saves.crystal);
  const engine = newEngine();
  const host = memoryHost();
  await engine.game.load(readFileSync(saves.red));
  const [first] = await engine.party.get();
  const key = copyKey(await engine.pokemon.details(first.at), 1);
  host.kept.set(key, { identityKey: key, generation: 0, game: "", bytes: new Uint8Array(), ambiguous: true });
  await engine.transfer.open(readFileSync(saves.crystal));

  const plan = await planTransfer(engine, host, [first.at], "Red");

  expect(plan.offer.arrivals).toEqual([]);
  expect(noteFor(plan.notes, first.at)?.ambiguous).toBe(true);
});
