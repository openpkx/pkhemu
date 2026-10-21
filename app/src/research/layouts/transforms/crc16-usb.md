# crc16-usb

A checksum: CRC-16/USB, as in the Gen 7 save blocks of Sun, Moon, Ultra Sun and Ultra Moon. It's 2 bytes, stored little-endian. PKHeX calls it `CRC16Invert`.

## Use

A `checksums` entry names it with the bytes it covers, `start` to `end`, and the `range` that holds it, a `u16le`.

```json
{"step": "crc16-usb", "start": "0x1400", "end": "0x1A1C", "range": "party-checksum", "source": "pkhex:Saves/Blocks/BlockInfo3DS.cs"}
```

## Computing

Start with 0xFFFF. For each byte, XOR it into the low byte, then 8 times shift right by one bit, XORing with 0xA001 when the bit shifted out was set. Invert the result. "123456789" gives 0xB4C8.

## Where the games keep it

The block table at the end of the save holds each block's checksum.

## Vectors

[`vectors/crc16-usb.json`](vectors/crc16-usb.json): the party and box blocks of `vectors/sm.sav`, whose checksums the engine wrote.
