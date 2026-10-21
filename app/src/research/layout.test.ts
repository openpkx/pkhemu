// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020";
import { expect, it } from "vitest";
import { diffSpaces } from "./diff";
import { decodeSpaces, pickLayout, readSave, type DecodedSpace, type Layout, type PickedLayout } from "./layout";
import colosseum from "./layouts/known/memory-card-colosseum-1.0.json";
import frlg from "./layouts/known/frlg-1.0.json";
import unbound from "./layouts/known/unbound-2.1.json";
import schema from "./layouts/schema/layout.schema.json";

const known = new URL("./layouts/known/", import.meta.url);

it.for(readdirSync(known))("checks %s against the copy's schema", (file) => {
  const validate = new Ajv2020({ allErrors: true }).compile(schema);
  expect(validate(JSON.parse(readFileSync(new URL(file, known), "utf8"))), JSON.stringify(validate.errors)).toBe(true);
});

const vector = (name: string) => new Uint8Array(readFileSync(new URL(`./layouts/transforms/vectors/${name}`, import.meta.url)));
const EMERALD = "f3ae088181bf583e55daf962a92bb46f4f1d07b7";
const retail = { romSha1: null, romHack: false };

it("picks a Red save's layout by detection, not checked against the ROM", async () => {
  expect(await pickLayout(vector("red.sav"), retail)).toMatchObject({ checked: false, layout: { target: { format: "rby", version: "1.0" } } });
});

it("picks a Colosseum memory card's layout", async () => {
  expect(await pickLayout(vector("colosseum.raw"), retail)).toMatchObject({ layout: { target: { format: "memory-card-colosseum" } } });
});

it("picks the layout whose ROMs hold the game's SHA-1, checked against it", async () => {
  const picked = await pickLayout(vector("emerald.sav"), { romSha1: EMERALD.toUpperCase(), romHack: false });
  expect(picked).toMatchObject({ checked: true, layout: { target: { format: "emerald" } } });
});

it("picks a save's layout by detection when only a ROM layout lists the game's SHA-1", async () => {
  const imperiumRom = "1d20091c4d936f5eb122db8780554dd0829ffb63";
  const picked = await pickLayout(vector("imperium.sav"), { romSha1: imperiumRom, romHack: true });
  expect(picked).toMatchObject({ checked: false, layout: { target: { format: "emerald-imperium" } } });
});

it.for([
  ["gold.sav", "gs"],
  ["crystal.sav", "crystal"],
  ["dp.sav", "dp"],
  ["bw.sav", "bw"],
  ["b2w2.sav", "b2w2"],
  ["xy.sav", "xy"],
  ["sm.sav", "sm"],
  ["usum.sav", "usum"],
])("picks %s's layout, %s, by detection", async ([file, format]) => {
  expect(await pickLayout(vector(file), retail)).toMatchObject({ checked: false, layout: { target: { format } } });
});

it("picks no layout for a save no layout reads", async () => {
  expect(await pickLayout(new Uint8Array(0x80000), retail)).toBeUndefined();
});

it.for([
  ["a Japanese Gen 1 save, a possible match", "blue-jpn.sav"],
  ["a Korean Gen 2 save, a possible match", "gold-kor.sav"],
  ["an Emerald Legacy save, which Emerald matches too", "emerald-legacy.sav"],
  ["a card holding both Colosseum and XD", "gamecube.raw"],
])("picks no layout for %s", async ([, file]) => {
  expect(await pickLayout(vector(file), retail)).toBeUndefined();
});

const rangeCount = ({ layout }: PickedLayout) =>
  [...Object.values(layout.kinds ?? {}), ...(layout.spaces ?? [])].reduce((count, { ranges }) => count + (ranges?.length ?? 0), 0);

it("drops a retail layout's ranges for a patched ROM it wasn't checked against", async () => {
  const picked = (await pickLayout(vector("emerald.sav"), { romSha1: null, romHack: true }))!;
  expect(picked).toMatchObject({ checked: false, layout: { target: { format: "emerald" } } });
  expect(picked.layout.spaces?.length).toBeGreaterThan(0);
  expect(rangeCount(picked)).toBe(0);
});

it.for(["unbound.sav", "imperium.sav"])("keeps a hack format's ranges for a patched ROM, as in %s", async (file) => {
  expect(rangeCount((await pickLayout(vector(file), { romSha1: null, romHack: true }))!)).toBeGreaterThan(0);
});

it("keeps a retail layout's ranges for a patched ROM whose SHA-1 it lists", async () => {
  const picked = (await pickLayout(vector("emerald.sav"), { romSha1: EMERALD, romHack: true }))!;
  expect(picked.checked).toBe(true);
  expect(rangeCount(picked)).toBeGreaterThan(0);
});

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

it("reads a Red save's money and boxes through the layout detection picks", async () => {
  const save = vector("red.sav");
  const spaces = await decodeSpaces(save, (await pickLayout(save, retail))!.layout);

  expect(space(spaces, "sram").bytes).toEqual(save);
  expect(space(spaces, "sram").ranges).toContainEqual(expect.objectContaining({ id: "money", type: "bcd24be" }));
  expect(spaces.filter(({ name }) => /^box:\d+:\d+$/.test(name))).toHaveLength(12 * 20);
});

it("refuses a file the layout can't decode", async () => {
  await expect(decodeSpaces(new Uint8Array(0x20000), frlg as Layout)).rejects.toThrow();
});

type Shopper = { trainer: { money: number }; bag: { balls: { item: number; count: number }[] }; write(): Uint8Array };

it.for(["emerald", "frlg", "rs"])("shows the money a %s save spent on a Poké Ball as a known change", async (format) => {
  const before = vector(`${format}.sav`);
  const { layout } = (await pickLayout(before, retail))!;
  const save = (await readSave(before, layout)) as unknown as Shopper;
  save.trainer.money = 1000;
  Object.assign(save.bag.balls[0], { item: 4, count: 1 });
  const after = save.write();

  const changes = diffSpaces(await decodeSpaces(before, layout), await decodeSpaces(after, layout));

  const known = changes.flatMap(({ space, known }) => known.map(({ name }) => `${space.name} ${name}`));
  expect(known).toContain("section:1 Money");
  expect(known.some((name) => name.startsWith("section:1 Poké Balls pocket"))).toBe(true);
  expect(changes.flatMap(({ candidates }) => candidates)).toEqual([]);
});
