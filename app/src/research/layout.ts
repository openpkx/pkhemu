import { layouts } from "./layouts/parsers/detect.ts";
import { detectIn, expand } from "./layouts/tools/parser/runtime.ts";
import { uint, type Uint } from "./layouts/tools/steps/bytes.ts";

export const SCHEMA = "1.0";

export type LayoutRange = {
  id: string;
  offset: Uint;
  length: Uint;
  type: string;
  name: string;
  confidence: "known" | "guess";
  source: string;
  count?: Uint;
  stride?: Uint;
  bits?: { id: string; bit: number; width: number; name: string; domain?: string }[];
  domain?: string;
  note?: string;
};

export type LayoutSpace = { name: string; kind?: string; ranges?: LayoutRange[] };

export type Value = { domain: string; index: number; name: string };

type ModelField = { space?: string; range?: string; object?: { fields: Record<string, ModelField> } };

export type Layout = {
  schema: string;
  target: { kind: string; format: string; version: string; roms?: { sha1: string; name: string }[] };
  valueFiles?: string[];
  values?: Value[];
  kinds?: Record<string, { ranges: LayoutRange[] }>;
  spaces?: LayoutSpace[];
  model?: { root: ModelField & { fields: Record<string, ModelField> } };
};

export type Range = Omit<LayoutRange, "offset" | "length" | "count" | "stride"> & {
  offset: number;
  length: number;
  count?: number;
  stride?: number;
};

export type DecodedSpace = { name: string; bytes: Uint8Array; ranges: Range[] };

export type PickedLayout = { layout: Layout; checked: boolean };

type Parsed = { space(name: string): { bytes: Uint8Array } };

const files = import.meta.glob<Layout>("./layouts/known/*.json", { import: "default" });
const parsers = import.meta.glob<(file: Uint8Array) => Parsed>(["./layouts/parsers/*.ts", "!./layouts/parsers/detect.ts"], { import: "read" });

export const knownLayout = ({ format, version }: { format: string; version: string }) => files[`./layouts/known/${format}-${version}.json`]?.();

const parserOf = ({ target }: Layout) => parsers[`./layouts/parsers/${target.format}-${target.version}.ts`];

const newer = (a: string, b: string) => {
  const [x, y] = [a, b].map((version) => version.split(".").map(Number));
  for (let index = 0; index < Math.max(x.length, y.length); index++)
    if ((x[index] ?? 0) !== (y[index] ?? 0)) return (x[index] ?? 0) > (y[index] ?? 0);
  return false;
};

// Layouts don't mark a hack's format, so any other format counts as retail, whose known ranges a patched ROM may not keep.
const HACKS = ["unbound", "radicalred", "emerald-imperium", "heart-and-soul", "emerald-legacy"];

const unmapped = ({ kinds, spaces, ...layout }: Layout): Layout => ({
  ...layout,
  ...(kinds && { kinds: Object.fromEntries(Object.entries(kinds).map(([name, kind]) => [name, { ...kind, ranges: [] }])) }),
  ...(spaces && { spaces: spaces.map((space) => (space.ranges ? { ...space, ranges: [] } : space)) }),
});

const saveLayouts = layouts.filter(({ kind }) => kind === "save");

// A ROM layout can list the game's SHA-1 too, which would leave detection no save layout to try.
export const detectSave = (save: Uint8Array, romSha1?: string) => detectIn(saveLayouts, save, romSha1);

export async function pickLayout(save: Uint8Array, rom: { romSha1: string | null; romHack: boolean }): Promise<PickedLayout | undefined> {
  const found = detectSave(save, rom.romSha1 ?? undefined);
  if (found.length !== 1 || found[0].match !== "certain") return;
  const [{ format, version, by }] = found;
  const layout = await knownLayout({ format, version });
  if (!layout || newer(layout.schema, SCHEMA)) return;
  const checked = by === "rom";
  return { layout: rom.romHack && !checked && !HACKS.includes(format) ? unmapped(layout) : layout, checked };
}

function rangesOf(layout: Layout, space: LayoutSpace): Range[] {
  const ranges = space.kind ? layout.kinds?.[space.kind]?.ranges : (space.ranges ?? []);
  if (!ranges) throw new Error(`${space.name} names kind ${space.kind}, which the layout doesn't have`);
  return ranges.map(({ offset, length, count, stride, ...range }) => ({
    ...range,
    offset: uint(offset),
    length: uint(length),
    ...(count === undefined ? {} : { count: uint(count) }),
    ...(stride === undefined ? {} : { stride: uint(stride) }),
  }));
}

export async function readSave(file: Uint8Array, layout: Layout) {
  const parser = parserOf(layout);
  if (!parser) throw new Error(`${layout.target.format} ${layout.target.version} has no parser`);
  return (await parser())(file);
}

export async function decodeSpaces(file: Uint8Array, layout: Layout): Promise<DecodedSpace[]> {
  const save = await readSave(file, layout);
  return (layout.spaces ?? []).flatMap((space) => {
    const ranges = rangesOf(layout, space);
    return expand(space.name).map((name) => ({ name, bytes: save.space(name).bytes, ranges }));
  });
}
