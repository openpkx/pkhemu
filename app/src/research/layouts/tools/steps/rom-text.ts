import { uint, type Uint } from "./bytes.ts";
import { pointsTo } from "./rom-table.ts";
import type { ReadStep } from "./step.ts";
import { textGen3Intl, textGen3Jpn } from "./text-gen3.ts";

export const romTexts = { "text-gen3-intl": textGen3Intl, "text-gen3-jpn": textGen3Jpn };

export interface RomTextArgs {
  at: Uint;
  length: Uint;
  type: string;
}

export const romText: ReadStep<string, RomTextArgs> = {
  kind: "read",
  decode(rom, { at, length, type }) {
    const text = romTexts[type as keyof typeof romTexts];
    if (!text) throw new Error(`${type} isn't GBA text`);
    const field = uint(at);
    const pointed = pointsTo(rom, field);
    return text.decode(pointed === undefined ? rom.subarray(field, field + uint(length)) : rom.subarray(pointed), {});
  },
};
