# gc-memory-card-file

A detect step that passes when a file is a GameCube memory card holding a file with one of the given game codes. It reads the card as [`gc-memory-card`](gc-memory-card.md) does.

## Arguments

`gameCodes`: the game codes to look for, such as `["GXXE", "GXXP"]` for the American and European XD.

## Testing

1. Fail unless the size is a power of 2 from 512 KiB to 64 MiB and the header names the same size.
2. Take the directory as `gc-memory-card` does. Fail if neither directory's checksums hold.
3. Pass when any directory entry's game code is one of `gameCodes`.

A card holding both Colosseum and XD passes for each, so a reader asks which game to read, as the engine does.

## Vectors

[`vectors/gc-memory-card-file.json`](vectors/gc-memory-card-file.json): each card in `vectors/` tested for each game's codes, a file of zeros the size of a card, and a card cut short.
