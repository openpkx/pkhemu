import { uint, view, type Uint } from "./bytes.ts";
import type { Transform } from "./step.ts";

export const PARTITION = 0x40000;
const FILE = 2 * PARTITION;
const NEVER_SAVED = 0xffffffff;

export interface Gen4Block {
  start: Uint;
  length: Uint;
}

function newerSlot(a: number, b: number) {
  if (a === NEVER_SAVED && b !== NEVER_SAVED - 1) return 1;
  if (b === NEVER_SAVED && a !== NEVER_SAVED - 1) return 0;
  return a > b ? 0 : a < b ? 1 : undefined;
}

export function newerPartition(file: Uint8Array, block: Gen4Block) {
  if (file.length !== FILE) throw new Error(`gen4-slots takes a 512 KiB file, not ${file.length} bytes`);
  const data = view(file);
  const footer = uint(block.start) + uint(block.length) - 0x14;
  for (const counter of [footer, footer + 4]) {
    const slot = newerSlot(data.getUint32(counter, true), data.getUint32(PARTITION + counter, true));
    if (slot !== undefined) return slot * PARTITION;
  }
  return 0;
}

export const gen4Slots: Transform<Uint8Array, Gen4Block> = {
  kind: "transform",
  decode(file, block) {
    const start = newerPartition(file, block) + uint(block.start);
    return file.slice(start, start + uint(block.length));
  },
  encode(value, block, previous) {
    if (value.length !== uint(block.length)) throw new Error(`gen4-slots encodes ${uint(block.length)} bytes, not ${value.length}`);
    const file = previous.slice();
    file.set(value, newerPartition(previous, block) + uint(block.start));
    return file;
  },
};
