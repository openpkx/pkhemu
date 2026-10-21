# gen12-lists

A detect step that passes when a Gen 1 or Gen 2 save has valid Pokémon lists at the given offsets, as PKHeX checks them.

## Arguments

`lists`: each list's `offset` in the file and the `max` count it may hold, such as `{"offset": "0x2F2C", "max": 20}`.

## Testing

The step passes when, for every list, the count at `offset` is at most `max` and the byte after the last species, at `offset + 1 + count`, is 0xFF.

In Gen 1, PKHeX checks the party and the current box with a max of 20 in the international games and 30 in the Japanese ones, the Japanese first. A save can pass both ways. PKHeX reads such a save as Japanese. In Gen 2, it checks the international Gold and Silver, then Crystal, then the Japanese games with a max of 30, then the Korean Gold and Silver.

## Vectors

[`vectors/gen12-lists.json`](vectors/gen12-lists.json): `red.sav`, `red-boxes.sav` and `blue-jpn.sav` with the international and the Japanese lists, `red.sav` with its party's species list not ended, and a file of zeros. Each Gen 2 save passes its own lists and fails those PKHeX checks before them: `gold.sav`, `crystal.sav`, `crystal-boxes.sav`, `gold-jpn.sav`, `crystal-jpn.sav` and `gold-kor.sav`.
