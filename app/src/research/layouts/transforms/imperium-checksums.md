# imperium-checksums

A detect step. It passes when a file holds Emerald Imperium's 28 sections, each with a checksum over the number of bytes `lengths` gives for its id. Imperium keeps no version in its save, so these lengths tell one release's saves from another's.

## Arguments

| Argument | Meaning |
| --- | --- |
| `lengths` | 28 numbers: how many bytes of each section, by id from 0, its checksum covers. 0 covers none. |

## Test

1. Find the 28 sections as [`imperium-sections`](imperium-sections.md) does. A file without them fails.
2. The step passes when the checksum at 0xFF6 in each section's footer equals `sum32le-fold16` over the section's first `lengths[id]` bytes.

Imperium 1.x covers 0xA0C bytes of section 0, 0xFF4 of sections 1 to 3 and 17 to 24, 0x868 of section 4, 0x5C0 of section 25 and none of the others. 2.0 covers 0xB7C, 0xFF4, 0xFF4, 0xFF4, 0x304, none of sections 5 to 13, 0xFF4 of sections 14 to 25, 0x5E8 of section 26 and none of section 27. A retail Gen 3 layout uses the step with `"passes": false` for both, since the engine reads a save Imperium's format claims as Imperium, or refuses it, before PKHeX reads it as a retail game.

## Vectors

[`vectors/imperium-checksums.json`](vectors/imperium-checksums.json): `imperium.sav` passes with 1.x's lengths and fails with 2.0's, and a save made for 2.0's passes with those. `emerald.sav` and a file of zeros fail.
