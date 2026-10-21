# swishcrypto-block

Designed, not built. No layout uses it yet, and it has no vectors. The spec for Let's Go, BDSP and the keyed-block Switch games builds it.

Reads one block out of a save from Sword and Shield, Legends: Arceus, Scarlet and Violet or Legends: Z-A. These saves aren't laid out by offset. They're a list of blocks, each found by a 32-bit key.

## Arguments

| Argument | Meaning |
| --- | --- |
| `key` | The block's key, as 8 uppercase hex digits such as `"0x0D66012C"`. |
| `type` | `object`, `array`, `bool` or a number type: `u8`, `u16le`, `u32le`, `u64le`, `i8`, `i16le`, `i32le`, `i64le`, `f32le`, `f64le`. |
| `subtype` | For an `array`, the type of each element. |

The space's `length` is the block's data length: the type's size for a number, a whole number of elements for an array, and 1 for a `bool`. A block space has no `source`, and its name isn't a pattern, because each key is one block.

```json
{"name": "block:my-status", "length": "0x110", "transform": "swishcrypto-block", "args": {"key": "0x0D66012C", "type": "object"}, "ranges": []}
```

## Decoding

PKHeX's `Saves/Encryption/SwishCrypto/` describes the format: the file ends in a SHA-256 hash, the rest is XORed with a fixed pad, and each block starts with its key and a type byte encrypted with a stream seeded by the key. A `bool` block stores its value in its type, so it decodes to one byte, 0 or 1. The full steps and vectors come with the spec that builds it.

A keyed format detects with `swishcrypto-hash` and its file sizes. Ranges, checksums and `source` spaces work in a block space as they do in any other.
