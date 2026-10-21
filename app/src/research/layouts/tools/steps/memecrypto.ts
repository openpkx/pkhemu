import { sha1Digest, sha256 } from "./sha.ts";
import type { KeyedChecksum } from "./step.ts";

const SIGNATURE = 0x80;
const RSA_LENGTH = 0x60;
const DER_LENGTH = 0x7e;

const SBOX = (() => {
  const box = new Uint8Array(256);
  for (let p = 1, q = 1, first = true; first || p !== 1; first = false) {
    p = p ^ ((p << 1) & 0xff) ^ (p & 0x80 ? 0x1b : 0);
    q ^= q << 1;
    q ^= q << 2;
    q ^= q << 4;
    q &= 0xff;
    if (q & 0x80) q ^= 0x09;
    box[p] = q ^ ((q << 1) | (q >> 7)) ^ ((q << 2) | (q >> 6)) ^ ((q << 3) | (q >> 5)) ^ ((q << 4) | (q >> 4)) ^ 0x63;
  }
  box[0] = 0x63;
  return box;
})();

const double = (byte: number) => ((byte << 1) ^ (byte & 0x80 ? 0x1b : 0)) & 0xff;

function expandKey(key: Uint8Array) {
  const keys = new Uint8Array(176);
  keys.set(key);
  for (let at = 16, round = 1; at < 176; at += 4) {
    const word = keys.slice(at - 4, at);
    if (at % 16 === 0) {
      word.set([SBOX[word[1]] ^ round, SBOX[word[2]], SBOX[word[3]], SBOX[word[0]]]);
      round = double(round);
    }
    for (let i = 0; i < 4; i++) keys[at + i] = keys[at - 16 + i] ^ word[i];
  }
  return keys;
}

function aesEncrypt(keys: Uint8Array, block: Uint8Array) {
  for (let i = 0; i < 16; i++) block[i] ^= keys[i];
  for (let round = 1; round <= 10; round++) {
    const state = block.map((byte) => SBOX[byte]);
    for (let column = 0; column < 4; column++)
      for (let row = 0; row < 4; row++) block[column * 4 + row] = state[((column + row) % 4) * 4 + row];
    if (round < 10)
      for (let column = 0; column < 16; column += 4) {
        const [a, b, c, d] = block.slice(column, column + 4);
        const all = a ^ b ^ c ^ d;
        block.set([a ^ all ^ double(a ^ b), b ^ all ^ double(b ^ c), c ^ all ^ double(c ^ d), d ^ all ^ double(d ^ a)], column);
      }
    for (let i = 0; i < 16; i++) block[i] ^= keys[round * 16 + i];
  }
}

const xor = (into: Uint8Array, from: Uint8Array) => into.forEach((_, i) => (into[i] ^= from[i]));

// A left shift of the 16 bytes by one bit, reduced by 0x87, as in CMAC's subkeys.
function subkey(block: Uint8Array) {
  const shifted = block.map((byte, i) => ((byte << 1) | (i < 15 ? block[i + 1] >> 7 : 0)) & 0xff);
  if (block[0] & 0x80) shifted[15] ^= 0x87;
  return shifted;
}

function memeEncrypt(der: Uint8Array, data: Uint8Array) {
  const keys = expandKey(sha1Digest(Uint8Array.of(...der, ...data.subarray(0, data.length - RSA_LENGTH))).subarray(0, 16));
  const sig = data.subarray(data.length - RSA_LENGTH);
  const chunks = Array.from({ length: RSA_LENGTH / 16 }, (_, i) => sig.subarray(i * 16, i * 16 + 16));
  let previous = new Uint8Array(16);
  for (const chunk of chunks) {
    xor(chunk, previous);
    aesEncrypt(keys, chunk);
    previous = chunk.slice();
  }
  xor(previous, chunks[0]);
  const mask = subkey(previous);
  for (const chunk of chunks) xor(chunk, mask);
  previous = new Uint8Array(16);
  for (const chunk of chunks.reverse()) {
    const plain = chunk.slice();
    aesEncrypt(keys, chunk);
    xor(chunk, previous);
    previous = plain;
  }
}

const bigint = (bytes: Uint8Array) => bytes.reduce((value, byte) => (value << 8n) | BigInt(byte), 0n);

function modPow(base: bigint, exponent: bigint, modulus: bigint) {
  let result = 1n;
  for (base %= modulus; exponent > 0n; exponent >>= 1n, base = (base * base) % modulus) if (exponent & 1n) result = (result * base) % modulus;
  return result;
}

function sign(key: Uint8Array, data: Uint8Array) {
  if (key.length <= DER_LENGTH) throw new Error(`a MemeCrypto key is the 0x7E-byte DER public key and the private exponent, not ${key.length} bytes`);
  const der = key.subarray(0, DER_LENGTH);
  data.set(sha1Digest(data.subarray(0, data.length - 8)).subarray(0, 8), data.length - 8);
  memeEncrypt(der, data);
  const sig = data.subarray(data.length - RSA_LENGTH);
  sig[0] &= 0x7f;
  const signed = modPow(bigint(sig), bigint(key.subarray(DER_LENGTH)), bigint(der.subarray(0x18, 0x18 + 0x61)));
  // PKHeX writes the result's significant bytes from the start, leaving the rest as they were.
  const digits = signed.toString(16);
  sig.set(Uint8Array.from(digits.padStart(digits.length + (digits.length % 2), "0").match(/../g)!, (pair) => parseInt(pair, 16)));
}

export const memecryptoSign: KeyedChecksum = {
  kind: "checksum",
  size: SIGNATURE,
  keyed: true,
  compute(covered, key) {
    const signature = new Uint8Array(SIGNATURE);
    signature.set(sha256(covered));
    sign(key, signature);
    return signature;
  },
};
