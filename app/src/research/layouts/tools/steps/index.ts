import { uint, type Uint } from "./bytes.ts";
import { cfruBox } from "./cfru-box.ts";
import { checksum, checksums, type ChecksumArgs, type ChecksumName } from "./checksums.ts";
import { boxBlocks, boxSlots } from "./box-slots.ts";
import { gcMemoryCard, gcMemoryCardFile } from "./gc-memory-card.ts";
import { colosseumSlots, xdSlots } from "./gc-slots.ts";
import { frlgKeyMismatch } from "./frlg-key-mismatch.ts";
import { gen3Sections } from "./gen3-sections.ts";
import { gen3Signature } from "./gen3-signature.ts";
import { gen3Slots } from "./gen3-slots.ts";
import { pk3Crypt } from "./pk3-crypt.ts";
import type { Transform } from "./step.ts";
import { textGen3Gc } from "./text-gen3-gc.ts";
import { textGen3Intl, textGen3Jpn } from "./text-gen3.ts";
import { xorKey } from "./xor-key.ts";

export { checksum, type ChecksumName } from "./checksums.ts";

export const checksumSize = (name: ChecksumName) => checksums[name].size;
export const isChecksum = (name: string): name is ChecksumName => name in checksums;

export const transforms = {
  "gen3-slots": gen3Slots,
  "gen3-sections": gen3Sections,
  "pk3-crypt": pk3Crypt,
  "cfru-box": cfruBox,
  "xor-key": xorKey,
  "text-gen3-intl": textGen3Intl,
  "text-gen3-jpn": textGen3Jpn,
  "text-gen3-gc": textGen3Gc,
  "gc-memory-card": gcMemoryCard,
  "colosseum-slots": colosseumSlots,
  "xd-slots": xdSlots,
  "box-slots": boxSlots,
  "box-blocks": boxBlocks,
};

export const detects = { "gen3-signature": gen3Signature, "frlg-key-mismatch": frlgKeyMismatch, "gc-memory-card-file": gcMemoryCardFile };

export const steps = { ...transforms, ...checksums, ...detects };

export type TransformName = keyof typeof transforms;
export type DetectName = keyof typeof detects;
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

export const passes = (name: DetectName, file: Uint8Array, args: unknown) =>
  (detects[name] as { test(file: Uint8Array, args: unknown): boolean }).test(file, args);
