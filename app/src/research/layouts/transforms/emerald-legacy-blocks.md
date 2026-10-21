# emerald-legacy-blocks

A detect step. It passes when a Gen 3 save's SaveBlock1 looks like Emerald Legacy's rather than Emerald's. Emerald Legacy keeps Emerald's signature and sections, so nothing in the footers tells them apart.

## Arguments

None.

## Test

1. Find the newer slot, as the engine does: a slot counts when its 14 sectors hold each id from 0 to 13 once and the signature 0x08012025. Of those, the one with the higher counter at 0xFFC of section 0, read as a signed 32-bit number, wins, and a slot whose counter is negative never does. With equal counters, slot A wins. A file without one fails.
2. Join the first 0xF80 bytes of sections 1 to 4 into SaveBlock1, and read the key as the low 16 bits of section 0 0xAC.
3. The Pokédex keeps three copies of its seen flags, which the game writes together. The 0x34 bytes at SaveBlock1 0xAF0 must equal those at 0x3B34, Legacy's offsets, and the 0x34 bytes at 0x988 must differ from those at 0x3B24, Emerald's.
4. In each pocket below, every slot whose item, at +0, isn't 0 must hold a count, at +2 and XORed with the key, from 1 to the pocket's most:

   | Pocket | Offset | Slots | Most |
   | --- | --- | --- | --- |
   | Key items | 0x740 | 30 | 1 |
   | Berries | 0x8F8 | 46 | 999 |
   | TMs and HMs | 0x7F8 | 64 | 99 |

5. The step passes when the key items pocket holds at least one item, as the engine requires.

An Emerald save can still pass, so a layout that uses the step matches as `possible`.

## Vectors

[`vectors/emerald-legacy-blocks.json`](vectors/emerald-legacy-blocks.json): `emerald-legacy.sav` passes. `emerald.sav`, the same save with its key item taken out, with the seen flags out of step, and a file of zeros fail.
