# sha1

A checksum that is the 20-byte SHA-1 digest of the bytes it covers. Colosseum keeps one at the end of its save, and [`colosseum-slots`](colosseum-slots.md) keys its encryption with it.

## Use

```json
{"step": "sha1", "start": 0, "end": "0x1DFD8", "range": "digest", "source": "pkhex:Saves/Encryption/ColoCrypto.cs"}
```

The digest is stored as SHA-1 gives it. Colosseum's covers the header checksum at 0x0C, which the layout lists after it, so the digest reads it as zero.

## Vectors

[`vectors/sha1.json`](vectors/sha1.json): the save on `colosseum.raw`, its header checksum zeroed.
