// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import frlg from "./layouts/known/frlg-1.0.json";
import unbound from "./layouts/known/unbound-2.1.json";
import type { Layout } from "./layout";
import { decodeSpaces } from "./spaces";

const vector = (name: string) => new Uint8Array(readFileSync(new URL(`./layouts/transforms/vectors/${name}`, import.meta.url)));
const hexBytes = (text: string) => Uint8Array.from(text.split(" "), (pair) => parseInt(pair, 16));
const space = (spaces: ReturnType<typeof decodeSpaces>, name: string) => spaces.find((space) => space.name === name)!;

it("decodes a FireRed save into its sections, sectors, party slots and box slots", () => {
  const spaces = decodeSpaces(vector("frlg.sav"), frlg as Layout);

  expect(spaces.map(({ name }) => name)).toEqual([
    ...Array.from({ length: 14 }, (_, section) => `section:${section}`),
    "sector:28",
    "sector:29",
    ...Array.from({ length: 6 }, (_, slot) => `party:${slot + 1}`),
    ...Array.from({ length: 14 * 30 }, (_, index) => `box:${Math.floor(index / 30) + 1}:${(index % 30) + 1}`),
  ]);
  expect(space(spaces, "section:0").bytes.slice(0, 8)).toEqual(hexBytes("C9 CA BF C8 CA C5 D2 FF"));
  expect(space(spaces, "party:1").bytes).toHaveLength(100);
  expect(space(spaces, "box:14:30").bytes).toHaveLength(80);
});

it("decrypts the box slots the pk3-crypt vectors name", () => {
  const spaces = decodeSpaces(vector("frlg.sav"), frlg as Layout);

  expect(space(spaces, "box:1:2").bytes.slice(0x20, 0x28)).toEqual(hexBytes("13 00 00 00 1B 00 00 00"));
  expect(space(spaces, "box:1:3").bytes.slice(0x20, 0x28)).toEqual(hexBytes("0A 00 00 00 40 00 00 00"));
  expect(space(spaces, "box:1:4").bytes).toEqual(new Uint8Array(80));
});

it("gives each space its own ranges or its kind's, with numeric offsets", () => {
  const spaces = decodeSpaces(vector("frlg.sav"), frlg as Layout);

  expect(space(spaces, "section:1").ranges).toContainEqual(expect.objectContaining({ name: "Money", offset: 0x290, length: 4, type: "u32le" }));
  expect(space(spaces, "box:3:7").ranges).toEqual(space(spaces, "box:1:1").ranges);
  expect(space(spaces, "box:1:1").ranges.length).toBeGreaterThan(0);
  expect(space(spaces, "party:1").ranges.length).toBeGreaterThan(space(spaces, "box:1:1").ranges.length);
});

it("copies spaces with no transform as they sit, across the regions of their source", () => {
  const save = vector("unbound.sav");
  const spaces = decodeSpaces(save, unbound as Layout);

  expect(space(spaces, "section:1").bytes.slice(0x290, 0x294)).toEqual(hexBytes("40 E2 01 00"));
  expect(space(spaces, "party:2").bytes).toEqual(space(spaces, "section:1").bytes.slice(0x38 + 100, 0x38 + 200));
  expect(space(spaces, "box:1:1").bytes).toEqual(space(spaces, "section:5").bytes.slice(4, 4 + 58));
  expect(space(spaces, "box:25:30").bytes).toEqual(space(spaces, "section:0").bytes.slice(0x77c - 58, 0x77c));
  expect(space(spaces, "box:3:11").bytes).toEqual(
    new Uint8Array([...space(spaces, "section:5").bytes.slice(0xfe0, 0xff0), ...space(spaces, "section:6").bytes.slice(0, 42)]),
  );
});
