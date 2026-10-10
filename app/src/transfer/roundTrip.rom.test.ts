// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createEngine, wasmHost, type Engine, type PokemonHandle } from "@pkhex-everywhere/engine";
import { expect, it, type TestContext } from "vitest";
import { commitTransfer, planTransfer, type KeptCopyHost, type StoredCopy } from "./keptCopies";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const saves = {
  black2: `${repo}data/saves/black2.sav`,
  red: `${repo}data/saves/pksav-pokemon_red.sav`,
  crystal: `${repo}data/saves/crystal.sav`,
  fireRed: `${repo}data/saves/firered.sav`,
  soulSilver: `${repo}data/saves/soulsilver.sav`,
  white: `${repo}data/saves/white.sav`,
};
const dotnet = new URL("../../node_modules/@pkhex-everywhere/engine/_framework/dotnet.js", import.meta.url).href;

const growth = 74;

const stops = [
  { game: "Black 2", save: saves.black2 },
  { game: "Red", save: saves.red },
  { game: "Crystal", save: saves.crystal },
  { game: "FireRed", save: saves.fireRed },
  { game: "SoulSilver", save: saves.soulSilver },
  { game: "White", save: saves.white },
  { game: "Black 2", save: saves.black2 },
];

function needsEverySave(skip: TestContext["skip"]) {
  const missing = Object.values(saves).filter((path) => !existsSync(path)).map((path) => path.slice(repo.length));
  if (missing.length) skip(`needs ${missing.join(", ")}, with a Kanto Pokémon boxed in Black 2`);
}

function memoryHost(): KeptCopyHost {
  const kept = new Map<string, StoredCopy>();
  return {
    keptCopies: async (keys) => keys.flatMap((key) => kept.get(key) ?? []),
    keepCopies: async (copies) => {
      for (const copy of copies) for (const key of [copy.identityKey, ...(copy.aliases ?? [])]) kept.set(key, copy);
    },
  };
}

type Moved = { bytes: Uint8Array; at: PokemonHandle };

async function send(engine: Engine, host: KeptCopyHost, { bytes, at }: Moved, partner: string, game: string): Promise<Moved> {
  await engine.game.load(bytes);
  await engine.transfer.open(readFileSync(partner));
  const plan = await planTransfer(engine, host, [at], game);
  expect((await engine.transfer.preview(plan.offer)).refused).toEqual([]);
  const { result, keep } = await commitTransfer(engine, host, plan);
  await keep();
  await engine.transfer.close();
  return { bytes: result.partner.bytes, at: result.arrived[0].at };
}

async function roundTrip(engine: Engine, playInRed: (inRed: Moved) => Promise<Moved> = async (inRed) => inRed) {
  const host = memoryHost();
  const black2 = readFileSync(saves.black2);
  await engine.game.load(black2);
  const picked = (await engine.box.get()).find(({ isEgg, speciesId }) => !isEgg && speciesId !== null && speciesId >= 1 && speciesId <= 151);
  expect(picked).toBeDefined();
  const original = await engine.pokemon.details(picked!.at);

  let moved: Moved = { bytes: black2, at: picked!.at };
  for (const [index, { game }] of stops.slice(0, -1).entries()) {
    const next = stops[index + 1];
    moved = await send(engine, host, moved, next.save, game);
    if (next.game === "Red") moved = await playInRed(moved);
  }
  await engine.game.load(moved.bytes);
  return { original, back: await engine.pokemon.details(moved.at) };
}

const newEngine = () => createEngine({ host: wasmHost({ dotnetUrl: dotnet, load: (url) => import(/* @vite-ignore */ url) }) });

it("brings a Pokémon back to Black 2 as it left after a trip down to Red with no play", { timeout: 600_000 }, async ({ skip }) => {
  needsEverySave(skip);

  const { original, back } = await roundTrip(newEngine());

  expect(back).toEqual(original);
});

it("keeps the moves set in Red and brings back everything else", { timeout: 600_000 }, async ({ skip }) => {
  needsEverySave(skip);
  const engine = newEngine();

  const { original, back } = await roundTrip(engine, async (inRed) => {
    await engine.game.load(inRed.bytes);
    await engine.pokemon.update(inRed.at, { moves: [growth, 0, 0, 0] });
    return { bytes: (await engine.game.export()).bytes, at: inRed.at };
  });

  const { moves, ...rest } = back;
  const { moves: _, ...left } = original;
  expect(moves.map(({ id }) => id)).toEqual([growth, 0, 0, 0]);
  expect(rest).toEqual(left);
});
