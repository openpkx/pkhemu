# gen2-box-banks

A transform that reads one PC box of Gold, Silver or Crystal from the save. The boxes sit in two banks, and the game keeps a copy of the current box in its main data. PKHeX reads every box from its bank, since Pokémon Stadium 2 changes the banks without updating the copy.

## Arguments

| Argument | Meaning |
| --- | --- |
| `banks` | Where each bank's boxes start, such as `["0x4000", "0x6000"]` |
| `boxes` | How many boxes there are, split evenly over the banks |
| `length` | Bytes in a box: its list of Pokémon |
| `stride` | Bytes from one box to the next in a bank. Gen 2 leaves 2 bytes after each box. |
| `current` | Where the copy of the current box sits |
| `selected` | The byte that holds the current box's number from 0 |
| `index` | The box from 0. A space a pattern names, such as `box:{1..14}`, gets it from its position. |

Box `i` sits in bank `i / (boxes / banks)`, at `(i mod (boxes / banks)) * stride` from the bank's start.

## Decoding

`input` is the whole save. Return `length` bytes at the box's place in its bank.

## Encoding

`previous` is the save.

1. A value equal to what decoding gives changes nothing.
2. Otherwise, write the value at the box's place in its bank.
3. If the byte at `selected` is `index`, write it at `current` too, as PKHeX does.

Each box holds a list, which [`gen1-list`](gen1-list.md) reads Pokémon from.

## Vectors

[`vectors/gen2-box-banks.json`](vectors/gen2-box-banks.json): boxes of `crystal.sav` and `gold.sav`, whose current box is box 1, and of `crystal-boxes.sav`, whose current box is box 8 in the second bank. Each encode vector's output is the save the engine writes after it nicknames a boxed Pokémon.
