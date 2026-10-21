# text-gen5

A transform for the text in Gen 5 saves and Pokémon, in every language. Layouts name it as the `text-gen5` range type. The games store text as UTF-16, little-endian.

## Arguments

None. The range's `length` is the most bytes the text can take.

## Decoding

Read 16-bit little-endian units until 0xFFFF, 0x0000 or the end of the range. The games end text with 0xFFFF. Each unit is a UTF-16 code unit, except 0x246D and 0x246E, the half-width ♂ and ♀, which read as ♂ and ♀, U+2642 and U+2640.

## Encoding

`previous` is the range's bytes.

1. If `previous` decodes to the text, return it unchanged.
2. Write each code unit from the start. ♂ and ♀ take the half-width 0x246D and 0x246E unless the text holds a character outside U+0000 to U+0FFF and U+E000 to U+EFFF other than ♂ and ♀, as PKHeX decides whether a text is full width. A text longer than the range, or holding U+0000 or U+FFFF, fails.
3. If the text is shorter than the range, write 0xFFFF after it.
4. Fill the rest of the range with 0x00.

The engine writes a trainer name this way. It leaves the bytes after a Pokémon's nickname or original trainer name as they were. PKHeX also writes the half-width signs in a Korean save, which this step can't tell from the text.

## Vectors

[`vectors/text-gen5.json`](vectors/text-gen5.json): text the engine reads in the trainer name of a blank Black save, including both forms of ♂ and ♀ and the units that end the text, and trainer names the engine writes, with the bytes it writes after them.
