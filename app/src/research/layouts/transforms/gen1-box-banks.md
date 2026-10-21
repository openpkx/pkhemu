# gen1-box-banks

A transform that reads one PC box of Red, Blue or Yellow from the save. The game keeps the open box, the current one, at a fixed place in its main data, and the other boxes in two banks. When the player changes boxes, the game writes the current box back to its bank and copies the new one out. Until then the bank's copy of the current box goes stale.

## Arguments

| Argument | Meaning |
| --- | --- |
| `banks` | Where each bank's boxes start, such as `["0x4000", "0x6000"]` |
| `boxes` | How many boxes there are, split evenly over the banks |
| `length` | Bytes in a box: its list of Pokémon |
| `current` | Where the current box sits |
| `selected` | The byte that holds the current box's number from 0 in bits 0 to 6, and in bit 7 whether the boxes are set up |
| `index` | The box from 0. A space a pattern names, such as `box:{1..12}`, gets it from its position. |

Box `i` sits in bank `i / (boxes / banks)`, at `(i mod (boxes / banks)) * length` from the bank's start.

## Decoding

`input` is the whole save.

1. Read the current box's number and the set-up bit from `selected`.
2. Box `index` is the current box: return `length` bytes at `current`.
3. Otherwise, return `length` bytes at the box's place in its bank. Until the boxes are set up, PKHeX reads only the current box, so a box that isn't current reads as empty: its first two bytes are 0x00, no Pokémon, and 0xFF, the end of its species list.

## Encoding

`previous` is the save.

1. Box `index` is the current box: write the value at `current`. The bank's copy stays as it was.
2. Otherwise, with the boxes set up, write the value at the box's place in its bank.
3. With the boxes not set up, a value equal to what decoding gives changes nothing. Any other value sets the set-up bit, writes 0x00 and 0xFF at the start of every box that isn't current, as decoding read them, and writes the value at the box's place. PKHeX sets the bit when it writes a Pokémon to a box that isn't current.

Each box holds a list, which [`gen1-list`](gen1-list.md) reads Pokémon from.

## Vectors

[`vectors/gen1-box-banks.json`](vectors/gen1-box-banks.json): boxes of `red.sav`, whose boxes aren't set up, and of `red-boxes.sav`, whose current box is box 2 with a stale copy in its bank. Each encode vector's output is a save the engine reads the edited box from.
