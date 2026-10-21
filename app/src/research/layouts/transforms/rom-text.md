# rom-text

A read step for text in a GBA ROM table's field, which holds the text itself or, for text too long for it, a pointer to the text. A range marks this with `"storage": "inline-or-pointer"`. Unbound keeps 33 long item names this way.

## Arguments

| Argument | Meaning |
| --- | --- |
| `at` | The offset of the field in the ROM |
| `length` | Bytes in the field |
| `type` | The text type, `text-gen3-intl` or `text-gen3-jpn` |

## Decoding

1. Read the field's first 4 bytes as a ROM pointer, as [`rom-table`](rom-table.md) describes.
2. If it points inside the ROM, decode the text from there to its end with the text type's step.
3. Otherwise decode the field's `length` bytes with it.

Text in the field reads as a pointer only when its fourth byte is 0x08 or 0x09, Ë or Ì in Gen 3 text, and the pointer lands inside the ROM.

## Vectors

[`vectors/rom-text.json`](vectors/rom-text.json): ROMs the vectors build from bytes, with text in the field, text behind a pointer in it, and a field whose first bytes would point past the ROM, which holds text.
