import { view } from "./bytes.ts";

// Written out rather than taken from node:crypto, so the runtime also runs in a browser, where SubtleCrypto is async.

export function sha1Digest(message: Uint8Array) {
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
  const digest = new Uint8Array(20);
  hash.forEach((word, i) => view(digest).setUint32(i * 4, word));
  return digest;
}

const K = new Uint32Array(
  "428a2f98 71374491 b5c0fbcf e9b5dba5 3956c25b 59f111f1 923f82a4 ab1c5ed5 d807aa98 12835b01 243185be 550c7dc3 72be5d74 80deb1fe 9bdc06a7 c19bf174 e49b69c1 efbe4786 0fc19dc6 240ca1cc 2de92c6f 4a7484aa 5cb0a9dc 76f988da 983e5152 a831c66d b00327c8 bf597fc7 c6e00bf3 d5a79147 06ca6351 14292967 27b70a85 2e1b2138 4d2c6dfc 53380d13 650a7354 766a0abb 81c2c92e 92722c85 a2bfe8a1 a81a664b c24b8b70 c76c51a3 d192e819 d6990624 f40e3585 106aa070 19a4c116 1e376c08 2748774c 34b0bcb5 391c0cb3 4ed8aa4a 5b9cca4f 682e6ff3 748f82ee 78a5636f 84c87814 8cc70208 90befffa a4506ceb bef9a3f7 c67178f2"
    .split(" ")
    .map((word) => parseInt(word, 16)),
);

export function sha256(message: Uint8Array) {
  const padded = new Uint8Array(Math.ceil((message.length + 9) / 64) * 64);
  padded.set(message);
  padded[message.length] = 0x80;
  const data = view(padded);
  data.setUint32(padded.length - 8, Math.floor(message.length / 0x20000000));
  data.setUint32(padded.length - 4, (message.length * 8) >>> 0);
  const hash = Uint32Array.of(0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19);
  const words = new Uint32Array(64);
  const rotate = (word: number, by: number) => (word >>> by) | (word << (32 - by));
  for (let block = 0; block < padded.length; block += 64) {
    for (let i = 0; i < 16; i++) words[i] = data.getUint32(block + i * 4);
    for (let i = 16; i < 64; i++) {
      const [a, b] = [words[i - 15], words[i - 2]];
      words[i] = words[i - 16] + (rotate(a, 7) ^ rotate(a, 18) ^ (a >>> 3)) + words[i - 7] + (rotate(b, 17) ^ rotate(b, 19) ^ (b >>> 10));
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + words[i]) >>> 0;
      const t2 = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      [a, b, c, d, e, f, g, h] = [(t1 + t2) >>> 0, a, b, c, (d + t1) >>> 0, e, f, g];
    }
    [a, b, c, d, e, f, g, h].forEach((word, i) => (hash[i] = hash[i] + word));
  }
  const digest = new Uint8Array(32);
  hash.forEach((word, i) => view(digest).setUint32(i * 4, word));
  return digest;
}
