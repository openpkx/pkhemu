# colosseum-header

A checksum over the header of a Colosseum save. It covers the whole decoded save, 0x1E000 bytes, because it reads the digest at the end.

## Computing

1. Read the first eight big-endian 32-bit words, with the checksum itself, at 0x0C, read as zero.
2. XOR the words at 0x18 and 0x1C with the first two words of the digest at 0x1DFEC, each inverted. These are the two words the encrypted save holds there.
3. Subtract each word from 0, keeping 32 bits.
4. Write the result big-endian.

Colosseum computes the [`sha1`](sha1.md) digest first, with this checksum as zero, then this checksum.

## Vectors

[`vectors/colosseum-header.json`](vectors/colosseum-header.json): the save on `colosseum.raw`.
