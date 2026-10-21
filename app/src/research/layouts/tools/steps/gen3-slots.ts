import { equal, view } from "./bytes.ts";
import type { Transform } from "./step.ts";

export const SECTOR = 0x1000;
export const SLOT = 14 * SECTOR;
const OUTSIDE = 28 * SECTOR;
const FILE = 32 * SECTOR;

export interface Slot {
  start: number;
  counter: number;
  sectors: Map<number, number>;
}

export function validSlots(file: Uint8Array): Slot[] {
  if (file.length < 2 * SLOT) return [];
  const data = view(file);
  return [0, SLOT].flatMap((start) => {
    const sectors = new Map<number, number>();
    for (let sector = 0; sector < 14; sector++) sectors.set(data.getUint16(start + sector * SECTOR + 0xff4, true), start + sector * SECTOR);
    if (sectors.size !== 14 || [...sectors.keys()].some((id) => id > 13)) return [];
    return [{ start, counter: data.getUint32(start + 0xffc, true), sectors }];
  });
}

const newer = (a: number, b: number) => (a === 0 && b === 0xffffffff) || (a > b && !(a === 0xffffffff && b === 0));

export function activeSlot(file: Uint8Array): Slot {
  const [a, b] = validSlots(file);
  if (!a) throw new Error("the file has no valid Gen 3 save slot");
  return b && newer(b.counter, a.counter) ? b : a;
}

function checkSize(file: Uint8Array) {
  if (file.length !== FILE) throw new Error(`gen3-slots takes a 128 KiB file, not ${file.length} bytes`);
}

export const gen3Slots: Transform<Uint8Array, Record<string, never>> = {
  kind: "transform",
  decode(file) {
    checkSize(file);
    const { start } = activeSlot(file);
    const save = new Uint8Array(SLOT + FILE - OUTSIDE);
    save.set(file.subarray(start, start + SLOT));
    save.set(file.subarray(OUTSIDE), SLOT);
    return save;
  },
  encode(save, _, previous) {
    checkSize(previous);
    if (save.length !== SLOT + FILE - OUTSIDE) throw new Error(`gen3-slots encodes ${SLOT + FILE - OUTSIDE} bytes, not ${save.length}`);
    const { start, counter } = activeSlot(previous);
    const file = previous.slice();
    file.set(save.subarray(SLOT), OUTSIDE);
    const slot = save.subarray(0, SLOT);
    if (equal(slot, previous.subarray(start, start + SLOT))) return file;
    const other = SLOT - start;
    file.set(slot, other);
    const data = view(file);
    for (let sector = 0; sector < 14; sector++) data.setUint32(other + sector * SECTOR + 0xffc, (counter + 1) >>> 0, true);
    return file;
  },
};
