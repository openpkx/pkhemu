# text-gen1-intl

A transform for the text in Gen 1 saves and Pokémon from the English, French, German, Italian and Spanish games. Layouts name it as the `text-gen1-intl` range type. The table is the one PKHeX reads with for every language outside Japan.

## Arguments

None. The range's `length` is the most bytes the text can take.

## Decoding

If the first byte is 0x5D, the text is `*`, which marks a Pokémon from an in-game trade. Otherwise read bytes in order and look each up in the table below. The text ends at the first byte the table has no character for, or at the end of the range. The games end text with 0x50.

PKHeX reads text whose first byte is 0x0B or lower with its Korean table. The games outside Japan never write it, and this step reads it as empty.

## Encoding

`previous` is the range's bytes.

1. If `previous` decodes to the text, return it unchanged.
2. Write each character's byte from the start. A text longer than the range, a character the table doesn't hold, or `*` followed by more text fails.
3. If the text is shorter than the range, write 0x50 after it.
4. Fill the rest of the range with 0x00.

The engine writes a trainer name this way, over 8 bytes. It fills a rival's name and a Pokémon's names with 0x50 instead.

## Table

Rows give the high 4 bits of a byte, columns the low 4. Empty cells end the text, as every byte below 0x50 does.

|  | x0 | x1 | x2 | x3 | x4 | x5 | x6 | x7 | x8 | x9 | xA | xB | xC | xD | xE | xF |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 5x |  |  |  |  |  |  |  |  |  |  |  |  |  | \* |  |  |
| 6x |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 7x | @ | \# | “ | ” |  | … |  |  |  | ┌ | ─ | ┐ | │ | └ | ┘ | space |
| 8x | A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P |
| 9x | Q | R | S | T | U | V | W | X | Y | Z | ( | ) | : | ; | \[ | \] |
| Ax | a | b | c | d | e | f | g | h | i | j | k | l | m | n | o | p |
| Bx | q | r | s | t | u | v | w | x | y | z | à | è | é | ù | À | Á |
| Cx | Ä | Ö | Ü | ä | ö | ü | È | É | Ì | Í | Ñ | Ò | Ó | Ù | Ú | á |
| Dx | ì | í | ñ | ò | ó | ú | º |  |  |  |  |  |  |  | ← | ' |
| Ex | ’ | { | } | - |  |  | ? | ! | ․ | & | % | → | ▷ | ▶ | ▼ | ♂ |
| Fx | ¥ | × | . | / | , | ♀ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |

## Vectors

[`vectors/text-gen1-intl.json`](vectors/text-gen1-intl.json): every byte as the engine reads it in Red's trainer name, each byte that ends the text, the in-game trade mark, and every character the engine writes as the trainer name, with the bytes it writes after it.
