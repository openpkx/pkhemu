import { uint, view, type Uint } from "./bytes.ts";
import { checksum, type ChecksumArgs, type ChecksumName } from "./checksums.ts";
import { SECTOR } from "./gen3-slots.ts";
import type { Detect, Transform } from "./step.ts";

const SECTIONS = 28;
const SIGNATURE = 0x08012025;

export interface ImperiumSectionsArgs {
  section: number;
  length: Uint;
  checksum?: ChecksumArgs & { step: ChecksumName };
}

export function imperiumSections(file: Uint8Array): Map<number, number> | undefined {
  if (file.length < SECTIONS * SECTOR) return;
  const data = view(file);
  const sections = new Map<number, number>();
  for (let at = 0; at < SECTIONS * SECTOR; at += SECTOR) {
    const id = data.getUint16(at + 0xff4, true);
    if (id >= SECTIONS || sections.has(id) || data.getUint32(at + 0xff8, true) !== SIGNATURE) return;
    sections.set(id, at);
  }
  return sections;
}

function locate(file: Uint8Array, section: number) {
  const at = imperiumSections(file)?.get(section);
  if (at === undefined) throw new Error(`the file has no Imperium section ${section}`);
  return at;
}

export const imperiumSectionsTransform: Transform<Uint8Array, ImperiumSectionsArgs> = {
  kind: "transform",
  decode(file, { section, length }) {
    const at = locate(file, section);
    return file.slice(at, at + uint(length));
  },
  encode(value, args, previous) {
    if (value.length !== uint(args.length)) throw new Error(`the space is ${uint(args.length)} bytes, not ${value.length}`);
    const at = locate(previous, args.section);
    const file = previous.slice();
    file.set(value, at);
    if (args.checksum) file.set(checksum(args.checksum.step, value, args.checksum), at + 0xff6);
    return file;
  },
};

export const imperiumChecksums: Detect<{ lengths: Uint[] }> = {
  kind: "detect",
  test(file, { lengths }) {
    const sections = imperiumSections(file);
    if (!sections) return false;
    const data = view(file);
    return [...sections].every(
      ([id, at]) => data.getUint16(at + 0xff6, true) === view(checksum("sum32le-fold16", file.subarray(at, at + SECTOR), { start: 0, end: uint(lengths[id]) })).getUint16(0, true),
    );
  },
};
