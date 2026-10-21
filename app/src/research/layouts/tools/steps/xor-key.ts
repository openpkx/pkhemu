import { uint, type Uint } from "./bytes.ts";
import type { Transform } from "./step.ts";

function xor(input: Uint8Array, { key }: { key: Uint }) {
  if (input.length > 4) throw new Error(`xor-key takes up to 4 bytes, not ${input.length}`);
  const word = uint(key);
  return input.map((byte, i) => byte ^ ((word >>> (8 * i)) & 0xff));
}

export const xorKey: Transform<Uint8Array, { key: Uint }> = { kind: "transform", decode: xor, encode: xor };
