# text-gen6

A transform for the text in Gen 6 saves and Pokémon, in every language. Layouts name it as the `text-gen6` range type. The games store text as UTF-16, little-endian. Gen 7 stores it the same way, but reads glyphs of its own as `text-gen7` describes.

## Arguments

None. The range's `length` is the most bytes the text can take.

## Decoding

Read 16-bit little-endian units until 0x0000 or the end of the range. Each unit is a UTF-16 code unit, except 0xE08E and 0xE08F, the half-width ♂ and ♀, which read as ♂ and ♀, U+2642 and U+2640. 0xFFFF doesn't end the text.

## Encoding

`previous` is the range's bytes.

1. If `previous` decodes to the text, return it unchanged.
2. Write each code unit from the start. ♂ and ♀ take the half-width 0xE08E and 0xE08F unless the text holds a character outside U+0000 to U+0FFF and U+E000 to U+EFFF other than ♂ and ♀, as PKHeX decides whether a text is full width. A text longer than the range, or holding U+0000, fails.
3. Fill the rest of the range with 0x00.

The engine writes a trainer name this way. PKHeX also writes the half-width signs in a Korean save, which this step can't tell from the text.

## Vectors

[`vectors/text-gen6.json`](vectors/text-gen6.json): text the engine reads in the trainer name of a blank X save, including both forms of ♂ and ♀ and the units that end the text, and trainer names the engine writes, with the bytes it writes after them.
