# colosseum-slots

A transform that turns the Colosseum file from a memory card into the save the game reads: the newest of its three copies, decrypted.

## The file

The file is 0x60000 bytes. The first 0x6000 hold the card's banner, icon and comments. Three copies of the save follow, 0x1E000 bytes each, at 0x6000, 0x24000 and 0x42000. In each copy every number is big-endian:

| Offset | Size | Meaning |
| --- | --- | --- |
| 0x00000 | 4 | 01 01 00 00 |
| 0x00004 | 4 | Save counter, signed |
| 0x0000C | 4 | Header checksum, [`colosseum-header`](colosseum-header.md) |
| 0x00018 | 0x1DFD4 | Encrypted |
| 0x1DFEC | 20 | [`sha1`](sha1.md) digest of 0x00000 to 0x1DFD7, which keys the encryption |

## Arguments

None.

## Decoding

1. The copy with the highest save counter is the newest. On a tie, the first wins.
2. The key is the copy's last 20 bytes, each inverted.
3. From 0x18, take 20 bytes at a time while 20 bytes are left before the digest, 6141 chunks in all. For each chunk, keep its SHA-1, XOR it with the key, then use the SHA-1 as the next key. The last 16 bytes before the digest aren't encrypted.

The decoded save is the 0x1E000 bytes of the newest copy, with its header, header checksum and digest as they are.

## Encoding

`previous` is the file. The value is a decoded save, with its checksums written.

1. Find the newest copy in `previous`, as decoding does.
2. The key is the value's last 20 bytes, each inverted. For each chunk from 0x18, XOR it with the key, then use the SHA-1 of the encrypted chunk as the next key.
3. Write the result over the newest copy.

The game writes each new save over the oldest copy with the next counter. PKHeX and the engine write back to the copy they read, and so does this step. The game reads either.

## Vectors

[`vectors/colosseum-slots.json`](vectors/colosseum-slots.json): the Colosseum files on `colosseum.raw` and `gamecube.raw`, and the save from `colosseum.raw` written over the file on `gamecube.raw`, which comes out as the file on `colosseum.raw`.
