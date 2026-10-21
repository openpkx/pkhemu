# Steps

A step is logic a layout can't express as offsets, such as a decoder, a checksum or a detect test. Layouts name steps from this list and nothing else. A reader in any language implements each step once and checks it against the step's vectors. `tools/steps/` is the TypeScript implementation.

| Step | Kind | What it does |
| --- | --- | --- |
| [`gen3-slots`](gen3-slots.md) | transform | Reads the newer of a Gen 3 save's two copies and writes to the other one |
| [`gen4-slots`](gen4-slots.md) | transform | Reads a Gen 4 save block from the newer of its two copies |
| [`gen3-sections`](gen3-sections.md) | transform | Finds a Gen 3 section by its id and keeps its footer checksum |
| [`imperium-sections`](imperium-sections.md) | transform | Finds a section of an Emerald Imperium save, which keeps one slot of 28, and keeps its footer checksum |
| [`gc-memory-card`](gc-memory-card.md) | transform | Reads one game's file from a GameCube memory card |
| [`colosseum-slots`](colosseum-slots.md) | transform | Reads the newest of a Colosseum save's three copies and decrypts it |
| [`xd-slots`](xd-slots.md) | transform | Reads the newer of an XD save's two copies and decrypts it |
| [`box-slots`](box-slots.md) | transform | Reads the newer of a Box Ruby & Sapphire save's two copies |
| [`box-blocks`](box-blocks.md) | transform | Finds a Box Ruby & Sapphire block by its id |
| [`gen1-box-banks`](gen1-box-banks.md) | transform | Reads a Red, Blue or Yellow PC box from the current box or its bank |
| [`gen1-list`](gen1-list.md) | transform | Reads one Pokémon of a Gen 1 or Gen 2 list as a single-slot list, as a `.pk1` or `.pk2` holds it |
| [`gen2-box-banks`](gen2-box-banks.md) | transform | Reads a Gold, Silver or Crystal PC box from its bank, and writes the current box's copy too |
| [`gen2-backup`](gen2-backup.md) | transform | Writes the backup copy of a Gold, Silver or Crystal save's main data |
| [`pk3-crypt`](pk3-crypt.md) | transform | Decrypts and unshuffles a Gen 3 Pokémon |
| [`pk45-crypt`](pk45-crypt.md) | transform | Decrypts and unshuffles a Gen 4 or Gen 5 Pokémon |
| [`pk67-crypt`](pk67-crypt.md) | transform | Decrypts and unshuffles a Gen 6 or Gen 7 Pokémon |
| [`cfru-box`](cfru-box.md) | transform | Unpacks a boxed Pokémon in a Complete FireRed Upgrade hack |
| [`xor-key`](xor-key.md) | transform | XORs a value with a key, as Gen 3 money is |
| [`text-gen3-intl`](text-gen3-intl.md) | transform | Gen 3 text from the English, French, German, Italian and Spanish games |
| [`text-gen3-jpn`](text-gen3-jpn.md) | transform | Gen 3 text from the Japanese games |
| [`text-gen3-gc`](text-gen3-gc.md) | transform | UTF-16 text from Colosseum and XD |
| [`text-gen1-intl`](text-gen1-intl.md) | transform | Gen 1 text from the English, French, German, Italian and Spanish games |
| [`text-gen2-intl`](text-gen2-intl.md) | transform | Gen 2 text from the English, French, German, Italian and Spanish games |
| [`text-gen4`](text-gen4.md) | transform | Gen 4 text, a 16-bit table for every language |
| [`text-gen5`](text-gen5.md) | transform | UTF-16 text from Gen 5, ended by 0xFFFF |
| [`text-gen6`](text-gen6.md) | transform | UTF-16 text from Gen 6, ended by 0x0000 |
| [`text-gen7`](text-gen7.md) | transform | UTF-16 text from Gen 7, which also reads the Chinese games' glyphs |
| [`sum16le`](sum16le.md) | checksum | Sum of 16-bit words, as in a Gen 3 to 7 Pokémon |
| [`crc16-ccitt`](crc16-ccitt.md) | checksum | CRC-16/CCITT-FALSE, as in a Gen 4, 5 or 6 save block |
| [`crc16-usb`](crc16-usb.md) | checksum | CRC-16/USB, as in a Gen 7 save block |
| [`memecrypto-sign`](memecrypto-sign.md) | checksum | The signature over a Gen 7 save's checksum table, which needs a key the caller passes |
| [`sum32le-fold16`](sum32le-fold16.md) | checksum | Sum of 32-bit words folded to 16 bits, as in a Gen 3 section |
| [`gen1-checksum`](gen1-checksum.md) | checksum | Sum of bytes, inverted, as after Red, Blue and Yellow's main data |
| [`gen2-checksum`](gen2-checksum.md) | checksum | Sum of bytes in 16 bits, as after Gold, Silver and Crystal's main data and its backup |
| [`sha1`](sha1.md) | checksum | SHA-1 digest, as at the end of a Colosseum save |
| [`colosseum-header`](colosseum-header.md) | checksum | The header checksum of a Colosseum save |
| [`xd-header`](xd-header.md) | checksum | Sum of bytes, as over the header of an XD save |
| [`xd-body`](xd-body.md) | checksum | Four sums of 16-bit words, as over the body of an XD save |
| [`box-sum`](box-sum.md) | checksum | Sum of 16-bit words and its difference from 0xF004, as in a Box block |
| [`rom-table`](rom-table.md) | read | Reads a table from a GBA ROM by the pointer to it, with a known count or up to the first entry that fails its checks |
| [`rom-text`](rom-text.md) | read | Reads text from a ROM table's field, or from where a pointer in the field points |
| [`gen3-signature`](gen3-signature.md) | detect | Checks the signature in a Gen 3 save's sector footers |
| [`frlg-key-mismatch`](frlg-key-mismatch.md) | detect | Checks that a FireRed save's security key is 0 or out of step with its copy |
| [`imperium-checksums`](imperium-checksums.md) | detect | Checks that an Emerald Imperium save's section checksums cover one release's lengths |
| [`emerald-legacy-blocks`](emerald-legacy-blocks.md) | detect | Checks that a Gen 3 save's SaveBlock1 has Emerald Legacy's offsets |
| [`gc-memory-card-file`](gc-memory-card-file.md) | detect | Checks that a memory card holds a game's file |
| [`gen12-lists`](gen12-lists.md) | detect | Checks a Gen 1 or Gen 2 save's Pokémon lists, as PKHeX does |
| [`gen5-checksums`](gen5-checksums.md) | detect | Checks the checksum of a Gen 5 save's checksum block |
| [`swishcrypto-block`](swishcrypto-block.md), [`swishcrypto-hash`](swishcrypto-hash.md) | designed | Keyed blocks in the Switch games, built with their spec |

## Kinds

**Transforms** work in both directions. Decoding takes encoded bytes and returns a value, which is bytes, or text for the text steps. Encoding takes a value and `previous`, the encoded bytes it replaces, and returns the new encoded bytes. `previous` supplies what the value doesn't hold, such as the other copy of a save or the bytes after a text's end. Encoding a decoded value over the bytes it came from gives back the same bytes.

**Checksums** compute a value over the bytes from `start` to `end`, exclusive, and each step's doc says how many bytes it is and how they're stored. A writer stores them at `at`, the offset of the range that holds them. Decoding a checksum computes it, and a reader compares the result with the stored bytes. Encoding writes it. A keyed checksum, `memecrypto-sign`, also takes a key, which a writer gets from its caller and never from a layout. A checksum that covers its own range reads that range as zero. A writer computes a space's checksums in the order the layout lists them, and each reads the ranges of those after it as zero too.

**Detect steps** pass or fail on a whole file.

**Read steps** decode only, since ROM parsers only read. Their input is the whole ROM.

## How the steps chain

A Gen 3 save decodes in two steps. `gen3-slots` turns the 128 KiB file into the save the game reads, which is the 14 sectors of the newer slot followed by sectors 28 to 31. `gen3-sections` reads each `section:N` and `sector:N` space out of that save. Spaces with a `source` join the regions they name, and `pk3-crypt` decodes each Pokémon from there. In a Complete FireRed Upgrade hack, `cfru-box` does that for boxed Pokémon, and party Pokémon need no transform. Emerald Imperium keeps one slot of 28 sections and no second copy, so `imperium-sections` reads each from the file.

A writer goes back up the same chain. It encodes each changed Pokémon into its region, recomputes the kind's checksums, encodes each changed section into the save, then encodes the save into the file once. Anything it didn't change keeps its bytes.

A layout can list a `container` instead: the steps that decode the whole file into the save, in order. Colosseum's is `gc-memory-card`, which finds the game's file on the memory card, then `colosseum-slots`, which decrypts the newest copy of the save. Its `slot` space is that whole save, and the party and boxes sit in it. Box's container ends in `box-slots`, and `box-blocks` reads each `block:N` space from it. A writer encodes back through the container in reverse.

A Gen 4 save picks each block's newer copy on its own, so `gen4-slots` reads each block from the file. Gen 4 and 5 Pokémon decode with `pk45-crypt`, Gen 6 and 7 Pokémon with `pk67-crypt`.

Red, Blue and Yellow have no container. Their `sram` space is the whole save. Each `box:{1..12}` reads it through `gen1-box-banks`, which takes the box's `index` from its place in the pattern, as every transform on a pattern space can. Each Pokémon, `party:{1..6}` or `box:{1..12}:{1..20}`, reads its list through `gen1-list`. A writer encodes a changed Pokémon into its list, the list into the save, and then computes the save's `gen1-checksum`.

Gold, Silver and Crystal read the same way, with `gen2-box-banks` for each `box:{1..14}` and `gen1-list` for each Pokémon. Their container is `gen2-backup`, which decodes the file as it is. A writer computes the save's two `gen2-checksum`s, then encodes the save through `gen2-backup`, which copies the main data to its backup.

## Vectors

`vectors/<step>.json` holds a step's vectors and follows `schema/vectors.schema.json`:

- A `decode` vector: decoding `input` with `args` gives `output`.
- An `encode` vector: encoding `input` over `previous` with `args` gives `output`.
- A `test` vector: the detect step on `input` with `args` gives `passes`.

For a checksum, a decode vector's `output` is the checksum as it's stored, and an encode vector's `input` holds a wrong checksum at `at`.

A vector writes bytes in one of four ways, as hex pairs (`"9F 79 56 13"`), as `{"file", "offset", "length"}` for a run of a save in `vectors/`, as `{"fill", "length"}` for one byte repeated, such as `{"fill": "00", "length": "0x1000"}`, or as a list of these, joined in order. Text is `{"text": "OPENPKX"}`.

An implementation passes when every vector does, and when encoding each decode vector's output over its input gives back the input. Read steps have decode vectors alone.

## Where they come from

The `.sav` files in `vectors/` are blank saves the PKHeX Everywhere engine made. `tools/vectors/vectors.mjs` builds an empty scaffold of sections, because the engine can't export a blank Gen 3 save from `game.loadBlank` yet. It has the engine set the trainer name to OPENPKX and the money to 123456, then exports the save. Every Gen 3 save has slot B as the newer copy. `wrap.sav` has counter 0xFFFFFFFF in slot A and 0 in slot B, which the engine reads as slot B being newer. The FireRed scaffold keeps a copy of its security key at 0xAF8, as FireRed does. The Unbound and Radical Red scaffolds start with a Pikachu in the party and in box 1, written by `tools/vectors/cfru.mjs`, since the engine can't add a Pokémon to them. So do the Emerald Imperium, Heart & Soul and Emerald Legacy scaffolds, written by `tools/vectors/expansion.mjs`. `imperium-2.sav` is a scaffold alone, with the checksums Imperium 2.0 gives its sections, since the engine refuses to load it.

`bw.sav`, `b2w2.sav`, `xy.sav`, `sm.sav` and `usum.sav` are the engine's blank Black, White 2, X, Sun and Ultra Sun saves. `dp.sav` starts from zeros with a footer for each block in both slots, since the engine can't export a blank Gen 4 save. In each, the engine names the trainer, sets the money and puts three Pokémon in box 1. The engine can't put a Pokémon in the party, so `vectors.mjs` copies the first into party slot 1 with the crypt step, and the engine then renames it, which has it encrypt the slot itself.

The `.raw` files are memory cards. `vectors.mjs` formats each one and puts on it a blank Colosseum or XD save the engine made, or a scaffold of Box blocks, since the engine can't read back its blank Box save. The engine names the trainer, sets the money and puts a Pokémon in box 1. `gamecube.raw` holds Colosseum and XD saves from before the Pokémon went in.

`tools/vectors/steps.mjs` writes the vectors from those saves and from edits the engine makes to them, such as new money, a nickname or an item. It checks each value against the engine, and loads each save `gen3-slots` writes to confirm the engine reads the new values. The Gen 3 text vectors come from the engine reading and writing every byte of each table. The Gen 1, 2 and 4 to 7 ones come from trainer names: the engine reads bytes put in the trainer name of a blank save, and writes names there. The engine can't export a blank Gen 4 save, so the Diamond save is zeros with the general block's footer. `red.sav` is the engine's blank Red save with a Pikachu in box 1, and the same Pikachu in the party, which the parser copied and the engine wrote again. `red-boxes.sav` starts as the engine's save with box 1 full and two Pikachu in box 2. The engine can't change the current box, so `vectors.mjs` then makes box 2 current, as the game does: box 2 moves to 0x30C0 and its bank keeps a stale copy with one Pikachu. The engine reads the result. `blue-jpn.sav` is the engine's blank Japanese Blue save. `crystal.sav` and `gold.sav` are the engine's blank Crystal and Gold saves, cut to the cartridge's 32 KiB, with a Pikachu in box 1 and the party as in `red.sav`. `crystal-boxes.sav` is `crystal.sav` with box 8 current and a second Pikachu in it, which the parser put there, since the engine can't change the current box. The engine has no blank Japanese or Korean Gen 2 save, so `gold-jpn.sav`, `gold-kor.sav` and `crystal-jpn.sav` are zeros with an empty party and current box where those games keep them, which the engine then wrote. Nothing in them comes from a save someone else made. With Gen 4 to 7 saves in `LAYOUTS_SAVES`, `steps.mjs` also checks that every Pokémon in them goes through the crypt steps byte for byte, and writes no vectors from them.
