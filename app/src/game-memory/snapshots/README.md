# Memory snapshots

Each file holds the RAM ranges `readFacts` reads, at one moment of play, and nothing else. They come from save states we made with the cores pkh-emu ships, on our own saves or on the public test saves credited below. mGBA's state keeps IWRAM at offset `0x19000` and EWRAM at `0x21000`, so a range at `0x0300xxxx` or `0x0200xxxx` is copied from there. DS ranges come from melonDS DS's 4 MB of main RAM at `0x02000000`.

| Snapshot | Moment |
|---|---|
| `black-overworld` | Route 1, on Black with the White save |
| `black-wild` | Wild Lillipup on Route 1 |
| `black-after-battle` | Back on Route 1 after running from the Lillipup |
| `diamond-overworld` | Route 201, six Pokémon in the party |
| `diamond-wild` | Wild Starly on Route 201 |
| `diamond-after-battle` | Back on Route 201 after running from the Starly |
| `emerald-overworld` | Oldale Town, three Pokémon in the party |
| `emerald-wild` | Wild Poochyena on Route 101 |
| `emerald-trainer` | Youngster Calvin on Route 102 |
| `emerald-double` | Twins Gina and Mia on Route 104 |
| `emerald-double-one-fainted` | The same battle after Seedot fainted |
| `firered-1.0-wild` | Wild Pidgey on Route 1 |
| `firered-1.0-after-battle` | Back on Route 1 after running from the Pidgey |
| `firered-1.1-overworld` | Route 1 |
| `firered-1.1-wild` | Wild Pidgey on Route 1 |
| `heartgold-overworld` | Route 30, six Pokémon in the party |
| `heartgold-wild` | Wild Caterpie on Route 30 |
| `heartgold-wild-fainted` | The same battle after Caterpie fainted |
| `heartgold-after-battle` | Back on Route 30 after the battle |
| `pearl-overworld` | Route 201, three Pokémon in the party, one an Egg |
| `pearl-wild` | Wild Starly on Route 201 |
| `pearl-after-battle` | Back on Route 201 after running from the Starly |
| `ruby-overworld` | Route 121, four Pokémon in the party |
| `ruby-wild` | Wild Zigzagoon on Route 121 |
| `ruby-after-battle` | Back on Route 121 after running from the Zigzagoon |
| `sapphire-overworld` | Route 102, five Pokémon in the party |
| `sapphire-wild` | Wild Wurmple on Route 102 |
| `sapphire-after-battle` | Back on Route 102 after running from the Wurmple |
| `sapphire-trainer` | Youngster Calvin's rematch on Route 102 |
| `platinum-overworld` | Route 201, six Pokémon in the party |
| `platinum-wild` | Wild Starly on Route 201 |
| `platinum-after-battle` | Back on Route 201 after running from the Starly |
| `soulsilver-overworld` | Route 29, six Pokémon in the party |
| `soulsilver-wild` | Wild Rattata on Route 29 |
| `soulsilver-after-battle` | Back on Route 29 after running from the Rattata |
| `white-overworld` | Route 1, six Pokémon in the party |
| `white-wild` | Wild Patrat on Route 1 |
| `white-wild-fainted` | The same battle after Patrat fainted |
| `white-after-battle` | Back on Route 1 after running from the Patrat |
| `white2-overworld` | Route 20, six Pokémon in the party |
| `white2-wild` | Wild Purrloin on Route 20 |
| `white2-wild-fainted` | The same battle after Purrloin fainted |
| `white2-after-battle` | Back on Route 20 after running from the Purrloin |
| `black2-overworld` | Route 20, on Black 2 with the White 2 save |
| `black2-wild` | Wild Patrat on Route 20 |
| `black2-after-battle` | Back on Route 20 after running from the Patrat |

The Ruby and Sapphire snapshots start from the test saves in [codemonkey85/PKMDS-Blazor](https://github.com/codemonkey85/PKMDS-Blazor) `TestFiles/`. The Platinum, SoulSilver, White, Black, White 2 and Black 2 ones start from saves in [ExtraBytez/Pokemon](https://github.com/ExtraBytez/Pokemon). Black loads the White save and Black 2 the White 2 one, since each pair shares its save format.
