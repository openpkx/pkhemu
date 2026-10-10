import type { Gen3Symbols, ReadMemory } from "./builds";
import type { Battle } from "./gameMemory";
import { PARTY_SIZE, readNamed, slots, view } from "./memory";

type BattleMemory = Record<
  "battleTypeFlags" | "battlersCount" | "battlerPartyIndexes" | "battlerPositions" | "absentBattlerFlags" | "enemyParty",
  Uint8Array
>;

const POKEMON_SIZE = 100;
const MAX_BATTLERS = 4;
const IN_BATTLE = 0x02;
const BATTLE_TYPE_TRAINER = 1 << 3;
const HAS_SPECIES = 0x02;
const IS_EGG = 0x04;

export async function readGen3(symbols: Gen3Symbols, read: ReadMemory) {
  const memory = await readNamed(read, {
    inBattle: { address: symbols.inBattle, length: 1 },
    battleTypeFlags: { address: symbols.gBattleTypeFlags, length: 4 },
    battlersCount: { address: symbols.gBattlersCount, length: 1 },
    battlerPartyIndexes: { address: symbols.gBattlerPartyIndexes, length: 2 * MAX_BATTLERS },
    battlerPositions: { address: symbols.gBattlerPositions, length: MAX_BATTLERS },
    absentBattlerFlags: { address: symbols.gAbsentBattlerFlags, length: 1 },
    playerPartyCount: { address: symbols.gPlayerPartyCount, length: 1 },
    playerParty: { address: symbols.gPlayerParty, length: PARTY_SIZE * POKEMON_SIZE },
    enemyParty: { address: symbols.gEnemyParty, length: PARTY_SIZE * POKEMON_SIZE },
  });
  const party = slots(memory.playerParty, POKEMON_SIZE).slice(0, memory.playerPartyCount[0]);
  const inBattle = (memory.inBattle[0] & IN_BATTLE) !== 0;
  return { party, battle: inBattle ? battle(memory) : null };
}

function battle(memory: BattleMemory): Battle {
  const flags = view(memory.battleTypeFlags).getUint32(0, true);
  const enemies = slots(memory.enemyParty, POKEMON_SIZE);
  const indexes = view(memory.battlerPartyIndexes);
  const onField: { position: number; pokemon: Uint8Array }[] = [];
  for (let battler = 0; battler < Math.min(memory.battlersCount[0], MAX_BATTLERS); battler++) {
    const position = memory.battlerPositions[battler];
    const absent = (memory.absentBattlerFlags[0] & (1 << battler)) !== 0;
    const pokemon = enemies[indexes.getUint16(battler * 2, true)];
    if (position % 2 === 1 && !absent && pokemon) onField.push({ position, pokemon });
  }
  return {
    kind: flags & BATTLE_TYPE_TRAINER ? "trainer" : "wild",
    opponents: onField.sort((a, b) => a.position - b.position).map((battler) => battler.pokemon),
    left: enemies.filter(canFight).length,
  };
}

function canFight(pokemon: Uint8Array) {
  const flags = pokemon[0x13];
  return (flags & HAS_SPECIES) !== 0 && (flags & IS_EGG) === 0 && view(pokemon).getUint16(0x56, true) > 0;
}
