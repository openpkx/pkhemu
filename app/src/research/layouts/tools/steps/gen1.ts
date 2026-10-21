import { equal, uint, type Uint } from "./bytes.ts";
import type { Checksum, Detect, Transform } from "./step.ts";

export const gen1Checksum: Checksum = {
  kind: "checksum",
  size: 1,
  compute: (covered) => Uint8Array.of(~covered.reduce((sum, byte) => sum + byte, 0) & 0xff),
};

const END = 0xff;
const INITIALIZED = 0x80;

export interface BoxBanksArgs {
  banks: Uint[];
  boxes: number;
  length: Uint;
  current: Uint;
  selected: Uint;
  index: number;
}

function placesOf({ banks, boxes, length, current, selected, index }: BoxBanksArgs, save: Uint8Array) {
  const perBank = boxes / banks.length;
  const at = (box: number) => uint(banks[Math.floor(box / perBank)]) + (box % perBank) * uint(length);
  if (!Number.isInteger(index) || index < 0 || index >= boxes) throw new Error(`gen1-box-banks has no box ${index}`);
  const number = save[uint(selected)] & ~INITIALIZED;
  if (number >= boxes) throw new Error(`the save's current box ${number} is past its ${boxes} boxes`);
  return { at, number, initialized: (save[uint(selected)] & INITIALIZED) !== 0, size: uint(length), current: uint(current) };
}

// A box other than the current one before the save's boxes are set up reads as the game's empty list: count 0, then the
// end of the species list. The bytes after them are whatever the bank holds.
function decodeBox(save: Uint8Array, args: BoxBanksArgs) {
  const { at, number, initialized, size, current } = placesOf(args, save);
  if (args.index === number) return save.slice(current, current + size);
  const list = save.slice(at(args.index), at(args.index) + size);
  if (!initialized) list.set([0, END]);
  return list;
}

export const gen1BoxBanks: Transform<Uint8Array, BoxBanksArgs> = {
  kind: "transform",
  decode: decodeBox,
  encode(value, args, previous) {
    const { at, number, initialized, size, current } = placesOf(args, previous);
    if (value.length !== size) throw new Error(`a box is ${size} bytes, not ${value.length}`);
    const save = previous.slice();
    if (args.index === number) {
      save.set(value, current);
      return save;
    }
    if (!initialized) {
      if (equal(value, decodeBox(previous, args))) return save;
      save[uint(args.selected)] |= INITIALIZED;
      for (let box = 0; box < args.boxes; box++) if (box !== number) save.set([0, END], at(box));
    }
    save.set(value, at(args.index));
    return save;
  },
};

export interface ListArgs {
  capacity: number;
  stored: number;
  party: number;
  names: number;
  index: number;
}

const singleLength = ({ party, names }: ListArgs) => 3 + party + 2 * names;

function slotOf({ capacity, stored, names, index }: ListArgs, lists: Uint8Array) {
  const length = 2 + capacity * (1 + stored + 2 * names);
  const start = Math.floor(index / capacity) * length;
  const slot = index % capacity;
  if (!Number.isInteger(index) || index < 0 || start + length > lists.length) throw new Error(`gen1-list has no slot ${index} in ${lists.length} bytes`);
  const body = start + 2 + capacity + slot * stored;
  const trainer = start + 2 + capacity + capacity * stored + slot * names;
  return { start, mark: start + 1 + slot, body, trainer, nickname: trainer + capacity * names, slot };
}

export const gen1List: Transform<Uint8Array, ListArgs> = {
  kind: "transform",
  decode(stored, args) {
    const { start, mark, body, trainer, nickname, slot } = slotOf(args, stored);
    const namesAt = 3 + args.party;
    const single = new Uint8Array(singleLength(args));
    single.set([slot < stored[start] ? 1 : 0, stored[mark], END]);
    single.set(stored.subarray(body, body + args.stored), 3);
    single.set(stored.subarray(trainer, trainer + args.names), namesAt);
    single.set(stored.subarray(nickname, nickname + args.names), namesAt + args.names);
    return single;
  },
  encode(value, args, previous) {
    const { start, mark, body, trainer, nickname } = slotOf(args, previous);
    if (value.length !== singleLength(args)) throw new Error(`a slot is ${singleLength(args)} bytes, not ${value.length}`);
    const namesAt = 3 + args.party;
    const stored = previous.slice();
    stored[mark] = value[1];
    stored.set(value.subarray(3, 3 + args.stored), body);
    stored.set(value.subarray(namesAt, namesAt + args.names), trainer);
    stored.set(value.subarray(namesAt + args.names), nickname);
    const count = stored[start];
    if (count <= args.capacity) stored[start + 1 + count] = END;
    return stored;
  },
};

export const gen12Lists: Detect<{ lists: { offset: Uint; max: number }[] }> = {
  kind: "detect",
  test: (file, { lists }) =>
    lists.every(({ offset, max }) => {
      const count = file[uint(offset)];
      return count <= max && file[uint(offset) + 1 + count] === END;
    }),
};
