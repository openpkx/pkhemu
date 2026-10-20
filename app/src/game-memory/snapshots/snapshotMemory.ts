import type { Range } from "../builds";

export type Snapshot = { build: string; memory: { address: string; bytes: string }[] };

const headers: Record<string, { system: "gba" | "nds" | "gc"; code: string; revision: number }> = {
  "Emerald EN": { system: "gba", code: "BPEE", revision: 0 },
  "FireRed EN 1.0": { system: "gba", code: "BPRE", revision: 0 },
  "FireRed EN 1.1": { system: "gba", code: "BPRE", revision: 1 },
  "Ruby EN 1.1": { system: "gba", code: "AXVE", revision: 1 },
  "Sapphire EN 1.2": { system: "gba", code: "AXPE", revision: 2 },
  "Diamond EU": { system: "nds", code: "ADAE", revision: 13 },
  "Pearl EU": { system: "nds", code: "APAE", revision: 13 },
  "Platinum US": { system: "nds", code: "CPUE", revision: 10 },
  "HeartGold US": { system: "nds", code: "IPKE", revision: 0 },
  "SoulSilver US": { system: "nds", code: "IPGE", revision: 0 },
  "Black 2 EN": { system: "nds", code: "IREO", revision: 0 },
  "White 2 EN": { system: "nds", code: "IRDO", revision: 0 },
  "Black EN": { system: "nds", code: "IRBO", revision: 0 },
  "White EN": { system: "nds", code: "IRAO", revision: 0 },
  "Colosseum EU": { system: "gc", code: "GC6P", revision: 0 },
  "XD EU": { system: "gc", code: "GXXP", revision: 0 },
};

const headerAddresses = {
  gba: { code: 0x080000ac, revision: 0x080000bc },
  nds: { code: 0x027ffe0c, revision: 0x027ffe1e },
  gc: { code: 0x80000000, revision: 0x80000007 },
};

export const snapshotSystem = (snapshot: Snapshot) => headers[snapshot.build].system;

export const hex = (bytes: string) => Uint8Array.from(bytes.match(/../g)!, (byte) => parseInt(byte, 16));

// Snapshots leave out the ROM header, so it comes from the build they were captured on.
export function snapshotMemory(snapshot: Snapshot) {
  const { system, code, revision } = headers[snapshot.build];
  const memory = new Map(snapshot.memory.map(({ address, bytes }) => [Number(address), hex(bytes)]));
  memory.set(headerAddresses[system].code, Uint8Array.from(code, (c) => c.charCodeAt(0)));
  memory.set(headerAddresses[system].revision, Uint8Array.of(revision));
  return async (ranges: Range[]) =>
    Uint8Array.from(
      ranges.flatMap(({ address, length }) => {
        const bytes = memory.get(address);
        if (bytes?.length !== length) throw new Error(`${length} bytes at ${address.toString(16)} weren't captured`);
        return [...bytes];
      }),
    );
}

// Nicknames sit outside the encrypted part of a Pokémon, in the game's own character set.
export function gen3Nickname(pokemon: Uint8Array) {
  const name = pokemon.subarray(8, 18);
  const end = name.indexOf(0xff);
  return String.fromCharCode(...name.subarray(0, end < 0 ? undefined : end).map((c) => c - 0xbb + 65));
}

// Gen 4 and 5 shuffle and encrypt the block holding the species.
const blockA = [0, 0, 0, 0, 0, 0, 1, 1, 2, 3, 2, 3, 1, 1, 2, 3, 2, 3, 1, 1, 2, 3, 2, 3];
export function dsSpecies(pokemon: Uint8Array) {
  const data = new DataView(pokemon.buffer, pokemon.byteOffset, pokemon.byteLength);
  const position = blockA[((data.getUint32(0, true) >>> 13) & 31) % 24];
  let seed = data.getUint16(6, true);
  for (let word = 0; word <= position * 16; word++) seed = (Math.imul(seed, 0x41c64e6d) + 0x6073) >>> 0;
  return data.getUint16(8 + position * 32, true) ^ (seed >>> 16);
}

// Colosseum and XD keep a Pokémon unencrypted, with the species first and the nickname in big-endian UTF-16.
export function gameCubeNickname(pokemon: Uint8Array) {
  const at = pokemon.length === 312 ? 0x44 : 0x64;
  const name = new DataView(pokemon.buffer, pokemon.byteOffset + at, 22);
  const chars = Array.from({ length: 11 }, (_, i) => name.getUint16(i * 2));
  const end = chars.indexOf(0);
  return String.fromCharCode(...chars.slice(0, end < 0 ? undefined : end));
}
