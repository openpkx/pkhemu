import type { System } from "@/systems";

export type Range = { address: number; length: number };

export type ReadMemory = (ranges: Range[]) => Promise<Uint8Array>;

export type Gen3Symbols = {
  // The byte of gMain whose bit 1 is gMain.inBattle.
  inBattle: number;
  gBattleTypeFlags: number;
  gBattlersCount: number;
  gBattlerPartyIndexes: number;
  gBattlerPositions: number;
  gAbsentBattlerFlags: number;
  gPlayerPartyCount: number;
  gPlayerParty: number;
  gEnemyParty: number;
};

// Battle offsets are from the u32 at `battlePointer`, party offsets point at the party's count.
export type Gen4Addresses = {
  battleStatus: number;
  saveData: number;
  party: number;
  battlePointer: number;
  battleParty: number;
  enemyParty: number;
  enemyTrainer: number;
  opponent: number;
};

// Offsets are from the u32 at `basePointer`, or are addresses without one. The party offset points at the party's count.
export type Gen5Addresses = {
  battleStatus: number;
  basePointer?: number;
  party: number;
  enemyTrainer: number;
  battleTable: number;
  battleStyle: number;
};

export type GameCubeFormat = "ck3" | "xk3";

// The offset is from the big-endian u32 at `pointer` and points at the party.
export type GameCubeAddresses = {
  pointer: number;
  party: number;
};

export type Build =
  | { name: string; format: "pk3"; version: number; symbols: Gen3Symbols }
  | { name: string; format: "pk4"; version: number; addresses: Gen4Addresses }
  | { name: string; format: "pk5"; version: number; addresses: Gen5Addresses }
  | { name: string; format: GameCubeFormat; version: number; addresses: GameCubeAddresses };

// pret's symbols for all three revisions of each game agree on every address here.
const rubySapphire: Gen3Symbols = {
  inBattle: 0x03001bad,
  gBattleTypeFlags: 0x020239f8,
  gBattlersCount: 0x02024a68,
  gBattlerPartyIndexes: 0x02024a6a,
  gBattlerPositions: 0x02024a72,
  gAbsentBattlerFlags: 0x02024c0c,
  gPlayerPartyCount: 0x03004350,
  gPlayerParty: 0x03004360,
  gEnemyParty: 0x030045c0,
};

const emerald: Gen3Symbols = {
  inBattle: 0x030026f9,
  gBattleTypeFlags: 0x02022fec,
  gBattlersCount: 0x0202406c,
  gBattlerPartyIndexes: 0x0202406e,
  gBattlerPositions: 0x02024076,
  gAbsentBattlerFlags: 0x02024210,
  gPlayerPartyCount: 0x020244e9,
  gPlayerParty: 0x020244ec,
  gEnemyParty: 0x02024744,
};

// pret's FireRed and LeafGreen symbols, both revisions, agree on every address here.
const fireRedLeafGreen: Gen3Symbols = {
  inBattle: 0x03003529,
  gBattleTypeFlags: 0x02022b4c,
  gBattlersCount: 0x02023bcc,
  gBattlerPartyIndexes: 0x02023bce,
  gBattlerPositions: 0x02023bd6,
  gAbsentBattlerFlags: 0x02023d70,
  gPlayerPartyCount: 0x02024029,
  gPlayerParty: 0x02024284,
  gEnemyParty: 0x0202402c,
};

// pret has no symbols for the Gen 4 battle, which lives on the heap. These offsets come from PokeLua
// (Real96/PokeLua) and NDS-Ironmon-Tracker (Brian0255), which agree. The save data pointers come from pret's xMAPs.
const platinum: Gen4Addresses = {
  battleStatus: 0x0224a55a,
  saveData: 0x021c0794,
  party: 0xb0,
  battlePointer: 0x02101d2c,
  battleParty: 0x58888,
  enemyParty: 0x58e38,
  enemyTrainer: 0x4e87e,
  opponent: 0x546c0,
};

const heartGoldSoulSilver: Gen4Addresses = {
  battleStatus: 0x02246f48,
  saveData: 0x021d2228,
  party: 0xa4,
  battlePointer: 0x0211186c,
  battleParty: 0x5ba74,
  enemyParty: 0x5c044,
  enemyTrainer: 0x5108a,
  opponent: 0x56f1c,
};

// Diamond and Pearl have no xMAP. battleStatus, battleParty, enemyTrainer and opponent come from NDS-Ironmon-Tracker,
// the rest from PokeLua. The tracker's offsets hang off `*(*0x02000B70 + 0x20)`, 0xD000 below PokeLua's `*0x02106FAC`,
// so they're shifted by 0xD000 here. Both games share one table.
// https://github.com/Brian0255/NDS-Ironmon-Tracker/blob/05a0be0d/ironmon_tracker/constants/MemoryAddresses.lua
// https://github.com/Real96/PokeLua/blob/b76caf66/Gen%204/BizHawk/DP_RNG_BizHawk.lua
const diamondPearl: Gen4Addresses = {
  battleStatus: 0x0223bb38,
  saveData: 0x02106fac,
  party: 0xd2a8,
  battlePointer: 0x02106fac,
  battleParty: 0x597d4,
  enemyParty: 0x59d84,
  enemyTrainer: 0x4fa8e,
  opponent: 0x556a8,
};

// The offsets come from NDS-Ironmon-Tracker (Brian0255, MemoryAddresses.lua at 05a0be0d), which moved to the base
// pointer because fixed addresses shift on patched ROMs. PokeLua's fixed Black 2 addresses agree with them. The battle
// table's layout comes from the pokebw2 decomp (fuddlesworth, btl_main.h and btl_pokeparam.h at a76bb13e).
// battleStatus isn't a variable. It's a halfword of whichever overlay is loaded there, and the battle's holds 0x2100 at it.
const black2White2 = (battleStatus: number): Gen5Addresses => ({
  battleStatus,
  basePointer: 0x02000024,
  party: 0x19724,
  enemyTrainer: 0x5262e,
  battleTable: 0x526a8,
  battleStyle: 0x900a0,
});

// Black and White have no base pointer. These fixed addresses come from NDS-Ironmon-Tracker, and PokeLua agrees on the
// party's. White's are Black's plus 0x20. The battle table and battleStatus behave as in Black 2 and White 2.
// https://github.com/Brian0255/NDS-Ironmon-Tracker/blob/05a0be0d/ironmon_tracker/constants/MemoryAddresses.lua
// https://github.com/Real96/PokeLua/blob/b76caf66/Gen%205/BizHawk/BW_RNG_BizHawk.lua
const blackWhite = (shift: number): Gen5Addresses => ({
  battleStatus: 0x021d0798 + shift,
  party: 0x022349b0 + shift,
  enemyTrainer: 0x022697be + shift,
  battleTable: 0x02269838 + shift,
  battleStyle: 0x022a62f8 + shift,
});

// Colosseum and XD have no symbols, and their save moves between boots. These pointers sit in each DOL's .sbss and led to
// the party in all our RAM dumps.
const colosseum: GameCubeAddresses = { pointer: 0x804c8268, party: 0xa0 };
const xd: GameCubeAddresses = { pointer: 0x80525ce0, party: 0x170 };

const gen3 = (name: string, version: number, symbols: Gen3Symbols): Build => ({ name, format: "pk3", version, symbols });
const gen4 = (name: string, version: number, addresses: Gen4Addresses): Build => ({ name, format: "pk4", version, addresses });
const gen5 = (name: string, version: number, addresses: Gen5Addresses): Build => ({ name, format: "pk5", version, addresses });

const gameCube = (name: string, version: number, format: GameCubeFormat, addresses: GameCubeAddresses): Build => ({
  name,
  format,
  version,
  addresses,
});

const builds: Record<string, Build> = {
  "AXVE 0": gen3("Ruby EN 1.0", 2, rubySapphire),
  "AXVE 1": gen3("Ruby EN 1.1", 2, rubySapphire),
  "AXVE 2": gen3("Ruby EN 1.2", 2, rubySapphire),
  "AXPE 0": gen3("Sapphire EN 1.0", 1, rubySapphire),
  "AXPE 1": gen3("Sapphire EN 1.1", 1, rubySapphire),
  "AXPE 2": gen3("Sapphire EN 1.2", 1, rubySapphire),
  "BPEE 0": gen3("Emerald EN", 3, emerald),
  "BPRE 0": gen3("FireRed EN 1.0", 4, fireRedLeafGreen),
  "BPRE 1": gen3("FireRed EN 1.1", 4, fireRedLeafGreen),
  "BPGE 0": gen3("LeafGreen EN 1.0", 5, fireRedLeafGreen),
  "BPGE 1": gen3("LeafGreen EN 1.1", 5, fireRedLeafGreen),
  // Revision 13 is the European English release. pret's US build is revision 5, which we haven't verified.
  "ADAE 13": gen4("Diamond EU", 10, diamondPearl),
  "APAE 13": gen4("Pearl EU", 11, diamondPearl),
  "CPUE 10": gen4("Platinum US", 12, platinum),
  "IPKE 0": gen4("HeartGold US", 7, heartGoldSoulSilver),
  "IPGE 0": gen4("SoulSilver US", 8, heartGoldSoulSilver),
  "IREO 0": gen5("Black 2 EN", 23, black2White2(0x021b5138)),
  "IRDO 0": gen5("White 2 EN", 22, black2White2(0x021b5178)),
  "IRBO 0": gen5("Black EN", 21, blackWhite(0)),
  "IRAO 0": gen5("White EN", 20, blackWhite(0x20)),
  "GC6P 0": gameCube("Colosseum EU", 62, "ck3", colosseum),
  "GXXP 0": gameCube("XD EU", 63, "xk3", xd),
};

// melonDS DS doesn't map the cartridge, but the DS copies its header into main RAM at boot.
const headers: Partial<Record<System, { code: number; revision: number }>> = {
  gba: { code: 0x080000ac, revision: 0x080000bc },
  nds: { code: 0x027ffe0c, revision: 0x027ffe1e },
  gc: { code: 0x80000000, revision: 0x80000007 },
};

export async function identifyBuild(system: System, read: ReadMemory): Promise<Build | "unsupported"> {
  const header = headers[system];
  if (!header) return "unsupported";
  const bytes = await read([
    { address: header.code, length: 4 },
    { address: header.revision, length: 1 },
  ]);
  const code = String.fromCharCode(...bytes.subarray(0, 4));
  return builds[`${code} ${bytes[4]}`] ?? "unsupported";
}
