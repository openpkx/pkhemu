import { view } from "./bytes.ts";
import type { Detect, Transform } from "./step.ts";

export const BLOCK = 0x2000;
const ENTRY = 0x40;
const ENTRIES = 127;
const FIRST_DATA_BLOCK = 5;
const LAST = 0xffff;

export interface GameCodes {
  gameCodes: string[];
}

export const isCardSize = (length: number) => length >= 0x80000 && length <= 0x4000000 && (length & (length - 1)) === 0;

function sums(bytes: Uint8Array) {
  const data = view(bytes);
  let sum = 0;
  let inverse = 0;
  for (let at = 0; at + 1 < bytes.length; at += 2) {
    const word = data.getUint16(at);
    sum = (sum + word) & 0xffff;
    inverse = (inverse + (~word & 0xffff)) & 0xffff;
  }
  return [sum === 0xffff ? 0 : sum, inverse === 0xffff ? 0 : inverse];
}

function newer(card: Uint8Array, blocks: [number, number], covered: [number, number], sumAt: number, counterAt: number) {
  const data = view(card);
  const valid = blocks.filter((block) => {
    const at = block * BLOCK;
    const [sum, inverse] = sums(card.subarray(at + covered[0], at + covered[1]));
    return data.getUint16(at + sumAt) === sum && data.getUint16(at + sumAt + 2) === inverse;
  });
  if (!valid.length) throw new Error(`blocks ${blocks.join(" and ")} of the memory card both fail their checksums`);
  return valid.reduce((best, block) => (data.getUint16(block * BLOCK + counterAt) > data.getUint16(best * BLOCK + counterAt) ? block : best));
}

const gameCode = (card: Uint8Array, at: number) => String.fromCharCode(...card.subarray(at, at + 4));

function checkCard(card: Uint8Array) {
  if (!isCardSize(card.length)) throw new Error(`a memory card is a power of 2 from 512 KiB to 64 MiB, not ${card.length} bytes`);
  if (view(card).getUint16(0x22) !== card.length / BLOCK / 16) throw new Error("the memory card's header names another size");
}

function entries(card: Uint8Array, { gameCodes }: GameCodes) {
  checkCard(card);
  const directory = newer(card, [1, 2], [0, 0x1ffc], 0x1ffc, 0x1ffa) * BLOCK;
  const found = [];
  for (let index = 0; index < ENTRIES; index++) {
    const at = directory + index * ENTRY;
    if (gameCodes.includes(gameCode(card, at))) found.push(at);
  }
  return found;
}

export function blocksOf(card: Uint8Array, args: GameCodes) {
  const found = entries(card, args);
  if (found.length !== 1) throw new Error(`the memory card holds ${found.length} files with game code ${args.gameCodes.join(" or ")}, not 1`);
  const data = view(card);
  const allocation = newer(card, [3, 4], [4, BLOCK], 0, 4) * BLOCK;
  const count = data.getUint16(found[0] + 0x38);
  const blocks: number[] = [];
  for (let block = data.getUint16(found[0] + 0x36); blocks.length < count; ) {
    if (block < FIRST_DATA_BLOCK || block >= card.length / BLOCK || blocks.includes(block)) throw new Error(`the file's block chain reaches block ${block}`);
    blocks.push(block);
    block = data.getUint16(allocation + 0x0a + (block - FIRST_DATA_BLOCK) * 2);
    if (block === LAST && blocks.length < count) throw new Error(`the file's block chain ends after ${blocks.length} of ${count} blocks`);
  }
  return blocks;
}

export const gcMemoryCard: Transform<Uint8Array, GameCodes> = {
  kind: "transform",
  decode(card, args) {
    const blocks = blocksOf(card, args);
    const file = new Uint8Array(blocks.length * BLOCK);
    blocks.forEach((block, i) => file.set(card.subarray(block * BLOCK, (block + 1) * BLOCK), i * BLOCK));
    return file;
  },
  encode(file, args, previous) {
    const blocks = blocksOf(previous, args);
    if (file.length !== blocks.length * BLOCK) throw new Error(`the file takes ${blocks.length * BLOCK} bytes, not ${file.length}`);
    const card = previous.slice();
    blocks.forEach((block, i) => card.set(file.subarray(i * BLOCK, (i + 1) * BLOCK), block * BLOCK));
    return card;
  },
};

export const gcMemoryCardFile: Detect<GameCodes> = {
  kind: "detect",
  test(card, args) {
    try {
      return entries(card, args).length > 0;
    } catch {
      return false;
    }
  },
};
