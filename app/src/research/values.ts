import { spaceTitle } from "./diff";
import { knownLayout, readSave, type Layout, type Value } from "./layout";
import { expand } from "./layouts/tools/parser/runtime.ts";

export type ItemReading = { index: number; name?: string; count: number };

export type ValueReading = {
  pouches: { pocket: string; items: ItemReading[] }[];
  held: { slot: string; species: string; item: ItemReading }[];
};

export type Names = (domain: string, index: number) => string | undefined;

type ParsedItem = { item?: number; count?: number };
type ParsedPokemon = { species?: number; heldItem?: unknown };
type List<T> = readonly T[] & { count?: number };
type ParsedSave = {
  bag?: Record<string, List<ParsedItem>>;
  party?: List<ParsedPokemon>;
  boxes?: readonly { slots: List<ParsedPokemon> }[];
};

const valueFiles = import.meta.glob<{ values: Value[] }>("./layouts/values/*.json", { import: "default" });

export async function namesOf({ valueFiles: files = [], values = [] }: Layout): Promise<Names> {
  const loaded = await Promise.all(
    files.map((file) => {
      const load = valueFiles[`./layouts/values/${file}.json`];
      if (!load) throw new Error(`The layouts have no value file ${file}`);
      return load();
    }),
  );
  const names = new Map<string, string>();
  for (const { domain, index, name } of [...loaded.flatMap(({ values }) => values), ...values]) names.set(`${domain}:${index}`, name);
  return (domain, index) => names.get(`${domain}:${index}`);
}

const used = <T,>(list: List<T>) => list.slice(0, list.count ?? list.length);

const camel = (id: string) => id.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

function rangeName({ spaces = [], kinds = {} }: Layout, space: string, id: string) {
  const found = spaces.find(({ name }) => expand(name).includes(space));
  const ranges = found?.kind ? kinds[found.kind]?.ranges : found?.ranges;
  return ranges?.find((range) => range.id === id)?.name;
}

const pocketName = (range: string) => range.replace(/ \(part \d+\)$/, "").replace(/ pocket$/, "");

function pockets(layout: Layout) {
  const fields = layout.model?.root.fields.bag?.object?.fields ?? {};
  return Object.entries(fields).map(([id, { space, range }]) => {
    const name = space && range ? rangeName(layout, space, range) : undefined;
    return { key: camel(id), pocket: name ? pocketName(name) : id };
  });
}

export async function readValues(file: Uint8Array, layout: Layout): Promise<ValueReading> {
  // An unmapped layout has no ranges, and the pockets take their names from them.
  const known = (await knownLayout(layout.target)) ?? layout;
  const [save, names] = await Promise.all([readSave(file, layout) as Promise<ParsedSave>, namesOf(known)]);
  const item = (index: number, count: number): ItemReading => ({ index, name: names("item", index), count });

  const byPocket = new Map<string, ItemReading[]>();
  for (const { key, pocket } of pockets(known)) {
    const list = save.bag?.[key];
    if (!list) continue;
    const items = used(list).flatMap(({ item: index, count = 1 }) => (index ? [item(index, count)] : []));
    byPocket.set(pocket, [...(byPocket.get(pocket) ?? []), ...items]);
  }

  const holders = [
    ...used(save.party ?? []).map((pokemon, index) => ({ pokemon, slot: spaceTitle(`party:${index + 1}`) })),
    ...(save.boxes ?? []).flatMap(({ slots }, box) => used(slots).map((pokemon, index) => ({ pokemon, slot: spaceTitle(`box:${box + 1}:${index + 1}`) }))),
  ];
  const held = holders.flatMap(({ pokemon: { species, heldItem }, slot }) =>
    species && typeof heldItem === "number" && heldItem
      ? [{ slot, species: names("species", species) ?? `Species ${species}`, item: item(heldItem, 1) }]
      : [],
  );

  return { pouches: [...byPocket].map(([pocket, items]) => ({ pocket, items })), held };
}
