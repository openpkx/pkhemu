# memecrypto-sign

A checksum that signs a Gen 7 save: Sun, Moon, Ultra Sun and Ultra Moon keep a 0x80-byte signature over the save's checksum table. PKHeX calls the scheme MemeCrypto. Computing it needs a private key, which isn't in this repo. A writer takes it from its caller.

## Use

```json
{"step": "memecrypto-sign", "start": "0x6BC00", "end": "0x6BD40", "range": "signature", "source": "pkhex:Saves/Encryption/MemeCrypto/MemeCrypto.cs"}
```

The `signature` range is 0x80 bytes of type `bytes`. The signature covers the first 0x140 bytes of Sun and Moon's checksum table, which starts 0x200 bytes before the end of the save, and the first 0x150 bytes of Ultra Sun and Ultra Moon's. It's stored 0x100 bytes into block 36: at 0x6BB00 in Sun and Moon, 0x6C100 in Ultra Sun and Ultra Moon. Block 36's own checksum covers the signature, so a layout lists block 36's checksum before this step, and the block's checksum reads the signature as zero. The table holds the block checksums, so this step comes after all of them.

## The key

The key is the one PKHeX's `MemeKeyIndex` calls `PokedexAndSaveFile`, index 3. A caller passes it as one run of bytes: the key's 0x7E-byte DER public key, then its private exponent `d`, big-endian, in every byte after them. The DER holds the 768-bit modulus `n` in its 0x61 bytes from 0x18, a 0x00 and then `n` big-endian. A writer with no key fails rather than write a save with a stale signature. Reading needs no key, and neither does writing a save without changes.

## Computing

The step reads the signature's own bytes as zero, so the signature starts as 0x80 bytes of zeros, called `data` below. PKHeX signs whatever the region holds, which is zeros because it clears the region when it loads a save.

1. Put the SHA-256 of the covered bytes in `data[0x00..0x20]`.
2. Put the first 8 bytes of the SHA-1 of `data[0x00..0x78]` in `data[0x78..0x80]`.
3. Encrypt `data[0x20..0x80]`, below.
4. Clear the top bit of `data[0x20]`.
5. Read `data[0x20..0x80]` as a big-endian number `m` and compute `m^d mod n`. Write its bytes, big-endian with no leading zeros, from `data[0x20]` on. A result shorter than 0x60 bytes leaves the bytes after it as they were before this step, as PKHeX does.

### Encrypting

The AES-128 key is the first 16 bytes of the SHA-1 of the DER public key followed by `data[0x00..0x20]`. Split `data[0x20..0x80]` into six 16-byte chunks, C0 to C5. Each AES operation encrypts one 16-byte block with no IV.

1. Going forward from C0 to C5 with `previous` starting as 16 zeros: XOR the chunk with `previous`, encrypt it in place, and set `previous` to the result.
2. XOR `previous`, now C5, with C0. Shift the 16 bytes left by one bit, as one big-endian number, dropping the top bit. If that top bit was set, XOR the last byte with 0x87. XOR every chunk with the result.
3. Going back from C5 to C0 with `previous` starting as 16 zeros: keep a copy of the chunk, encrypt the chunk in place, XOR it with `previous`, and set `previous` to the copy.

## Where the games keep it

PKHeX clears the signature when it loads a Gen 7 save, computes the block checksums with it zeroed, then signs a copy of the save as it exports it. So in a save it writes, block 36's checksum in the table doesn't match the block as stored. It matches the block with its signature zeroed.

## Vectors

[`vectors/memecrypto-sign.json`](vectors/memecrypto-sign.json): the signatures of `vectors/sm.sav` and `vectors/usum.sav`, which the engine signed when it exported them. The tests need the key: set `LAYOUTS_MEMECRYPTO_KEY` to a file outside the repo that holds it, in the order above. Without it they skip. The vectors themselves are what the engine wrote, so `npm run steps` makes them without a key, and checks them when it has one.
