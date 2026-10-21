import { view } from "./bytes.ts";
import type { Transform } from "./step.ts";

const POSITIONS = [
  [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 3, 1, 2], [0, 2, 3, 1], [0, 3, 2, 1],
  [1, 0, 2, 3], [1, 0, 3, 2], [2, 0, 1, 3], [3, 0, 1, 2], [2, 0, 3, 1], [3, 0, 2, 1],
  [1, 2, 0, 3], [1, 3, 0, 2], [2, 1, 0, 3], [3, 1, 0, 2], [2, 3, 0, 1], [3, 2, 0, 1],
  [1, 2, 3, 0], [1, 3, 2, 0], [2, 1, 3, 0], [3, 1, 2, 0], [2, 3, 1, 0], [3, 2, 1, 0],
];
const HEADER = 8;

function lcrng(bytes: Uint8Array, start: number, end: number, seed: number) {
  const data = view(bytes);
  for (let at = start; at + 1 < end; at += 2) {
    seed = (Math.imul(seed, 0x41c64e6d) + 0x6073) >>> 0;
    data.setUint16(at, data.getUint16(at, true) ^ (seed >>> 16), true);
  }
}

interface Format {
  name: string;
  block: number;
  lengths: number[];
  seed: (data: DataView) => number;
}

function crypt({ name, block, lengths, seed }: Format, input: Uint8Array, toStored: boolean) {
  if (!lengths.includes(input.length)) throw new Error(`${name} takes ${lengths.join(" or ")} bytes, not ${input.length}`);
  const data = view(input);
  const pid = data.getUint32(0, true);
  const stored = HEADER + 4 * block;
  const positions = POSITIONS[((pid >>> 13) & 31) % 24];
  const output = input.slice();
  if (toStored) {
    for (let b = 0; b < 4; b++) output.set(input.subarray(HEADER + b * block, HEADER + (b + 1) * block), HEADER + positions[b] * block);
    lcrng(output, HEADER, stored, seed(data));
  } else {
    const plain = input.slice(HEADER, stored);
    lcrng(plain, 0, plain.length, seed(data));
    for (let b = 0; b < 4; b++) output.set(plain.subarray(positions[b] * block, (positions[b] + 1) * block), HEADER + b * block);
  }
  lcrng(output, stored, output.length, pid);
  return output;
}

function step(format: Format): Transform<Uint8Array, Record<string, never>> {
  return { kind: "transform", decode: (input) => crypt(format, input, false), encode: (value) => crypt(format, value, true) };
}

export const pk45Crypt = step({ name: "pk45-crypt", block: 32, lengths: [136, 220, 236], seed: (data) => data.getUint16(6, true) });
export const pk67Crypt = step({ name: "pk67-crypt", block: 56, lengths: [232, 260], seed: (data) => data.getUint32(0, true) });
