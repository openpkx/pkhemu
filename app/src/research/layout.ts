import { expand } from "./layouts/tools/parser/runtime.ts";
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

export type Layout = {
  schema: string;
  target: { kind: string; format: string; version: string; roms?: { sha1: string; name: string }[] };
  kinds?: Record<string, { ranges: LayoutRange[] }>;
  spaces?: LayoutSpace[];
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
const parsers = import.meta.glob<(file: Uint8Array) => Parsed>("./layouts/parsers/*.ts", { import: "read" });

const parserOf = ({ target }: Layout) => parsers[`./layouts/parsers/${target.format}-${target.version}.ts`];

export const knownLayouts = async () => (await Promise.all(Object.values(files).map((load) => load()))).filter(parserOf);

const newer = (a: string, b: string) => {
  const [x, y] = [a, b].map((version) => version.split(".").map(Number));
  for (let index = 0; index < Math.max(x.length, y.length); index++)
    if ((x[index] ?? 0) !== (y[index] ?? 0)) return (x[index] ?? 0) > (y[index] ?? 0);
  return false;
};

const readable = ({ schema, target }: Layout) => target.kind === "save" && !newer(schema, SCHEMA);

const RETAIL: Record<number, string> = { 1: "rs", 2: "rs", 3: "emerald", 4: "frlg", 5: "frlg" };

const retailFormat = (layout: Layout) => Object.values(RETAIL).includes(layout.target.format);

const unmapped = ({ kinds, spaces, ...layout }: Layout): Layout => ({
  ...layout,
  ...(kinds && { kinds: Object.fromEntries(Object.entries(kinds).map(([name, kind]) => [name, { ...kind, ranges: [] }])) }),
  ...(spaces && { spaces: spaces.map((space) => (space.ranges ? { ...space, ranges: [] } : space)) }),
});

export function pickLayout(layouts: Layout[], game: { format: string; romSha1: string; romHack?: boolean }): PickedLayout | undefined {
  const romSha1 = game.romSha1.toLowerCase();
  const candidates = layouts.filter(readable);
  const checked = candidates.find(({ target }) => target.roms?.some(({ sha1 }) => sha1 === romSha1));
  const fallback = candidates.filter(({ target }) => target.format === game.format).reduce<Layout | undefined>(
    (newest, layout) => (newest && !newer(layout.target.version, newest.target.version) ? newest : layout),
    undefined,
  );
  const picked = checked ? { layout: checked, checked: true } : fallback && { layout: fallback, checked: false };
  return picked && game.romHack && retailFormat(picked.layout) ? { layout: unmapped(picked.layout), checked: false } : picked;
}

export function layoutFormat(version: { versionId: number; formatId: string | null }) {
  return version.formatId ?? RETAIL[version.versionId];
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
