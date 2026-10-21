// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020";
import { expect, it } from "vitest";
import { decodeSpaces, knownLayouts, layoutFormat, pickLayout, type DecodedSpace, type Layout } from "./layout";
import colosseum from "./layouts/known/memory-card-colosseum-1.0.json";
import frlg from "./layouts/known/frlg-1.0.json";
import unbound from "./layouts/known/unbound-2.1.json";
import schema from "./layouts/schema/layout.schema.json";

const known = new URL("./layouts/known/", import.meta.url);

it.for(readdirSync(known))("checks %s against the copy's schema", (file) => {
  const validate = new Ajv2020({ allErrors: true }).compile(schema);
  expect(validate(JSON.parse(readFileSync(new URL(file, known), "utf8"))), JSON.stringify(validate.errors)).toBe(true);
});

const fireRedRev1 = "dd5945db9b930750cb39d00c84da8571feebf417";
const unknownRom = "0000000000000000000000000000000000000000";

const layout = (format: string, version: string, roms: string[] = [], schema = "1.0"): Layout => ({
  schema,
  target: { kind: "save", format, version, roms: roms.map((sha1) => ({ sha1, name: sha1 })) },
  spaces: [],
});

it("picks the known layout whose ROMs hold the game's SHA-1", async () => {
  const picked = pickLayout(await knownLayouts(), { format: "frlg", romSha1: fireRedRev1 });

  expect(picked?.layout.target).toMatchObject({ format: "frlg", version: "1.0" });
  expect(picked?.checked).toBe(true);
  expect(pickLayout(await knownLayouts(), { format: "frlg", romSha1: fireRedRev1.toUpperCase() })?.checked).toBe(true);
});

it("prefers the SHA-1 over the save format", () => {
  const hotfix = layout("unbound", "2.0", ["a".repeat(40)]);
  const picked = pickLayout([layout("unbound", "2.1"), hotfix], { format: "unbound", romSha1: "a".repeat(40) });
  expect(picked).toEqual({ layout: hotfix, checked: true });
});

it("falls back to the newest layout for the save format, not checked against the ROM", () => {
  const newest = layout("unbound", "2.10");
  const picked = pickLayout([layout("unbound", "2.9"), newest, layout("frlg", "3.0")], { format: "unbound", romSha1: unknownRom });
  expect(picked).toEqual({ layout: newest, checked: false });
});

it("keeps a hack format's own layout for a ROM the library patched", () => {
  const unbound = layout("unbound", "2.1");
  expect(pickLayout([unbound], { format: "unbound", romSha1: unknownRom, romHack: true })).toEqual({ layout: unbound, checked: false });
});

it("skips a layout whose schema is newer than Research understands", () => {
  const understood = layout("unbound", "2.1", ["a".repeat(40)]);
  const newer = layout("unbound", "2.2", ["a".repeat(40)], "1.1");
  expect(pickLayout([newer, understood], { format: "unbound", romSha1: "a".repeat(40) })).toEqual({ layout: understood, checked: true });
  expect(pickLayout([layout("unbound", "3.0", [], "2.0"), understood], { format: "unbound", romSha1: unknownRom })).toEqual({ layout: understood, checked: false });
  expect(pickLayout([newer], { format: "unbound", romSha1: "a".repeat(40) })).toBeUndefined();
});

it("has no layout for a game with neither", async () => {
  expect(pickLayout(await knownLayouts(), { format: "emerald-imperium", romSha1: unknownRom })).toBeUndefined();
});

it("names the layout format of the engine's save version", () => {
  expect(layoutFormat({ versionId: 1, formatId: null })).toBe("rs");
  expect(layoutFormat({ versionId: 2, formatId: null })).toBe("rs");
  expect(layoutFormat({ versionId: 3, formatId: null })).toBe("emerald");
  expect(layoutFormat({ versionId: 4, formatId: null })).toBe("frlg");
  expect(layoutFormat({ versionId: 5, formatId: null })).toBe("frlg");
  expect(layoutFormat({ versionId: 4, formatId: "unbound" })).toBe("unbound");
  expect(layoutFormat({ versionId: 10, formatId: null })).toBeUndefined();
});

const vector = (name: string) => new Uint8Array(readFileSync(new URL(`./layouts/transforms/vectors/${name}`, import.meta.url)));
const hexBytes = (text: string) => Uint8Array.from(text.split(" "), (pair) => parseInt(pair, 16));
const space = (spaces: DecodedSpace[], name: string) => spaces.find((space) => space.name === name)!;

it("decodes a FireRed save into its sections, sectors, party slots and box slots", async () => {
  const save = vector("frlg.sav");
  const spaces = await decodeSpaces(save, frlg as Layout);

  expect(spaces.map(({ name }) => name)).toEqual([
    ...Array.from({ length: 14 }, (_, section) => `section:${section}`),
    "sector:28",
    "sector:29",
    ...Array.from({ length: 6 }, (_, slot) => `party:${slot + 1}`),
    ...Array.from({ length: 14 * 30 }, (_, index) => `box:${Math.floor(index / 30) + 1}:${(index % 30) + 1}`),
  ]);
  expect(space(spaces, "section:1").bytes).toEqual(save.slice(0x18000, 0x18f80));
  expect(space(spaces, "party:1").bytes).toHaveLength(100);
  expect(space(spaces, "box:1:2").bytes.slice(0x20, 0x28)).toEqual(hexBytes("13 00 00 00 1B 00 00 00"));
  expect(space(spaces, "box:1:4").bytes).toEqual(new Uint8Array(80));
});

it("gives each space its own ranges or its kind's, with numeric offsets", async () => {
  const spaces = await decodeSpaces(vector("frlg.sav"), frlg as Layout);

  expect(space(spaces, "section:1").ranges).toContainEqual(expect.objectContaining({ id: "money", offset: 0x290, length: 4, type: "u32le" }));
  expect(space(spaces, "box:3:7").ranges).toEqual(space(spaces, "box:1:1").ranges);
  expect(space(spaces, "box:1:1").ranges.length).toBeGreaterThan(0);
  expect(space(spaces, "party:1").ranges.length).toBeGreaterThan(space(spaces, "box:1:1").ranges.length);
});

it("unpacks an Unbound box slot and copies a party slot as it sits", async () => {
  const spaces = await decodeSpaces(vector("unbound.sav"), unbound as Layout);

  expect(space(spaces, "box:1:1").bytes).toEqual(
    hexBytes(
      "4D 3C 6B 2A 39 30 31 D4 CA C3 C5 BB BD C2 CF FF FF FF 02 00 C9 CA BF C8 CA C5 D2 00 00 00 00 00 19 00 00 00 7D 00 00 00 00 46 03 00 54 00 2D 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 01 05 02 08 21 84 10 00 00 00 00",
    ),
  );
  expect(space(spaces, "party:2").bytes).toEqual(space(spaces, "section:1").bytes.slice(0x38 + 100, 0x38 + 200));
  expect(space(spaces, "box:25:30").bytes).toHaveLength(80);
});

it("finds a Colosseum save on a memory card", async () => {
  const card = vector("colosseum.raw");
  const spaces = await decodeSpaces(card, colosseum as Layout);

  expect(spaces.map(({ name }) => name).slice(0, 8)).toEqual(["slot", ...Array.from({ length: 6 }, (_, slot) => `party:${slot + 1}`), "box:1:1"]);
  expect(space(spaces, "slot").bytes).toHaveLength(0x1e000);
});

it("refuses a file the layout can't decode", async () => {
  await expect(decodeSpaces(new Uint8Array(0x20000), frlg as Layout)).rejects.toThrow();
});
