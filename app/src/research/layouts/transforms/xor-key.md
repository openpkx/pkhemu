# xor-key

A model step for a number stored XORed with a key. Gen 3 stores money, coins, bag quantities, Berry Powder and game stats this way, with the security key at `section:0` 0x00AC in Emerald and 0x0F20 in FireRed and LeafGreen. Ruby and Sapphire have no key, so they store the numbers as they are.

## Use

A model field names it with two inputs, the `value` as stored and the `key`.

```json
{"step": "xor-key", "args": {"value": {"space": "section:1", "range": "money"}, "key": {"space": "section:0", "range": "security-key"}}}
```

A reader reads the key as a number and passes it to the step as `key`. The step's input is the value's bytes, little-endian, up to 4 of them.

## Decoding

1. Write the key as 4 little-endian bytes.
2. XOR each byte of the value with the key byte at the same position.

A 2-byte value, such as coins or a 16-bit quantity, uses the key's low 16 bits.

## Encoding

The same as decoding. Encoding doesn't need `previous`, and the key doesn't change.

## Vectors

[`vectors/xor-key.json`](vectors/xor-key.json): money of 123456 and 654321 in `frlg.sav` and `emerald.sav`, whose key is 0x13579BDF, and a quantity of 5 Poké Balls that the engine wrote to `frlg.sav`.
