# cfru-box

A transform that unpacks a Pokémon in a box of a hack built on the Complete FireRed Upgrade, such as Unbound and Radical Red. A box packs each Pokémon into 58 bytes. Decoded, it has the 80-byte Gen 3 layout, unencrypted, so the `cfru-boxed` and `cfru-party` kinds share their offsets.

## Arguments

None. The space's `source` says where each Pokémon sits, with `length` 58, and the space's `length` is 80.

## The bytes

| Stored | Decoded | Size | Meaning |
| --- | --- | --- | --- |
| 0x00 | 0x00 | 0x1C | PID, original trainer ID, nickname, language, flags and trainer name |
| 0x1C | 0x20 | 0x0B | Species, held item, experience, PP Ups, friendship and ball |
| 0x27 | 0x2C | 5 | Four moves, 10 bits each |
| 0x2C | 0x38 | 6 | EVs |
| 0x32 | 0x44 | 8 | Pokérus, met location, origins, IVs, egg and hidden ability |

## Decoding

1. Start from 80 zero bytes.
2. Copy each run in the table to its decoded offset.
3. Read the 5 bytes at 0x27 as a little-endian 40-bit number. Move N (from 0) is bits 10N to 10N + 9. Write each as a little-endian 16-bit number at 0x2C + 2N.

The bytes a box doesn't store decode as zeros: the checksum at 0x1C, 0x2B, the PP at 0x34, 0x3E to 0x43 and the ribbons at 0x4C. An empty slot is all zeros and decodes to all zeros.

## Encoding

1. Copy each run back to its stored offset.
2. Join the four moves into the 40-bit number, move N at bit 10N, and write it little-endian at 0x27.

A move of 1024 or more doesn't fit, and encoding fails. The bytes a box doesn't store are dropped. Encoding doesn't need `previous`.

## Vectors

[`vectors/cfru-box.json`](vectors/cfru-box.json): the Pokémon in box 1 of `vectors/unbound.sav` and `vectors/radicalred.sav`, an empty box slot, and the first again after the engine renamed it and changed its moves. The decoded bytes are what the engine's `pokemon.export` returns for the same slot, cut to 80 bytes, with the PP at 0x34 cleared, since the engine fills in the PP a box doesn't store.
