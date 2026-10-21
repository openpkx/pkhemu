# gc-memory-card

A transform that reads one game's file from a GameCube memory card. Colosseum, XD and Box keep their saves in a file on the card, and a card can hold files from other games too.

## The card

A card is a power of 2 from 512 KiB to 64 MiB, in blocks of 0x2000 bytes. Every number on it is big-endian.

| Block | Holds |
| --- | --- |
| 0 | Header. The card's size in megabits, which is its size in blocks over 16, is at 0x22. |
| 1 and 2 | Directory, and a copy of it |
| 3 and 4 | Block allocation table, and a copy of it |
| 5 on | Files |

A directory holds 127 entries of 0x40 bytes. An entry's game code is its first 4 bytes, in ASCII, such as `GC6E`. Its first block is a u16 at 0x36 and its block count a u16 at 0x38. An unused entry is all 0xFF.

The block allocation table holds a u16 at 0x0A + (block - 5) * 2 for each block from 5 on: the block that comes next in the same file, or 0xFFFF for a file's last block.

Each of the four control blocks after the header has two 16-bit checksums: the sum of its big-endian 16-bit words, and the sum of each word inverted, each kept to 16 bits and written as 0 when it comes to 0xFFFF. A directory's cover 0x0000 to 0x1FFB and sit at 0x1FFC and 0x1FFE, with its update counter at 0x1FFA. An allocation table's cover 0x0004 to 0x1FFF and sit at 0x0000 and 0x0002, with its update counter at 0x0004.

## Arguments

`gameCodes`: the game codes of the file to read, such as `["GC6E", "GC6P"]` for the American and European Colosseum.

## Decoding

1. Check that the card's size is a power of 2 from 512 KiB to 64 MiB, and that its header names the same size.
2. Of the two directories, take the one whose checksums hold. If both hold, take the one with the higher update counter, or block 1 on a tie. Do the same for the two allocation tables, blocks 3 and 4.
3. Find the directory entry whose game code is one of `gameCodes`. There must be exactly one.
4. From its first block, follow the allocation table for its block count. The file is those blocks, joined in order.

## Encoding

`previous` is the card. The value is the file, its block count times 0x2000 bytes. Find the file's blocks as decoding does, and write the value over them. Nothing else on the card changes, so the directory keeps the file's old modification time. The engine sets the time when it writes a file. The game accepts either.

## Vectors

[`vectors/gc-memory-card.json`](vectors/gc-memory-card.json): the file on each card in `vectors/`, and each of the two files on `gamecube.raw`, which holds Colosseum and XD. The encode vectors write the files from `colosseum.raw` and `xd.raw`, which have a Pokémon in box 1, over the ones on `gamecube.raw`, which don't.
