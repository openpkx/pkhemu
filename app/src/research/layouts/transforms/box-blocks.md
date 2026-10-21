# box-blocks

A transform that finds one block of a Box Ruby & Sapphire save by its id. It reads the save [`box-slots`](box-slots.md) decodes.

## Arguments

`block`: the block's id, 0 to 22.

## Decoding

Find the block, 0x2000 bytes, whose id, a big-endian u32 at 0x04, is `block`. The space is the whole block, header included. The PC's boxes run through the data of blocks 0 to 22 in id order, 0x000C to 0x1FFB of each.

## Encoding

`previous` is the save. Write the value over the block with the same id. The layout lists the block's checksum, so a writer computes it before encoding.

## Vectors

[`vectors/box-blocks.json`](vectors/box-blocks.json): blocks 0, 1 and 22 of the save on `box.raw`, and block 0 of that save written over the scaffold's.
