# text-gen3-gc

A text transform for Colosseum and XD, which store text as UTF-16, big-endian, in every language.

## Decoding

Read big-endian 16-bit units until a unit of 0 or the end of the range. Each unit is a UTF-16 code unit.

## Encoding

`previous` is the range's bytes before the change. Write each code unit big-endian, then a 0 unit if two bytes are left. The bytes after it keep their values. Text longer than the range, or holding a 0 unit, can't be encoded.

PKHeX remaps some characters when a Pokémon moves between regions or to a Game Boy Advance game. That remapping isn't part of reading or writing a save.

## Vectors

[`vectors/text-gen3-gc.json`](vectors/text-gen3-gc.json): nicknames the engine reads from a Colosseum Pokémon, the trainer name in `colosseum.raw`, and nicknames the engine writes over the one before.
