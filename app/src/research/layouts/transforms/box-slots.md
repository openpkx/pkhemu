# box-slots

A transform that turns the Pokémon Box Ruby & Sapphire file from a memory card into the newer of its two save copies.

## The file

The file is 0x76000 bytes, in blocks of 0x2000. Block 0 is a header. Blocks 1 to 23 are the first copy and blocks 24 to 46 the second. The 12 blocks after them aren't in either copy. Each block in a copy starts with a big-endian header:

| Offset | Size | Meaning |
| --- | --- | --- |
| 0x0000 | 4 | Checksum, [`box-sum`](box-sum.md) |
| 0x0004 | 4 | Block id, 0 to 22 |
| 0x0008 | 4 | Save counter, signed |
| 0x000C | 0x1FF0 | Data |

## Arguments

None.

## Decoding

The newer copy holds the block with the highest save counter. On a tie, the first copy wins. The save is that copy's 23 blocks as they're stored, 0x2E000 bytes. [`box-blocks`](box-blocks.md) finds each block in it.

## Encoding

`previous` is the file. Find the newer copy in `previous` and write the value over it. PKHeX and the engine write back to the copy they read, and so does this step.

## Vectors

[`vectors/box-slots.json`](vectors/box-slots.json): the file on `box.raw`, whose second copy is newer, and that copy written over the scaffold `vectors.mjs` starts the file from.
