import { uint, view, type Uint } from "./bytes.ts";
import { checksum, type ChecksumArgs, type ChecksumName } from "./checksums.ts";
import { SECTOR, SLOT } from "./gen3-slots.ts";
import type { Transform } from "./step.ts";

export interface Gen3SectionsArgs {
  section?: number;
  sector?: number;
  length: Uint;
  checksum?: ChecksumArgs & { step: ChecksumName };
}

function locate(save: Uint8Array, { section, sector }: Gen3SectionsArgs) {
  if ((section === undefined) === (sector === undefined)) throw new Error("gen3-sections takes a section or a sector");
  if (sector !== undefined) {
    if (sector < 28 || sector > 31) throw new Error(`sector ${sector} isn't outside the save slots`);
    return SLOT + (sector - 28) * SECTOR;
  }
  const data = view(save);
  for (let at = 0; at < SLOT; at += SECTOR) if (data.getUint16(at + 0xff4, true) === section) return at;
  throw new Error(`the save slot has no section ${section}`);
}

const unwritten = (sector: Uint8Array) => sector.every((byte) => byte === 0 || byte === 0xff);

export const gen3Sections: Transform<Uint8Array, Gen3SectionsArgs> = {
  kind: "transform",
  decode(save, args) {
    const at = locate(save, args);
    return save.slice(at, at + uint(args.length));
  },
  encode(value, args, previous) {
    if (value.length !== uint(args.length)) throw new Error(`the space is ${uint(args.length)} bytes, not ${value.length}`);
    const at = locate(previous, args);
    const save = previous.slice();
    save.set(value, at);
    if (!args.checksum) return save;
    if (args.section !== undefined) save.set(checksum(args.checksum.step, value, args.checksum), at + 0xff6);
    else if (!unwritten(save.subarray(at, at + SECTOR))) save.set(checksum(args.checksum.step, value, args.checksum), at + 0xff4);
    return save;
  },
};
