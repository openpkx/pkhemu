# Store screenshots

Makes the phone screenshots for the Google Play and App Store listings: the app's own screens, with frames from homebrew games, framed on a dark background with a caption. The listings can't show Pokémon, so every game here is homebrew whose licence allows it.

Everything it downloads or writes goes under `data/store/`, which git ignores.

## Make them

From the repo root, after one macOS build (`scripts/macos-dev.sh` or `scripts/macos-build.sh`), which leaves the mGBA and melonDS DS cores under `app/src-tauri`:

```sh
app/screenshots/store/games.sh              # download the games
python3 app/screenshots/store/frames.py     # play each one headless, write data/store/frames/
cd app
NODE_ENV= npm run screenshots:store          # render the app's screens to data/store/raw/<device>/, then frame and caption them to data/store/out/<device>/
```

`games.sh` downloads 10 games. Tobu Tobu Girl, Tobu Tobu Girl Deluxe and Feline come from itch.io, so the script names the file to save by hand.

`screenshots:store` runs `capture.mjs` then `compose.mjs`. Each step takes names to redo only some of it: `frames.py ucity`, `node screenshots/store/capture.mjs editor`, `node screenshots/store/compose.mjs 3-editor`. The last two also take device names: `compose.mjs iphone-6.9 3-editor`.

Upload each folder of `data/store/out/` in name order:

| Folder | Store | Size |
|---|---|---|
| `play` | Google Play phone | 1080×1920 |
| `iphone-6.9` | App Store 6.9" iPhone | 1320×2868 |
| `iphone-6.3` | App Store 6.3" iPhone | 1206×2622 |

## How it works

- `frames.py` loads the app's cores through libretro and plays each game from power-on with scripted presses. `GAMES_STEPS` holds the presses. The `HANDHELD` and `DS` scripts press Start and A in a loop and save a frame each round, as `<game>-01.png` to `-16.png`. Look through the frames and pick by number. The runs are deterministic, except DS games, which read the clock.
- `store.tsx` mounts the real screens with the test fakes, as `../main.tsx` does. Picked frames become box art (`covers`), last screens on the library (`lastScreens`), and the running game (`playingGame`). `capture.mjs` shoots each screen at each device's size from `devices.mjs`, at 3×, and opens the pause menu for `playing-pause`. The systems, default preferences and device name come from the Android hosts for Play and the iOS hosts for the iPhone, so the iPhone library has no N64 games.
- `compose.mjs` places each shot on the background with the caption from `shots.json`. A shot's `ios` entry overrides its fields on the iPhone.

## What's in the shots

| Shot | Screen |
|---|---|
| 1-library | Library with Resume and recently played |
| 2-play | Tobu Tobu Girl Deluxe with touch controls |
| 3-editor | Editor with a party and a box |
| 4-pause | Pause menu over Tobu Tobu Girl |
| 5-ds | JamClown on both DS screens |
| 6-library | Library scrolled to GBA, DS and, on Play, N64 |

The editor's creatures are made up. `store.tsx` draws their sprites and names them, because a real save would show Pokémon.

The N64 games show as unplayed tiles. The N64 core needs a GL context, which `frames.py` doesn't give it.

Derelict, the best-looking DS homebrew, renders white in melonDS DS, so Traffic Escape takes its place.

## Games and credits

| Game | System | Licence of the art |
|---|---|---|
| Tobu Tobu Girl, Tobu Tobu Girl Deluxe | GB, GBC | CC BY 4.0, Tangram Games |
| Libbet and the Magic Floor | GB | zlib, Damian Yerrick |
| Rhythm Land | GB | MIT |
| µCity | GBC | CC BY-SA 4.0, Antonio Niño Díaz |
| Geometrix | GBC | GPL-3.0, Antonio Niño Díaz |
| Collie Defense | GBA | CC BY-SA 4.0, Yulianto Hiu, Lea Espanet and Yann Vaillant |
| Feline | GBA | CC0, Jono Shields |
| Luggage Retrieval Officer | GBA | WTFPL and CC0, Jono Shields, title art by Vent |
| JamClown | DS | MIT |
| Traffic Escape | DS | Apache-2.0, car models CC0. The backgrounds and music weren't checked. |
| sblobber64 | N64 | MIT, Kenney art CC0 |
| Kumi-Daiko Beatoff 64 | N64 | CC0 |

Don't use the box art that ships with Kumi-Daiko or Uncharted Terra 2264. Both copy N64 box designs.

The store description ends with this credit. µCity's and Collie Defense's art is ShareAlike, so the framed shots carry CC BY-SA too:

> Screenshots show homebrew games: Tobu Tobu Girl and Tobu Tobu Girl Deluxe by Tangram Games (CC BY 4.0), µCity by Antonio Niño Díaz (CC BY-SA 4.0), Collie Defense by Yann Vaillant, Yulianto Hiu and Lea Espanet (CC BY-SA 4.0), Rhythm Land, Libbet and the Magic Floor, Feline, Luggage Retrieval Officer, JamClown and Traffic Escape. The screenshots are licensed CC BY-SA 4.0.

Change it when the games in the shots change.
