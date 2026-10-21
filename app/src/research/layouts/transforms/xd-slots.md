# xd-slots

A transform that turns the XD file from a memory card into the save the game reads: the newer of its two copies, decrypted.

## The file

The file is 0x56000 bytes. The first 0x6000 hold the card's banner, icon and comments. Two copies of the save follow, 0x28000 bytes each, at 0x6000 and 0x2E000. In each copy every number is big-endian:

| Offset | Size | Meaning |
| --- | --- | --- |
| 0x00000 | 4 | 01 01 00 00, or 01 01 01 00 |
| 0x00004 | 4 | Save counter, signed |
| 0x00008 | 8 | Four 16-bit keys |
| 0x00010 | 0x27FC8 | Encrypted, starting with the body checksum, [`xd-body`](xd-body.md) |

## Arguments

None.

## Decoding

1. The copy with the higher save counter is newer. On a tie, the first wins.
2. Read the four keys from 0x08.
3. From 0x10 to 0x27FD7, take four 16-bit words at a time. Subtract the first key from the first word, the second from the second, and so on, keeping 16 bits. Then advance the keys.

To advance the keys, add 0x43, 0x29, 0x17 and 0x13 to keys 0 to 3, without keeping them to 16 bits. Then key n takes nibble n of each sum: its lowest nibble from the first sum, the next from the second, and so on. In code, with k0 to k3 the sums:

```
key0 = (k0 & 0xF)         | ((k1 << 4) & 0xF0)  | ((k2 << 8) & 0xF00)  | ((k3 << 12) & 0xF000)
key1 = ((k0 >> 4) & 0xF)  | (k1 & 0xF0)         | ((k2 << 4) & 0xF00)  | ((k3 << 8) & 0xF000)
key2 = ((k0 >> 8) & 0xF)  | ((k1 >> 4) & 0xF0) | (k2 & 0xF00)         | ((k3 << 4) & 0xF000)
key3 = ((k0 >> 12) & 0xF) | ((k1 >> 8) & 0xF0) | ((k2 >> 4) & 0xF00) | (k3 & 0xF000)
```

The decoded save is the 0x28000 bytes of the newer copy, with its header and keys as they are.

## Encoding

`previous` is the file. Find the newer copy in `previous`, as decoding does. Encrypt the value by adding the keys from its 0x08 instead of subtracting them, and write it over the newer copy.

PKHeX and the engine write back to the copy they read, and so does this step.

## Vectors

[`vectors/xd-slots.json`](vectors/xd-slots.json): the XD files on `xd.raw` and `gamecube.raw`, and the save from `xd.raw` written over the file on `gamecube.raw`, which comes out as the file on `xd.raw`.
