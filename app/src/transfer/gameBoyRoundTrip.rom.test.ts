// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createEngine, wasmHost, type Engine, type PokemonHandle } from "@pkhex-everywhere/engine";
import { expect, it } from "vitest";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const saves = {
  black2: `${repo}data/saves/black2.sav`,
  red: `${repo}data/saves/pksav-pokemon_red.sav`,
  crystal: `${repo}data/saves/crystal.sav`,
  fireRed: `${repo}data/saves/firered.sav`,
};
const dotnet = new URL("../../node_modules/@pkhex-everywhere/engine/_framework/dotnet.js", import.meta.url).href;

type Moved = { bytes: Uint8Array; at: PokemonHandle };

async function transferTo(engine: Engine, { bytes, at }: Moved, partnerPath: string): Promise<Moved> {
  await engine.game.load(bytes);
  await engine.transfer.open(readFileSync(partnerPath));
  const offer = { send: [at], receive: [] };
  expect((await engine.transfer.preview(offer)).refused).toEqual([]);
  const result = await engine.transfer.commit(offer);
  await engine.transfer.close();
  return { bytes: result.partner.bytes, at: result.arrived[0].at };
}

it("keeps a Pokémon's trainer, language and legal EVs through Red and Crystal", { timeout: 300_000 }, async ({ skip }) => {
  const missing = Object.values(saves).filter((save) => !existsSync(save));
  const needed = missing.map((save) => save.slice(repo.length)).join(", ");
  if (missing.length) skip(`needs ${needed}, with a Kanto Pokémon boxed in Black 2`);
  const engine = createEngine({ host: wasmHost({ dotnetUrl: dotnet, load: (url) => import(/* @vite-ignore */ url) }) });

  const black2 = readFileSync(saves.black2);
  await engine.game.load(black2);
  const picked = (await engine.box.get()).find(
    ({ isEgg, speciesId }) => !isEgg && speciesId !== null && speciesId >= 1 && speciesId <= 151,
  );
  expect(picked).toBeDefined();
  const original = await engine.pokemon.details(picked!.at);

  const red = await transferTo(engine, { bytes: black2, at: picked!.at }, saves.red);
  const crystal = await transferTo(engine, red, saves.crystal);
  const fireRed = await transferTo(engine, crystal, saves.fireRed);

  await engine.game.load(fireRed.bytes);
  const arrived = await engine.pokemon.details(fireRed.at);
  expect(arrived.originalTrainerName).toBe(original.originalTrainerName.slice(0, 7));
  expect(arrived.language).toBe(original.language);
  expect(Object.values(arrived.evs).reduce((total, ev) => total + ev, 0)).toBe(0);
  expect(arrived.pid).not.toBe(0);
  expect(arrived.legality?.messages.filter((message) => /^(Language|EVs):/.test(message))).toEqual([]);
});
