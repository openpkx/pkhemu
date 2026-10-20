# gen3-sections

Reads one section, or one fixed sector, out of a Gen 3 save file. Ruby, Sapphire, Emerald, FireRed, LeafGreen and the hacks built on them, such as Unbound, all store their saves this way.

## The file

A save file is 128 KiB: 32 sectors of 0x1000 bytes. Sectors 0–13 are save slot A, sectors 14–27 are save slot B, and sectors 28–31 sit outside both slots.

Each sector in a slot holds one section and ends in a 12-byte footer:

| Offset | Size | Meaning |
| --- | --- | --- |
| 0xFF4 | 2 | Section id, 0–13, little-endian |
| 0xFF6 | 2 | Checksum, little-endian |
| 0xFF8 | 4 | Signature: 0x08012025 in the retail games. Hacks may use their own, such as 0x01122000 in Unbound. |
| 0xFFC | 4 | Save counter, little-endian |

The game writes each save to the slot it didn't write last, and rotates the sections, so a section's sector changes from save to save.

## Arguments

| Argument | Meaning |
| --- | --- |
| `section` | The section id to read, 0–13. |
| `sector` | A sector to read where it sits, 0–31, ignoring its footer. Use it for sectors 28–31. |

Give one of them. The space's `length` says how many bytes to take from the start of the sector. The retail games use the first 0xF80 bytes of a section. Unbound uses up to 0xFF0.

## Decoding

1. A slot is valid when the section ids in its 14 footers are 0–13, each once.
2. If only one slot is valid, it's the active slot. If both are, the one with the higher save counter is active. Every footer in a slot holds the same counter, so read it from any of them, such as the one holding section 0. Compare the counters as unsigned 32-bit numbers. The counter wraps, so 0 is newer than 0xFFFFFFFF. With equal counters, slot A is active. If neither slot is valid, the file isn't a Gen 3 save.
3. For `section`, find the sector in the active slot whose footer holds that id, and take the first `length` bytes of it.
4. For `sector`, take the first `length` bytes at `sector * 0x1000`.

The checksum is the sum of the section's data as little-endian 32-bit words, over the section's used size, with the high 16 bits of the sum then added to the low 16 bits. Decoding doesn't need it, and Research doesn't check it.

## Test vectors

`vectors/frlg.sav` and `vectors/unbound.sav` come from `tools/vectors/vectors.mjs`. It gives `@pkhex-everywhere/engine` 0.29.0 an empty scaffold of sections, with slot B active and its sections rotated, has the engine set the trainer name to OPENPKX and the money to 123456, and exports the save. The FireRed one also gets a security key of 0x13579BDF and three wild Pokémon from PKHeX's encounter tables. The engine can't export a blank Gen 3 save from `game.loadBlank` yet, which is why it starts from a scaffold. Nothing in them comes from a save someone else made.

### frlg.sav

SHA-256 `cdb7628ce5d0bdf64c38edcf53ffb2fa3f4f0c8821956aad551e6b2f14f2babe`. Slot B is active. With `length` 0xF80:

| Section | File offset | SHA-256 of the space |
| --- | --- | --- |
| 0 | 0x17000 | 340a8f098ca0daf977cd7e9e26d32915f900d8cf4fffecdca8143435cb5de55e |
| 1 | 0x18000 | 6ad9aef7346374ee0a2b0d7907e5097e088318669538f14c3ed7552dc3de6d59 |
| 2 | 0x19000 | 12525d303b667ee3d0917d8257a21fa0ae80a706be72d4fe8fa4b06739bdbe38 |
| 3 | 0x1A000 | 12525d303b667ee3d0917d8257a21fa0ae80a706be72d4fe8fa4b06739bdbe38 |
| 4 | 0x1B000 | 857a4fbc76c9bbf29c7d8dfb83f335d352b4548ad4f878bc44f8121dcf3b8caf |
| 5 | 0x0E000 | 10a8de7b1f76268a8706422886dc38c2f68d168093bfb957325263200bf1fa60 |
| 6 | 0x0F000 | 12525d303b667ee3d0917d8257a21fa0ae80a706be72d4fe8fa4b06739bdbe38 |
| 7 | 0x10000 | 12525d303b667ee3d0917d8257a21fa0ae80a706be72d4fe8fa4b06739bdbe38 |
| 8 | 0x11000 | 12525d303b667ee3d0917d8257a21fa0ae80a706be72d4fe8fa4b06739bdbe38 |
| 9 | 0x12000 | 12525d303b667ee3d0917d8257a21fa0ae80a706be72d4fe8fa4b06739bdbe38 |
| 10 | 0x13000 | 12525d303b667ee3d0917d8257a21fa0ae80a706be72d4fe8fa4b06739bdbe38 |
| 11 | 0x14000 | 12525d303b667ee3d0917d8257a21fa0ae80a706be72d4fe8fa4b06739bdbe38 |
| 12 | 0x15000 | 12525d303b667ee3d0917d8257a21fa0ae80a706be72d4fe8fa4b06739bdbe38 |
| 13 | 0x16000 | 12525d303b667ee3d0917d8257a21fa0ae80a706be72d4fe8fa4b06739bdbe38 |

- `section:0` 0x0000, the trainer name: `C9 CA BF C8 CA C5 D2 FF` (OPENPKX)
- `section:0` 0x0F20, the security key: `DF 9B 57 13` (0x13579BDF)
- `section:1` 0x0290, the money XORed with the security key: `9F 79 56 13` (123456)

### unbound.sav

SHA-256 `dbe14fdc07aa318502add9678b5fcba7f4acbb453f5262cb779593af05dc943b`. Slot B is active. With `length` 0xFF0:

| Section | File offset | SHA-256 of the space |
| --- | --- | --- |
| 0 | 0x13000 | a70886f4d239785c667dd799f9bb4fac2067e37dbfea5b00ded9fb8debf51fd2 |
| 1 | 0x14000 | eadebf2e3a795e2dc217e8ecdd079af3bc68a7e03e0ac6c3aacd588a977830a1 |
| 2 | 0x15000 | 9d4e9038bfe86a9c97688e56ccd91c848bbef20d631a7cce970645162bd478ef |
| 3 | 0x16000 | 9d4e9038bfe86a9c97688e56ccd91c848bbef20d631a7cce970645162bd478ef |
| 4 | 0x17000 | 9d4e9038bfe86a9c97688e56ccd91c848bbef20d631a7cce970645162bd478ef |
| 5 | 0x18000 | 9d4e9038bfe86a9c97688e56ccd91c848bbef20d631a7cce970645162bd478ef |
| 6 | 0x19000 | 9d4e9038bfe86a9c97688e56ccd91c848bbef20d631a7cce970645162bd478ef |
| 7 | 0x1A000 | 9d4e9038bfe86a9c97688e56ccd91c848bbef20d631a7cce970645162bd478ef |
| 8 | 0x1B000 | 9d4e9038bfe86a9c97688e56ccd91c848bbef20d631a7cce970645162bd478ef |
| 9 | 0x0E000 | 9d4e9038bfe86a9c97688e56ccd91c848bbef20d631a7cce970645162bd478ef |
| 10 | 0x0F000 | 9d4e9038bfe86a9c97688e56ccd91c848bbef20d631a7cce970645162bd478ef |
| 11 | 0x10000 | 9d4e9038bfe86a9c97688e56ccd91c848bbef20d631a7cce970645162bd478ef |
| 12 | 0x11000 | 9d4e9038bfe86a9c97688e56ccd91c848bbef20d631a7cce970645162bd478ef |
| 13 | 0x12000 | 9d4e9038bfe86a9c97688e56ccd91c848bbef20d631a7cce970645162bd478ef |

- `section:0` 0x0000, the trainer name: `C9 CA BF C8 CA C5 D2` (OPENPKX)
- `section:1` 0x0290, the money: `40 E2 01 00` (123456)
