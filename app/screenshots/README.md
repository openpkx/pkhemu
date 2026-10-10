# Screenshots

Renders screens with the test fakes in Chromium, without Tauri, and saves each at 390px and 1280px wide, in dark and light, with a touch pointer and a mouse, to `out/`, which git ignores. On touch it reports any button or menu row under 44px.

From `app/`:

```sh
npx playwright install chromium   # once
npm run screenshots               # every screen
npm run screenshots -- game-page  # only the screens whose names start so
```

Files are named `<screen>-<theme>-<width>-<pointer>.png`.

The library has box art for FireRed and last screens for Emerald and Platinum, drawn on a canvas. Platinum's is 256×384, a blue top screen over a red bottom one, so its tile and `game-page-nds-art` show the crop to the top screen. `library` continues Emerald from its resume point, `library-no-resume` has no resume point, `library-cloud` continues cloud-only Sapphire, and `library-unplayed` has nothing played. The game page has a screen per system, `game-page-gba` for example, one with a last screen, `game-page-gba-art`, and `game-page-gba-menu` with the ⋯ menu open and a "Patched from" note. `overlays` shows a toast, the opponent pill and a sync badge in each state, `overlays-dialog` an alert dialog over the library, `transfer` the transfer list with a game in each route state, `box-art-sheet` the box art sheet over the library, `editor-stadium` the editor's home for a Stadium save, and `editor-teams` its Teams page. Gallery images from thumbnails.libretro.com are drawn placeholders.

`playing-gb`, `playing-gba` and `playing-nds` run the game screen on a checkerboard frame with touch controls and Fast-forward on. They're shot with a touch pointer only, in portrait at 390×844 and landscape at 844×390, at 3×, named `<screen>-<theme>-<portrait|landscape>-touch.png`. `playing-gb` and `playing-nds` also get portrait shots of the handheld display with the tilt forced to a shift in dp, `-shift+5+5` and `-shift-5-5`, and with the glass on, `-glass` and `-glass-shift+5+5`. `screenshots/tilt.ts` stands in for the tilt to hold that shift.

To add a screen, add an entry to `screens` in `main.tsx` and its name to `screens` in `capture.mjs`. Give it data through the fakes and hosts in `main.tsx`. `vitest.ts` stands in for vitest, since the fakes call `vi.fn`.

The Google Play screenshots have their own setup in `store/`. See `store/README.md`.
