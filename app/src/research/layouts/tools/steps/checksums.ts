import { uint, view, type Uint } from "./bytes.ts";
import type { Checksum } from "./step.ts";

export interface ChecksumArgs {
  start: Uint;
  end: Uint;
  at?: Uint;
}

const bytes = (size: number, write: (data: DataView) => void) => {
  const result = new Uint8Array(size);
  write(view(result));
  return result;
};

const sum16 = (bytes: Uint8Array, little: boolean) => {
  const data = view(bytes);
  let sum = 0;
  for (let at = 0; at + 1 < bytes.length; at += 2) sum = (sum + data.getUint16(at, little)) & 0xffff;
  return sum;
};

export const sum16le: Checksum = {
  kind: "checksum",
  size: 2,
  compute: (covered) => bytes(2, (out) => out.setUint16(0, sum16(covered, true), true)),
};

export const sum32leFold16: Checksum = {
  kind: "checksum",
  size: 2,
  compute(covered) {
    const data = view(covered);
    let sum = 0;
    for (let at = 0; at + 3 < covered.length; at += 4) sum = (sum + data.getUint32(at, true)) >>> 0;
    return bytes(2, (out) => out.setUint16(0, ((sum >>> 16) + (sum & 0xffff)) & 0xffff, true));
  },
};

// Written out rather than taken from node:crypto, so the runtime also runs in a browser, where SubtleCrypto is async.
function sha1Digest(message: Uint8Array) {
  const padded = new Uint8Array(Math.ceil((message.length + 9) / 64) * 64);
  padded.set(message);
  padded[message.length] = 0x80;
  const data = view(padded);
  data.setUint32(padded.length - 8, Math.floor(message.length / 0x20000000));
  data.setUint32(padded.length - 4, (message.length * 8) >>> 0);
  const hash = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  const words = new Uint32Array(80);
  const rotate = (word: number, by: number) => (word << by) | (word >>> (32 - by));
  for (let block = 0; block < padded.length; block += 64) {
    for (let i = 0; i < 16; i++) words[i] = data.getUint32(block + i * 4);
    for (let i = 16; i < 80; i++) words[i] = rotate(words[i - 3] ^ words[i - 8] ^ words[i - 14] ^ words[i - 16], 1);
    let [a, b, c, d, e] = hash;
    for (let i = 0; i < 80; i++) {
      const [f, k] =
        i < 20 ? [(b & c) | (~b & d), 0x5a827999] : i < 40 ? [b ^ c ^ d, 0x6ed9eba1] : i < 60 ? [(b & c) | (b & d) | (c & d), 0x8f1bbcdc] : [b ^ c ^ d, 0xca62c1d6];
      const next = (rotate(a, 5) + f + e + k + words[i]) >>> 0;
      [a, b, c, d, e] = [next, a, rotate(b, 30) >>> 0, c, d];
    }
    [a, b, c, d, e].forEach((word, i) => (hash[i] = (hash[i] + word) >>> 0));
  }
  return bytes(20, (out) => hash.forEach((word, i) => out.setUint32(i * 4, word)));
}

export const sha1: Checksum = {
  kind: "checksum",
  size: 20,
  compute: sha1Digest,
};

export const colosseumHeader: Checksum = {
  kind: "checksum",
  size: 4,
  compute(covered) {
    if (covered.length !== 0x1e000) throw new Error(`colosseum-header covers a whole 0x1E000-byte slot, not ${covered.length} bytes`);
    const data = view(covered);
    let sum = 0;
    for (let at = 0; at < 0x20; at += 4) {
      const key = at >= 0x18 ? ~data.getUint32(covered.length - 20 + at - 0x18) : 0;
      sum = (sum - ((data.getUint32(at) ^ key) >>> 0)) >>> 0;
    }
    return bytes(4, (out) => out.setUint32(0, sum));
  },
};

export const xdHeader: Checksum = {
  kind: "checksum",
  size: 4,
  compute: (covered) => bytes(4, (out) => out.setUint32(0, covered.reduce((sum, byte) => (sum + byte) >>> 0, 0))),
};

export const xdBody: Checksum = {
  kind: "checksum",
  size: 16,
  compute(covered) {
    if (covered.length % 8) throw new Error(`xd-body covers four equal runs of 16-bit words, not ${covered.length} bytes`);
    const data = view(covered);
    const quarter = covered.length / 4;
    return bytes(16, (out) => {
      for (let q = 0; q < 4; q++) {
        let sum = 0;
        for (let at = q * quarter; at < (q + 1) * quarter; at += 2) sum = (sum + data.getUint16(at)) >>> 0;
        out.setUint16(12 - q * 4, sum & 0xffff);
        out.setUint16(14 - q * 4, sum >>> 16);
      }
    });
  },
};

export const boxSum: Checksum = {
  kind: "checksum",
  size: 4,
  compute(covered) {
    const sum = sum16(covered, false);
    return bytes(4, (out) => {
      out.setUint16(0, sum);
      out.setUint16(2, (0xf004 - sum) & 0xffff);
    });
  },
};

export const checksums = {
  sum16le,
  "sum32le-fold16": sum32leFold16,
  sha1,
  "colosseum-header": colosseumHeader,
  "xd-header": xdHeader,
  "xd-body": xdBody,
  "box-sum": boxSum,
};

export type ChecksumName = keyof typeof checksums;

export function checksum(name: ChecksumName, bytes: Uint8Array, { start, end, at }: ChecksumArgs) {
  const covered = bytes.slice(uint(start), uint(end));
  if (at !== undefined) {
    const from = uint(at) - uint(start);
    covered.fill(0, Math.max(0, from), Math.max(0, Math.min(covered.length, from + checksums[name].size)));
  }
  return checksums[name].compute(covered);
}
