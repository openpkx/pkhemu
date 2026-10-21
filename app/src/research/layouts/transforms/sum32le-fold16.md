# sum32le-fold16

A checksum that adds little-endian 32-bit words and folds the sum into 16 bits. Gen 3 sections use it.

## Use

A `checksums` entry names it with the bytes it covers, `start` to `end`. In a `gen3-sections` space it has no `range`, because [`gen3-sections`](gen3-sections.md) writes it to the sector's footer at 0xFF6.

```json
{"step": "sum32le-fold16", "start": 0, "end": "0xF80", "source": "pkhex:Saves/SAV3.cs"}
```

## Computing

1. Read the bytes from `start` to `end` as little-endian 32-bit words.
2. Add them, keeping the low 32 bits.
3. Add the high 16 bits of the sum to its low 16 bits, and keep the low 16 bits of that.
4. Write the result as a little-endian 16-bit number.

## Vectors

[`vectors/sum32le-fold16.json`](vectors/sum32le-fold16.json): whole sectors from the saves in `vectors/`, with `at` 0xFF6, covering the lengths the layouts give: 0xF80 in the retail games, and 0xF24, 0xFF0 and 0x450 in Unbound. Section 0 of `frlg.sav` sums to 0xDBF33073 and folds to 0x0C66.
