# pk45-crypt

A transform that decodes a Gen 4 or Gen 5 Pokémon: 136 bytes in a PC box, 236 in a Gen 4 party, 220 in a Gen 5 party. The games encrypt everything after the first 8 bytes with a linear congruential generator and shuffle the four 32-byte blocks in one of 24 orders picked by the PID.

## Arguments

None. The space's `length` says which of the three sizes to take.

## The bytes

| Offset | Size | Meaning |
| --- | --- | --- |
| 0x00 | 4 | PID, little-endian |
| 0x04 | 2 | Plain flags |
| 0x06 | 2 | Checksum, little-endian |
| 0x08 | 128 | Four 32-byte blocks, A to D, encrypted and shuffled |
| 0x88 | 100 or 84 | Party only: status, level and stats, encrypted |

## The generator

Each step sets `seed = (seed × 0x41C64E6D + 0x6073) mod 2³²` and gives `seed >> 16`. To crypt a run of bytes from a seed, XOR each little-endian 16-bit word in it, in order, with the next value. Crypting the same run again from the same seed undoes it.

## Decoding

1. Crypt 0x08 to 0x87 from the checksum at 0x06.
2. `((PID >> 13) & 31) mod 24` gives the order the blocks are stored in, from the table below. Move them so they read A, B, C, D from 0x08.
3. In a party Pokémon, crypt 0x88 to the end from the PID.
4. Copy the first 8 bytes as they are.

## Encoding

Encoding runs the same steps in reverse: put the blocks in the stored order, crypt 0x08 to 0x87 from the checksum, and crypt the party bytes from the PID. Encoding doesn't need `previous`.

The checksum at 0x06 is [`sum16le`](sum16le.md) over the decoded bytes 0x08 to 0x88. A writer computes it before encoding, since it seeds the crypt.

The blank saves the engine makes keep empty slots as zeros. Those decode to bytes that aren't all zeros, but the species, the first word at 0x08, stays 0, because the first value from seed 0 is 0.

| Shuffle | Stored order |
| --- | --- |
| 0 | ABCD |
| 1 | ABDC |
| 2 | ACBD |
| 3 | ACDB |
| 4 | ADBC |
| 5 | ADCB |
| 6 | BACD |
| 7 | BADC |
| 8 | BCAD |
| 9 | BCDA |
| 10 | BDAC |
| 11 | BDCA |
| 12 | CABD |
| 13 | CADB |
| 14 | CBAD |
| 15 | CBDA |
| 16 | CDAB |
| 17 | CDBA |
| 18 | DABC |
| 19 | DACB |
| 20 | DBAC |
| 21 | DBCA |
| 22 | DCAB |
| 23 | DCBA |

## Vectors

[`vectors/pk45-crypt.json`](vectors/pk45-crypt.json): the three Pokémon the engine put in box 1 of `vectors/dp.sav`, `vectors/bw.sav` and `vectors/b2w2.sav`, the one in each save's party, and the first of each box again after the engine renamed it. The decoded bytes are what the engine's `pokemon.export` returns for the same slot, cut to 136 bytes for a boxed Pokémon.
