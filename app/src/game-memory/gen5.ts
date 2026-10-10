import type { Gen5Addresses, ReadMemory } from "./builds";
import type { Battle } from "./gameMemory";
import { PARTY_SIZE, readEach, readNamed, slots, u32, view } from "./memory";

const POKEMON_SIZE = 220;
const PARTY_LENGTH = 4 + PARTY_SIZE * POKEMON_SIZE;
const IN_BATTLE = [0x2100, 0x2101];
// Each battle client holds `BattleMon* mons[6]` and a u8 count. Clients 1 and 3 are the enemy's.
const CLIENT_SIZE = 0x1c;
const CLIENT_COUNT = 0x18;
const ENEMY_CLIENTS = [1, 3];
const TABLE_LENGTH = 4 * CLIENT_SIZE;
// A BattleMon starts with a pointer to its party Pokémon and keeps its current HP at 0x10, unencrypted.
const BATTLE_MON_LENGTH = 0x12;
const BATTLE_MON_HP = 0x10;
// Field sizes of single, double, triple and rotation battles. Switching swaps a client's BattleMons, so the field ones come first.
const ON_FIELD = [1, 2, 3, 3];
const MAIN_RAM = { start: 0x02000000, end: 0x02400000 };

type BattleMemory = Record<"enemyTrainer" | "battleStyle" | "battleTable", Uint8Array>;

export async function readGen5(addresses: Gen5Addresses, read: ReadMemory) {
  const [battleStatus, pointer] = await readEach(read, [
    { address: addresses.battleStatus, length: 2 },
    ...(addresses.basePointer === undefined ? [] : [{ address: addresses.basePointer, length: 4 }]),
  ]);
  const base = pointer ? u32(pointer) : 0;
  const party = { address: base + addresses.party, length: PARTY_LENGTH };
  if (!IN_BATTLE.includes(view(battleStatus).getUint16(0, true))) {
    const memory = await readNamed(read, { party });
    return { party: members(memory.party), battle: null };
  }
  // The battle works on its own copy of the party and leaves this one in place.
  const memory = await readNamed(read, {
    party,
    enemyTrainer: { address: base + addresses.enemyTrainer, length: 2 },
    battleStyle: { address: base + addresses.battleStyle, length: 1 },
    battleTable: { address: base + addresses.battleTable, length: TABLE_LENGTH },
  });
  return { party: members(memory.party), battle: await battle(memory, read) };
}

async function battle(memory: BattleMemory, read: ReadMemory): Promise<Battle> {
  const table = view(memory.battleTable);
  const clients = ENEMY_CLIENTS.map((client) => {
    const count = Math.min(memory.battleTable[client * CLIENT_SIZE + CLIENT_COUNT], PARTY_SIZE);
    return Array.from({ length: count }, (_, slot) => table.getUint32(client * CLIENT_SIZE + slot * 4, true));
  }).filter((client) => client.length > 0);
  // A multi battle splits the enemy's field between two clients.
  const fieldPerClient = Math.ceil((ON_FIELD[memory.battleStyle[0]] ?? 1) / Math.max(clients.length, 1));
  const enemies = clients
    .flatMap((client) => client.map((pointer, slot) => ({ pointer, onField: slot < fieldPerClient })))
    .filter(({ pointer }) => inMainRam(pointer, BATTLE_MON_LENGTH));
  const mons = await readEach(read, enemies.map(({ pointer }) => ({ address: pointer, length: BATTLE_MON_LENGTH })));
  const alive = (mon: Uint8Array) => view(mon).getUint16(BATTLE_MON_HP, true) > 0;
  const sources = mons
    .filter((mon, i) => enemies[i].onField && alive(mon))
    .map(u32)
    .filter((pointer) => inMainRam(pointer, POKEMON_SIZE));
  return {
    kind: view(memory.enemyTrainer).getUint16(0, true) === 0 ? "wild" : "trainer",
    opponents: await readEach(read, sources.map((address) => ({ address, length: POKEMON_SIZE }))),
    left: mons.filter(alive).length,
  };
}

function members(party: Uint8Array) {
  return slots(party.subarray(4), POKEMON_SIZE).slice(0, Math.min(u32(party), PARTY_SIZE));
}

function inMainRam(address: number, length: number) {
  return address >= MAIN_RAM.start && address + length <= MAIN_RAM.end;
}
