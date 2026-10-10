import { expect, it } from "vitest";
import type { Gen5Addresses, Range } from "./builds";
import { readGen5 } from "./gen5";

const addresses = {
  battleStatus: 0x021b5138,
  basePointer: 0x02000024,
  party: 0x19724,
  enemyTrainer: 0x5262e,
  battleTable: 0x526a8,
  battleStyle: 0x900a0,
} satisfies Gen5Addresses;
const BASE = 0x02204cc4;
const SINGLE = 0;
const DOUBLE = 1;
const TRIPLE = 2;
const ROTATION = 3;

type Enemy = { pid: number; hp: number; disguise?: number };

function battleMemory(style: number, clients: Record<number, Enemy[]>, trainer = 7) {
  const ram = new Uint8Array(0x400000);
  const at = new DataView(ram.buffer);
  const set32 = (address: number, value: number) => at.setUint32(address - 0x02000000, value, true);
  const set16 = (address: number, value: number) => at.setUint16(address - 0x02000000, value, true);
  set16(addresses.battleStatus, 0x2100);
  set32(addresses.basePointer, BASE);
  set16(BASE + addresses.enemyTrainer, trainer);
  ram[BASE + addresses.battleStyle - 0x02000000] = style;
  let heap = 0x02300000;
  for (const [client, enemies] of Object.entries(clients)) {
    const entry = BASE + addresses.battleTable + Number(client) * 0x1c;
    ram[entry + 0x18 - 0x02000000] = enemies.length;
    enemies.forEach(({ pid, hp, disguise }, slot) => {
      const mon = (heap += 0x100);
      const pokemon = (heap += 0x100);
      set32(pokemon, pid);
      set32(mon, pokemon);
      set32(mon + 4, disguise ?? 0);
      set16(mon + 0x10, hp);
      set32(entry + slot * 4, mon);
    });
  }
  const read = async (ranges: Range[]) =>
    Uint8Array.from(ranges.flatMap(({ address, length }) => [...ram.subarray(address - 0x02000000, address - 0x02000000 + length)]));
  return { read, set32 };
}

async function opponents(memory: ReturnType<typeof battleMemory>) {
  const { battle } = await readGen5(addresses, memory.read);
  return { pids: battle?.opponents.map((pokemon) => new DataView(pokemon.buffer, pokemon.byteOffset).getUint32(0, true)), left: battle?.left };
}

it("shows the one enemy on the field in a single battle", async () => {
  const memory = battleMemory(SINGLE, { 1: [{ pid: 1, hp: 20 }, { pid: 2, hp: 30 }] });

  expect(await opponents(memory)).toEqual({ pids: [1], left: 2 });
});

it.each([
  ["a triple", TRIPLE],
  ["a rotation", ROTATION],
])("shows all three enemies on the field in %s battle", async (_, style) => {
  const memory = battleMemory(style, { 1: [1, 2, 3, 4].map((pid) => ({ pid, hp: 10 })) });

  expect(await opponents(memory)).toEqual({ pids: [1, 2, 3], left: 4 });
});

it("shows one enemy from each trainer when a double battle splits them across two clients", async () => {
  const memory = battleMemory(DOUBLE, {
    1: [{ pid: 1, hp: 10 }, { pid: 2, hp: 10 }],
    3: [{ pid: 3, hp: 10 }, { pid: 4, hp: 10 }],
  });

  expect(await opponents(memory)).toEqual({ pids: [1, 3], left: 4 });
});

it("drops a fainted enemy still on the field and doesn't count it as left", async () => {
  const memory = battleMemory(DOUBLE, { 1: [{ pid: 1, hp: 0 }, { pid: 2, hp: 10 }, { pid: 3, hp: 0 }] });

  expect(await opponents(memory)).toEqual({ pids: [2], left: 1 });
});

it("shows the Pokémon behind Zoroark's Illusion, not its disguise", async () => {
  const memory = battleMemory(SINGLE, { 1: [{ pid: 571, hp: 10, disguise: 0x02310000 }] });
  memory.set32(0x02310000, 25);

  expect(await opponents(memory)).toEqual({ pids: [571], left: 1 });
});

it("skips a BattleMon pointer outside main RAM instead of failing the read", async () => {
  const memory = battleMemory(SINGLE, { 1: [{ pid: 1, hp: 10 }] });
  memory.set32(BASE + addresses.battleTable + 0x1c, 0x0badf00d);

  expect(await opponents(memory)).toEqual({ pids: [], left: 0 });
});

it("tells a wild battle by its trainer id of 0", async () => {
  const memory = battleMemory(SINGLE, { 1: [{ pid: 1, hp: 10 }] }, 0);

  expect((await readGen5(addresses, memory.read)).battle?.kind).toBe("wild");
});
