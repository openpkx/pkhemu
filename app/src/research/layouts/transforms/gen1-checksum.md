# gen1-checksum

A checksum that adds bytes and keeps the low 8 bits, inverted. Red, Blue and Yellow keep it after their main data.

## Use

A `checksums` entry names it with the bytes it covers, `start` to `end`, and the `range` that holds it, a `u8`.

```json
{"step": "gen1-checksum", "start": "0x2598", "end": "0x3523", "range": "checksum", "source": "pkhex:Saves/SAV1.cs"}
```

## Computing

1. Add the covered bytes, keeping the low 8 bits.
2. Invert the sum: write 0xFF minus it.

The international games cover 0x2598 to 0x3522 and keep the checksum at 0x3523. The Japanese games cover 0x2598 to 0x3593 and keep it at 0x3594.

## Vectors

[`vectors/gen1-checksum.json`](vectors/gen1-checksum.json): `red.sav`, `red-boxes.sav` and the Japanese `blue-jpn.sav`, and `red.sav` with the money the engine set, its checksum zeroed.
