import { view } from "./bytes.ts";
import type { Transform } from "./step.ts";

const ORDERS = [
  "GAEM", "GAME", "GEAM", "GEMA", "GMAE", "GMEA", "AGEM", "AGME", "AEGM", "AEMG", "AMGE", "AMEG",
  "EGAM", "EGMA", "EAGM", "EAMG", "EMGA", "EMAG", "MGAE", "MGEA", "MAGE", "MAEG", "MEGA", "MEAG",
];
const DECODED = "GAEM";
const BLOCKS = 0x20;
const BLOCK = 12;

function crypt(input: Uint8Array, toStored: boolean) {
  if (input.length !== 80 && input.length !== 100) throw new Error(`pk3-crypt takes 80 or 100 bytes, not ${input.length}`);
  const from = view(input);
  const pid = from.getUint32(0, true);
  const key = (pid ^ from.getUint32(4, true)) >>> 0;
  const output = input.slice();
  const to = view(output);
  const stored = ORDERS[pid % 24];
  for (let block = 0; block < 4; block++) {
    const source = toStored ? DECODED.indexOf(stored[block]) : stored.indexOf(DECODED[block]);
    for (let word = 0; word < BLOCK; word += 4)
      to.setUint32(BLOCKS + block * BLOCK + word, (from.getUint32(BLOCKS + source * BLOCK + word, true) ^ key) >>> 0, true);
  }
  return output;
}

export const pk3Crypt: Transform<Uint8Array, Record<string, never>> = {
  kind: "transform",
  decode: (input) => crypt(input, false),
  encode: (value) => crypt(value, true),
};
