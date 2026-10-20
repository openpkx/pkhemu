import { expect, it } from "vitest";
import { openGameMemory } from "./gameMemory";
import blackAfterBattle from "./snapshots/black-after-battle.json";
import blackOverworld from "./snapshots/black-overworld.json";
import blackWild from "./snapshots/black-wild.json";
import black2AfterBattle from "./snapshots/black2-after-battle.json";
import black2Overworld from "./snapshots/black2-overworld.json";
import black2Wild from "./snapshots/black2-wild.json";
import colosseumMenu from "./snapshots/colosseum-menu.json";
import colosseumOverworld from "./snapshots/colosseum-overworld.json";
import diamondAfterBattle from "./snapshots/diamond-after-battle.json";
import diamondOverworld from "./snapshots/diamond-overworld.json";
import diamondWild from "./snapshots/diamond-wild.json";
import emeraldDouble from "./snapshots/emerald-double.json";
import emeraldDoubleOneFainted from "./snapshots/emerald-double-one-fainted.json";
import emeraldOverworld from "./snapshots/emerald-overworld.json";
import emeraldTrainer from "./snapshots/emerald-trainer.json";
import emeraldWild from "./snapshots/emerald-wild.json";
import fireRed10AfterBattle from "./snapshots/firered-1.0-after-battle.json";
import fireRed10Wild from "./snapshots/firered-1.0-wild.json";
import fireRed11Overworld from "./snapshots/firered-1.1-overworld.json";
import fireRed11Wild from "./snapshots/firered-1.1-wild.json";
import heartGoldAfterBattle from "./snapshots/heartgold-after-battle.json";
import heartGoldOverworld from "./snapshots/heartgold-overworld.json";
import heartGoldWild from "./snapshots/heartgold-wild.json";
import heartGoldWildFainted from "./snapshots/heartgold-wild-fainted.json";
import pearlAfterBattle from "./snapshots/pearl-after-battle.json";
import pearlOverworld from "./snapshots/pearl-overworld.json";
import pearlWild from "./snapshots/pearl-wild.json";
import platinumAfterBattle from "./snapshots/platinum-after-battle.json";
import platinumOverworld from "./snapshots/platinum-overworld.json";
import platinumWild from "./snapshots/platinum-wild.json";
import rubyAfterBattle from "./snapshots/ruby-after-battle.json";
import rubyOverworld from "./snapshots/ruby-overworld.json";
import rubyWild from "./snapshots/ruby-wild.json";
import sapphireAfterBattle from "./snapshots/sapphire-after-battle.json";
import sapphireOverworld from "./snapshots/sapphire-overworld.json";
import sapphireTrainer from "./snapshots/sapphire-trainer.json";
import sapphireWild from "./snapshots/sapphire-wild.json";
import soulSilverAfterBattle from "./snapshots/soulsilver-after-battle.json";
import soulSilverOverworld from "./snapshots/soulsilver-overworld.json";
import soulSilverWild from "./snapshots/soulsilver-wild.json";
import white2AfterBattle from "./snapshots/white2-after-battle.json";
import white2Overworld from "./snapshots/white2-overworld.json";
import white2Wild from "./snapshots/white2-wild.json";
import white2WildFainted from "./snapshots/white2-wild-fainted.json";
import whiteAfterBattle from "./snapshots/white-after-battle.json";
import whiteOverworld from "./snapshots/white-overworld.json";
import whiteWild from "./snapshots/white-wild.json";
import whiteWildFainted from "./snapshots/white-wild-fainted.json";
import xdOverworld from "./snapshots/xd-overworld.json";
import xdTitle from "./snapshots/xd-title.json";
import {
  gen3Nickname as nickname,
  dsSpecies as species,
  gameCubeNickname,
  hex,
  snapshotMemory,
  snapshotSystem,
  type Snapshot,
} from "./snapshots/snapshotMemory";

async function factsOf(snapshot: Snapshot) {
  const game = await openGameMemory(snapshotSystem(snapshot), snapshotMemory(snapshot));
  if (game === "unsupported") throw new Error(`${snapshot.build} is unsupported`);
  return game.read();
}

it.each([
  ["Emerald", emeraldOverworld, ["TORCHIC", "WURMPLE", "WINGULL"]],
  ["Ruby", rubyOverworld, ["FLYGON", "SWAMPERT", "SCEPTILE", "COMBUSKEN"]],
  ["Sapphire", sapphireOverworld, ["RAYQUAZA", "METAGROSS", "ESPEON", "SEVIPER", "UMBREON"]],
])("reads the party outside battle in %s", async (_, snapshot, party) => {
  const facts = await factsOf(snapshot);

  expect(facts.party.map(nickname)).toEqual(party);
  expect(facts.battle).toBeNull();
});

it.each([
  ["Diamond", diamondOverworld, [466, 229, 389, 107, 260, 373]],
  ["Pearl", pearlOverworld, [396, 493, 490]],
  ["Platinum", platinumOverworld, [93, 466, 376, 6, 248, 405]],
  ["SoulSilver", soulSilverOverworld, [65, 195, 181, 157, 169, 76]],
])("reads a DS game's party from its save data in %s", async (_, snapshot, party) => {
  const facts = await factsOf(snapshot);

  expect(facts.party.map(species)).toEqual(party);
  expect(facts.party.every((pokemon) => pokemon.length === 236)).toBe(true);
  expect(facts.battle).toBeNull();
});

// Black loads the White save and Black 2 the White 2 one.
const white2Party = [521, 553, 500, 181, 638, 279];
const whiteParty = [644, 515, 553, 538, 555, 497];

it.each([
  ["Black 2", black2Overworld, white2Party],
  ["White 2", white2Overworld, white2Party],
  ["Black", blackOverworld, whiteParty],
  ["White", whiteOverworld, whiteParty],
])("reads a Gen 5 party in %s", async (_, snapshot, party) => {
  const facts = await factsOf(snapshot);

  expect(facts.party.map(species)).toEqual(party);
  expect(facts.party.every((pokemon) => pokemon.length === 220)).toBe(true);
  expect(facts.battle).toBeNull();
});

it.each([
  ["Colosseum", colosseumOverworld, ["UMBREON", "ESPEON"], 312],
  ["XD", xdOverworld, ["EEVEE"], 196],
])("reads the party from the save the game keeps in RAM in %s", async (_, snapshot, party, size) => {
  const facts = await factsOf(snapshot);

  expect(facts.party.map(gameCubeNickname)).toEqual(party);
  expect(facts.party.every((pokemon) => pokemon.length === size)).toBe(true);
  expect(facts.battle).toBeNull();
});

// The game puts its save elsewhere on each boot, and keeps the starter party there before a story begins.
it.each([
  ["Colosseum", colosseumMenu, ["UMBREON", "ESPEON"]],
  ["XD", xdTitle, ["EEVEE"]],
])("follows %s's save to wherever this boot put it", async (_, snapshot, party) => {
  const facts = await factsOf(snapshot);

  expect(facts.party.map(gameCubeNickname)).toEqual(party);
});

it("has no party while the game boots, before it points at its save", async () => {
  const booting = { 0x80000000: [..."GC6P"].map((c) => c.charCodeAt(0)), 0x80000007: [0], 0x804c8268: [0, 0, 0, 0] };
  const read = async (ranges: { address: number; length: number }[]) =>
    Uint8Array.from(ranges.flatMap(({ address }) => booting[address as keyof typeof booting]));
  const game = await openGameMemory("gc", read);
  if (game === "unsupported") throw new Error("unsupported");

  expect(await game.read()).toMatchObject({ party: [], battle: null });
});

it("keeps each Pokémon as the game stores it, encrypted", async () => {
  const party = hex(emeraldOverworld.memory.find((range) => range.address === "0x020244ec")!.bytes);

  const facts = await factsOf(emeraldOverworld);

  expect(facts.party[0]).toEqual(party.subarray(0, 100));
});

it.each([
  ["Emerald", emeraldWild, "POOCHYENA"],
  ["FireRed 1.0", fireRed10Wild, "PIDGEY"],
  ["FireRed 1.1", fireRed11Wild, "PIDGEY"],
  ["Ruby", rubyWild, "ZIGZAGOON"],
  ["Sapphire", sapphireWild, "WURMPLE"],
])("reads a wild battle in %s", async (_, snapshot, opponent) => {
  const { battle } = await factsOf(snapshot);

  expect(battle?.kind).toBe("wild");
  expect(battle?.opponents.map(nickname)).toEqual([opponent]);
  expect(battle?.left).toBe(1);
});

it.each([
  ["Diamond", diamondWild, 396],
  ["Pearl", pearlWild, 396],
  ["Platinum", platinumWild, 396],
  ["HeartGold", heartGoldWild, 10],
  ["SoulSilver", soulSilverWild, 19],
])("reads a wild battle in %s", async (_, snapshot, opponent) => {
  const { battle } = await factsOf(snapshot);

  expect(battle?.kind).toBe("wild");
  expect(battle?.opponents.map(species)).toEqual([opponent]);
  expect(battle?.left).toBe(1);
});

it.each([
  ["Diamond", diamondWild, [466, 229, 389, 107, 260, 373]],
  ["Pearl", pearlWild, [396, 493, 490]],
  ["Platinum", platinumWild, [93, 466, 376, 6, 248, 405]],
  ["HeartGold", heartGoldWild, [154, 181, 197, 164, 195, 20]],
  ["SoulSilver", soulSilverWild, [65, 195, 181, 157, 169, 76]],
])("reads a DS game's party from the battle's own copy during a battle in %s", async (_, snapshot, party) => {
  const facts = await factsOf(snapshot);

  expect(facts.party.map(species)).toEqual(party);
});

it.each([
  ["Black 2", black2Wild, 504, white2Party],
  ["White 2", white2Wild, 509, white2Party],
  ["Black", blackWild, 506, whiteParty],
  ["White", whiteWild, 504, whiteParty],
])("reads a wild battle from the battle's table in %s", async (_, snapshot, opponent, party) => {
  const facts = await factsOf(snapshot);

  expect(facts.battle?.kind).toBe("wild");
  expect(facts.battle?.opponents.map(species)).toEqual([opponent]);
  expect(facts.battle?.left).toBe(1);
  expect(facts.party.map(species)).toEqual(party);
});

it.each([
  ["HeartGold", heartGoldWildFainted],
  ["White 2", white2WildFainted],
  ["White", whiteWildFainted],
])("has no opponent left once the wild one faints, though the battle goes on in %s", async (_, snapshot) => {
  const { battle } = await factsOf(snapshot);

  expect(battle?.opponents).toEqual([]);
  expect(battle?.left).toBe(0);
});

it.each([
  ["Emerald", emeraldTrainer, "POOCHYENA"],
  ["Sapphire", sapphireTrainer, "LINOONE"],
])("reads a trainer battle in %s", async (_, snapshot, opponent) => {
  const { battle } = await factsOf(snapshot);

  expect(battle?.kind).toBe("trainer");
  expect(battle?.opponents.map(nickname)).toEqual([opponent]);
  expect(battle?.left).toBe(1);
});

it("reads both opponents in a double battle", async () => {
  const { battle } = await factsOf(emeraldDouble);

  expect(battle?.kind).toBe("trainer");
  expect(battle?.opponents.map(nickname)).toEqual(["SEEDOT", "LOTAD"]);
  expect(battle?.left).toBe(2);
});

it("drops a fainted opponent that left the field", async () => {
  const { battle } = await factsOf(emeraldDoubleOneFainted);

  expect(battle?.opponents.map(nickname)).toEqual(["LOTAD"]);
  expect(battle?.left).toBe(1);
});

it("has no battle once it ends, though the last opponent stays in memory", async () => {
  const facts = await factsOf(fireRed10AfterBattle);

  expect(facts.party.map(nickname)).toEqual(["CHARMANDER"]);
  expect(facts.battle).toBeNull();
});

it.each([
  ["Ruby", rubyAfterBattle],
  ["Sapphire", sapphireAfterBattle],
  ["Diamond", diamondAfterBattle],
  ["Pearl", pearlAfterBattle],
  ["Platinum", platinumAfterBattle],
  ["SoulSilver", soulSilverAfterBattle],
  ["Black 2", black2AfterBattle],
  ["White 2", white2AfterBattle],
  ["Black", blackAfterBattle],
  ["White", whiteAfterBattle],
])("has no battle once it ends in %s", async (_, snapshot) => {
  expect((await factsOf(snapshot)).battle).toBeNull();
});

it("has no battle once a DS battle ends", async () => {
  const facts = await factsOf(heartGoldAfterBattle);

  expect(facts.party.map(species)).toEqual([154, 181, 197, 164, 195, 20]);
  expect(facts.battle).toBeNull();
});

it.each([
  ["Emerald EN", emeraldOverworld, 3],
  ["FireRed EN 1.0", fireRed10Wild, 4],
  ["FireRed EN 1.1", fireRed11Overworld, 4],
  ["Ruby EN 1.1", rubyOverworld, 2],
  ["Sapphire EN 1.2", sapphireOverworld, 1],
])("names %s and its PKHeX game version", async (build, snapshot, version) => {
  expect(await factsOf(snapshot)).toMatchObject({ build, format: "pk3", version });
});

it.each([
  ["Diamond EU", diamondOverworld, 10],
  ["Pearl EU", pearlOverworld, 11],
  ["Platinum US", platinumOverworld, 12],
  ["HeartGold US", heartGoldOverworld, 7],
  ["SoulSilver US", soulSilverOverworld, 8],
])("names %s, its PKHeX game version and the Gen 4 format", async (build, snapshot, version) => {
  expect(await factsOf(snapshot)).toMatchObject({ build, format: "pk4", version });
});

it.each([
  ["Black 2 EN", black2Overworld, 23],
  ["White 2 EN", white2Overworld, 22],
  ["Black EN", blackOverworld, 21],
  ["White EN", whiteOverworld, 20],
])("names %s, its PKHeX game version and the Gen 5 format", async (build, snapshot, version) => {
  expect(await factsOf(snapshot)).toMatchObject({ build, format: "pk5", version });
});

it.each([
  ["Colosseum EU", colosseumOverworld, 62, "ck3"],
  ["XD EU", xdOverworld, 63, "xk3"],
])("names %s, its PKHeX game version and its GameCube format", async (build, snapshot, version, format) => {
  expect(await factsOf(snapshot)).toMatchObject({ build, format, version });
});

it("reports a build it has no addresses for as unsupported", async () => {
  const read = async () => Uint8Array.from([..."BPRF"].map((c) => c.charCodeAt(0)).concat(0));

  expect(await openGameMemory("gba", read)).toBe("unsupported");
});
