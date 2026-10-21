import { expect, it } from "vitest";
import { diffReadings, diffSpaces, spaceTitle } from "./diff";
import type { DecodedSpace, Range } from "./layout";

const range = (offset: number, length: number, name: string, repeat?: { count: number; stride: number }): Range => ({
  id: name.toLowerCase().replace(/\W+/g, "-"),
  offset,
  length,
  name,
  type: length === 4 ? "u32le" : "u8",
  confidence: "known",
  source: "test",
  ...repeat,
});

function spaces(name: string, length: number, ranges: Range[], changed: number[]) {
  const before: DecodedSpace = { name, bytes: new Uint8Array(length), ranges };
  const after: DecodedSpace = { ...before, bytes: before.bytes.slice() };
  for (const offset of changed) after.bytes[offset] = 0xff;
  return [before, after] as const;
}

it("groups unmapped changes into runs, merging runs less than 8 bytes apart", () => {
  const [before, after] = spaces("section:2", 0x100, [], [0x10, 0x11, 0x19, 0x40, 0x49]);

  const [changes] = diffSpaces([before], [after]);

  expect(changes.candidates.map(({ start, end, bytes }) => ({ start, end, bytes }))).toEqual([
    { start: 0x10, end: 0x1a, bytes: [0x10, 0x11, 0x19] },
    { start: 0x40, end: 0x41, bytes: [0x40] },
    { start: 0x49, end: 0x4a, bytes: [0x49] },
  ]);
});

it("never runs across a known range", () => {
  const [before, after] = spaces("section:1", 0x100, [range(0x90, 4, "Money")], [0x8f, 0x95]);

  const [changes] = diffSpaces([before], [after]);

  expect(changes.candidates.map(({ bytes }) => bytes)).toEqual([[0x8f], [0x95]]);
});

it("names changes inside known ranges, counting repeats from 1, and keeps them out of the runs", () => {
  const ranges = [range(0x90, 4, "Money"), range(0x100, 4, "Items pocket", { count: 30, stride: 4 })];
  const [before, after] = spaces("section:1", 0x200, ranges, [0x90, 0x91, 0x10a, 0x94]);

  const [changes] = diffSpaces([before], [after]);

  expect(changes.known.map(({ name, offset, length, bytes }) => ({ name, offset, length, bytes }))).toEqual([
    { name: "Money", offset: 0x90, length: 4, bytes: [0x90, 0x91] },
    { name: "Items pocket 3", offset: 0x108, length: 4, bytes: [0x10a] },
  ]);
  expect(changes.candidates.map(({ bytes }) => bytes)).toEqual([[0x94]]);
});

it("hides spaces where nothing changed", () => {
  const [before, after] = spaces("section:3", 0x40, [], []);

  expect(diffSpaces([before], [after])).toEqual([]);
});

it("names sections from 0, as the layout does, and boxes and slots from 1", () => {
  expect(["section:0", "sector:28", "party:1", "box:14:30"].map(spaceTitle)).toEqual(["Section 0", "Sector 28", "Party slot 1", "Box 14, slot 30"]);
});

it("counts an unnamed held item across Pokémon wherever they move, and leaves out items the layout names", () => {
  const potion = { index: 13, name: "Potion", count: 1 };
  const unnamed = { index: 368, count: 1 };
  const before = {
    pouches: [{ pocket: "Items", items: [potion, unnamed] }],
    held: [{ slot: "Box 1, slot 1", species: "Latias", item: unnamed }],
  };
  const after = {
    pouches: [{ pocket: "Items", items: [{ ...potion, count: 5 }] }],
    held: [
      { slot: "Party slot 1", species: "Latias", item: unnamed },
      { slot: "Party slot 2", species: "Kyogre", item: unnamed },
      { slot: "Party slot 3", species: "Pikachu", item: { index: 202, name: "Light Ball", count: 1 } },
    ],
  };

  expect(diffReadings(before, after)).toEqual([
    expect.objectContaining({ index: 368, pocket: "Items", before: 1, after: 0 }),
    expect.objectContaining({ index: 368, holder: { slot: "Party slot 1", species: "Latias" }, before: 1, after: 2 }),
  ]);
});
