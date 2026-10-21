import { view } from "./bytes.ts";
import { sha1 } from "./checksums.ts";
import type { Transform } from "./step.ts";

const FIRST_SLOT = 0x6000;

function newest(file: Uint8Array, size: number, count: number, name: string) {
  if (file.length !== FIRST_SLOT + size * count) throw new Error(`${name} takes ${FIRST_SLOT + size * count} bytes, not ${file.length}`);
  const data = view(file);
  let best = 0;
  for (let slot = 1; slot < count; slot++) if (data.getInt32(FIRST_SLOT + slot * size + 4) > data.getInt32(FIRST_SLOT + best * size + 4)) best = slot;
  return FIRST_SLOT + best * size;
}

function slots(size: number, count: number, name: string, crypt: (slot: Uint8Array, decrypt: boolean) => Uint8Array): Transform<Uint8Array, Record<string, never>> {
  return {
    kind: "transform",
    decode(file) {
      const at = newest(file, size, count, name);
      return crypt(file.slice(at, at + size), true);
    },
    encode(slot, _, previous) {
      if (slot.length !== size) throw new Error(`${name} encodes ${size} bytes, not ${slot.length}`);
      const file = previous.slice();
      file.set(crypt(slot.slice(), false), newest(previous, size, count, name));
      return file;
    },
  };
}

const DIGEST = 20;

function colosseumCrypt(slot: Uint8Array, decrypt: boolean) {
  let key: Uint8Array = slot.subarray(slot.length - DIGEST).map((byte) => ~byte & 0xff);
  for (let at = 0x18; at + DIGEST <= slot.length - DIGEST; at += DIGEST) {
    const chunk = slot.subarray(at, at + DIGEST);
    const next = decrypt ? sha1.compute(chunk) : undefined;
    chunk.forEach((byte, i) => (chunk[i] = byte ^ key[i]));
    key = next ?? sha1.compute(chunk);
  }
  return slot;
}

function advance(keys: number[]) {
  const [k0, k1, k2, k3] = [keys[0] + 0x43, keys[1] + 0x29, keys[2] + 0x17, keys[3] + 0x13];
  return [
    (k0 & 0xf) | ((k1 << 4) & 0xf0) | ((k2 << 8) & 0xf00) | ((k3 << 12) & 0xf000),
    ((k0 >> 4) & 0xf) | (k1 & 0xf0) | ((k2 << 4) & 0xf00) | ((k3 << 8) & 0xf000),
    ((k0 >> 8) & 0xf) | ((k1 >> 4) & 0xf0) | (k2 & 0xf00) | ((k3 << 4) & 0xf000),
    ((k0 >> 12) & 0xf) | ((k1 >> 8) & 0xf0) | ((k2 >> 4) & 0xf00) | (k3 & 0xf000),
  ];
}

function xdCrypt(slot: Uint8Array, decrypt: boolean) {
  const data = view(slot);
  let keys = [0, 1, 2, 3].map((i) => data.getUint16(8 + i * 2));
  for (let at = 0x10; at < 0x27fd8; at += 8) {
    for (let i = 0; i < 4; i++) data.setUint16(at + i * 2, (data.getUint16(at + i * 2) + (decrypt ? -keys[i] : keys[i])) & 0xffff);
    keys = advance(keys);
  }
  return slot;
}

export const colosseumSlots = slots(0x1e000, 3, "colosseum-slots", colosseumCrypt);
export const xdSlots = slots(0x28000, 2, "xd-slots", xdCrypt);
