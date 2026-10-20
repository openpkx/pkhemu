import type { GameCubeAddresses, GameCubeFormat, ReadMemory } from "./builds";
import { PARTY_SIZE, readEach, slots, view } from "./memory";

const POKEMON_SIZE = { ck3: 312, xk3: 196 };
const MEM1 = { start: 0x80000000, end: 0x81800000 };

// The save keeps no party count, so empty slots are the ones without a species, as PKHeX counts them.
export async function readGameCube(addresses: GameCubeAddresses, format: GameCubeFormat, read: ReadMemory) {
  const size = POKEMON_SIZE[format];
  const [pointer] = await readEach(read, [{ address: addresses.pointer, length: 4 }]);
  const party = { address: view(pointer).getUint32(0) + addresses.party, length: PARTY_SIZE * size };
  if (party.address < MEM1.start || party.address + party.length > MEM1.end) return { party: [], battle: null };
  const [bytes] = await readEach(read, [party]);
  return { party: slots(bytes, size).filter((pokemon) => view(pokemon).getUint16(0) !== 0), battle: null };
}
