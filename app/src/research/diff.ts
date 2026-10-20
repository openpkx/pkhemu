import type { EngineReading, ItemReading } from "./host";
import type { DecodedSpace, Range } from "./spaces";
import { bytesText, hex, plural } from "./text";

export type KnownRange = Omit<Range, "count" | "stride">;

export type Space = { name: string; before: Uint8Array; after: Uint8Array; ranges: KnownRange[]; rangeIndex: Int32Array };

export type RangeCandidate = { kind: "range"; id: string; space: Space; start: number; end: number; bytes: number[] };
export type KnownChange = KnownRange & { kind: "known"; id: string; space: Space; bytes: number[] };
export type SpaceChange = RangeCandidate | KnownChange;
export type ValueCandidate = {
  kind: "value";
  id: string;
  domain: "item";
  index: number;
  pocket?: string;
  holder?: { slot: string; species: string };
  before: number;
  after: number;
};
export type Change = SpaceChange | ValueCandidate;

export type SpaceChanges = { space: Space; candidates: RangeCandidate[]; known: KnownChange[] };

const GAP = 8;

function expand(ranges: Range[], length: number) {
  return ranges.flatMap(({ count = 1, stride = 0, ...range }) =>
    Array.from({ length: count }, (_, index) => ({
      ...range,
      offset: range.offset + index * stride,
      name: count > 1 ? `${range.name} ${index + 1}` : range.name,
    })).filter(({ offset }) => offset < length),
  );
}

export function space(name: string, before: Uint8Array, after: Uint8Array, layoutRanges: Range[]): Space {
  const ranges = expand(layoutRanges, after.length).sort((a, b) => a.offset - b.offset);
  const rangeIndex = new Int32Array(after.length).fill(-1);
  ranges.forEach(({ offset, length }, index) => rangeIndex.fill(index, offset, Math.min(offset + length, after.length)));
  return { name, before, after, ranges, rangeIndex };
}

export const rangeAt = (space: Space, offset: number): KnownRange | undefined => space.ranges[space.rangeIndex[offset]];

function runs(offsets: number[], rangeIndex: Int32Array) {
  const found: number[][] = [];
  for (const offset of offsets) {
    const last = found.at(-1);
    const end = last?.at(-1);
    if (last && end !== undefined && offset - end - 1 < GAP && rangeIndex.subarray(end, offset).every((index) => index < 0)) last.push(offset);
    else found.push([offset]);
  }
  return found;
}

export function diffSpaces(before: DecodedSpace[], after: DecodedSpace[]): SpaceChanges[] {
  const old = new Map(before.map((decoded) => [decoded.name, decoded.bytes]));
  return after.flatMap((decoded) => {
    const was = old.get(decoded.name);
    if (!was) return [];
    const changed: number[] = [];
    for (let offset = 0; offset < decoded.bytes.length; offset++) if (was[offset] !== decoded.bytes[offset]) changed.push(offset);
    if (!changed.length) return [];

    const pair = space(decoded.name, was, decoded.bytes, decoded.ranges);
    const known = new Map<number, number[]>();
    const unmapped: number[] = [];
    for (const offset of changed) {
      const index = pair.rangeIndex[offset];
      if (index < 0) unmapped.push(offset);
      else known.set(index, [...(known.get(index) ?? []), offset]);
    }
    return [
      {
        space: pair,
        candidates: runs(unmapped, pair.rangeIndex).map(
          (bytes): RangeCandidate => ({ kind: "range", id: `${pair.name}#${bytes[0]}`, space: pair, start: bytes[0], end: bytes.at(-1)! + 1, bytes }),
        ),
        known: [...known].map(([index, bytes]): KnownChange => {
          const range = pair.ranges[index];
          return { ...range, kind: "known", id: `${pair.name}@${range.offset}`, space: pair, bytes };
        }),
      },
    ];
  });
}

type Unnamed = Pick<ValueCandidate, "index" | "pocket" | "holder"> & { count: number };

function unnamed({ pouches, held }: EngineReading) {
  const found = new Map<string, Unnamed>();
  const add = (key: string, { index, name, count }: ItemReading, where: Omit<Unnamed, "index" | "count">) => {
    if (name !== undefined || !index) return;
    const id = `${key}:${index}`;
    const was = found.get(id);
    found.set(id, { index, ...where, ...was, count: (was?.count ?? 0) + count });
  };
  for (const { pocket, items } of pouches) for (const item of items) add(`pocket:${pocket}`, item, { pocket });
  for (const { slot, species, item } of held) add("held", item, { holder: { slot, species } });
  return found;
}

export function diffReadings(before: EngineReading, after: EngineReading): ValueCandidate[] {
  const was = unnamed(before);
  const now = unnamed(after);
  return [...new Set([...was.keys(), ...now.keys()])]
    .flatMap((id): ValueCandidate[] => {
      const old = was.get(id);
      const current = now.get(id);
      const { count: _, ...item } = (current ?? old)!;
      const counts = { before: old?.count ?? 0, after: current?.count ?? 0 };
      return counts.before === counts.after ? [] : [{ kind: "value", id: `item@${id}`, domain: "item", ...item, ...counts }];
    })
    .sort((a, b) => Number(a.before > 0) - Number(b.before > 0) || a.index - b.index);
}

export function spaceTitle(name: string) {
  const [kind, ...numbers] = name.split(":");
  if (kind === "party") return `Party slot ${numbers[0]}`;
  if (kind === "box") return `Box ${numbers[0]}, slot ${numbers[1]}`;
  return [kind[0].toUpperCase() + kind.slice(1), ...numbers].join(" ");
}

export const runName = ({ start, end }: RangeCandidate) => (end - start === 1 ? hex(start) : `${hex(start)}–${hex(end - 1)}`);

export const SHORT = 4;

export const knownValue = ({ space, offset, length }: KnownChange, which: "before" | "after") => bytesText(space[which].subarray(offset, offset + length));

export const knownChanged = ({ length, bytes }: KnownChange) => `${bytes.length} of ${plural(length, "byte")} changed`;

export const valueName = ({ index }: ValueCandidate) => `Item ${index}`;

export const valueWhere = ({ pocket, holder }: ValueCandidate) => pocket ?? `Held by ${holder?.species}`;
