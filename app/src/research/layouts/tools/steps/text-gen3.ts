import type { Transform } from "./step.ts";

// Bytes past the end of a table are terminators. The international table holds some Japanese characters,
// as PKHeX reads them.
const INTL = [
  " ÀÁÂÇÈÉÊËÌこÎÏÒÓÔ", "ŒÙÚÛÑßàáねçèéêëìま", "îïòóôœùúûñºª⑩&+あ", "ぃぅぇぉゃ=;がぎぐげござじずぜ",
  "ぞだぢづでどばびぶべぼぱぴぷぺぽ", "っ¿¡⒆⒇オカキクケÍ%()セソ", "タチツテトナニヌâノハヒフヘホí", "ミムメモヤユヨラリ↑↓←＋ヲンァ",
  "ィゥェォ⒅<>ガギグゲゴザジズゼ", "ゾダヂヅデドバビブベボパピプペポ", "ッ0123456789!?.-･", "⑬“”‘'♂♀$,⑧/ABCDE",
  "FGHIJKLMNOPQRSTU", "VWXYZabcdefghijk", "lmnopqrstuvwxyz►", ":ÄÖÜäöü",
].join("");

const JPN = [
  "　あいうえおかきくけこさしすせそ", "たちつてとなにぬねのはひふへほま", "みむめもやゆよらりるれろわをんぁ", "ぃぅぇぉゃゅょがぎぐげござじずぜ",
  "ぞだぢづでどばびぶべぼぱぴぷぺぽ", "っアイウエオカキクケコサシスセソ", "タチツテトナニヌネノハヒフヘホマ", "ミムメモヤユヨラリルレロワヲンァ",
  "ィゥェォャュョガギグゲゴザジズゼ", "ゾダヂヅデドバビブベボパピプペポ", "ッ０１２３４５６７８９！？。ー・", "…『』「」♂♀円．×／ＡＢＣＤＥ",
  "ＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵ", "ＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋ", "ｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ►", "：ÄÖÜäöü↑↓←→＋",
].join("");

const TERMINATOR = 0xff;

function text(table: string): Transform<string, Record<string, never>> {
  const chars = Array.from(table);
  return {
    kind: "transform",
    decode(input) {
      let decoded = "";
      for (const byte of input) {
        if (byte >= chars.length) break;
        decoded += chars[byte];
      }
      return decoded;
    },
    encode(value, _, previous) {
      const encoded = previous.slice();
      const characters = Array.from(value);
      if (characters.length > encoded.length) throw new Error(`"${value}" is longer than ${encoded.length} bytes`);
      characters.forEach((char, i) => {
        const byte = chars.indexOf(char);
        if (byte < 0) throw new Error(`"${char}" has no Gen 3 byte`);
        encoded[i] = byte;
      });
      if (characters.length < encoded.length && encoded[characters.length] < chars.length) encoded[characters.length] = TERMINATOR;
      return encoded;
    },
  };
}

export const textGen3Intl = text(INTL);
export const textGen3Jpn = text(JPN);
