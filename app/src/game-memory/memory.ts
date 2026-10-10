import type { Range, ReadMemory } from "./builds";

export const PARTY_SIZE = 6;

export function slots(party: Uint8Array, size: number) {
  return Array.from({ length: PARTY_SIZE }, (_, i) => party.slice(i * size, (i + 1) * size));
}

export function view(bytes: Uint8Array) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export function u32(bytes: Uint8Array) {
  return view(bytes).getUint32(0, true);
}

export async function readEach(read: ReadMemory, ranges: Range[]) {
  if (!ranges.length) return [];
  const bytes = await read(ranges);
  let at = 0;
  return ranges.map(({ length }) => bytes.subarray(at, (at += length)));
}

export async function readNamed<K extends string>(read: ReadMemory, ranges: Record<K, Range>): Promise<Record<K, Uint8Array>> {
  const names = Object.keys(ranges) as K[];
  const bytes = await readEach(read, names.map((name) => ranges[name]));
  return Object.fromEntries(names.map((name, i) => [name, bytes[i]])) as Record<K, Uint8Array>;
}
