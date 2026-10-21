# imperium-sections

A transform that reads one section of an Emerald Imperium save from the file. Imperium keeps one slot of 28 sections instead of Emerald's two slots of 14, and moves them along by one sector each time it saves, so a section is found by the id in its footer.

## The file

A save file is 128 KiB. Its first 28 sectors of 0x1000 bytes hold the sections, in any order. Each ends in the footer [`gen3-slots`](gen3-slots.md) describes, with a section id from 0 to 27 and the signature 0x08012025. The bytes after the 28 sectors, including any clock an emulator appends, aren't read or changed.

## Arguments

| Argument | Meaning |
| --- | --- |
| `section` | The section id to read, 0 to 27. |
| `length` | How many bytes to take from the start of the sector, which is the space's `length`, up to 0xFF4. |
| `checksum` | The space's checksum without a `range`, as `{"step", "start", "end"}`. Encoding writes it to the footer. |

A layout gives `section` in the space's `args`. `length` and `checksum` come from the space itself.

## Decoding

1. Find the sector among the file's first 28 whose footer holds `section` at 0xFF4. The file isn't an Imperium save unless each id from 0 to 27 is in one footer and every footer holds the signature.
2. Take its first `length` bytes.

## Encoding

`previous` is the file.

1. Find the sector, as decoding does, and write the value over its first `length` bytes.
2. Compute `checksum` over the value and write it little-endian to the footer at 0xFF6. Imperium uses `sum32le-fold16` over the bytes the game uses, which differ by section, such as 0xA0C in section 0.

The sector keeps its place, id, signature and counter, as the engine writes it. The game would move every section along by one sector, but reads them by id, so either order loads.

## Vectors

[`vectors/imperium-sections.json`](vectors/imperium-sections.json): sections 0, 1 and 17 of `vectors/imperium.sav`, and money of 654321 written to section 1 as the engine writes it.
