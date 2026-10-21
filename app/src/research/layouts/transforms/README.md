# Steps

A step is logic a layout can't express as offsets, such as a decoder, a checksum or a detect test. Layouts name steps from this list and nothing else. A reader in any language implements each step once and checks it against the step's vectors. `tools/steps/` is the TypeScript implementation.

| Step | Kind | What it does |
| --- | --- | --- |
| [`gen3-slots`](gen3-slots.md) | transform | Reads the newer of a Gen 3 save's two copies and writes to the other one |
| [`gen3-sections`](gen3-sections.md) | transform | Finds a Gen 3 section by its id and keeps its footer checksum |
| [`gc-memory-card`](gc-memory-card.md) | transform | Reads one game's file from a GameCube memory card |
| [`colosseum-slots`](colosseum-slots.md) | transform | Reads the newest of a Colosseum save's three copies and decrypts it |
| [`xd-slots`](xd-slots.md) | transform | Reads the newer of an XD save's two copies and decrypts it |
| [`box-slots`](box-slots.md) | transform | Reads the newer of a Box Ruby & Sapphire save's two copies |
| [`box-blocks`](box-blocks.md) | transform | Finds a Box Ruby & Sapphire block by its id |
| [`pk3-crypt`](pk3-crypt.md) | transform | Decrypts and unshuffles a Gen 3 Pokémon |
| [`cfru-box`](cfru-box.md) | transform | Unpacks a boxed Pokémon in a Complete FireRed Upgrade hack |
| [`xor-key`](xor-key.md) | transform | XORs a value with a key, as Gen 3 money is |
| [`text-gen3-intl`](text-gen3-intl.md) | transform | Gen 3 text from the English, French, German, Italian and Spanish games |
| [`text-gen3-jpn`](text-gen3-jpn.md) | transform | Gen 3 text from the Japanese games |
| [`text-gen3-gc`](text-gen3-gc.md) | transform | UTF-16 text from Colosseum and XD |
| [`sum16le`](sum16le.md) | checksum | Sum of 16-bit words, as in a Gen 3 Pokémon |
| [`sum32le-fold16`](sum32le-fold16.md) | checksum | Sum of 32-bit words folded to 16 bits, as in a Gen 3 section |
| [`sha1`](sha1.md) | checksum | SHA-1 digest, as at the end of a Colosseum save |
| [`colosseum-header`](colosseum-header.md) | checksum | The header checksum of a Colosseum save |
| [`xd-header`](xd-header.md) | checksum | Sum of bytes, as over the header of an XD save |
| [`xd-body`](xd-body.md) | checksum | Four sums of 16-bit words, as over the body of an XD save |
| [`box-sum`](box-sum.md) | checksum | Sum of 16-bit words and its difference from 0xF004, as in a Box block |
| [`gen3-signature`](gen3-signature.md) | detect | Checks the signature in a Gen 3 save's sector footers |
| [`frlg-key-mismatch`](frlg-key-mismatch.md) | detect | Checks that a FireRed save's security key is 0 or out of step with its copy |
| [`gc-memory-card-file`](gc-memory-card-file.md) | detect | Checks that a memory card holds a game's file |
| [`swishcrypto-block`](swishcrypto-block.md), [`swishcrypto-hash`](swishcrypto-hash.md) | designed | Keyed blocks in the Switch games, built with their spec |

## Kinds

**Transforms** work in both directions. Decoding takes encoded bytes and returns a value, which is bytes, or text for the text steps. Encoding takes a value and `previous`, the encoded bytes it replaces, and returns the new encoded bytes. `previous` supplies what the value doesn't hold, such as the other copy of a save or the bytes after a text's end. Encoding a decoded value over the bytes it came from gives back the same bytes.

**Checksums** compute a value over the bytes from `start` to `end`, exclusive, and each step's doc says how many bytes it is and how they're stored. A writer stores them at `at`, the offset of the range that holds them. Decoding a checksum computes it, and a reader compares the result with the stored bytes. Encoding writes it. A checksum that covers its own range reads that range as zero. A writer computes a space's checksums in the order the layout lists them, and each reads the ranges of those after it as zero too.

**Detect steps** pass or fail on a whole file.

## How the steps chain

A Gen 3 save decodes in two steps. `gen3-slots` turns the 128 KiB file into the save the game reads, which is the 14 sectors of the newer slot followed by sectors 28 to 31. `gen3-sections` reads each `section:N` and `sector:N` space out of that save. Spaces with a `source` join the regions they name, and `pk3-crypt` decodes each Pokémon from there. In a Complete FireRed Upgrade hack, `cfru-box` does that for boxed Pokémon, and party Pokémon need no transform.

A writer goes back up the same chain. It encodes each changed Pokémon into its region, recomputes the kind's checksums, encodes each changed section into the save, then encodes the save into the file once. Anything it didn't change keeps its bytes.

A layout can list a `container` instead: the steps that decode the whole file into the save, in order. Colosseum's is `gc-memory-card`, which finds the game's file on the memory card, then `colosseum-slots`, which decrypts the newest copy of the save. Its `slot` space is that whole save, and the party and boxes sit in it. Box's container ends in `box-slots`, and `box-blocks` reads each `block:N` space from it. A writer encodes back through the container in reverse.

## Vectors

`vectors/<step>.json` holds a step's vectors and follows `schema/vectors.schema.json`:

- A `decode` vector: decoding `input` with `args` gives `output`.
- An `encode` vector: encoding `input` over `previous` with `args` gives `output`.
- A `test` vector: the detect step on `input` with `args` gives `passes`.

For a checksum, a decode vector's `output` is the checksum as it's stored, and an encode vector's `input` holds a wrong checksum at `at`.

A vector writes bytes in one of four ways, as hex pairs (`"9F 79 56 13"`), as `{"file", "offset", "length"}` for a run of a save in `vectors/`, as `{"fill", "length"}` for one byte repeated, such as `{"fill": "00", "length": "0x1000"}`, or as a list of these, joined in order. Text is `{"text": "OPENPKX"}`.

An implementation passes when every vector does, and when encoding each decode vector's output over its input gives back the input.

## Where they come from

The `.sav` files in `vectors/` are blank saves the PKHeX Everywhere engine made. `tools/vectors/vectors.mjs` builds an empty scaffold of sections, because the engine can't export a blank Gen 3 save from `game.loadBlank` yet. It has the engine set the trainer name to OPENPKX and the money to 123456, then exports the save. Every save has slot B as the newer copy. `wrap.sav` has counter 0xFFFFFFFF in slot A and 0 in slot B, which the engine reads as slot B being newer. The FireRed scaffold keeps a copy of its security key at 0xAF8, as FireRed does. The Unbound and Radical Red scaffolds start with a Pikachu in the party and in box 1, written by `tools/vectors/cfru.mjs`, since the engine can't add a Pokémon to them.

The `.raw` files are memory cards. `vectors.mjs` formats each one and puts on it a blank Colosseum or XD save the engine made, or a scaffold of Box blocks, since the engine can't read back its blank Box save. The engine names the trainer, sets the money and puts a Pokémon in box 1. `gamecube.raw` holds Colosseum and XD saves from before the Pokémon went in.

`tools/vectors/steps.mjs` writes the vectors from those saves and from edits the engine makes to them, such as new money, a nickname or an item. It checks each value against the engine, and loads each save `gen3-slots` writes to confirm the engine reads the new values. The text vectors come from the engine reading and writing every byte of each table. Nothing in them comes from a save someone else made.
