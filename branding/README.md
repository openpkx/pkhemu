# Branding

Every app icon and store graphic comes from the masters here.

| Master | What it is |
|---|---|
| `icon.svg` | The app icon: a white D-pad and two buttons on a `#6d4aff` rounded square. |
| `glyph.svg` | The white D-pad and buttons alone, on the icon's 100×100 grid. Android's adaptive foreground and monochrome layers use it. |
| `wordmark.svg` | "pkhemu" in Pixelify Sans 600 with 0.02em tracking, outlined to paths so it renders without the font. |

## Regenerate

From `app/`:

```sh
npm run branding
```

`generate.mjs` copies `icon.svg` to `app/src-tauri/icons/` and `site/public/`, writes the Android foreground, and runs `tauri icon`. `tauri icon` updates the Linux and Windows icons in `app/src-tauri/icons/`. On Android it updates the `mipmap-*` folders, the background colour and the adaptive icon XML. The script then replaces the macOS and iOS icons and renders the store graphics into `out/`. A second run gives no diff.

| Platform | Shape |
|---|---|
| Windows, Linux | `icon.svg` as drawn: a rounded square filling the canvas. |
| macOS (`icon.icns`) | The rounded square at 824×824 in the middle of a 1024 canvas, as Big Sur and later expect. |
| iOS (`ios/AppIcon-*.png`) | A full square with no alpha channel, since iOS applies its own mask and App Store validation rejects alpha. The same PNGs go into the Xcode asset catalog, `app/src-tauri/gen/apple/Assets.xcassets/AppIcon.appiconset/`. |
| iOS sideload build (`ios-sideload/AppIcon-*.png`) | The iOS icon with a white "JIT" badge. `scripts/ios-build.sh --sideload` copies these into the asset catalog for its build and puts the App Store icons back after. |
| Android | The glyph on a `#6d4aff` adaptive background. The launcher applies the mask. |

opentype.js outlined the wordmark once from `pixelify-sans-latin-600-normal.woff` in `@fontsource/pixelify-sans`. Redo that only if the wordmark changes.

## Store graphics

| File | Where it goes |
|---|---|
| `out/play-icon-512.png` | Google Play, app icon. A full square, since Play applies its own mask. |
| `out/play-feature-1024x500.png` | Google Play, feature graphic. No alpha channel, as Play requires. |
| `out/appstore-icon-1024.png` | App Store Connect, app icon. A full square with no alpha channel, as Apple requires. The `ios/AppIcon-*.png` files are the same image at each size. |
