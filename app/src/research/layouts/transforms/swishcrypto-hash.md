# swishcrypto-hash

Designed, not built, as `swishcrypto-block.md` is. A detect step that takes no arguments.

It passes when the file's last 32 bytes are the SHA-256 hash PKHeX's `Saves/Encryption/SwishCrypto/SwishCrypto.cs` computes over the rest of the file. Sword and Shield, Legends: Arceus, Scarlet and Violet and Legends: Z-A all pass, so their layouts tell them apart by file size and by checks on their blocks.
