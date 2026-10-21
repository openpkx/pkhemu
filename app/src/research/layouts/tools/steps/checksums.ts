import { uint, view, type Uint } from "./bytes.ts";
import { gen1Checksum } from "./gen1.ts";
import { gen2Checksum } from "./gen2.ts";
import { memecryptoSign } from "./memecrypto.ts";
import { sha1Digest } from "./sha.ts";
import type { Checksum, KeyedChecksum } from "./step.ts";

export interface ChecksumArgs {
  start: Uint;
  end: Uint;
  at?: Uint;
  key?: Uint8Array;
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

export const crc16Ccitt: Checksum = {
  kind: "checksum",
  size: 2,
  compute(covered) {
    let crc = 0xffff;
    for (const byte of covered) {
      crc ^= byte << 8;
      for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return bytes(2, (out) => out.setUint16(0, crc, true));
  },
};

export const crc16Usb: Checksum = {
  kind: "checksum",
  size: 2,
  compute(covered) {
    let crc = 0xffff;
    for (const byte of covered) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
    }
    return bytes(2, (out) => out.setUint16(0, ~crc & 0xffff, true));
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
  "crc16-ccitt": crc16Ccitt,
  "crc16-usb": crc16Usb,
  "gen1-checksum": gen1Checksum,
  "gen2-checksum": gen2Checksum,
  "memecrypto-sign": memecryptoSign,
} satisfies Record<string, Checksum | KeyedChecksum>;

export type ChecksumName = keyof typeof checksums;

export const isKeyed = (name: ChecksumName) => "keyed" in checksums[name];

export function checksum(name: ChecksumName, bytes: Uint8Array, { start, end, at, key }: ChecksumArgs) {
  const covered = bytes.slice(uint(start), uint(end));
  if (at !== undefined) {
    const from = uint(at) - uint(start);
    covered.fill(0, Math.max(0, from), Math.max(0, Math.min(covered.length, from + checksums[name].size)));
  }
  const step: Checksum | KeyedChecksum = checksums[name];
  if (!("keyed" in step)) return step.compute(covered);
  if (!key) throw new Error(`${name} needs a key, which the caller passes`);
  return step.compute(covered, key);
}
