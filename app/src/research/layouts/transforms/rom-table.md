# rom-table

A read step that finds a table in a GBA ROM, such as a hack's item names, by the pointer to it at a fixed offset. A `rom` layout's table spaces read through it. A ROM parser only reads, so it has no encoding.

## Pointers

A ROM pointer is a u32le GBA address. The ROM starts at 0x08000000, so offset `o` is address `0x08000000 + o`. A pointer points inside the ROM when `0x08000000 ≤ address < 0x08000000 + ROM length`.

## Arguments

| Argument | Meaning |
| --- | --- |
| `pointer` | The offset in the ROM of the pointer to the table |
| `length` | Bytes in one entry, the length of the table's kind |
| `count` | Entries in the table, for a ROM the layout lists in `roms` |
| `checks` | The entry checks, for any other ROM |

It takes `count` or `checks`, not both.

## Checks

A check reads a value at `offset` from the start of an entry, as a detect check does in a space. `equals` passes when the value is one of its numbers, `not` when it's none of them, and `zero` when every byte is 0 (true) or any isn't (false). `pointer` passes when the u32le there points inside the ROM. `any` passes when one of its checks does. A check that ends past the entry fails.

## Decoding

1. Read the pointer at `pointer`. If it doesn't point inside the ROM, fail.
2. With `count`, the table is `count × length` bytes from there. If that runs past the ROM, fail.
3. With `checks`, the table runs from there until the first entry that fails a check or would end past the ROM, which isn't part of it.

The output is the table's bytes, its entries back to back.

## Detecting

A `rom` layout's detect lists `tables`: a table passes when its pointer points inside the ROM and its first `entries` entries pass every check.

## Vectors

[`vectors/rom-table.json`](vectors/rom-table.json): tables in ROMs the vectors build from bytes, read with a count and to the first entry that fails, by a number, a pointer and an `any` check.
