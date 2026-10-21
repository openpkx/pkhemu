# xd-header

A checksum that adds bytes. XD keeps the sum of the first 8 bytes of its save, the header and save counter, at 0xE0.

## Computing

1. Add the covered bytes, keeping 32 bits.
2. Write the sum big-endian.

## Vectors

[`vectors/xd-header.json`](vectors/xd-header.json): the save on `xd.raw`.
