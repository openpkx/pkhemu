const SECTOR = 0x1000;

export type Gen3Edit = { section: number; offset: number; bytes: number[] };

export function gen3Save(edits: Gen3Edit[] = []) {
  const save = new Uint8Array(0x20000);
  const view = new DataView(save.buffer);
  for (let section = 0; section < 14; section++) {
    view.setUint16(section * SECTOR + 0xff4, section, true);
    view.setUint32(section * SECTOR + 0xffc, 1, true);
  }
  for (const { section, offset, bytes } of edits) save.set(bytes, section * SECTOR + offset);
  return save;
}
