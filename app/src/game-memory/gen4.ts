import type { Gen4Addresses, ReadMemory } from "./builds";
import type { Battle } from "./gameMemory";
import { PARTY_SIZE, readNamed, slots, u32, view } from "./memory";

const POKEMON_SIZE = 236;
const PARTY_LENGTH = 4 + PARTY_SIZE * POKEMON_SIZE;
// The values NDS-Ironmon-Tracker treats as in battle. Outside battle it reads 0x2800.
const IN_BATTLE = [0x2100, 0x2101];
// The battle keeps each battler in a 0xC0-byte struct, ordered player, enemy, player, enemy.
const NEXT_OPPONENT = 0x180;
const CURRENT_HP = 0x8e;

export async function readGen4(addresses: Gen4Addresses, read: ReadMemory) {
  const pointers = await readNamed(read, {
    battleStatus: { address: addresses.battleStatus, length: 2 },
    saveData: { address: addresses.saveData, length: 4 },
    battlePointer: { address: addresses.battlePointer, length: 4 },
  });
  if (!IN_BATTLE.includes(view(pointers.battleStatus).getUint16(0, true))) {
    const memory = await readNamed(read, { party: { address: u32(pointers.saveData) + addresses.party, length: PARTY_LENGTH } });
    return { party: members(memory.party), battle: null };
  }
  const base = u32(pointers.battlePointer);
  // The battle works on its own copy of the party and writes it back to the save data when it ends.
  const memory = await readNamed(read, {
    party: { address: base + addresses.battleParty, length: PARTY_LENGTH },
    enemyParty: { address: base + addresses.enemyParty, length: PARTY_LENGTH },
    enemyTrainer: { address: base + addresses.enemyTrainer, length: 2 },
    firstOpponent: { address: base + addresses.opponent, length: 4 },
    secondOpponent: { address: base + addresses.opponent + NEXT_OPPONENT, length: 4 },
  });
  return { party: members(memory.party), battle: battle(memory) };
}

function battle(memory: Record<"enemyParty" | "enemyTrainer" | "firstOpponent" | "secondOpponent", Uint8Array>): Battle {
  const enemies = members(memory.enemyParty).filter((pokemon) => currentHp(pokemon) > 0);
  const unmatched = [...enemies];
  const opponents = [memory.firstOpponent, memory.secondOpponent].flatMap((battler) => {
    const at = unmatched.findIndex((pokemon) => u32(pokemon) === u32(battler));
    return at < 0 ? [] : unmatched.splice(at, 1);
  });
  return {
    kind: view(memory.enemyTrainer).getUint16(0, true) === 0 ? "wild" : "trainer",
    opponents,
    left: enemies.length,
  };
}

function members(party: Uint8Array) {
  return slots(party.subarray(4), POKEMON_SIZE).slice(0, Math.min(u32(party), PARTY_SIZE));
}

// Gen 4 encrypts the battle stats too, with a stream seeded by the personality value.
function currentHp(pokemon: Uint8Array) {
  let seed = u32(pokemon);
  for (let at = 0x88; at <= CURRENT_HP; at += 2) seed = (Math.imul(seed, 0x41c64e6d) + 0x6073) >>> 0;
  return view(pokemon).getUint16(CURRENT_HP, true) ^ (seed >>> 16);
}
