import { expect, it } from "vitest";
import { fakeEngine, type FakeEngineSave } from "@/editor/fakeEngine";
import { openGameMemory } from "@/game-memory/gameMemory";
import emeraldDouble from "@/game-memory/snapshots/emerald-double.json";
import emeraldOverworld from "@/game-memory/snapshots/emerald-overworld.json";
import emeraldWild from "@/game-memory/snapshots/emerald-wild.json";
import { snapshotMemory, type Snapshot } from "@/game-memory/snapshots/snapshotMemory";
import { createPokemonInfo } from "./pokemonInfo";
import type { GameMemory } from "@/game-memory/gameMemory";

const species = [
  { id: 255, name: "Torchic" },
  { id: 265, name: "Wurmple" },
  { id: 278, name: "Wingull" },
  { id: 261, name: "Poochyena" },
  { id: 273, name: "Seedot" },
  { id: 270, name: "Lotad" },
];

const inMemory: FakeEngineSave["inMemory"] = {
  TORCHIC: { species: 255, level: 9, heldItem: 234 },
  WURMPLE: { species: 265, level: 4 },
  WINGULL: { species: 278, level: 5 },
  POOCHYENA: { species: 261, level: 3, isShiny: true, nature: 3, ability: 22, ivs: { health: 31, attack: 31, defense: 28, specialAttack: 1, specialDefense: 2, speed: 3 } },
  SEEDOT: { species: 273, level: 4 },
  LOTAD: { species: 270, level: 4 },
};

async function liveInfo(snapshot: Snapshot, save: FakeEngineSave = { species, inMemory }, formatId?: string) {
  const memory = await openGameMemory("gba", snapshotMemory(snapshot));
  if (memory === "unsupported") throw new Error("unsupported");
  const fake = fakeEngine(save);
  return { ...fake, info: createPokemonInfo(memory, fake.engine, formatId) };
}

const unbound = { id: "unbound", species: [{ id: 62146, name: "Shadow Warrior" }] };

const shownSpecies = (shown: { state: string; pokemon?: { species: string } }[]) =>
  shown.map((card) => (card.state === "read" ? card.pokemon!.species : card.state));

it("names the party outside battle", async () => {
  const { info } = await liveInfo(emeraldOverworld);

  const read = await info.read("all");

  expect(shownSpecies(read.party)).toEqual(["Torchic", "Wurmple", "Wingull"]);
  expect(read.party[0]).toMatchObject({ state: "read", pokemon: { level: 9, heldItem: "Leftovers", moves: ["Tackle"] } });
  expect(read.party[1]).toMatchObject({ state: "read", pokemon: { heldItem: null } });
  expect(read.battle).toBeNull();
});

it("shows a wild opponent", async () => {
  const { info } = await liveInfo(emeraldWild);

  const { battle } = await info.read("all");

  expect(battle).toMatchObject({ kind: "wild", left: 1 });
  expect(battle?.opponents[0]).toMatchObject({
    state: "read",
    pokemon: { species: "Poochyena", isShiny: true, ivs: { health: 31, attack: 31, defense: 28 } },
  });
});

it("names the nature and ability", async () => {
  const { info } = await liveInfo(emeraldWild);

  const { battle } = await info.read("all");

  expect(battle?.opponents[0]).toMatchObject({ state: "read", pokemon: { nature: "Adamant", ability: "Intimidate" } });
});

it("shows both opponents in a double battle", async () => {
  const { info } = await liveInfo(emeraldDouble);

  const { battle } = await info.read("all");

  expect(shownSpecies(battle!.opponents)).toEqual(["Seedot", "Lotad"]);
});

it("marks a Pokémon the engine can't read", async () => {
  const { info } = await liveInfo(emeraldOverworld, { species, inMemory: { TORCHIC: inMemory!.TORCHIC } });

  const { party } = await info.read("all");

  expect(shownSpecies(party)).toEqual(["Torchic", "unreadable", "unreadable"]);
});

it("reads with the build's game version", async () => {
  const { info, reads } = await liveInfo(emeraldWild);

  await info.read("all");

  expect(new Set(reads())).toEqual(new Set([3]));
});

it("leaves the party out when only the battle is wanted", async () => {
  const { info, reads } = await liveInfo(emeraldWild);

  const read = await info.read("battle");

  expect(read.party).toEqual([]);
  expect(reads()).toHaveLength(1);
});

it("doesn't decode the same Pokémon twice", async () => {
  const { info, reads } = await liveInfo(emeraldOverworld);

  await info.read("all");
  await info.read("all");

  expect(reads()).toHaveLength(3);
});

it("reads a ROM hack's party and opponents with its format", async () => {
  const { info } = await liveInfo(emeraldWild, { species, inMemory, memoryFormat: unbound }, "unbound");

  const { party, battle } = await info.read("all");

  expect(shownSpecies(party)).toEqual(["Torchic", "Wurmple", "Wingull"]);
  expect(shownSpecies(battle!.opponents)).toEqual(["Poochyena"]);
});

it("names a ROM hack's own species with its format", async () => {
  const { info } = await liveInfo(emeraldWild, { species, inMemory: { ...inMemory, POOCHYENA: { species: 62146 } }, memoryFormat: unbound }, "unbound");

  const { battle } = await info.read("battle");

  expect(shownSpecies(battle!.opponents)).toEqual(["Shadow Warrior"]);
});

it("can't read a ROM hack's Pokémon without its format", async () => {
  const { info } = await liveInfo(emeraldOverworld, { species, inMemory, memoryFormat: unbound });

  const { party } = await info.read("all");

  expect(shownSpecies(party)).toEqual(["unreadable", "unreadable", "unreadable"]);
});

it("reads the original game's Pokémon without a ROM hack format", async () => {
  const { info } = await liveInfo(emeraldOverworld, { species, inMemory }, "pkhex");

  const { party } = await info.read("all");

  expect(shownSpecies(party)).toEqual(["Torchic", "Wurmple", "Wingull"]);
});

async function flickeringInfo(misses: number) {
  const memory = await openGameMemory("gba", snapshotMemory(emeraldOverworld));
  if (memory === "unsupported") throw new Error("unsupported");
  let reads = 0;
  const flickering: GameMemory = {
    build: memory.build,
    read: async () => {
      const facts = await memory.read();
      reads += 1;
      if (reads > 1 && reads <= 1 + misses) facts.party[0] = new Uint8Array(facts.party[0].length);
      return facts;
    },
  };
  return createPokemonInfo(flickering, fakeEngine({ species, inMemory }).engine);
}

it("keeps a Pokémon's last reading through a few failed reads", async () => {
  const info = await flickeringInfo(3);

  await info.read("all");
  const reads = [await info.read("all"), await info.read("all"), await info.read("all")];

  expect(reads.map(({ party }) => shownSpecies(party)[0])).toEqual(["Torchic", "Torchic", "Torchic"]);
});

it("marks a Pokémon unreadable once its reads keep failing", async () => {
  const info = await flickeringInfo(4);

  for (let read = 0; read < 4; read++) await info.read("all");
  const { party } = await info.read("all");

  expect(shownSpecies(party)[0]).toBe("unreadable");
});
