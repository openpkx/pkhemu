import { equal, uint, type Uint } from "./bytes.ts";
import type { Checksum, Transform } from "./step.ts";

export const gen2Checksum: Checksum = {
  kind: "checksum",
  size: 2,
  compute(covered) {
    const sum = covered.reduce((total, byte) => (total + byte) & 0xffff, 0);
    return Uint8Array.of(sum & 0xff, sum >> 8);
  },
};

export interface BackupArgs {
  copies: { from: Uint; to: Uint; length: Uint }[];
}

export const gen2Backup: Transform<Uint8Array, BackupArgs> = {
  kind: "transform",
  decode: (file) => file.slice(),
  encode(value, { copies }, previous) {
    if (value.length !== previous.length) throw new Error(`the save is ${previous.length} bytes, not ${value.length}`);
    const file = value.slice();
    for (const { from, to, length } of copies) file.copyWithin(uint(to), uint(from), uint(from) + uint(length));
    return file;
  },
};

export interface BoxBanksArgs {
  banks: Uint[];
  boxes: number;
  length: Uint;
  stride: Uint;
  current: Uint;
  selected: Uint;
  index: number;
}

function placeOf({ banks, boxes, stride, index }: BoxBanksArgs) {
  if (!Number.isInteger(index) || index < 0 || index >= boxes) throw new Error(`gen2-box-banks has no box ${index}`);
  const perBank = boxes / banks.length;
  return uint(banks[Math.floor(index / perBank)]) + (index % perBank) * uint(stride);
}

const decodeBox = (save: Uint8Array, args: BoxBanksArgs) => save.slice(placeOf(args), placeOf(args) + uint(args.length));

export const gen2BoxBanks: Transform<Uint8Array, BoxBanksArgs> = {
  kind: "transform",
  decode: decodeBox,
  encode(value, args, previous) {
    if (value.length !== uint(args.length)) throw new Error(`a box is ${uint(args.length)} bytes, not ${value.length}`);
    if (equal(value, decodeBox(previous, args))) return previous.slice();
    const save = previous.slice();
    save.set(value, placeOf(args));
    if (save[uint(args.selected)] === args.index) save.set(value, uint(args.current));
    return save;
  },
};
