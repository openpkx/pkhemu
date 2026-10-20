import type { Engine } from "@pkhex-everywhere/engine";

const block = 0x2000;
const cardSize = 0x200000;
const megabits = cardSize >> 17;
const firstDataBlock = 5;
const gameCodes: Record<number, string> = { 61: "GPXP01", 62: "GC6P01", 63: "GXXP01" };

export const isGameCube = (version: number) => version in gameCodes;

function writeChecksum(view: DataView, from: number, to: number, at: number) {
  let sum = 0;
  let inverse = 0;
  for (let offset = from; offset < to; offset += 2) {
    const word = view.getUint16(offset);
    sum = (sum + word) & 0xffff;
    inverse = (inverse + (word ^ 0xffff)) & 0xffff;
  }
  view.setUint16(at, sum === 0xffff ? 0 : sum);
  view.setUint16(at + 2, inverse === 0xffff ? 0 : inverse);
}

// Blank Colosseum, XD and Box saves export as the bare save file, so this puts one on a freshly formatted card, the way
// the app keeps a GameCube game's save.
export async function exportBlankCard(engine: Engine, version: number) {
  await engine.game.loadBlank(version);
  const save = (await engine.game.export()).bytes;
  const blocks = save.length / block;
  const card = new Uint8Array(cardSize).fill(0xff);
  const view = new DataView(card.buffer);
  card.fill(0, 0, 0x26);
  view.setUint16(0x22, megabits);
  writeChecksum(view, 0, 0x1fc, 0x1fc);
  for (const directory of [1, 2].map((number) => number * block)) {
    card.set(new TextEncoder().encode(gameCodes[version]), directory);
    view.setUint16(directory + 0x36, firstDataBlock);
    view.setUint16(directory + 0x38, blocks);
    writeChecksum(view, directory, directory + 0x1ffc, directory + 0x1ffc);
  }
  for (const allocation of [3, 4].map((number) => number * block)) {
    card.fill(0, allocation, allocation + block);
    view.setUint16(allocation + 6, cardSize / block - firstDataBlock - blocks);
    view.setUint16(allocation + 8, firstDataBlock - 1 + blocks);
    for (let index = 0; index < blocks; index++)
      view.setUint16(allocation + 0xa + index * 2, index === blocks - 1 ? 0xffff : firstDataBlock + 1 + index);
    writeChecksum(view, allocation + 4, allocation + block, allocation);
  }
  card.set(save, firstDataBlock * block);
  return card;
}
