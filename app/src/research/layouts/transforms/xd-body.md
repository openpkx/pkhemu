# xd-body

A 16-byte checksum over most of an XD save, 0x0008 to 0x27FD7 in the layout.

## Computing

1. Split the covered bytes into four equal parts.
2. For each part, add its big-endian 16-bit words, keeping 32 bits.
3. Split each sum into a high and a low 16-bit half. Write the eight halves big-endian in reverse order: the fourth sum's low half, then its high half, then the third sum's, down to the first sum's high half.

XD keeps it at 0x10, inside the bytes it covers, so it reads its own range as zero. It covers the [`xd-header`](xd-header.md) checksum too, which the layout lists before it.

## Vectors

[`vectors/xd-body.json`](vectors/xd-body.json): the save on `xd.raw`.
