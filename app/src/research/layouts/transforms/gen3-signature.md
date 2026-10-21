# gen3-signature

A detect step. It passes when a Gen 3 save has a valid slot whose sectors all hold one of the given signatures.

## Arguments

| Argument | Meaning |
| --- | --- |
| `signatures` | The signatures a sector may hold at 0xFF8, as 8-digit hex numbers such as `"0x08012025"`. |

## Test

1. A slot is valid when the section ids in its 14 footers are 0 to 13, each once, as in [`gen3-slots`](gen3-slots.md).
2. The step passes when at least one valid slot has one of `signatures` at 0xFF8 in each of its 14 sectors.

The retail games sign their sectors 0x08012025. Unbound uses 0x01122000, 0x01121999 and 0x01121998. Radical Red keeps 0x08012025, so the signature alone can't tell it from FireRed.

## Vectors

[`vectors/gen3-signature.json`](vectors/gen3-signature.json): each save in `vectors/` with two slots, with the retail and the Unbound signatures, and a file of zeros. The retail saves, `heart-and-soul.sav` and `emerald-legacy.sav` pass with 0x08012025 and `unbound.sav` with Unbound's.
