# gen2-checksum

A checksum that adds bytes and keeps the low 16 bits, stored little-endian. Gold, Silver and Crystal keep it after their main data, and the same value again after the backup copy.

## Use

A `checksums` entry names it with the bytes it covers, `start` to `end`, and the `range` that holds it, a `u16le`.

```json
{"step": "gen2-checksum", "start": "0x2009", "end": "0x2B83", "range": "checksum", "source": "pkhex:Saves/SAV2.cs"}
```

## Computing

Add the covered bytes, keeping the low 16 bits, and write the sum low byte first.

The international Gold and Silver cover 0x2009 to 0x2D68 and keep the sum at 0x2D69 and 0x7E6D. The international Crystal covers 0x2009 to 0x2B82 and keeps it at 0x2D0D and 0x1F0D.

## Vectors

[`vectors/gen2-checksum.json`](vectors/gen2-checksum.json): both checksums of `crystal.sav` and `gold.sav`, and `crystal.sav` with the money the engine set, its checksum zeroed.
