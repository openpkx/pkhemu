import { equal, uint, view, type Uint } from "../steps/bytes.ts";
import { checksumSize, decode, encode, writeChecksum, type ChecksumName, type TransformName } from "../steps/index.ts";

export type NumberType = "u8" | "i8" | "u16le" | "i16le" | "u16be" | "u32le" | "i32le" | "u32be" | "i32be" | "f32be" | "f64be";
export type TextType = "text-gen3-intl" | "text-gen3-jpn" | "text-gen3-gc";
export type Type = NumberType | "u64le" | "flags" | "bytes" | TextType;

export interface Region {
  space: string;
  start: Uint;
  end: Uint;
}

export interface SpaceDef {
  name: string;
  length: Uint;
  transform?: TransformName;
  args?: Record<string, unknown>;
  source?: { regions: Region[]; offset: Uint; stride?: Uint; length?: Uint };
  checksums?: { step: ChecksumName; start: Uint; end: Uint; at?: Uint }[];
}

export interface ContainerDef {
  transform: TransformName;
  args?: Record<string, unknown>;
}

export interface Read {
  space: string;
  offset: number;
  type: Type;
  length: number;
  bit?: number;
  width?: number;
}

export interface At {
  space: string;
  index: number;
  offset: number;
}

const containers: Partial<Record<TransformName, TransformName>> = { "gen3-sections": "gen3-slots" };

const placeholder = /^\{(\d+)\.\.(\d+)\}$/;

export function expand(pattern: string): string[] {
  return pattern.split(":").reduce<string[]>(
    (names, part) => {
      const found = placeholder.exec(part);
      const parts = found ? Array.from({ length: +found[2] - +found[1] + 1 }, (_, i) => String(+found[1] + i)) : [part];
      return names.flatMap((name) => parts.map((each) => (name === "" ? each : `${name}:${each}`)));
    },
    [""],
  );
}

function indexIn(pattern: string, name: string): number | undefined {
  const parts = pattern.split(":");
  const values = name.split(":");
  if (parts.length !== values.length) return undefined;
  let index = 0;
  for (let i = 0; i < parts.length; i++) {
    const found = placeholder.exec(parts[i]);
    if (!found) {
      if (parts[i] !== values[i]) return undefined;
      continue;
    }
    const [first, last, value] = [+found[1], +found[2], Number(values[i])];
    if (!/^\d+$/.test(values[i]) || value < first || value > last) return undefined;
    index = index * (last - first + 1) + value - first;
  }
  return index;
}

export const sizes: Record<NumberType, number> = {
  u8: 1, i8: 1, u16le: 2, i16le: 2, u16be: 2, u32le: 4, i32le: 4, u32be: 4, i32be: 4, f32be: 4, f64be: 8,
};
const signed = (type: NumberType) => type.startsWith("i");
const little = (type: NumberType) => !type.endsWith("be");
const float = (type: NumberType) => type.startsWith("f");

function getNumber(bytes: Uint8Array, at: number, type: NumberType) {
  const data = view(bytes);
  const size = sizes[type];
  if (float(type)) return size === 4 ? data.getFloat32(at, little(type)) : data.getFloat64(at, little(type));
  if (size === 1) return signed(type) ? data.getInt8(at) : data.getUint8(at);
  if (size === 2) return signed(type) ? data.getInt16(at, little(type)) : data.getUint16(at, little(type));
  return signed(type) ? data.getInt32(at, little(type)) : data.getUint32(at, little(type));
}

function setNumber(bytes: Uint8Array, at: number, type: NumberType, value: number) {
  const bits = sizes[type] * 8;
  if (float(type)) {
    if (!Number.isFinite(value) || (bits === 32 && Math.fround(value) !== value)) throw new Error(`${value} doesn't fit in ${type}`);
    return bits === 32 ? view(bytes).setFloat32(at, value, little(type)) : view(bytes).setFloat64(at, value, little(type));
  }
  const [min, max] = signed(type) ? [-(2 ** (bits - 1)), 2 ** (bits - 1) - 1] : [0, 2 ** bits - 1];
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${value} doesn't fit in ${type}`);
  const data = view(bytes);
  if (bits === 8) data.setUint8(at, value & 0xff);
  else if (bits === 16) data.setUint16(at, value & 0xffff, little(type));
  else data.setUint32(at, value >>> 0, little(type));
}

const mask = (width: number) => 2 ** width - 1;

function littleEndian(value: number, length: number) {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) bytes[i] = Math.floor(value / 2 ** (8 * i)) & 0xff;
  return bytes;
}

const fromLittleEndian = (bytes: Uint8Array) => bytes.reduce((value, byte, i) => value + byte * 2 ** (8 * i), 0);

interface Decoded {
  bytes: Uint8Array;
  original: Uint8Array;
}

export class Store {
  readonly #file: Uint8Array;
  readonly #defs: SpaceDef[];
  readonly #chain: ContainerDef[];
  readonly #spaces = new Map<string, Decoded>();
  readonly #containers = new Map<TransformName, Uint8Array>();
  #levels?: Uint8Array[];

  constructor(file: Uint8Array, defs: SpaceDef[], chain: ContainerDef[] = []) {
    this.#file = file.slice();
    this.#defs = defs;
    this.#chain = chain;
  }

  // The file, then what each container transform decodes from the one before.
  #layers() {
    if (!this.#levels) {
      const levels = [this.#file];
      for (const { transform, args } of this.#chain) levels.push(decode(transform, levels.at(-1)!, args ?? {}) as Uint8Array);
      this.#levels = levels;
    }
    return this.#levels;
  }

  #save() {
    return this.#layers().at(-1)!;
  }

  #def(name: string) {
    for (const def of this.#defs) {
      const index = indexIn(def.name, name);
      if (index !== undefined) return { def, index };
    }
    throw new Error(`the layout has no space ${name}`);
  }

  #container(transform: TransformName) {
    if (!this.#containers.has(transform)) this.#containers.set(transform, decode(transform, this.#save()) as Uint8Array);
    return this.#containers.get(transform)!;
  }

  #pieces(def: SpaceDef, index: number) {
    const { regions, offset, stride = 0, length: stored = def.length } = def.source!;
    let start = uint(offset) + index * uint(stride);
    let length = uint(stored);
    const pieces: { space: string; at: number; length: number; into: number }[] = [];
    for (const region of regions) {
      const size = uint(region.end) - uint(region.start);
      if (start >= size) {
        start -= size;
        continue;
      }
      const taken = Math.min(size - start, length);
      pieces.push({ space: region.space, at: uint(region.start) + start, length: taken, into: uint(stored) - length });
      length -= taken;
      start = 0;
      if (!length) break;
    }
    if (length) throw new Error(`${def.name} runs past its source`);
    return pieces;
  }

  #args(def: SpaceDef) {
    const checksum = def.checksums?.find(({ at }) => at === undefined);
    return { ...def.args, length: def.length, ...(checksum && { checksum: { step: checksum.step, start: checksum.start, end: checksum.end } }) };
  }

  #decode(name: string) {
    const { def, index } = this.#def(name);
    if (def.source) {
      const stored = new Uint8Array(uint(def.source.length ?? def.length));
      for (const piece of this.#pieces(def, index)) stored.set(this.bytes(piece.space).subarray(piece.at, piece.at + piece.length), piece.into);
      return def.transform ? (decode(def.transform, stored, def.args) as Uint8Array) : stored;
    }
    if (!def.transform) {
      const save = this.#save();
      if (save.length !== uint(def.length)) throw new Error(`${name} is ${uint(def.length)} bytes, not ${save.length}`);
      return save.slice();
    }
    const container = containers[def.transform];
    const input = container ? this.#container(container) : this.#save();
    return decode(def.transform, input, this.#args(def)) as Uint8Array;
  }

  bytes(space: string): Uint8Array {
    let decoded = this.#spaces.get(space);
    if (!decoded) {
      const bytes = this.#decode(space);
      decoded = { bytes, original: bytes.slice() };
      this.#spaces.set(space, decoded);
    }
    return decoded.bytes;
  }

  write(): Uint8Array {
    const written = new Map<string, Uint8Array>();
    const current = (name: string) => written.get(name) ?? this.bytes(name);
    const changed = (name: string) => !equal(current(name), this.#spaces.get(name)!.original);
    const writable = (name: string) => {
      if (!written.has(name)) written.set(name, this.bytes(name).slice());
      return written.get(name)!;
    };
    for (const name of [...this.#spaces.keys()].filter((name) => this.#def(name).def.source)) {
      if (!changed(name)) continue;
      const { def, index } = this.#def(name);
      const pieces = this.#pieces(def, index);
      const previous = new Uint8Array(uint(def.source!.length ?? def.length));
      for (const piece of pieces) previous.set(current(piece.space).subarray(piece.at, piece.at + piece.length), piece.into);
      const value = this.#checksummed(def, current(name));
      const stored = def.transform ? encode(def.transform, value, def.args, previous) : value;
      for (const piece of pieces) writable(piece.space).set(stored.subarray(piece.into, piece.into + piece.length), piece.at);
    }
    const decoded = new Map<TransformName, Uint8Array>();
    const direct: [SpaceDef, Uint8Array][] = [];
    for (const name of [...this.#spaces.keys()].filter((name) => !this.#def(name).def.source)) {
      if (!changed(name)) continue;
      const { def } = this.#def(name);
      const value = this.#checksummed(def, current(name));
      const container = def.transform && containers[def.transform];
      if (!container) direct.push([def, value]);
      else decoded.set(container, encode(def.transform!, value, this.#args(def), decoded.get(container) ?? this.#container(container)));
    }
    const levels = this.#layers();
    if (!decoded.size && !direct.length) return this.#file.slice();
    let save: Uint8Array = levels.at(-1)!.slice();
    for (const [transform, bytes] of decoded) save = encode(transform, bytes, {}, save);
    for (const [def, value] of direct) save = def.transform ? encode(def.transform, value, this.#args(def), save) : value.slice();
    return this.#chain.reduceRight((inner, { transform, args }, i) => encode(transform, inner, args ?? {}, levels[i]), save);
  }

  #checksummed(def: SpaceDef, bytes: Uint8Array) {
    const ranged = (def.checksums ?? []).filter(({ at }) => at !== undefined);
    return ranged.reduce((value, { step, start, end, at }, i) => {
      const zeroed = value.slice();
      for (const later of ranged.slice(i + 1)) zeroed.fill(0, uint(later.at!), uint(later.at!) + checksumSize(later.step));
      return writeChecksum(step, zeroed, { start, end, at: at! });
    }, bytes);
  }

  #at(read: Read) {
    return this.bytes(read.space).subarray(read.offset, read.offset + read.length);
  }

  number(read: Read): number {
    const value = getNumber(this.#at(read), 0, read.type as NumberType);
    if (read.bit === undefined) return value;
    return Math.floor((value >>> 0) / 2 ** read.bit) % 2 ** read.width!;
  }

  setNumber(read: Read, value: number) {
    if (read.bit === undefined) return setNumber(this.#at(read), 0, read.type as NumberType, value);
    const width = read.width!;
    if (!Number.isInteger(value) || value < 0 || value > mask(width)) throw new Error(`${value} doesn't fit in ${width} bits`);
    const whole = getNumber(this.#at(read), 0, read.type as NumberType) >>> 0;
    const shift = 2 ** read.bit;
    setNumber(this.#at(read), 0, read.type as NumberType, whole - (Math.floor(whole / shift) % 2 ** width) * shift + value * shift);
  }

  bigint(read: Read): bigint {
    return view(this.#at(read)).getBigUint64(0, true);
  }

  setBigint(read: Read, value: bigint) {
    if (value < 0n || value >= 1n << 64n) throw new Error(`${value} doesn't fit in u64le`);
    view(this.#at(read)).setBigUint64(0, value, true);
  }

  text(read: Read): string {
    return decode(read.type as TextType, this.#at(read)) as string;
  }

  setText(read: Read, value: string) {
    const at = this.#at(read);
    at.set(encode(read.type as TextType, value, {}, at));
  }

  raw(read: Read): Uint8Array {
    return this.#at(read).slice();
  }

  setRaw(read: Read, value: Uint8Array) {
    if (value.length !== read.length) throw new Error(`the range is ${read.length} bytes, not ${value.length}`);
    this.#at(read).set(value);
  }

  flags(read: Read): readonly boolean[] {
    return Object.freeze(Array.from({ length: read.length * 8 }, (_, i) => (this.#at(read)[i >> 3] & (1 << (i & 7))) !== 0));
  }

  setFlags(read: Read, value: readonly boolean[]) {
    if (value.length !== read.length * 8) throw new Error(`the range holds ${read.length * 8} flags, not ${value.length}`);
    const at = this.#at(read);
    value.forEach((flag, i) => (at[i >> 3] = flag ? at[i >> 3] | (1 << (i & 7)) : at[i >> 3] & ~(1 << (i & 7))));
  }

  #stored(read: Read) {
    return read.bit === undefined ? this.raw(read) : littleEndian(this.number(read), Math.ceil(read.width! / 8));
  }

  xorKey(value: Read, key: Read): number {
    return fromLittleEndian(decode("xor-key", this.#stored(value), { key: this.number(key) }) as Uint8Array);
  }

  setXorKey(value: Read, key: Read, number: number) {
    const length = value.bit === undefined ? value.length : Math.ceil(value.width! / 8);
    if (!Number.isInteger(number) || number < 0 || number >= 2 ** (8 * length)) throw new Error(`${number} doesn't fit in ${length} bytes`);
    const stored = encode("xor-key", littleEndian(number, length), { key: this.number(key) }, this.#stored(value));
    if (value.bit === undefined) this.setRaw(value, stored);
    else this.setNumber(value, fromLittleEndian(stored));
  }
}

export function repeat<T>(count: number, element: (i: number) => T): readonly T[] {
  return Object.freeze(Array.from({ length: count }, (_, i) => element(i)));
}

export function setEach<T>(count: number, values: readonly T[], set: (value: T, i: number) => void) {
  if (values.length !== count) throw new Error(`the range has ${count} elements, not ${values.length}`);
  values.forEach(set);
}

export type Counted<T> = readonly T[] & { count: number };

export function counted<T>(elements: readonly T[], store: Store, length: Read): Counted<T> {
  return Object.defineProperty(elements, "count", {
    get: () => store.number(length),
    set: (value: number) => {
      if (value > elements.length) throw new Error(`the list holds ${elements.length}, not ${value}`);
      store.setNumber(length, value);
    },
  }) as unknown as Counted<T>;
}

export function spaceView<T>(store: Store, name: string, views: [string, new (store: Store, space: string) => T][]): T {
  for (const [pattern, View] of views) if (indexIn(pattern, name) !== undefined) return new View(store, name);
  throw new Error(`the layout has no space ${name}`);
}
