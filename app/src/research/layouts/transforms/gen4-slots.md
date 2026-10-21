# gen4-slots

A transform that reads one block of a Gen 4 save from the newer of the file's two slots. Diamond, Pearl, Platinum, HeartGold and SoulSilver keep two copies of the save and pick each block's newer copy on its own, so the general block can come from one slot and the storage block from the other.

## The file

A save file is 512 KiB. Slot A is the first 0x40000 bytes and slot B the second. Each slot holds the same blocks at the same offsets: the general block, then the storage block with the PC boxes.

| Game | General block | Storage block |
| --- | --- | --- |
| Diamond and Pearl | 0x0, 0xC100 bytes | 0xC100, 0x121E0 bytes |
| Platinum | 0x0, 0xCF2C bytes | 0xCF2C, 0x121E4 bytes |
| HeartGold and SoulSilver | 0x0, 0xF628 bytes | 0xF700, 0x12310 bytes |

Each block's last 0x14 bytes hold its counters:

| Offset from the block's end | Size | Meaning |
| --- | --- | --- |
| −0x14 | 4 | Major save counter, little-endian |
| −0x10 | 4 | Minor save counter, little-endian |

These are the offsets PKHeX reads in every Gen 4 game, though HeartGold and SoulSilver's footer is only 0x10 bytes. The checksum is [`crc16-ccitt`](crc16-ccitt.md), in the block's last 2 bytes.

## Arguments

| Name | Meaning |
| --- | --- |
| `start` | The block's offset in a slot |
| `length` | The block's length |

## Decoding

1. Compare the major counters of the two copies, as unsigned 32-bit numbers:
   - A counter of 0xFFFFFFFF marks a copy never saved to. It loses, unless the other counter is 0xFFFFFFFE. If both are 0xFFFFFFFF, slot B is newer.
   - Otherwise the higher counter is newer.
2. If the major counters are equal, compare the minor counters the same way. If those are equal too, slot A is newer.
3. The block is the newer copy's `length` bytes from `start`.

## Encoding

`previous` is the file. Find the newer copy as decoding does, and write the block over it. The other copy stays as it is.

This is what PKHeX and the engine do. The games write a new save over the older copy instead.

## Vectors

[`vectors/gen4-slots.json`](vectors/gen4-slots.json): both blocks of `vectors/dp.sav`, whose general block is newer in slot B by its major counter and storage block newer in slot A by its minor counter. Three more change the general block's major counters: to 0xFFFFFFFF in slot B, against 1 and against 0xFFFFFFFE in slot A, and to 2 in both. The engine reads the trainer name from the copy the step picks in each. The encode vector is money of 654321 the engine wrote.
