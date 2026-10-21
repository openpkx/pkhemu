# text-gen3-intl

A transform for the text in Gen 3 saves and Pokémon from the English, French, German, Italian and Spanish games. Layouts name it as the `text-gen3-intl` range type. The table is the one PKHeX reads with, which has some Japanese characters at bytes the international font draws differently.

The quote marks at 0xB1 and 0xB2 show as „ and “ in the German games and as « and » in the French ones. This step uses the English “ and ”.

## Arguments

None. The range's `length` is the most bytes the text can take.

## Decoding

Read bytes in order and look each up in the table below. The text ends at the first byte the table has no character for, 0xF7 to 0xFF, where PKHeX stops reading too. The games end text with 0xFF, or at the end of the range.

## Encoding

`previous` is the range's bytes.

1. Copy `previous`.
2. Write each character's byte from the start. A text longer than the range, or a character the table doesn't hold, fails.
3. If the text is shorter than the range, and the byte after it doesn't already end the text, write 0xFF there.
4. Leave the bytes after that as they were. PKHeX and the engine leave them too when they write a trainer name.

## Table

Rows give the high 4 bits of a byte, columns the low 4. Empty cells end the text.

|  | x0 | x1 | x2 | x3 | x4 | x5 | x6 | x7 | x8 | x9 | xA | xB | xC | xD | xE | xF |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0x | space | À | Á | Â | Ç | È | É | Ê | Ë | Ì | こ | Î | Ï | Ò | Ó | Ô |
| 1x | Œ | Ù | Ú | Û | Ñ | ß | à | á | ね | ç | è | é | ê | ë | ì | ま |
| 2x | î | ï | ò | ó | ô | œ | ù | ú | û | ñ | º | ª | ⑩ | & | + | あ |
| 3x | ぃ | ぅ | ぇ | ぉ | ゃ | = | ; | が | ぎ | ぐ | げ | ご | ざ | じ | ず | ぜ |
| 4x | ぞ | だ | ぢ | づ | で | ど | ば | び | ぶ | べ | ぼ | ぱ | ぴ | ぷ | ぺ | ぽ |
| 5x | っ | ¿ | ¡ | ⒆ | ⒇ | オ | カ | キ | ク | ケ | Í | % | ( | ) | セ | ソ |
| 6x | タ | チ | ツ | テ | ト | ナ | ニ | ヌ | â | ノ | ハ | ヒ | フ | ヘ | ホ | í |
| 7x | ミ | ム | メ | モ | ヤ | ユ | ヨ | ラ | リ | ↑ | ↓ | ← | ＋ | ヲ | ン | ァ |
| 8x | ィ | ゥ | ェ | ォ | ⒅ | < | > | ガ | ギ | グ | ゲ | ゴ | ザ | ジ | ズ | ゼ |
| 9x | ゾ | ダ | ヂ | ヅ | デ | ド | バ | ビ | ブ | ベ | ボ | パ | ピ | プ | ペ | ポ |
| Ax | ッ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | ! | ? | . | - | ･ |
| Bx | ⑬ | “ | ” | ‘ | ' | ♂ | ♀ | $ | , | ⑧ | / | A | B | C | D | E |
| Cx | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T | U |
| Dx | V | W | X | Y | Z | a | b | c | d | e | f | g | h | i | j | k |
| Ex | l | m | n | o | p | q | r | s | t | u | v | w | x | y | z | ► |
| Fx | : | Ä | Ö | Ü | ä | ö | ü |  |  |  |  |  |  |  |  |  |

## Vectors

[`vectors/text-gen3-intl.json`](vectors/text-gen3-intl.json): every byte from 0x00 to 0xF6 as the engine reads it in a Pokémon's nickname, each byte that ends the text, the trainer name and a nickname from `frlg.sav`, every character written by the engine as an original trainer name, and the trainer name Ab written over OPENPKX.
