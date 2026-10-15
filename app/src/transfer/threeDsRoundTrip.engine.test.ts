// @vitest-environment node
import { createEngine, wasmHost, type EditablePokemon, type Engine, type PokemonHandle } from "@pkhex-everywhere/engine";
import { expect, it } from "vitest";
import { exportBlank } from "./blankSaveFixture";
import { commitTransfer, noteFor, planTransfer, type KeptCopyHost, type StoredCopy } from "./keptCopies";

const dotnet = new URL("../../node_modules/@pkhex-everywhere/engine/_framework/dotnet.js", import.meta.url).href;

const newEngine = () => createEngine({ host: wasmHost({ dotnetUrl: dotnet, load: (url) => import(/* @vite-ignore */ url) }) });

const versions = { red: 35, black: 21, x: 24, sun: 30 };
const threeDsGames = [
  { game: "Sun", version: versions.sun },
  { game: "X", version: versions.x },
];
const pikachu = 25;
const moonblast = 585;
const quickAttack = 98;
const boxSize = 0xe8;

function memoryHost(): KeptCopyHost {
  const kept = new Map<string, StoredCopy>();
  return {
    keptCopies: async (keys) => keys.flatMap((key) => kept.get(key) ?? []),
    keepCopies: async (copies) => {
      for (const copy of copies) for (const key of [copy.identityKey, ...(copy.aliases ?? [])]) kept.set(key, copy);
    },
  };
}

// The engine has no fields for ribbons, memories or Hyper Training, so these are set at their PK6 and PK7 offsets.
function withThreeDsExtras(file: Uint8Array, generation: number) {
  const bytes = file.slice();
  bytes.set([0x0f, 0x30, 0x01, 0x80], 0x30);
  bytes.set([1, 7, 4], 0xcb);
  bytes[0xd0] = 3;
  if (generation === 7) bytes[0xde] = 0b111111;
  const view = new DataView(bytes.buffer);
  let checksum = 0;
  for (let offset = 0x08; offset < boxSize; offset += 2) checksum += view.getUint16(offset, true);
  view.setUint16(0x06, checksum & 0xffff, true);
  return bytes;
}

async function departing(engine: Engine, version: number) {
  await engine.game.loadBlank(version);
  const encounter = (await engine.encounters.search(version, pikachu)).find(({ isEgg }) => !isEgg);
  const { at } = await engine.box.addEncounter(encounter!.index);
  await engine.pokemon.update(at, { moves: [moonblast, quickAttack, 0, 0] });
  const exported = await engine.pokemon.export(at);
  await engine.game.loadBlank(version);
  const added = await engine.box.addFromFile(withThreeDsExtras(exported.bytes, exported.generation));
  return { save: (await engine.game.export()).bytes, at: added.at, pokemon: (await engine.pokemon.export(added.at)).bytes };
}

type Moved = { save: Uint8Array; at: PokemonHandle };

async function send(engine: Engine, host: KeptCopyHost, { save, at }: Moved, partner: Uint8Array, game: string) {
  await engine.game.load(save);
  await engine.transfer.open(partner);
  const plan = await planTransfer(engine, host, [at], game);
  expect((await engine.transfer.preview(plan.offer)).refused).toEqual([]);
  const { result, keep } = await commitTransfer(engine, host, plan);
  await keep();
  await engine.transfer.close();
  return { plan, emptied: result.save.bytes, moved: { save: result.partner.bytes, at: result.arrived[0].at } };
}

type Trip = { via?: { game: string; version: number }; play?: (there: Moved) => Promise<Moved> };

async function roundTrip(engine: Engine, game: string, version: number, trip: Trip = {}) {
  const { via = { game: "Black", version: versions.black }, play = async (there: Moved) => there } = trip;
  const host = memoryHost();
  const start = await departing(engine, version);
  const there = await send(engine, host, start, await exportBlank(engine, via.version), game);
  await engine.game.load(there.moved.save);
  expect((await engine.pokemon.details(there.moved.at)).moves.map(({ id }) => id)).not.toContain(moonblast);
  const played = await play(there.moved);
  const back = await send(engine, host, played, there.emptied, via.game);
  await engine.game.load(back.moved.save);
  return { start, back: back.moved.at, restored: noteFor(back.plan.notes, played.at)?.restored };
}

it.each(threeDsGames)("brings a Pokémon back to $game as it left after a trip to Black with no play", { timeout: 300_000 }, async ({ game, version }) => {
  const engine = newEngine();

  const { start, back, restored } = await roundTrip(engine, game, version);

  expect((await engine.pokemon.export(back)).bytes).toEqual(start.pokemon);
  expect(restored).toEqual({ game, patched: [] });
});

it.each(threeDsGames)("keeps the level and nickname set in Black and brings back the rest as it left $game", { timeout: 300_000 }, async ({ game, version }) => {
  const engine = newEngine();
  let levelBefore = 0;

  const { start, back, restored } = await roundTrip(engine, game, version, {
    play: async (inBlack) => {
      await engine.game.load(inBlack.save);
      levelBefore = (await engine.pokemon.details(inBlack.at)).level;
      await engine.pokemon.update(inBlack.at, { level: 30, nickname: "Sparky" });
      return { save: (await engine.game.export()).bytes, at: inBlack.at };
    },
  });

  expect(await engine.pokemon.details(back)).toMatchObject({ level: 30, nickname: "Sparky" });
  expect(restored).toEqual({ game, patched: ["level", "nickname"] });
  await engine.pokemon.update(back, { level: levelBefore, nickname: "" });
  // Setting the level also fills in the party-only level byte, so compare the box data.
  expect((await engine.pokemon.export(back)).bytes.subarray(0, boxSize)).toEqual(start.pokemon.subarray(0, boxSize));
});

it("brings a Pokémon back to Sun from its kept copy after a trip to Red", { timeout: 300_000 }, async () => {
  const engine = newEngine();
  const traits = ({ ivs, nature, ability }: EditablePokemon) => ({ ivs, nature, ability });

  const { start, back, restored } = await roundTrip(engine, "Sun", versions.sun, { via: { game: "Red", version: versions.red } });

  expect(restored).toEqual({ game: "Sun", patched: [] });
  expect((await engine.pokemon.export(back)).bytes).toEqual(start.pokemon);
  const arrived = traits(await engine.pokemon.details(back));
  await engine.game.load(start.save);
  expect(arrived).toEqual(traits(await engine.pokemon.details(start.at)));
});
