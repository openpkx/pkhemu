# crc16-ccitt

A checksum: CRC-16/CCITT-FALSE, as in the Gen 4, Gen 5 and Gen 6 save blocks. It's 2 bytes, stored little-endian.

## Use

A `checksums` entry names it with the bytes it covers, `start` to `end`, and the `range` that holds it, a `u16le`.

```json
{"step": "crc16-ccitt", "start": 0, "end": "0xC0EC", "range": "checksum", "source": "pkhex:Saves/SAV4.cs"}
```

## Computing

Start with 0xFFFF. For each byte, XOR it into the high byte, then 8 times shift left by one bit, XORing with 0x1021 when the bit shifted out was set. Keep 16 bits. Nothing is reflected and the result isn't inverted, so "123456789" gives 0x29B1.

## Where the games keep it

- Gen 4: each block ends in a footer, 0x14 bytes in Diamond, Pearl and Platinum, 0x10 in HeartGold and SoulSilver. The checksum covers the block up to its footer and sits in the footer's last 2 bytes.
- Gen 5: each block is followed by a 2-byte counter and the checksum. A checksum block repeats every block's checksum, and has its own.
- Gen 6: the block table at the end of the save holds each block's checksum.

## Vectors

[`vectors/crc16-ccitt.json`](vectors/crc16-ccitt.json): both blocks of `vectors/dp.sav`, two blocks of `vectors/bw.sav` with the party block's copy in the checksum block, and the party and box blocks of `vectors/xy.sav`. The engine wrote every checksum.
