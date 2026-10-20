// @vitest-environment node
import { createEngine, wasmHost } from "@pkhex-everywhere/engine";
import { expect, it } from "vitest";
import { openGameMemory } from "@/game-memory/gameMemory";
import colosseumOverworld from "@/game-memory/snapshots/colosseum-overworld.json";
import emeraldOverworld from "@/game-memory/snapshots/emerald-overworld.json";
import { hex, snapshotMemory, snapshotSystem } from "@/game-memory/snapshots/snapshotMemory";
import xdOverworld from "@/game-memory/snapshots/xd-overworld.json";
import { createPokemonInfo } from "./pokemonInfo";

const dotnet = new URL("../../node_modules/@pkhex-everywhere/engine/_framework/dotnet.js", import.meta.url).href;
const emeraldParty = 0x020244ec;
const levelOffset = 0x54;

// A randomizer that changes growth rates makes the level worked out from EXP differ from the one the game stores.
it("reads the level the game stores, not the one worked out from EXP", { timeout: 300_000 }, async () => {
  const memory = emeraldOverworld.memory.map((range) => {
    if (Number(range.address) !== emeraldParty) return range;
    const bytes = hex(range.bytes);
    bytes[levelOffset] = 42;
    return { ...range, bytes: Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("") };
  });
  const game = await openGameMemory("gba", snapshotMemory({ ...emeraldOverworld, memory }));
  if (game === "unsupported") throw new Error("unsupported");
  const engine = createEngine({ host: wasmHost({ dotnetUrl: dotnet, load: (url) => import(/* @vite-ignore */ url) }) });

  const read = await createPokemonInfo(game, engine).read("all");

  expect(read.party[0]).toMatchObject({ state: "read", pokemon: { species: "Torchic", level: 42 } });
});

it.each([
  ["Colosseum", colosseumOverworld, [{ species: "Umbreon", level: 26 }, { species: "Espeon", level: 25 }]],
  ["XD", xdOverworld, [{ species: "Eevee", level: 10 }]],
])("names the party %s keeps in RAM", { timeout: 300_000 }, async (_, snapshot, party) => {
  const game = await openGameMemory(snapshotSystem(snapshot), snapshotMemory(snapshot));
  if (game === "unsupported") throw new Error("unsupported");
  const engine = createEngine({ host: wasmHost({ dotnetUrl: dotnet, load: (url) => import(/* @vite-ignore */ url) }) });

  const read = await createPokemonInfo(game, engine).read("all");

  expect(read.party).toMatchObject(party.map((pokemon) => ({ state: "read", pokemon })));
});
