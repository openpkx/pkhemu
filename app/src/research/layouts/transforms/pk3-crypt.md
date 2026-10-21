# pk3-crypt

A transform that decodes a Gen 3 Pokémon: 80 bytes in a PC box, 100 in the party. The retail games encrypt the middle 48 bytes with the Pokémon's PID and trainer ID and shuffle them in one of 24 orders.

## Arguments

None. The space's `source` says where each Pokémon sits, and its `length`, 80 or 100, how many bytes to take.

## The bytes

| Offset | Size | Meaning |
| --- | --- | --- |
| 0x00 | 4 | PID, little-endian |
| 0x04 | 4 | Original trainer ID, little-endian |
| 0x08 | 20 | Plain: nickname, language, flags, trainer name, markings |
| 0x1C | 2 | Checksum |
| 0x1E | 2 | Unused |
| 0x20 | 48 | Four 12-byte substructures, encrypted and shuffled |
| 0x50 | 20 | Party only, plain: status, level, HP and stats |

The substructures are Growth (G), Attacks (A), EVs and Condition (E) and Miscellaneous (M).

## Decoding

1. Read the PID and the trainer ID. The key is PID XOR trainer ID.
2. XOR each little-endian 32-bit word from 0x20 to 0x4F with the key.
3. PID mod 24 gives the order the substructures are stored in, from the table below. Move them so they read G, A, E, M from 0x20.
4. Copy every other byte as it is.

A decoded Pokémon has Growth at 0x20, Attacks at 0x2C, EVs and Condition at 0x38 and Miscellaneous at 0x44, which is what the `pk3` and `pk3-party` kinds describe. An empty slot is all zeros and decodes to all zeros.

## Encoding

Encoding runs the same steps in reverse. Put the substructures in the stored order for PID mod 24, then XOR the words from 0x20 to 0x4F with the key. Encoding doesn't need `previous`.

The checksum at 0x1C is [`sum16le`](sum16le.md) over the decoded bytes 0x20 to 0x50, as the `pk3` kinds' `checksums` say. A writer computes it before encoding.

| PID mod 24 | Stored order |
| --- | --- |
| 0 | GAEM |
| 1 | GAME |
| 2 | GEAM |
| 3 | GEMA |
| 4 | GMAE |
| 5 | GMEA |
| 6 | AGEM |
| 7 | AGME |
| 8 | AEGM |
| 9 | AEMG |
| 10 | AMGE |
| 11 | AMEG |
| 12 | EGAM |
| 13 | EGMA |
| 14 | EAGM |
| 15 | EAMG |
| 16 | EMGA |
| 17 | EMAG |
| 18 | MGAE |
| 19 | MGEA |
| 20 | MAGE |
| 21 | MAEG |
| 22 | MEGA |
| 23 | MEAG |

## Vectors

[`vectors/pk3-crypt.json`](vectors/pk3-crypt.json): the three Pokémon the engine put in box 1 of `vectors/frlg.sav` from PKHeX's wild encounter tables, with PID mod 24 of 20, 15 and 17, an empty box slot and an empty party slot, and the first Pokémon again after the engine renamed it. The decoded bytes are what the engine's `pokemon.export` returns for the same slot, cut to 80 bytes.
