import { uint, view, type Uint } from "./bytes.ts";
import type { ReadStep } from "./step.ts";

export type EntryCheck =
  | { any: EntryCheck[] }
  | { offset: Uint; type: string; length?: Uint; equals?: Uint | Uint[]; not?: Uint | Uint[]; zero?: boolean; pointer?: true };

export type TableArgs = { pointer: Uint; length: Uint } & ({ count: number } | { checks: EntryCheck[] });

const ROM = 0x08000000;

export function pointsTo(rom: Uint8Array, at: number): number | undefined {
  if (at < 0 || at + 4 > rom.length) return undefined;
  const offset = view(rom).getUint32(at, true) - ROM;
  return offset >= 0 && offset < rom.length ? offset : undefined;
}

export const checkSizes: Record<string, number> = { u8: 1, i8: 1, u16le: 2, i16le: 2, u16be: 2, u32le: 4, i32le: 4, u32be: 4, i32be: 4 };

function number(bytes: Uint8Array, type: string) {
  const data = view(bytes);
  if (type === "u8") return data.getUint8(0);
  if (type === "i8") return data.getInt8(0);
  if (type === "u16le" || type === "u16be") return data.getUint16(0, type === "u16le");
  if (type === "i16le") return data.getInt16(0, true);
  if (type === "u32le" || type === "u32be") return data.getUint32(0, type === "u32le");
  return data.getInt32(0, type === "i32le");
}

const numbers = (value: Uint | Uint[]) => (Array.isArray(value) ? value : [value]).map(uint);

function passes(rom: Uint8Array, entry: number, length: number, check: EntryCheck): boolean {
  if ("any" in check) return check.any.some((each) => passes(rom, entry, length, each));
  const at = entry + uint(check.offset);
  const size = uint(check.length ?? checkSizes[check.type]);
  if (uint(check.offset) + size > length) return false;
  const bytes = rom.subarray(at, at + size);
  if (check.pointer) return pointsTo(rom, at) !== undefined;
  if (check.zero !== undefined) return bytes.every((byte) => byte === 0) === check.zero;
  const value = number(bytes, check.type);
  return check.equals !== undefined ? numbers(check.equals).includes(value) : !numbers(check.not!).includes(value);
}

export function tableStart(rom: Uint8Array, pointer: Uint) {
  const start = pointsTo(rom, uint(pointer));
  if (start === undefined) throw new Error(`the pointer at ${pointer} doesn't point inside the ROM`);
  return start;
}

const entryPasses = (rom: Uint8Array, entry: number, length: number, checks: EntryCheck[]) =>
  entry + length <= rom.length && checks.every((check) => passes(rom, entry, length, check));

export function tableFits(rom: Uint8Array, args: { pointer: Uint; length: Uint; checks: EntryCheck[] }, entries: number) {
  const start = pointsTo(rom, uint(args.pointer));
  const length = uint(args.length);
  return start !== undefined && Array.from({ length: entries }, (_, i) => start + i * length).every((entry) => entryPasses(rom, entry, length, args.checks));
}

export const romTable: ReadStep<Uint8Array, TableArgs> = {
  kind: "read",
  decode(rom, args) {
    const start = tableStart(rom, args.pointer);
    const length = uint(args.length);
    let count = 0;
    if ("count" in args) {
      count = args.count;
      if (start + count * length > rom.length) throw new Error(`${count} entries of ${length} bytes run past the ROM`);
    } else while (entryPasses(rom, start + count * length, length, args.checks)) count++;
    return rom.slice(start, start + count * length);
  },
};
