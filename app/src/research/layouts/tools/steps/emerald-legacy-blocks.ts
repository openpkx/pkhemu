import { view } from "./bytes.ts";
import { SECTOR, SLOT } from "./gen3-slots.ts";
import type { Detect } from "./step.ts";

const SIGNATURE = 0x08012025;
const USED = 0xf80;
const DEX = 0x34;

// The newer slot whose 14 sectors hold each id once and the retail signature, as the engine picks it: a higher counter,
// read as a signed 32-bit number, wins, and a slot with a negative counter is never picked.
function newerSlot(file: Uint8Array) {
  const data = view(file);
  let best: Map<number, number> | undefined;
  let counter = -1;
  for (const start of [0, SLOT]) {
    const sectors = new Map<number, number>();
    for (let at = start; at < start + SLOT; at += SECTOR) {
      const id = data.getUint16(at + 0xff4, true);
      if (id > 13 || sectors.has(id) || data.getUint32(at + 0xff8, true) !== SIGNATURE) break;
      sectors.set(id, at);
    }
    if (sectors.size !== 14) continue;
    const count = data.getInt32(sectors.get(0)! + 0xffc, true);
    if (count <= counter) continue;
    [best, counter] = [sectors, count];
  }
  return best;
}

function blocks(file: Uint8Array) {
  const sectors = newerSlot(file);
  if (!sectors) return;
  const large = new Uint8Array(4 * USED);
  for (let id = 1; id <= 4; id++) large.set(file.subarray(sectors.get(id)!, sectors.get(id)! + USED), (id - 1) * USED);
  return { key: view(file).getUint16(sectors.get(0)! + 0xac, true), large };
}

const agree = (large: Uint8Array, first: number, second: number) => large.subarray(first, first + DEX).every((byte, i) => byte === large[second + i]);

// -1 for a pocket with a count out of range.
function pouch(large: Uint8Array, offset: number, slots: number, max: number, key: number) {
  const data = view(large);
  let used = 0;
  for (let slot = 0; slot < slots; slot++) {
    const at = offset + slot * 4;
    if (!data.getUint16(at, true)) continue;
    const count = data.getUint16(at + 2, true) ^ key;
    if (!count || count > max) return -1;
    used++;
  }
  return used;
}

export const emeraldLegacyBlocks: Detect<Record<string, never>> = {
  kind: "detect",
  test(file) {
    const found = file.length >= 2 * SLOT ? blocks(file) : undefined;
    if (!found) return false;
    const { key, large } = found;
    if (!agree(large, 0xaf0, 0x3b34) || agree(large, 0x988, 0x3b24)) return false;
    const keyItems = pouch(large, 0x740, 30, 1, key);
    return keyItems > 0 && pouch(large, 0x8f8, 46, 999, key) >= 0 && pouch(large, 0x7f8, 64, 99, key) >= 0;
  },
};
