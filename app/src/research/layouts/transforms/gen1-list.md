# gen1-list

A transform that reads one Pokémon from a Gen 1 list, such as the party or a PC box, as a single-slot list, the way a `.pk1` file holds it.

## The list

| Offset | Size | Meaning |
| --- | --- | --- |
| 0 | 1 | Count of Pokémon |
| 1 | capacity + 1 | Species of each Pokémon, then 0xFF after the last |
| capacity + 2 | capacity × stored | The Pokémon |
| after them | capacity × names | Original trainer names |
| after them | capacity × names | Nicknames |

A list is `2 + capacity × (1 + stored + 2 × names)` bytes. In Red, Blue and Yellow, the party holds 6 Pokémon of 44 bytes, a box 20 of 33, the first 33 bytes of a party Pokémon. Gold, Silver and Crystal keep their lists the same way, with 6 Pokémon of 48 bytes in the party and 20 of 32 in a box, and mark an egg with 0xFD in place of its species. International names take 11 bytes.

## Arguments

| Argument | Meaning |
| --- | --- |
| `capacity` | Pokémon a list holds |
| `stored` | Bytes a Pokémon takes in the list |
| `party` | Bytes of a party Pokémon, which a single-slot list holds |
| `names` | Bytes a name takes |
| `index` | The slot from 0. A space a pattern names gets it from its position. |

`input` holds one or more lists back to back. Slot `index` is slot `index mod capacity` of list `index / capacity`, so `box:{1..12}:{1..20}` reads all twelve boxes from one source.

## Decoding

The single-slot list is `3 + party + 2 × names` bytes, 69 in the international Gen 1 games and 73 in the Gen 2 ones:

| Offset | Size | Meaning |
| --- | --- | --- |
| 0 | 1 | 1 when the slot is within the list's count, otherwise 0 |
| 1 | 1 | The slot's species from the list's header |
| 2 | 1 | 0xFF |
| 3 | party | The Pokémon's `stored` bytes, then zeros up to `party` |
| 3 + party | names | Original trainer name |
| 3 + party + names | names | Nickname |

## Encoding

`previous` is the input the value replaces.

1. Write byte 1 to the slot's species in the header, and the Pokémon's `stored` bytes and both names to their places. Bytes 0 and 2, and the bytes past `stored`, aren't written.
2. Write 0xFF after the last species, at `1 + count`, so the list stays ended. A writer that adds or takes away a Pokémon sets the count first.

## Vectors

[`vectors/gen1-list.json`](vectors/gen1-list.json): the party Pokémon of `red.sav`, which decodes to the `.pk1` the engine exports, and boxed Pokémon of `red-boxes.sav`, which decode to the engine's `.pk1` without the level and stats it fills in. The encode vectors write Pokémon the engine nicknamed, and one into a box whose count went up first. The party and box 1 of `crystal.sav` decode to the engine's `.pk2`s and take Pokémon it nicknamed.
