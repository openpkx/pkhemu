# frlg-key-mismatch

A detect step. It passes when a FireRed or LeafGreen save's security key is 0 or differs from its copy, which tells a Radical Red save from FireRed's.

## Arguments

None.

## Test

1. Find the newer slot as [`gen3-slots`](gen3-slots.md) does, and section 0 in it as [`gen3-sections`](gen3-sections.md) does. A file with no valid slot fails.
2. Read the security key at section 0 0xF20 and its copy at 0xAF8, as little-endian 32-bit numbers.
3. The step passes when the key is 0, or when the two differ.

FireRed and LeafGreen pick a security key that isn't 0 and keep the copy in step with it. Radical Red leaves the key at 0, or out of step. A FireRed save can still pass, so a layout that uses the step matches as `possible`.

## Vectors

[`vectors/frlg-key-mismatch.json`](vectors/frlg-key-mismatch.json): `frlg.sav`, whose key and copy match, fails, and `radicalred.sav`, whose key is 0, passes. So do the same sections with the copy cleared or the key changed, and a file of zeros fails.
