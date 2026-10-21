import { uint, type Uint } from "./bytes.ts";
import { cfruBox } from "./cfru-box.ts";
import { checksum, checksums, type ChecksumArgs, type ChecksumName } from "./checksums.ts";
import { boxBlocks, boxSlots } from "./box-slots.ts";
import { gcMemoryCard, gcMemoryCardFile } from "./gc-memory-card.ts";
import { colosseumSlots, xdSlots } from "./gc-slots.ts";
import { emeraldLegacyBlocks } from "./emerald-legacy-blocks.ts";
import { frlgKeyMismatch } from "./frlg-key-mismatch.ts";
import { gen12Lists, gen1BoxBanks, gen1List } from "./gen1.ts";
import { gen2Backup, gen2BoxBanks } from "./gen2.ts";
import { gen3Sections } from "./gen3-sections.ts";
import { gen3Signature } from "./gen3-signature.ts";
import { gen3Slots } from "./gen3-slots.ts";
import { gen4Slots } from "./gen4-slots.ts";
import { gen5Checksums } from "./gen5-checksums.ts";
import { imperiumChecksums, imperiumSectionsTransform } from "./imperium-sections.ts";
import { pk45Crypt, pk67Crypt } from "./lcrng-crypt.ts";
import { pk3Crypt } from "./pk3-crypt.ts";
import { romTable } from "./rom-table.ts";
import { romText } from "./rom-text.ts";
import type { Transform } from "./step.ts";
import { textGen1Intl, textGen2Intl } from "./text-gen12.ts";
import { textGen3Gc } from "./text-gen3-gc.ts";
import { textGen3Intl, textGen3Jpn } from "./text-gen3.ts";
import { textGen4 } from "./text-gen4.ts";
import { textGen5, textGen6, textGen7 } from "./text-utf16.ts";
import { xorKey } from "./xor-key.ts";

export { checksum, isKeyed, type ChecksumName } from "./checksums.ts";

export const checksumSize = (name: ChecksumName) => checksums[name].size;
export const isChecksum = (name: string): name is ChecksumName => name in checksums;

export const transforms = {
  "gen3-slots": gen3Slots,
  "gen3-sections": gen3Sections,
  "imperium-sections": imperiumSectionsTransform,
  "gen4-slots": gen4Slots,
  "pk3-crypt": pk3Crypt,
  "pk45-crypt": pk45Crypt,
  "pk67-crypt": pk67Crypt,
  "cfru-box": cfruBox,
  "xor-key": xorKey,
  "text-gen3-intl": textGen3Intl,
  "text-gen3-jpn": textGen3Jpn,
  "text-gen3-gc": textGen3Gc,
  "text-gen1-intl": textGen1Intl,
  "text-gen2-intl": textGen2Intl,
  "text-gen4": textGen4,
  "text-gen5": textGen5,
  "text-gen6": textGen6,
  "text-gen7": textGen7,
  "gc-memory-card": gcMemoryCard,
  "colosseum-slots": colosseumSlots,
  "xd-slots": xdSlots,
  "box-slots": boxSlots,
  "box-blocks": boxBlocks,
  "gen1-box-banks": gen1BoxBanks,
  "gen1-list": gen1List,
  "gen2-backup": gen2Backup,
  "gen2-box-banks": gen2BoxBanks,
};

export const detects = {
  "gen3-signature": gen3Signature,
  "frlg-key-mismatch": frlgKeyMismatch,
  "imperium-checksums": imperiumChecksums,
  "emerald-legacy-blocks": emeraldLegacyBlocks,
  "gc-memory-card-file": gcMemoryCardFile,
  "gen12-lists": gen12Lists,
  "gen5-checksums": gen5Checksums,
};

export const reads = {
  "rom-table": romTable,
  "rom-text": romText,
};

export const steps = { ...transforms, ...checksums, ...detects, ...reads };

export type TransformName = keyof typeof transforms;
export type DetectName = keyof typeof detects;
export type ReadName = keyof typeof reads;
export type StepName = keyof typeof steps;

type Value = Uint8Array | string;
type AnyTransform = Transform<Value, unknown>;

const transform = (name: TransformName) => transforms[name] as AnyTransform;

export const decode = (name: TransformName, input: Uint8Array, args: unknown = {}) => transform(name).decode(input, args);

export const encode = (name: TransformName, value: Value, args: unknown, previous: Uint8Array) =>
  transform(name).encode(value, args, previous);

export function writeChecksum(name: ChecksumName, bytes: Uint8Array, args: ChecksumArgs & { at: Uint }) {
  const written = bytes.slice();
  written.set(checksum(name, bytes, args), uint(args.at));
  return written;
}

export const read = (name: ReadName, input: Uint8Array, args: unknown) =>
  (reads[name] as { decode(input: Uint8Array, args: unknown): Value }).decode(input, args);

export const passes = (name: DetectName, file: Uint8Array, args: unknown) =>
  (detects[name] as { test(file: Uint8Array, args: unknown): boolean }).test(file, args);
