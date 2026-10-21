# box-sum

A 4-byte checksum over a block of a Box Ruby & Sapphire save, 0x0004 to 0x1FFB.

## Computing

1. Add the covered bytes as big-endian 16-bit words, keeping 16 bits.
2. Write the sum big-endian, then 0xF004 minus the sum, kept to 16 bits, big-endian.

## Vectors

[`vectors/box-sum.json`](vectors/box-sum.json): blocks 0, 1 and 22 of the save on `box.raw`.
