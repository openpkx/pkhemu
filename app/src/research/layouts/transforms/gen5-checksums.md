# gen5-checksums

A detect step. It passes when the checksum stored at `at` is the [`crc16-ccitt`](crc16-ccitt.md) of the bytes from `start` to `end`, as PKHeX tells a Gen 5 save by its checksum block.

## Arguments

| Argument | Meaning |
| --- | --- |
| `start` | The first byte the checksum covers. |
| `end` | The byte after the last one it covers. |
| `at` | Where the checksum is stored, a `u16le`. |

## Test

1. Compute the CRC-16/CCITT-FALSE of the bytes from `start` to `end`.
2. The step passes when the `u16le` at `at` equals it, and fails when `at` is past the end of the file.

A Gen 5 save ends its main data with a block that holds a copy of every other block's checksum, then a footer whose last 2 bytes are the block's own checksum. Black and White's block runs from 0x23F00 to 0x23F8C with its checksum at 0x23F9A. Black 2 and White 2's runs from 0x25F00 to 0x25F94 with its checksum at 0x25FA2. The game also writes the save's size and a magic number in the footer, but PKHeX's blank saves don't, so detect reads the checksum alone.

## Vectors

[`vectors/gen5-checksums.json`](vectors/gen5-checksums.json): `bw.sav` and `b2w2.sav` with both games' arguments, each passing only its own, `bw.sav` with a byte of its checksum block changed, and a file of zeros.
