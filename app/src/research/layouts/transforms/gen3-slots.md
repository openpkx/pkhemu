# gen3-slots

A transform that turns a Gen 3 save file into the save the game reads. Ruby, Sapphire, Emerald, FireRed, LeafGreen and the hacks built on them, such as Unbound, all store their saves this way. The game keeps two copies of its save and writes each new save over the older one, so a failed write leaves the last good save intact.

## The file

A save file is 128 KiB: 32 sectors of 0x1000 bytes. Sectors 0 to 13 are slot A, sectors 14 to 27 are slot B, and sectors 28 to 31 sit outside both slots.

Each sector in a slot ends in a 12-byte footer:

| Offset | Size | Meaning |
| --- | --- | --- |
| 0xFF4 | 2 | Section id, 0 to 13, little-endian |
| 0xFF6 | 2 | Checksum, little-endian |
| 0xFF8 | 4 | Signature: 0x08012025 in the retail games. Hacks may use their own, such as 0x01122000 in Unbound. |
| 0xFFC | 4 | Save counter, little-endian |

## Arguments

None.

## Decoding

1. A slot is valid when the section ids in its 14 footers are 0 to 13, each once.
2. If only one slot is valid, it's the newer one. If both are, the one with the higher save counter is newer. Every footer in a slot holds the same counter, so read it from the slot's first sector. Compare counters as unsigned 32-bit numbers. The counter wraps, so 0 is newer than 0xFFFFFFFF. With equal counters, slot A is newer. If neither slot is valid, the file isn't a Gen 3 save.
3. The save is the newer slot's 14 sectors as they're stored, followed by sectors 28 to 31, 0x12000 bytes in all.

## Encoding

`previous` is the file. The value is a save of 0x12000 bytes.

1. Find the newer slot in `previous`, as decoding does.
2. Copy `previous`, and write the save's last 0x4000 bytes over sectors 28 to 31.
3. If the save's first 0xE000 bytes match the newer slot, stop there.
4. Otherwise write them over the other slot, and set the counter in each of its 14 footers to the newer slot's counter plus 1, wrapping from 0xFFFFFFFF to 0.

The new copy keeps its sections in the same sectors. The game rotates them by one sector on each save, but reads them by id, so either order loads.

PKHeX and the engine write a save back over the slot they read, without moving it. The game, and this step, write the other slot. The vectors check that the engine reads each file this step writes.

## Vectors

[`vectors/gen3-slots.json`](vectors/gen3-slots.json): the newer slot of each save in `vectors/`, and money of 654321 written to slot A of four of them, which makes slot A the newer copy.
