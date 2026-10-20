const SECTOR = 0x1000;
const SECTIONS = 14;

export type Gen3SectionsArgs = { section: number } | { sector: number };

const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

function slotSectors(save: Uint8Array, slot: number) {
  const data = view(save);
  const sectors = new Map<number, number>();
  for (let index = 0; index < SECTIONS; index++) {
    const sector = slot * SECTIONS + index;
    if ((sector + 1) * SECTOR > save.length) return undefined;
    const id = data.getUint16(sector * SECTOR + 0xff4, true);
    if (id >= SECTIONS || sectors.has(id)) return undefined;
    sectors.set(id, sector);
  }
  return { sectors, counter: data.getUint32(sectors.get(0)! * SECTOR + 0xffc, true) };
}

function activeSlot(save: Uint8Array) {
  const [a, b] = [slotSectors(save, 0), slotSectors(save, 1)];
  if (!a || !b) return a ?? b;
  if (a.counter === 0xffffffff && b.counter === 0) return b;
  if (b.counter === 0xffffffff && a.counter === 0) return a;
  return b.counter > a.counter ? b : a;
}

export function gen3Sections(save: Uint8Array, args: Gen3SectionsArgs, length: number) {
  if ("sector" in args) {
    if (args.sector * SECTOR + length > save.length) throw new Error(`Sector ${args.sector} is past the end of the save`);
    return save.slice(args.sector * SECTOR, args.sector * SECTOR + length);
  }
  const slot = activeSlot(save);
  if (!slot) throw new Error("The file isn't a Gen 3 save");
  const sector = slot.sectors.get(args.section);
  if (sector === undefined) throw new Error(`Section ${args.section} isn't in a Gen 3 save`);
  return save.slice(sector * SECTOR, sector * SECTOR + length);
}

const ORDERS = [
  "GAEM", "GAME", "GEAM", "GEMA", "GMAE", "GMEA",
  "AGEM", "AGME", "AEGM", "AEMG", "AMGE", "AMEG",
  "EGAM", "EGMA", "EAGM", "EAMG", "EMGA", "EMAG",
  "MGAE", "MGEA", "MAGE", "MAEG", "MEGA", "MEAG",
];
const SUBSTRUCTURES = 0x20;
const SUBSTRUCTURE = 12;

export function pk3Crypt(stored: Uint8Array) {
  const pokemon = stored.slice();
  const data = view(pokemon);
  const pid = data.getUint32(0, true);
  const key = (pid ^ data.getUint32(4, true)) >>> 0;
  const decrypted = new Uint8Array(4 * SUBSTRUCTURE);
  const words = view(decrypted);
  for (let at = 0; at < decrypted.length; at += 4) words.setUint32(at, data.getUint32(SUBSTRUCTURES + at, true) ^ key, true);
  const order = ORDERS[pid % 24];
  "GAEM".split("").forEach((substructure, index) => {
    const from = order.indexOf(substructure) * SUBSTRUCTURE;
    pokemon.set(decrypted.subarray(from, from + SUBSTRUCTURE), SUBSTRUCTURES + index * SUBSTRUCTURE);
  });
  return pokemon;
}
