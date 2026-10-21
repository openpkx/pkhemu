import { view } from "./bytes.ts";
import type { Transform } from "./step.ts";

const STORED = 58;
const DECODED = 80;
const COPIED = [
  { stored: 0x00, decoded: 0x00, length: 0x1c },
  { stored: 0x1c, decoded: 0x20, length: 0x0b },
  { stored: 0x2c, decoded: 0x38, length: 6 },
  { stored: 0x32, decoded: 0x44, length: 8 },
];
const PACKED = 0x27;
const MOVES = 0x2c;
const MOVE = 2 ** 10;

function check(input: Uint8Array, length: number, what: string) {
  if (input.length !== length) throw new Error(`cfru-box ${what} ${length} bytes, not ${input.length}`);
}

export const cfruBox: Transform<Uint8Array, Record<string, never>> = {
  kind: "transform",
  decode(input) {
    check(input, STORED, "decodes");
    const output = new Uint8Array(DECODED);
    for (const { stored, decoded, length } of COPIED) output.set(input.subarray(stored, stored + length), decoded);
    const packed = input.subarray(PACKED, PACKED + 5).reduce((value, byte, i) => value + byte * 2 ** (8 * i), 0);
    const moves = view(output);
    for (let i = 0; i < 4; i++) moves.setUint16(MOVES + 2 * i, Math.floor(packed / MOVE ** i) % MOVE, true);
    return output;
  },
  encode(value) {
    check(value, DECODED, "encodes");
    const output = new Uint8Array(STORED);
    for (const { stored, decoded, length } of COPIED) output.set(value.subarray(decoded, decoded + length), stored);
    const moves = view(value);
    let packed = 0;
    for (let i = 0; i < 4; i++) {
      const move = moves.getUint16(MOVES + 2 * i, true);
      if (move >= MOVE) throw new Error(`move ${move} doesn't fit in 10 bits`);
      packed += move * MOVE ** i;
    }
    for (let i = 0; i < 5; i++) output[PACKED + i] = Math.floor(packed / 2 ** (8 * i)) % 256;
    return output;
  },
};
