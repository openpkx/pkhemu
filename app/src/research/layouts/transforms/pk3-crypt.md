# pk3-crypt

Decodes a Gen 3 Pokémon: 80 bytes in a PC box, 100 in the party. The retail games encrypt the middle 48 bytes with the Pokémon's PID and trainer ID and shuffle them in one of 24 orders.

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

The checksum at 0x1C is the sum of the decoded bytes 0x20 to 0x4F as little-endian 16-bit words, kept to 16 bits. Decoding doesn't need it.

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

## Test vectors

The three Pokémon in box 1 of `vectors/frlg.sav`, described in `gen3-sections.md`. The engine put them there from PKHeX's wild encounter tables. Each sits in the storage stream of sections 5 to 13, 0xF80 bytes from each, at offset 4 + 80 × (slot − 1). The decoded bytes are what the engine's `pokemon.export` returns for the same slot, cut to 80 bytes.

### box:1:1

PID mod 24 is 20, so the encrypted order is MAGE.

Encrypted:

```
64 D0 30 39 00 00 00 00 CA C3 BE C1 BF D3 FF 00 00 00 02 02 C9 CA BF C8 CA C5 D2 00 E3 A6 00 00 64 B5 33 1B 8F 7B 58 14 64 D0 30 39 45 D0 30 39 64 D0 30 39 47 D0 30 39 74 D0 30 39 5D D0 30 39 64 96 30 39 64 D0 30 39 64 D0 30 39 64 D0 30 39
```

Decoded:

```
64 D0 30 39 00 00 00 00 CA C3 BE C1 BF D3 FF 00 00 00 02 02 C9 CA BF C8 CA C5 D2 00 E3 A6 00 00 10 00 00 00 39 00 00 00 00 46 00 00 21 00 00 00 00 00 00 00 23 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 65 03 22 EB AB 68 2D 00 00 00 00
```

### box:1:2

PID mod 24 is 15, so the encrypted order is EAMG.

Encrypted:

```
47 29 3F C5 00 00 00 00 CC BB CE CE BB CE BB FF 00 00 02 02 C9 CA BF C8 CA C5 D2 00 80 A9 00 00 47 29 3F C5 47 29 3F C5 47 29 3F C5 66 29 18 C5 47 29 3F C5 64 37 3F C5 47 4C 3C E7 F9 3E 19 63 47 29 3F C5 54 29 3F C5 5C 29 3F C5 47 6F 3F C5
```

Decoded:

```
47 29 3F C5 00 00 00 00 CC BB CE CE BB CE BB FF 00 00 02 02 C9 CA BF C8 CA C5 D2 00 80 A9 00 00 13 00 00 00 1B 00 00 00 00 46 00 00 21 00 27 00 00 00 00 00 23 1E 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 65 03 22 BE 17 26 A6 00 00 00 00
```

### box:1:3

PID mod 24 is 17, so the encrypted order is EMAG.

Encrypted:

```
91 A6 5D 8A 00 00 00 00 BD BB CE BF CC CA C3 BF FF 00 02 02 C9 CA BF C8 CA C5 D2 00 83 DD 00 00 91 A6 5D 8A 91 A6 5D 8A 91 A6 5D 8A 91 C0 59 A8 2A 6C B8 91 91 A6 5D 8A B0 A6 0C 8A 91 A6 5D 8A B2 8E 5D 8A 9B A6 5D 8A D1 A6 5D 8A 91 E0 5D 8A
```

Decoded:

```
91 A6 5D 8A 00 00 00 00 BD BB CE BF CC CA C3 BF FF 00 02 02 C9 CA BF C8 CA C5 D2 00 83 DD 00 00 0A 00 00 00 40 00 00 00 00 46 00 00 21 00 51 00 00 00 00 00 23 28 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 66 04 22 BB CA E5 1B 00 00 00 00
```
