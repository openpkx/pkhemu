# text-gen3-jpn

A transform for the text in Gen 3 saves and Pokémon from the Japanese games. Layouts name it as the `text-gen3-jpn` range type. The table is the one PKHeX reads with.

## Arguments

None. The range's `length` is the most bytes the text can take.

## Decoding

Read bytes in order and look each up in the table below. The text ends at the first byte the table has no character for, 0xFC to 0xFF, where PKHeX stops reading too. The games end text with 0xFF, or at the end of the range.

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
| 0x | ideographic space | あ | い | う | え | お | か | き | く | け | こ | さ | し | す | せ | そ |
| 1x | た | ち | つ | て | と | な | に | ぬ | ね | の | は | ひ | ふ | へ | ほ | ま |
| 2x | み | む | め | も | や | ゆ | よ | ら | り | る | れ | ろ | わ | を | ん | ぁ |
| 3x | ぃ | ぅ | ぇ | ぉ | ゃ | ゅ | ょ | が | ぎ | ぐ | げ | ご | ざ | じ | ず | ぜ |
| 4x | ぞ | だ | ぢ | づ | で | ど | ば | び | ぶ | べ | ぼ | ぱ | ぴ | ぷ | ぺ | ぽ |
| 5x | っ | ア | イ | ウ | エ | オ | カ | キ | ク | ケ | コ | サ | シ | ス | セ | ソ |
| 6x | タ | チ | ツ | テ | ト | ナ | ニ | ヌ | ネ | ノ | ハ | ヒ | フ | ヘ | ホ | マ |
| 7x | ミ | ム | メ | モ | ヤ | ユ | ヨ | ラ | リ | ル | レ | ロ | ワ | ヲ | ン | ァ |
| 8x | ィ | ゥ | ェ | ォ | ャ | ュ | ョ | ガ | ギ | グ | ゲ | ゴ | ザ | ジ | ズ | ゼ |
| 9x | ゾ | ダ | ヂ | ヅ | デ | ド | バ | ビ | ブ | ベ | ボ | パ | ピ | プ | ペ | ポ |
| Ax | ッ | ０ | １ | ２ | ３ | ４ | ５ | ６ | ７ | ８ | ９ | ！ | ？ | 。 | ー | ・ |
| Bx | … | 『 | 』 | 「 | 」 | ♂ | ♀ | 円 | ． | × | ／ | Ａ | Ｂ | Ｃ | Ｄ | Ｅ |
| Cx | Ｆ | Ｇ | Ｈ | Ｉ | Ｊ | Ｋ | Ｌ | Ｍ | Ｎ | Ｏ | Ｐ | Ｑ | Ｒ | Ｓ | Ｔ | Ｕ |
| Dx | Ｖ | Ｗ | Ｘ | Ｙ | Ｚ | ａ | ｂ | ｃ | ｄ | ｅ | ｆ | ｇ | ｈ | ｉ | ｊ | ｋ |
| Ex | ｌ | ｍ | ｎ | ｏ | ｐ | ｑ | ｒ | ｓ | ｔ | ｕ | ｖ | ｗ | ｘ | ｙ | ｚ | ► |
| Fx | ： | Ä | Ö | Ü | ä | ö | ü | ↑ | ↓ | ← | → | ＋ |  |  |  |  |

## Vectors

[`vectors/text-gen3-jpn.json`](vectors/text-gen3-jpn.json): every byte from 0x00 to 0xFB as the engine reads it in a Japanese Pokémon's nickname, each byte that ends the text, and every character written by the engine as the original trainer name of a Japanese Pokémon, 5 at a time.
