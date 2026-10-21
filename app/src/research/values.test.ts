// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { diffReadings } from "./diff";
import { pickLayout, type Layout } from "./layout";
import { read as readCrystal } from "./layouts/parsers/crystal-1.0.ts";
import { read as readUnbound } from "./layouts/parsers/unbound-2.1.ts";
import unboundValues from "./layouts/values/unbound.json";
import { namesOf, readValues } from "./values";

const vector = (name: string) => new Uint8Array(readFileSync(new URL(`./layouts/transforms/vectors/${name}`, import.meta.url)));
const retail = { romSha1: null, romHack: false };
const layoutOf = async (save: Uint8Array, rom: Parameters<typeof pickLayout>[1] = retail) => (await pickLayout(save, rom))!.layout;

const blank = (valueFiles: string[], values: Layout["values"] = []): Layout => ({
  schema: "1.0",
  target: { kind: "save", format: "test", version: "1.0" },
  valueFiles,
  values,
});

it("names a value from the last value file that has it, and from the layout's own values over them all", async () => {
  const [gen5Last, gen3Last] = await Promise.all([namesOf(blank(["gen3", "gen5"])), namesOf(blank(["gen5", "gen3"]))]);
  const own = await namesOf(blank(["gen3"], [{ domain: "item", index: 13, name: "Tonic" }]));

  expect([gen5Last("item", 13), gen3Last("item", 13), own("item", 13), own("item", 14)]).toEqual(["Dusk Ball", "Potion", "Tonic", "Antidote"]);
  expect(gen3Last("species", 25)).toBe("Pikachu");
});

const namedItems = unboundValues.values.filter(({ domain }) => domain === "item").map(({ index }) => index);
const unnamedItem = Array.from({ length: Math.max(...namedItems) }, (_, index) => index + 1).find((index) => !namedItems.includes(index))!;

function unboundAfter() {
  const save = readUnbound(vector("unbound.sav"));
  const { items, moreItems, keyItems, balls, tmsHms, berries } = save.bag;
  const slots = [...items, ...moreItems, ...keyItems, ...balls, ...tmsHms, ...berries];
  [...namedItems, unnamedItem].forEach((index, slot) => Object.assign(slots[slot], { item: index, count: 2 }));
  save.party.count = 1;
  Object.assign(save.party[0], { species: 1, heldItem: unnamedItem });
  Object.assign(save.boxes[1].slots[2], { species: 4, heldItem: namedItems[0] });
  return save.write();
}

it("reads an Unbound save's pockets and held items through its parser, named from its value files", async () => {
  const after = unboundAfter();
  const { pouches, held } = await readValues(after, await layoutOf(after));

  expect(pouches.map(({ pocket }) => pocket)).toEqual(["Items", "Key items", "Poké Balls", "TMs and HMs", "Berries"]);
  const items = pouches.flatMap(({ items }) => items);
  expect(items.filter(({ name }) => name === undefined)).toEqual([{ index: unnamedItem, count: 2 }]);
  expect(items.filter(({ name }) => name).map(({ index }) => index)).toEqual(namedItems);
  expect(held).toEqual([
    { slot: "Party slot 1", species: "Bulbasaur", item: { index: unnamedItem, count: 1 } },
    { slot: "Box 2, slot 3", species: "Charmander", item: { index: namedItems[0], name: expect.any(String), count: 1 } },
  ]);
});

it("finds only the items Unbound's value files don't name as value candidates, in both saves of a compare", async () => {
  const before = vector("unbound.sav");
  const after = unboundAfter();
  const layout = await layoutOf(before);

  const values = diffReadings(await readValues(before, layout), await readValues(after, layout));

  expect(values).toEqual([
    expect.objectContaining({ kind: "value", domain: "item", index: unnamedItem, pocket: "TMs and HMs", before: 0, after: 2 }),
    expect.objectContaining({ kind: "value", domain: "item", index: unnamedItem, holder: { slot: "Party slot 1", species: "Bulbasaur" }, before: 0, after: 1 }),
  ]);
});

it("reads only the items a Gen 2 pocket counts, and a key item with no count as one", async () => {
  const save = readCrystal(vector("crystal.sav"));
  Object.assign(save.bag.items[0], { item: 0x12, count: 3 });
  Object.assign(save.bag.items[1], { item: 0x13, count: 4 });
  save.bag.items.count = 1;
  save.bag.keyItems[0].item = 0x7f;
  save.bag.keyItems.count = 1;
  const after = save.write();

  const { pouches } = await readValues(after, await layoutOf(after));

  expect(pouches.filter(({ items }) => items.length)).toEqual([
    { pocket: "Bag items", items: [{ index: 0x12, name: expect.any(String), count: 3 }] },
    { pocket: "Key items", items: [{ index: 0x7f, name: expect.any(String), count: 1 }] },
  ]);
});

it("names the pockets of a layout Research reads without its ranges", async () => {
  const save = vector("frlg.sav");
  const layout = await layoutOf(save, { romSha1: "c".repeat(40), romHack: true });
  expect(layout.spaces?.every(({ ranges }) => !ranges?.length)).toBe(true);

  const { pouches } = await readValues(save, layout);

  expect(pouches.map(({ pocket }) => pocket)).toContain("Key items");
});
