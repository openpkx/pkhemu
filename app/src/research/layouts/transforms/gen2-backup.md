# gen2-backup

A container transform for Gold, Silver and Crystal saves, which keep a backup copy of their main data. PKHeX reads only the main data, and writes the backup when it writes the save.

## Arguments

`copies`: where the backup keeps each run of the main data, as its `from` in the main data, its `to` in the backup and its `length`. Crystal keeps one run, `{"from": "0x2009", "to": "0x1209", "length": "0xB7A"}`. Gold and Silver keep five:

| From | To | Length |
| --- | --- | --- |
| 0x2009 | 0x15C7 | 0x226 |
| 0x222F | 0x3D69 | 0x1AA |
| 0x23D9 | 0x0C6B | 0x47D |
| 0x2856 | 0x7E39 | 0x34 |
| 0x288A | 0x10E8 | 0x4DF |

## Decoding

The save is the file, unchanged.

## Encoding

`previous` is the file. Copy each run of the value from `from` to `to`, then return the value. The value is the whole save, so `previous` only gives its length.

The backup's checksum isn't copied. A layout lists it as a second [`gen2-checksum`](gen2-checksum.md) over the main data.

## Vectors

[`vectors/gen2-backup.json`](vectors/gen2-backup.json): `crystal.sav` and `gold.sav`, which decode to themselves, and each with the money the engine set and its backup put back as it was, which encodes to the save the engine writes.
