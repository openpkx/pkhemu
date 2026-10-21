# pk67-crypt

A transform that decodes a Gen 6 or Gen 7 Pokémon: 232 bytes in a PC box, 260 in the party. It works as [`pk45-crypt`](pk45-crypt.md) does, with bigger blocks and the encryption constant as the seed.

## Arguments

None. The space's `length`, 232 or 260, says how many bytes to take.

## The bytes

| Offset | Size | Meaning |
| --- | --- | --- |
| 0x00 | 4 | Encryption constant, little-endian |
| 0x04 | 2 | Plain |
| 0x06 | 2 | Checksum, little-endian |
| 0x08 | 224 | Four 56-byte blocks, A to D, encrypted and shuffled |
| 0xE8 | 28 | Party only: status, level and stats, encrypted |

## Decoding

1. Crypt 0x08 to 0xE7 from the encryption constant, with the generator in [`pk45-crypt`](pk45-crypt.md).
2. `((constant >> 13) & 31) mod 24` gives the order the blocks are stored in, from the table in `pk45-crypt`. Move them so they read A, B, C, D from 0x08.
3. In a party Pokémon, crypt 0xE8 to the end from the encryption constant again, starting over.
4. Copy the first 8 bytes as they are.

## Encoding

Encoding runs the same steps in reverse. It doesn't need `previous`.

The checksum at 0x06 is [`sum16le`](sum16le.md) over the decoded bytes 0x08 to 0xE8. It isn't part of the crypt, so a writer can compute it before or after.

An all-zero slot, as in the engine's blank saves, decodes to species 0, as in `pk45-crypt`.

## Vectors

[`vectors/pk67-crypt.json`](vectors/pk67-crypt.json): the three Pokémon the engine put in box 1 of `vectors/xy.sav`, `vectors/sm.sav` and `vectors/usum.sav`, the one in each save's party, and the first of each box again after the engine renamed it. The decoded bytes are what the engine's `pokemon.export` returns for the same slot, cut to 232 bytes for a boxed Pokémon.
