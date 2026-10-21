# sum16le

A checksum that adds little-endian 16-bit words and keeps the low 16 bits. Gen 3 Pokémon use it.

## Use

A `checksums` entry names it with the bytes it covers, `start` to `end`, and the `range` that holds it, a `u16le`.

```json
{"step": "sum16le", "start": "0x20", "end": "0x50", "range": "checksum", "source": "pkhex:PKM/PK3.cs"}
```

## Computing

1. Read the bytes from `start` to `end` as little-endian 16-bit words.
2. Add them, keeping the low 16 bits.
3. Write the result to the range in little-endian order.

## Vectors

[`vectors/sum16le.json`](vectors/sum16le.json): the three decoded Pokémon from [`pk3-crypt`](pk3-crypt.md), with `at` 0x1C. The first sums to 0xA6E3, held as `E3 A6`.
