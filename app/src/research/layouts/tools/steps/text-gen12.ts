import type { Transform } from "./step.ts";

// PKHeX's tables from 0x70. \0 marks a byte with no character, which ends the text, as every byte below 0x70 does
// but 0x5D, and 0x4E in Gen 2. Gen 2's ０ to ６ stand for the ligatures 'd 'l 'm 'r 's 't 'v, as PKHeX reads them.
const GEN1 = [
  "@#“”\0…\0\0\0┌─┐│└┘ ", "ABCDEFGHIJKLMNOP", "QRSTUVWXYZ():;[]", "abcdefghijklmnop", "qrstuvwxyzàèéùÀÁ",
  "ÄÖÜäöüÈÉÌÍÑÒÓÙÚá", "ìíñòóúº\0\0\0\0\0\0\0←'", "’{}-\0\0?!․&%→▷▶▼♂", "¥×./,♀0123456789",
].join("");

const GEN2 = [
  "@#“”\0…\0\0\0┌─┐│└┘ ", "ABCDEFGHIJKLMNOP", "QRSTUVWXYZ():;[]", "abcdefghijklmnop", "qrstuvwxyzàèéùÀÁ",
  "ÄÖÜäöüÈÉÌÍÑÒÓÙÚá", "０１２３４５６\0\0\0\0\0\0\0\0←", "’{}-+\0?!․&%→▷▶▼♂", "¥×./,♀0123456789",
].join("");

const TRADE = 0x5d;
const TERMINATOR = 0x50;

function table(from0x70: string, others: Record<number, string>) {
  const chars = Array<string>(256).fill("\0");
  Array.from(from0x70).forEach((char, i) => (chars[0x70 + i] = char));
  for (const [byte, char] of Object.entries(others)) chars[Number(byte)] = char;
  return chars;
}

function text(chars: string[], fill: number): Transform<string, Record<string, never>> {
  const decode = (input: Uint8Array) => {
    if (input[0] === TRADE) return chars[TRADE];
    let decoded = "";
    for (const byte of input) {
      if (chars[byte] === "\0") break;
      decoded += chars[byte];
    }
    return decoded;
  };
  return {
    kind: "transform",
    decode,
    encode(value, _, previous) {
      // Text the bytes already hold keeps them, since a table can read two values as one character.
      if (decode(previous) === value) return previous.slice();
      const characters = Array.from(value);
      if (characters.length > previous.length) throw new Error(`"${value}" is longer than ${previous.length} bytes`);
      if (characters[0] === chars[TRADE] && characters.length > 1) throw new Error(`"${value}" starts with ${chars[TRADE]}, which marks a trade`);
      const encoded = new Uint8Array(previous.length).fill(fill);
      characters.forEach((char, i) => {
        const byte = char === "\0" ? -1 : chars.indexOf(char);
        if (byte < 0) throw new Error(`"${char}" has no Gen 1 or 2 byte`);
        encoded[i] = byte;
      });
      if (characters.length < encoded.length) encoded[characters.length] = TERMINATOR;
      return encoded;
    },
  };
}

export const textGen1Intl = text(table(GEN1, { [TRADE]: "*" }), 0x00);
export const textGen2Intl = text(table(GEN2, { [TRADE]: "*", 0x4e: "⏎" }), TERMINATOR);
