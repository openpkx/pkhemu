# gen3-sections

A transform that reads one section, or one sector outside the slots, from the save that [`gen3-slots`](gen3-slots.md) decodes.

## Arguments

| Argument | Meaning |
| --- | --- |
| `section` | The section id to read, 0 to 13. |
| `sector` | A sector outside the slots to read, 28 to 31. |
| `length` | How many bytes to take from the start of the sector, which is the space's `length`. The retail games use the first 0xF80 bytes of a section. Unbound uses up to 0xFF0. |
| `checksum` | The space's checksum without a `range`, as `{"step", "start", "end"}`. Encoding writes it to the footer. |

A layout gives `section` or `sector` in the space's `args`. `length` and `checksum` come from the space itself.

## Decoding

1. For `section`, find the sector among the save's first 14 whose footer holds that id at 0xFF4. For `sector`, take the sector at (`sector` − 28) × 0x1000 + 0xE000 in the save.
2. Take its first `length` bytes.

## Encoding

`previous` is the save.

1. Find the sector, as decoding does, and write the value over its first `length` bytes.
2. For `section`, compute `checksum` over the value and write it little-endian to the footer at 0xFF6. A retail section uses `sum32le-fold16` over its first 0xF80 bytes.
3. For `sector`, write the checksum to 0xFF4 instead. Skip it when every byte of the sector is 0x00 or 0xFF, which means nothing has written the sector yet. PKHeX does the same. The retail games keep a checksum there, and Unbound's sectors 30 and 31 have none.

A section's footer keeps its id, signature and counter. `gen3-slots` sets the counter when it writes the save to the file.

## Vectors

[`vectors/gen3-sections.json`](vectors/gen3-sections.json): sections 0, 1, 5 and 13 of each save in `vectors/`, sectors 28 and 30, money of 654321 written to section 1 of four saves as the engine writes it, and a write to sector 28 with the checksum the engine gives it.
