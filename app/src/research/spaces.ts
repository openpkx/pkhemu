import { uint, type Layout, type LayoutRange, type LayoutSpace } from "./layout";
import { gen3Sections, pk3Crypt, type Gen3SectionsArgs } from "./transforms";

export type Range = Omit<LayoutRange, "offset" | "length" | "count" | "stride"> & {
  offset: number;
  length: number;
  count?: number;
  stride?: number;
};

export type DecodedSpace = { name: string; bytes: Uint8Array; ranges: Range[] };

export function spaceNames(pattern: string) {
  const [prefix, ...parts] = pattern.split(":");
  return parts.reduce(
    (names, part) => {
      const placeholder = part.match(/^\{(\d+)\.\.(\d+)\}$/);
      const values = placeholder
        ? Array.from({ length: Number(placeholder[2]) - Number(placeholder[1]) + 1 }, (_, index) => Number(placeholder[1]) + index)
        : [Number(part)];
      return names.flatMap((name) => values.map((value) => `${name}:${value}`));
    },
    [prefix],
  );
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

function joinRegions(space: LayoutSpace, decoded: Map<string, Uint8Array>) {
  const parts = space.source!.regions.map(({ space: name, start, end }) => {
    const bytes = decoded.get(name);
    if (!bytes) throw new Error(`${space.name} reads from ${name}, which the layout doesn't decode first`);
    return bytes.subarray(uint(start), uint(end));
  });
  const joined = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
  parts.reduce((at, part) => (joined.set(part, at), at + part.length), 0);
  return joined;
}

export function decodeSpaces(save: Uint8Array, layout: Layout): DecodedSpace[] {
  const decoded = new Map<string, Uint8Array>();
  const decode = (space: LayoutSpace) => {
    const length = uint(space.length);
    if (!space.source) {
      if (space.transform !== "gen3-sections") throw new Error(`${space.name} needs a source or the gen3-sections transform`);
      return spaceNames(space.name).map((name) => [name, gen3Sections(save, space.args as Gen3SectionsArgs, length)] as const);
    }
    const joined = joinRegions(space, decoded);
    const offset = uint(space.source.offset);
    const stride = uint(space.source.stride ?? 0);
    return spaceNames(space.name).map((name, index) => {
      const start = offset + index * stride;
      if (start + length > joined.length) throw new Error(`${name} ends past its source`);
      const bytes = joined.slice(start, start + length);
      return [name, space.transform === "pk3-crypt" ? pk3Crypt(bytes) : bytes] as const;
    });
  };

  const spaces = layout.spaces ?? [];
  const byLayoutSpace = new Map<LayoutSpace, (readonly [string, Uint8Array])[]>();
  for (const space of [...spaces.filter(({ source }) => !source), ...spaces.filter(({ source }) => source)]) {
    const decodedSpaces = decode(space);
    for (const [name, bytes] of decodedSpaces) decoded.set(name, bytes);
    byLayoutSpace.set(space, decodedSpaces);
  }
  return spaces.flatMap((space) => {
    const ranges = rangesOf(layout, space);
    return byLayoutSpace.get(space)!.map(([name, bytes]) => ({ name, bytes, ranges }));
  });
}
