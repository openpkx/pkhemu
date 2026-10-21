import { view } from "./bytes.ts";
import type { Transform } from "./step.ts";

export const BOX_BLOCK = 0x2000;
const BLOCKS = 23;
const SLOT = BLOCKS * BOX_BLOCK;
const FILE = 0x76000;

function newerSlot(file: Uint8Array) {
  if (file.length !== FILE) throw new Error(`box-slots takes ${FILE} bytes, not ${file.length}`);
  const data = view(file);
  let best = { start: BOX_BLOCK, counter: data.getInt32(BOX_BLOCK + 8) };
  for (let block = 1; block < 2 * BLOCKS; block++) {
    const at = BOX_BLOCK + block * BOX_BLOCK;
    const counter = data.getInt32(at + 8);
    if (counter > best.counter) best = { start: block < BLOCKS ? BOX_BLOCK : BOX_BLOCK + SLOT, counter };
  }
  return best.start;
}

export const boxSlots: Transform<Uint8Array, Record<string, never>> = {
  kind: "transform",
  decode(file) {
    const start = newerSlot(file);
    return file.slice(start, start + SLOT);
  },
  encode(slot, _, previous) {
    if (slot.length !== SLOT) throw new Error(`box-slots encodes ${SLOT} bytes, not ${slot.length}`);
    const file = previous.slice();
    file.set(slot, newerSlot(previous));
    return file;
  },
};

function locate(slot: Uint8Array, block: number) {
  const data = view(slot);
  for (let at = 0; at < slot.length; at += BOX_BLOCK) if (data.getUint32(at + 4) === block) return at;
  throw new Error(`the save slot has no block ${block}`);
}

export const boxBlocks: Transform<Uint8Array, { block: number }> = {
  kind: "transform",
  decode(slot, { block }) {
    const at = locate(slot, block);
    return slot.slice(at, at + BOX_BLOCK);
  },
  encode(value, { block }, previous) {
    if (value.length !== BOX_BLOCK) throw new Error(`box-blocks encodes ${BOX_BLOCK} bytes, not ${value.length}`);
    const slot = previous.slice();
    slot.set(value, locate(previous, block));
    return slot;
  },
};
