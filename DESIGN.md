# Design

How pkhemu's UI is built. When a pattern shows up in a second place, add it here.

## Look

`design/` holds the look. Open `design/index.html` in a browser. The app has its colours, fonts and radii as theme tokens in `app/src/index.css`. Style through those tokens, not literal colours.

### Colour

Dark is the main theme. The colours come from the PKHeX Everywhere docs site.

| Token | Dark | Light |
| --- | --- | --- |
| `--background` | `#0e0b1c` | `#ffffff` |
| `--card`, `--popover` | `#19162a` | `#f6f5fb` |
| `--muted`, `--secondary` | `#1f1c33` | `#f6f5fb` |
| `--border` | `#2a2640` | `#ecebf5` |
| `--input`, outline buttons | `#3a3652` | `#c4c2d6` |
| `--primary` | `#6d4aff` | `#512bd4` |
| `--ring` | `#7c5cff` | `#7c5cff` |
| `--foreground` | `#ecebf5` | `#0e0b1c` |
| `--muted-foreground` | `#8e8aa8` | `#5a5673` |
| `--accent` (hover, pressed) | `#2a2640` | `#ecebf5` |
| `--destructive` | `#ff8fa8` | `#c4264a` |
| `--success` | `#7fdca4` | `#1d7a4c` |
| `--warning` | `#f5c56b` | `#9a5b00` |
| `--pad`, `--pad-pressed` | `#1f1c33`, `#2a2640` | `#f6f5fb`, `#ecebf5` |
| `--pad-border`, `--pad-foreground` | `#3a3652`, `#d4caff` | `#c4c2d6`, `#512bd4` |
| `--pad-face`, `--pad-face-pressed` | `#2a2152`, `#382c6b` | `#ece8ff`, `#d4caff` |
| `--pad-face-border`, `--pad-face-foreground` | `#5b45c4`, `#ffffff` | `#7c5cff`, `#2a2152` |

Text tokens read at 4.5:1 or better on their grounds. The status colours reach 4.5:1 as text on `--background` and `--card`, and so does `--background` text on them. `app/src/theme/contrast.test.ts` checks both. `--muted` is the same as `--card` in light, so a hover or pressed fill on a card uses `--accent`.

Overlays such as toasts, the opponent pill, sync badges and dialog scrims use `--overlay` (`#0e0b1c`) in both themes, at the opacity each had in black, with white text. A warning icon on one uses `--overlay-warning`, dark's `--warning`, since light's doesn't read on it. The player and the game screen stay black, except in portrait, where the game screen sits recessed in the shell (see Touch controls). Status colours, like the transfer list's route dots and the shiny star, use `--success`, `--warning` and `--destructive`.

Body text on dark is `#c4c2d6`, and violet text such as a version name is `#d4caff`. The primary is `#6d4aff` and not the docs site's `#7c5cff`, because white text on `#7c5cff` reaches only 4.35:1.

Each system has colours for its chip, its tile pattern and the game page's hero ground, in `systemColors` in `app/src/systems.ts`. Light theme gets lighter chip fills, darker chip text and darker patterns. The hero ground stays dark in both themes. `contrast.test.ts` checks chip text at 4.5:1 on its fill.

| System | Chip fill | Chip text | Pattern | Hero ground |
| --- | --- | --- | --- | --- |
| GB | `#1d3320` | `#b3e0a0` | `#9ad17b` | `#132b16` |
| GBC | `#3d2e12` | `#f5cd85` | `#f0b95a` | `#362607` |
| GBA | `#2a2152` | `#c9b9ff` | `#a48bff` | `#1e1247` |
| NDS | `#14304a` | `#9fd8fa` | `#6cc4f5` | `#072542` |
| N64 | `#3d1518` | `#f5a3a8` | `#ef6b73` | `#350a0d` |
| 3DS | `#103a36` | `#8fe3d6` | `#4fd1c0` | `#06332f` |
| GameCube | `#212b52` | `#b9c7ff` | `#5b7bff` | `#121c47` |

In light:

| System | Chip fill | Chip text | Pattern |
| --- | --- | --- | --- |
| GB | `#dcefd2` | `#2d5a1e` | `#5c9c3e` |
| GBC | `#f8e6c4` | `#6b4708` | `#c98a1e` |
| GBA | `#e6e0ff` | `#4a2fb8` | `#7c5cff` |
| NDS | `#d6ecfa` | `#12507c` | `#2f93d1` |
| N64 | `#fadadc` | `#7c1820` | `#d63a45` |
| 3DS | `#d3f2ed` | `#0f5a50` | `#23a08f` |
| GameCube | `#e0e6ff` | `#2f4ab8` | `#3a5ce9` |

A system chip is `SystemChip` from `components/`. A row of them is `SystemChips`, which screen readers hear once as "Plays Game Boy, Game Boy Color, Game Boy Advance, Nintendo DS, Nintendo 64, Nintendo 3DS and Nintendo GameCube games". The welcome screen and the empty library pass it the platform's systems, which today is every system on every platform. The dot grid is the `dot-grid` utility, which takes the pattern from `--pattern` and `--pattern-dark`.

### Type

Geist sets everything except five things, which use Pixelify Sans: the wordmark, section headings, system chips, the save card's numbers (play time, badges, Pokédex) and the touch controls' labels. Titles, body text and buttons stay in Geist. Section headings are the library's sections, the game page's Save heading and every `TitledCard` title, styled with `sectionHeading` from `components/`: 15px, muted, spaced 0.04em. A caption beside one, such as the system under a folder's name, stays in Geist. Pixelify Sans is the `font-pixel` utility, at weights 400 and 600. Fonts that copy Nintendo's lettering stay out, as Pokémon does from the app's name and icon.

### Shapes

Buttons are pills. On a touch screen (`pointer: coarse`) every button is at least 44px tall and icon buttons are 44px circles; with a mouse they keep their smaller sizes. Menu rows follow the same rule: at least 44px tall with 16px text on a touch screen. The touch controls' small buttons are an exception, at 36px in landscape (see Small-button row), and so are the N64 shoulders, Z and C buttons in landscape (see N64 controls) and the 3DS shoulders in landscape (see 3DS controls). A screen or dialog has at most one primary button, for its main action such as Resume. The rest are outline buttons, or `secondary` muted fills for a dismissal like "Not now" or Cancel. A destructive button is an outline with red text. Rows and tiles built from `Button`, such as menu entries and save state tiles, keep `rounded-lg`, and so do toggle group items, inputs and the buttons inside them. Cards round to 16px (`rounded-xl`) and library tiles to 14px (`rounded-tile`), both steps of the `--radius` scale.

### Library

The library opens with a Continue card for the last game played, as in "Continue card" below. The header's `h1` is the icon and the "pkhemu" wordmark in Pixelify Sans, in place of "Library".

A tile without art shows the system chip top left and the name bottom left, over a dot grid in the system's colour that fades out from the top-left corner. Box art and the last screen cover it as they do today.

### Game page

Without art, the hero's ground is the system's hero ground, `#1e1247` for GBA, with its dot grid fading out from the top-left corner. Box art and the last screen keep their blurred backdrop. A system chip in its dark colours sits above the title. Text on the hero is `--hero-text` (`#c4c2d6`), and the version line `--hero-version` (`#d4caff`), in both themes. `contrast.test.ts` checks both on every hero ground. Resume is the primary button, or Start when there's nothing to resume, and the rest are outline buttons. Once a game fails to start because the device can't run its system, a muted line like "Nintendo 64 games don't run on this device." takes the play buttons' place on that system's pages until the app restarts. A system the platform doesn't offer shows "Not supported on this device yet." in the same place from the start, and its Continue card's play button opens the page. The save card's play time, badges and Pokédex numbers use Pixelify Sans.

### Touch controls

In portrait the game screen wears the system's chosen skin (`skins.ts`): a photo of console plastic drawn once behind the header, the screens and the controls, anchored to the top and scaled to cover, over the skin's base colour. The photo stops growing at 960px tall, about the largest phone, so on a tablet its pattern keeps phone scale and stays sharp. Mirrored copies beside and below it cover the rest, so every seam lines up. It covers the safe areas too, and ignores the app's light or dark theme. The header goes transparent over it, with text and icons in the skin's tone, and the system bars' icons follow that tone while the game is open. Each game screen sits on a plate below an opening in the shell, the wall colour at 30% brightness, with a shadow under the shell's lip that's darkest along the top. The walls take the skin's screen border colour in Moulded when it has one, and its base colour otherwise. The WebGL pass in `screen.ts` draws the opening, its walls when the tilt shows them, and the glass when Screen glass is on, so CSS layers never cover it, and leaves the canvas clear outside the opening's rounded corners so the plastic shows through. With the native renderer the plastic has a rounded hole over each window, a device pixel inside its edge, and the native surface draws the opening under it. Each system's `handheld` entry in `systems.ts` sets the opening: a 4dp margin around the game, reserved first so `fit.ts` scales the game into the space left by its usual rules, and a depth per window. DS and 3DS get one window per screen, with an 8dp strip of plastic between them when stacked, and a touchscreen at half depth. A system without an entry, and landscape, keep the game area black. The screen sits at the top of the game area, 24px in from the sides and the top, with "pkhemu" printed under it in Pixelify Sans and the print colour, except on DS and 3DS.

Over a skin the controls take one of two looks (`skin-look/`). Every colour, shadow, blur, inset and rotation they use is a `--skin-` variable that `lookVariables` sets from the skin and look, and `blendLooks` mixes two sets for the picker's animations, with colours premultiplied so a fade to transparent never darkens. Both looks share the layout and the hit areas, so switching looks moves nothing. `TouchControls.tsx` marks each part with `data-part`, which `skinLook.css` styles under `[data-skin]`.

- **Moulded.** The console's own parts in the skin's colours. A border in the screen border colour rings the screen. The D-pad has a hard edge, a soft shadow under it, a sheen and a dimple in the middle. Face buttons are domed in the face colour, sit in a well and press down onto their lip. On GB, GBC and GBA the A and B letters are printed on the plastic below the buttons, and on DS, 3DS and N64 they sit on the buttons. N64's A, B, Z and C buttons are blue, green, grey and yellow. GameCube's A, B, X and Y, Z and C-stick are green, red, grey, purple and yellow on every skin, and its Start is a level grey pill. Select and Start are rubber pills angled at -24° with their names printed below, and N64's Start is a level red pill. The shoulders, pause, Hold and Fast-forward are rubber, and Hold and Fast-forward light a small violet LED when on. The stick sits in a well with a domed knob in the D-pad colour.
- **Frosted.** Every control is glass blurred 12px over the plastic, with a white hairline, stronger on light skins. Labels sit on the buttons in near-black on light skins and white on dark ones. Hold and Fast-forward fill violet when on.

A pressed button darkens, and a pressed D-pad arm lightens on a dark D-pad. In Frosted both lighten.

Without a skin, as in landscape, buttons and the D-pad use the `--pad` tokens, `#1f1c33` with an `#3a3652` outline in dark. A and B, X and Y on DS and 3DS, and Z on N64 use the `--pad-face` tokens, `#2a2152` with a `#5b45c4` outline. A pressed button takes the next step lighter, or darker in light theme. Labels use Pixelify Sans. A mode toggle that's on, such as Fast-forward, fills with the primary. In landscape the controls lie over the game at 70% opacity. On a phone they mostly sit on black beside it. In a landscape window closer to square than 5:3, like an iPad or a small Stage Manager window, the game shrinks to stay clear of both sides, unless that would take it below its own size.

A portrait window shorter than a phone, under 640pt tall like a small Stage Manager window, takes the landscape layout too: no skin, no header while the controls show, and the controls over the game, which fills the window's width under them. Below the game they'd leave it a stamp. A DS keeps portrait in one at least 432pt wide and 580pt tall, where keeping its touch screen clear of the controls at the sides would shrink it more (`portraitLayout.ts`). Everywhere else on this page, portrait and landscape mean these two layouts.

In a portrait window bigger than a phone's, the controls grow with it. Every size in them scales by the window's width over 600px or its height over 880px, whichever is smaller, never below 1 and at most 1.4 (`padScale.ts`). Phones keep the sizes on this page, Split View at half width gets about 1.14×, the 11" iPad Pro 1.375× and the 13" 1.4×. Labels, printed letters and the pills' rubber scale with them. Shadows and outlines don't. Both sides stay in the bottom corners, under the thumbs, and the game takes the rest of the height. Landscape keeps phone sizes, since the controls lie over the game or take room from it there.

In landscape the game screen drops its header while the touch controls show, so the game starts at the top edge. A game that fails to load keeps it. The ☰ in the controls opens the pause menu, which ends with Quit. When a gamepad or keyboard takes over, the controls hide and the header comes back.

### Name

The app is pkhemu: one word, lowercase, also at the start of a sentence. Players see it in the app, the store listings, the site and the sign-in screens. The bundle id is `fyi.openpkx.pkhemu`, and it stays fixed from the first Play upload, since Play never lets a package name change. The repos, the core forks' `pkh-emu` branches and the Rust crate keep the hyphen, since players never see them.

### Screenshots

`app/screenshots/` renders screens with the test fakes and captures them at 390px and 1280px in both themes, with a touch pointer and a mouse. The playing screens are shot with touch only, at 390×844 and 844×390. `--ipad` shoots every screen at iPad sizes, in Split View and in small Stage Manager windows. Its README says how to run it. A change to the look adds the screens it touches and attaches before and after shots to its PR.

### Icon

The icon is a white D-pad and two buttons on a `#6d4aff` rounded square. It reads at 16px and works as Android's round and monochrome icons. The masters live in `branding/`, and `npm run branding` in `app/` makes every app icon and store graphic from them (`branding/README.md`). The splash in `app/index.html` builds the glyph and wordmark from the same masters.

### Splash

Every cold start opens on `#6d4aff` in both themes, with the white glyph at 120px and the wordmark 24px below it. The D-pad's bars slide in from the top and left, the buttons fall toward the screen and wobble flat, and the wordmark types in one letter at a time and holds for 400ms, about 2.3s in all (`app/src/splash.ts`). It's the one animation outside the motion system and the colour tokens, since it runs before `index.css` loads and keeps the prototype's timings. With reduced motion the finished logo fades in. The splash fades out once the animation has ended and the app knows whether to show the welcome screen or the library. A tap skips the animation. Android's system splash is the same violet with no icon, and the bars stay violet with light icons until the web splash hides.

## Onboarding

With no games folder saved, the splash hands over to the welcome screen. It centres the icon at 56px beside the wordmark, a row of the platform's system chips below them, the heading "Let's get your games in" and a muted "Bring your own games, or start with the free demo.", or "This app doesn't include any games." while the Demo game experiment is off. It says nothing about where to get games. Below sit full-width choice rows, outline buttons with a primary-tinted round icon, a title, a muted line and a chevron. "I'm new to emulators" goes forward to "A folder for your games", which shows `Documents/pkhemu` in a bordered box in monospace and ends with Back and a primary "Make folder". "I have ROMs on this phone" starts the folder import (see Importing games). "I'm coming from another emulator" starts the same import, and its "Where are your games?" names that platform's emulators: Delta, Provenance, RetroArch and Manic EMU in On My iPhone or On My iPad on iOS, since iOS can't open the picker inside another app's folder, RetroArch, Pizza Boy and My Boy! on Android, and RetroArch on the Mac. "I've used pkhemu before" goes forward to "Pick your pkhemu folder", laid out like "A folder for your games", with Back and a primary "Choose folder". Its picker opens at `Documents/pkhemu` when that exists, or at Documents, and never makes the folder. A folder with any system folder becomes the games folder and the library opens. Any other folder keeps the player on the screen with an alert naming it, and the buttons stack into a primary "Choose another folder" over an outline "Use it anyway". Android says which taps its picker needs next. The Mac makes the folder without a dialog, so it skips that note, and copy says "Mac" where Android's says "phone". On iOS the games folder is the app's own, so "I have ROMs on this phone" reads "I have games on this iPhone", or "iPad" on an iPad, and "I've used pkhemu before" is left out. The iOS folder screen says the folder is in the Files app and leaves out the uninstall line, since uninstalling deletes it. Once "Make folder" saves the folder, the player lands on the library with a toast. A cancelled picker leaves them where they were. The pad setup prompt waits until there's a games folder.

## Components

Build the UI from shadcn/ui. The components live in `app/src/components/ui`; add a missing one from `app/` with `npx shadcn@latest add <name>`. Write a custom component only when shadcn has nothing that fits, and build it from shadcn parts where it can. Don't use a plain `<button>`, `<select>` or `<input>` where shadcn has a component.

## Picking from a list

Use a Combobox. Typing filters the list, and a row can show a sprite next to its name. A row loads its sprite only when it scrolls into view. Don't use a native select, even for short lists.

## Adding a Pokémon

The plus button in the Boxes header opens a species page: a search box stuck to the top over every species in the game, each row with its sprite, name and number. Picking one opens its encounters in this game, one row each, like "Route 101 · Lv. 2–4", with the form below when it isn't the default and tags for an egg or a fixed ball. With none, the page says "No Mudkip encounters in Emerald". Tapping a row asks first in a dialog with a short card for the encounter: sprite, species and level, location, form, PKHeX's name for the encounter and the egg and ball tags. Confirming adds the Pokémon to the first empty box slot and replaces both pages with its editor, where the legality chip shows the check. A failed check never blocks the add.

On a Gen 1, 2 or 3 save, an Events row with a gift icon and a chevron sits above the species list. It opens every event Pokémon the save can hold, under a search that matches species, trainer name or language. Each row shows the sprite, the event's trainer name before the species and level, as in "WISHMKR Jirachi · Lv. 5", and a language tag when the event fixes one. Picking a row asks in the encounter dialog, which adds the language tag. DS saves get their events from Mystery Gift instead.

"From a file" is next to the search and opens the system file picker for one Pokémon file. The app adds the Pokémon to the first empty box slot and opens it in the editor, like an encounter. A file the real games couldn't move into this game asks first, in the same dialog, with the "Not possible in the real games" alert. Other files add right away. If the engine can't add it, the reason shows under the search until the next pick or search. A Wonder Card (.pgt, .pcd, .wc4 or .pgf) never reaches the box. On a save with a card album, a dialog offers to open it in Mystery Gift, which shows the card's preview as if it had been picked there. On other saves, the reason under the search says Wonder Cards go in Gen 4 and Gen 5 saves. On a save with no encounter data, the plus button opens the file picker straight away and the reason shows under the Boxes heading.

When no box has an empty slot, the plus button is disabled and "Your boxes are full" shows under the Boxes heading. If the engine finds them full during an add, the add pages close to this state with no error.

## Teams

A Stadium save has registered teams but no party, trainer or bag, so its editor shows a Teams tile in their place. Other saves get no tile. The Teams page groups teams under their cup's name as a section heading. Pocket Monsters Stadium doesn't sort teams by cup, so it has no headings. Each team is a card titled by its place in the cup, as in "Team 2", with the name of the trainer who registered it below. The card shows its members as party slots. Tapping a member opens it in the Pokémon editor. A member's corner button asks in an alert dialog, then removes it. The members after it move up a slot. "Add from box" in the card's header opens the boxes, and picking a Pokémon copies it into the first empty slot and returns to Teams. A full team's "Add from box" is disabled.

## Box saves

A Box Ruby & Sapphire save holds only boxes. Its editor shows no party and no Trainer or Bag tile, and its Save card has no trainer.

## Shadow Pokémon

A shadow Pokémon in Colosseum or XD shows a Shadow badge beside its nickname, and a Shadow card after Stats holds its heart gauge and an outline Purify button. Purifying empties the gauge and removes the badge and the card.

## Mystery Gift

A Gen 4 or Gen 5 save gets a Mystery Gift tile after Events. The page lists the cards in the save's album under "In the save". Each card has a remove button that asks first in an alert dialog. Below, an Events heading sits over the list controls: a search, a "From a file" button and a Pokémon or Item filter. Each event shows its sprite or item icon, its title, a language tag and "Received" once the save has it. Cards that give neither, such as seals, show only with no filter on. Picking an event or a card file opens a dialog with what the card gives, laid out like Add a Pokémon's. A card PKHeX doesn't know gets a "Not a known event" alert. Review opens a Review card that names the slot the card goes in and says "Also unlocks Mystery Gift in the menu" when the menu is locked. When the album is full, the page above the card asks which card to replace, and Add card stays disabled until the player picks one. Add card returns to the page. The player collects the gift in the game. A card file picked in Add a Pokémon opens this page with its dialog already up.

## List controls

A list's search, filters and add button sit above the list and stick to the top of the page while it scrolls, as on the Events and Bag pages. The bottom bar is only for committing changes.

## Committing changes

A page that changes data commits from a bar stuck to the bottom of the page. The bar appears once something changed, says what changed on the left, and puts its buttons on the right. Pages put no actions in the header. When a wide screen shows a page beside the one on top, as the editor does, only the top page's bar keeps a primary button.

## Actions on one item

Since pages put no actions in the header, actions on one item, such as exporting a Pokémon's file, go in a ⋯ menu in the item's top-right corner, as on the Pokémon hero, the game page's hero and Save card, and a backup's summary card. An action that saves a file shows a toast like "Saved BULBASAUR.pk3" and nothing when the player cancels. On Android it opens the share sheet instead and shows no toast, since the app can't tell whether the player finished sharing.

A menu's first line can be a short muted note about the item, as in the game page's "Game art isn't available for this ROM" or "Patched from FireRed EN 1.0 with radical_red.ups". The actions go below it.

A 3DS game's ⋯ menu has "Install update…", which opens the import picker. An installed update shows as "Update v5232" in a muted hero line under the version line, with the title version from its TMD.

A game with no save, or a save the engine can't read, has no Save card. Its actions move to the game's ⋯ menu, after "Re-extract game art": "Export save" for a save it can't read, then "Backups" when the game has any.

Actions that take the item away go last, below a separator: the game page's "Remove from this device", shown only while signed in to sync, and a destructive "Delete…". Delete asks first in an alert dialog that says where the game is removed from: all devices while signed in to sync, this device otherwise. Both return to the library with a toast like "Deleted Ruby". Delete goes back as soon as it's confirmed and hides the game while it deletes. If that fails, the game comes back with a toast like "Couldn't delete Ruby. {reason}".

## Dialogs that make something

An action that makes something new from a few inputs, such as Patch ROM, opens a centered dialog. Show what the player needs to check first, such as the base ROM's build. Picking a file is an outline button that opens the system file picker, with the file's name below it. On desktop the dialog also takes a file dropped anywhere on the window, and gets a primary ring while one hovers. A problem shows inline in destructive text under the field it's about, and the field gets `aria-invalid`. The main button stays disabled until every input is valid. While the work runs, the main button shows a `Spinner` from `components/ui` and the other controls are disabled. Escape, a tap outside and the back gesture don't close the dialog then. On success the dialog closes and a toast confirms it, as in "Created Radical Red". The Patch ROM toast ends with an Add box art button, which opens the Box art sheet for the new game. When the input comes from outside, as with a patch opened from another app, the dialog asks for what the menu would have fixed at the top: Patch ROM gets a base picker, a combobox of the games that fit, with the only one preselected and a muted line when it can't tell which fit. When none fit, a muted line names the build the patch needs, as in "It needs FireRed EN 1.0", or its CRC32 when the app doesn't know it, with an outline Add game button. Add game runs the import picker and keeps the dialog open, and a game that fits becomes the base.

## Unsaved play

Before an action that starts from the save, warn when play isn't in it yet. The dialog is titled "Save in game first?", says what would be lost, and offers the way to save in game as the main button with a way to go on anyway next to it.

## Box art and screenshots

Show box art or a screenshot over a blurred, darkened copy of itself that fills the space, so art of any shape fits. Draw screenshots with pixelated scaling and box art smooth. A library tile prefers box art, then the game's last screen. On library tiles and the Continue card, box art fades in from transparent at the top-left corner to opaque 20% along the diagonal, over the system's dot grid, with the system chip in that corner and the name hidden. The game page hero and the pause menu show box art unfaded. The last screen fills the tile, with the system chip top left and the name in white over a dark gradient from the bottom. A DS or 3DS last screen shows its top screen only, on tiles, the game page hero and the Resume button, filling the tile from its top edge. A tile with neither shows the chip top left and the name bottom left over the system's dot grid, fading out from the top-left corner. Without art, the game page uses the system's hero ground and dot grid.

## Choosing box art

"Change box art" in the game page's ⋯ menu, a long press on a library tile or the Continue card, and a right-click or long click with a mouse all open one sheet titled "Box art". A long press doesn't also open the game. Cloud-only games don't open it. A phone shows it as a bottom sheet, and a wide screen centres it. Rows at the top offer Choose image, From URL, and No box art, or Use default once the game has a choice. From URL shows a field with a Use button. Below the rows, a search prefilled with the game's name and Box art and Title screens tabs stick to the top over a grid of the system's libretro thumbnails, ranked by the matcher. Each result shows its name with the region tags on a second line. For a ROM hack opened from its "Created" toast, the search starts on the base game's name from its build, and the base game's box art has a primary ring. A pick closes the sheet with a "Box art changed" toast. A failure shows inline and keeps the sheet open. Offline, the grid says "Connect to the internet to browse box art" and the rows still work.

## Importing games

The + button in the library header, before Settings, opens a menu with "Import files" and "Import folder". An empty library shows a centred row of the platform's system chips above "Import your games, or try the free demo.", which sits over a primary "Import files" button, with "Import folder" and, on desktop, "Open folder" as outline buttons beside it. An outline "Play a demo" button with a Play icon sits on its own row below them. It copies Tobu Tobu Girl Deluxe into the games folder and starts it, with a `Spinner` in the button and the import buttons disabled while it copies. Once copied, the demo is an ordinary game. With the Demo game experiment off, the line reads "This app doesn't include any games." and the button is gone. The app never says where to get games. Imports copy the files and leave the originals alone. While an import runs, the + button and the empty library's button show a `Spinner`.

Questions during an import open one at a time. A save that matches no game by name opens a dialog titled "Which game is this save for?" with a Combobox of the library's games. "Skip this save" is the secondary button, and the primary "Use for Emerald" stays disabled until the player picks a game. Replacing a save asks first in an alert dialog, "Replace Emerald's save?", with both saves' dates, a muted "pkhemu's save goes to Backups first." line, and "Keep pkhemu's" next to the primary "Replace". The replaced save shows in Backups as "Before import". A zip holding several patches asks "Which patch?" with a Combobox of them before the Patch ROM dialog opens. Several patches opened at once open only the first, and the toast adds "Open one patch at a time". The import ends with a toast like "Added 2 games and 1 save", or "Already in pkhemu" when nothing was new.

"Import folder" opens the folder picker, then shows full-screen steps laid out like the onboarding screens, with Back and the main button side by side at the bottom. From the welcome screen it starts with "Where are your games?" and a "Choose folder" button. A spinner shows while the app looks through every folder inside the pick. When the folder is Delta's, Provenance's, RetroArch's or Manic EMU's, a muted line under the heading reads "Found a Provenance folder", and that app's own folders are left out. The summary shows three stats in cards: games, games with a save, and size to copy. When some games have no save, an alert below offers an outline "Add a folder with saves" button. A list follows with each game's system chip and "Save" or "No save". When saves match no game, a muted line under the notes says to import the ROMs too, then import the folder again. From the welcome screen its main button is "Continue", which leads to the games folder screen, and from the library it's "Copy 6 games". When games already in pkhemu have a save and the folder brings one too, one screen lists them with a checkbox each, unticked, and both saves' dates. Copying shows a Progress bar over "3 of 6 · FireRed" and a secondary Cancel, which stops after the current file. Back does nothing while it copies. It ends on the library with a toast like "Copied 6 games and 4 saves" or "Copied 3 of 6 games", or "Already in pkhemu" when nothing was new.

## Continue card

The library starts with a Continue card for the game played last. Recently played leaves that game out, and hides when it has no other games. The card shows the last screen, or box art, or the system's dot grid, with the system chip, the name and "Played 2 hours ago". Its button is the screen's primary button. It says Resume and starts from the resume point, or Play and starts from the save when there's no resume point. A tap anywhere else on the card opens the game page, with the same container transform as a tile, grown from the thumbnail. A cloud-only game shows its cloud pill on the thumbnail, and its button opens the game page, which runs the download. On a phone the button sits under the thumbnail and text. On a wide screen it sits on the right. With nothing played there's no card.

## Cloud-only games

A cloud-only game's library tile has a cloud icon in a small dark round pill in its top-right corner, labelled "In the cloud". Box art comes from the game's name as usual. Decoded game art and the last screen wait for the ROM.

On mobile data, opening one first asks in an alert dialog like "Download Emerald (16 MB) on mobile data?", whatever the mobile data switch says. Cancel returns to the library. On Wi-Fi it downloads without asking.

Opening one shows the game page's hero. Below it, in place of the play buttons, a muted line like "Downloading · 12 of 512 MB" sits over a Progress bar. Once the ROM is down, the line says "Checking your other devices…" while the game syncs. Then the full game page replaces it. A failed download shows the reason in destructive text above a Try again button, and the game stays cloud-only. Its ⋯ menu has only Delete.

## Sync on the tile

A library tile shows a small dark round pill in its top-right corner, like the cloud icon, only when its game needs the player or can't sync. Files moving, a game waiting its turn and a finished transfer show nothing on the tile, since the header ring covers the run.

- A Wi-Fi icon shows while the game's saves wait for Wi-Fi.
- A sync conflict or an error gets an amber attention icon.

A cloud-only game keeps its cloud pill and shows the ring left of it only while its ROM downloads.

On a computer, hovering the badge shows a Tooltip with the stage, such as "Waiting for Wi-Fi" or "Downloading ROM · 12%". The badge's accessible label is the same text. Tapping the badge opens the game like the rest of the tile, except a conflict's. That one is a button labelled "Changed on another device. Choose a version to keep", and it opens the conflict sheet (see Sync conflicts) over the library. The badges sit beside the tile's button, not inside it, so the conflict badge isn't a button in a button.

The game page's hero shows the game's sync stage, such as "Uploading ROM · 46%" or "Waiting for Wi-Fi", in a muted line under the play history, or "Last synced 5 minutes ago" when the game is idle, and "Not synced yet" before its first sync. A conflict's line, "Changed on another device", is amber (`text-overlay-warning`) with the alert icon, over a small secondary "Choose version" button that opens the same sheet. Once every version is picked, the sheet closes and the game syncs again. Signed out of sync, the line is hidden.

The ring fills in `medium2` with standard easing. The badge fades in and out in `short4`. With reduced motion, the ring jumps to its new fill.

## Sync in the header

The library header shows sync's whole run as a ghost icon button left of the + button, hidden while nothing runs or waits. It's the library's only loading indicator: the + button stays plain while an import runs. The empty library has no ring for its import, so its buttons keep their spinners. While sync checks the games or an import adds them, a quarter ring spins. While files move, the ring fills clockwise with the run's bytes done over total. While saves wait for Wi-Fi, a still Wi-Fi icon takes the spinner's place. A problem with the account, such as an expired sign-in or a full Drive, shows an amber attention icon until the next run, even while an import runs. Being offline isn't a warning. The button's accessible label and tooltip give the same text as Settings, such as "Syncing · 46%", "Adding games" or "Sign in to Google Drive again". Tapping it opens the Sync details sheet. It fades in and out like the tile badge.

## Game art

Pokémon art uses the menu icon at `size-12` and below and the front sprite above, falling back to whichever the ROM has. The editor's artwork slot scales the front sprite by a whole number with pixelated rendering. The artwork slot plays the animated sprite when the ROM has one, and shows the still sprite when the OS asks for reduced motion. Everywhere else shows the still sprite, and menu icons never animate.

When game art has no image for a Pokémon, show a neutral tile with its national dex number and name, or just its name for a ROM hack species with no dex number, tinted by its first type with `typeColor` from `app/src/game-art/typeColors.ts`. An item with no icon gets a neutral tile with its name. Gen 1 and 2 games and Ruby and Sapphire never had item icons, so they hide the icon column instead.

## Two screens

DS and 3DS games show both screens at one scale, picked like a single screen's. They stack or sit side by side, top screen first, whichever makes them bigger. For DS that means stacking when the space is less than 4:3 wide. The 3DS's narrower bottom screen sits centred under the top one, or beside it at its own width. In a landscape window the 3DS shows the top screen large with the bottom one beside it at half its scale. Where the controls on both sides leave the space no wider than tall, as at 1376×1032, the screens stack instead. A portrait window keeps both at one scale, even where the controls below leave the space wider than tall. The Swap screens button in the game's header exchanges them, as does the pause menu's Swap screens entry below Fast-forward. Only the bottom screen takes touch or clicks, wherever it sits.

With touch controls showing, the two screens stay clear of them, since the bottom one takes touches. In portrait the controls sit below. In landscape the touch screen stays clear of the controls on its side, with 0.5rem to spare beside the 9rem side, and the other screen may lie under the far side's controls at their 70%. In a window closer to square than 5:3 both screens stay clear of both sides. Where staying clear would take them below their own size, they lie under the controls like a single screen. At 844×390 they sit side by side. DS face buttons form a diamond with X on top and Y on the left.

## 3DS controls

3DS games get the DS layout plus a circle pad. The left side stacks L, the circle pad (a stick zone), a 96px D-pad and the Select row. Both sides span the left side's height, so L and R stay level and the face diamond sits between R and the Start row. In landscape the shoulders shrink to 36px tall and the space between controls to 8px, so each side fits the screen's height. There's no ZL, ZR, C-stick, gyro, 3D slider or microphone. A gamepad's left stick is the circle pad, and its right stick does nothing. On a keyboard, I, J, K and L tilt the circle pad and the arrows stay on the D-pad.

## N64 controls

N64 games get their own touch layout. L and R sit in the top corners. The left side stacks the stick, a smaller 96px D-pad and the pause menu. The right side stacks B, A and Z, with Z a smaller face button above A, then the C buttons as a diamond of 44px circles with arrows, then Hold and Fast-forward. N64 has no Select, and Start sits alone in the middle of the bottom edge. In landscape the shoulders shrink to 36px tall, and Z and the C buttons to 40px, so each side fits the screen's height.

## GameCube controls

GameCube games get a layout shaped like the pad. The left side matches N64's: L, the stick, a 96px D-pad and the pause menu. On the right, Z is a small pill above R, or beside it in landscape. Below R a big A sits with a smaller B to its lower left, and X and Y as pills to its right and above it. X and Y tuck under A's edge, so A's rim cuts the pad's kidney shapes into them. Under the face buttons the C-stick is an 80px stick zone, 64px in landscape, with a small knob, then Hold and Fast-forward. Start sits alone in the middle of the bottom edge. Touch L and R send full presses. In landscape the shoulders shrink to 36px tall.

## Stick zone

A stick is a 128px circle, 104px in landscape, with a face-token knob at its centre. The stick measures from where the thumb lands inside the zone, not from the centre. While touched, a ring at the landing point shows the reach, a third of the zone's width, and the knob follows the tilt inside it. A slide shorter than a tenth of the reach doesn't tilt. Past the reach the tilt stays full, clamped to a circle. A thumb that slides out of the zone still moves the stick. "Stick sensitivity" in the Controls settings scales the tilt, and shows only while Touch controls is on: Low, Medium and High are 0.75×, 1× and 1.5×.

## Small-button row

Select and Start each sit in a row of small buttons at the bottom of their side of the touch controls. The left row adds the pause menu and the right row adds Hold and Fast-forward, as round icon buttons. Select and Start are 56×44 pills and the round buttons are 44px, 8px apart. Mode toggles go in these rows as icon buttons with `aria-pressed`, which fill with the primary while on, or light up as the skin's look says (see Touch controls).

The right row is 160px, wider than the side's 9rem. In portrait it reaches 8px past the side into the edge padding. In landscape the small buttons shrink to 36px tall, so the row fits the 9rem and stays clear of DS screens side by side. Don't shrink them below 36px.

## Two sides

Transfer shows this game's party and boxes next to a "Send to" list of the other games. A Stadium save has no party, so its side shows only boxes. Picking a game adds a status line under the list's heading, such as "12 empty slots in HeartGold". A phone stacks the Pokémon above the list. A wide screen puts the Pokémon on the left and the list on the right. Only this game's slots are selectable, and they reuse the editor's party slots and box switcher. Tapping a slot toggles a check mark. Slots are selectable before a game is picked. Picking a game checks the selection against it, greys out the Pokémon it refuses, and shows the first reason in the bottom bar. Picking another game checks the player's picks again. A slot that can't be picked is greyed out, and tapping it shows why in the bottom bar.

Each game in the list shows its version name with the ROM's file name under it, so two copies of FireRed can be told apart. The file name is left out when it matches the version name.

A game the player can only reach by an unofficial transfer stays pickable, with "Not possible in the real games" under its name and a note under the status line. When the game is an older generation, the hint reads "The games only moved Pokémon forward" instead.

A dot left of each game's name shows its route: green when the real games reach it, amber for an unofficial transfer, red when it can't receive, and grey while it's being checked.

## Pokémon info

While a game runs, the app can show the opponent in battle and the live party, read from the game's memory. It's off by default and turns on per game from the "Pokémon info" switch in the pause menu. A "Randomized" switch sits below it, also per game. The switches are missing for games whose memory the app can't read. Neither the panel nor the pill pauses the game. Memory is read a few times a second while the game runs and stops while it's paused. Outside battle on a phone, the app reads only enough to notice a battle starting.

A card shows one Pokémon: its sprite, "Poochyena · Lv. 3" with a Shiny badge, the held item or "No item", the nature and ability, as in "Adamant · Intimidate", the six IVs in a row under their short names, and the moves in two columns. When the engine can't read the Pokémon, as in a ROM hack that moves memory around, the card says "Can't read this game". With Randomized on, the card must leave out anything the engine looks up in its species tables, such as the ability and types.

A wide screen, in landscape or at least 48rem across, puts a panel to the right of the game. In battle, the opponent's card sits on top, both cards in a double battle, with "3 left" under them in a trainer battle, and the party shrinks to a row of sprites below. Outside battle the panel lists the party, and each row expands to its card.

A phone in portrait shows a pill at the top of the game, only in battle, like the toasts: "Poochyena · Shiny · Adamant · 31/31/28/…", one line per opponent. Tapping it pauses the game and opens the cards in a bottom sheet, and closing the sheet resumes.

## Skin picker

The skin picker covers the screen for one system, with Close and "Game Boy skin" in its header. A two-way switch, Moulded and Frosted, sits under the header. Below it the preview, a rounded card, is the portrait game screen at reduced scale: the header, the plastic, the opening and the touch controls, drawn by `screen.ts` with Screen glass and Screen depth as the player set them, and with controls that don't respond. It shows the paused frame when opened from a game and the system's last resume screenshot otherwise, or a black screen without one. Under the card the skin's name and a dot per skin sit between ‹ and › buttons, and "Use this skin" fills the bottom, reading "In use" when the shown skin and look are the saved ones. Tapping it saves the skin and closes the picker, back to where it opened from. In landscape the card takes the left side and the rest stacks on the right. The picker always lays the preview out in portrait: `[data-portrait]` turns off the `landscape:` variant inside it.

Skins marked `free: false` need Plus. Without it, a locked skin still previews, with a small lock after its name, and the bottom button reads "Get Plus". Tapping it buys Plus, and the purchase saves the skin and closes the picker. A pending or cancelled purchase changes nothing. A store build that can't sell Plus offers only the free skins, here and in Settings. A saved skin that's locked, as after a refund, shows as pkhemu until Plus comes back, and the saved choice stays.

Swiping the card, tapping its left or right quarter, ‹ and ›, a dot or the arrow keys move to another skin, and the list wraps around. The next skin's plastic comes in under a mask with a soft edge a third of the card wide, from the side the finger pulls from, with a faint light along the edge. The controls' colours and the skin's name blend at the same progress. Released past 40%, or flicked, the move lands, and otherwise it springs back. Switching looks blends every `--skin-` variable over 560ms as the switch's thumb slides. A second after the picker opens, the next skin edges in 20% and falls back, until the player first moves to another skin on this device. With reduced motion the wipe and the blend become a 150ms crossfade, and the hint doesn't play. A skin landing and a look switching each tap the haptics. Close keeps the saved choice.

Two entries open the picker, and both show only while the Touch controls switch in Settings › Controls is on. The pause menu's Skin entry sits above Settings, in landscape too, with the skin and look in a muted line under its name, like "Classic grey · Moulded". It opens the picker for the running game's system. Settings › Appearance has a Skins row with a chevron under Theme. It opens a list of the platform's systems, each row a small tile of the system's plastic, its name over the same muted line, and a chevron. A row opens that system's picker.

## Bottom sheets

A phone shows menus and pop-up details, such as the pause menu and the opponent cards, in a sheet that rises from the bottom. B, Escape, the back gesture or a tap outside closes it. Build one with `BottomSheet`.

## Safe areas

Nothing sits under a notch, the Dynamic Island or the home indicator, but backgrounds still reach the edges. The body pads the side insets. `ScreenHeader` pads the top one, so a screen without a header pads the top itself. A screen pads its bottom with `pb-safe`, and a full-screen layer (`fixed inset-0`) pads its sides and bottom with `px-safe pb-safe`. Something that already has padding at an edge, such as a bar, a sheet or a centred page, uses `max(<padding>, env(safe-area-inset-*))` there. In a game, the touch pad pads the bottom in portrait, and the picture pads it whenever nothing else does.

## Review cards

Before Pokémon move, as in a transfer, a Review screen shows one card per Pokémon. A phone shows one column, and a wide screen wraps the cards into a grid. A card starts with the sprite, or the sprites before and after an arrow when the species or form changes, then "Kadabra · Lv. 36". Each changed field gets a row with the field on the left and "before → after" on the right, with the reason in small muted text below. A card with no changes says "No changes". Changes to the saves go below a rule, under headings like "In Platinum". A failed legality check shows a warning under the heading with its messages behind "Details". It never blocks the action. An unofficial transfer's card shows one alert, "Not possible in the real games", in place of the legality warning, with the legality messages behind "Details". A restored field reads "Restored from its Black copy". When pkhemu keeps a copy, the unofficial alert says the data comes back when the Pokémon moves forward. When kept copies can't tell this Pokémon from another, the card says "pkhemu keeps copies of more than one Pokémon that could be this one, so nothing is restored." It goes in the unofficial alert after the legality sentence, or on an official card in plain text above the change rows. Long values wrap and never truncate, so a card fits a 320px screen. The bottom bar holds Back and the action.

## Slot grids

Numbered slots, such as save states, sit in a full-screen grid of tiles. A phone shows two columns and a wide screen up to five. A filled tile shows its screenshot over a blurred copy of itself, the slot number, and when it was filled in the backup list's time format. An empty tile says "Empty". The D-pad and arrow keys move between tiles, and A, Enter or a tap picks one. A filled tile has a trash button in its top-right corner, reached by moving right from the tile. Before a pick or delete replaces or drops something, an alert dialog asks, and its main button names the action.

## Cheats

The pause menu's Cheats entry opens a full-screen list of the game's codes, with an outline "Add code" button above it. Each row has the code's name on the left, and its switch and a trash button on the right. When the core can't read a code, the row shows why in destructive text under the name, and the switch stays off and disabled. A tap on a row or on Add code opens a centered dialog with a Name field and a multi-line Code field. A blank name becomes the first free "Code N", such as "Code 1". Save stores the code even when it fails the check, and the dialog then stays open with the reason under the Code field. Delete asks first in an alert dialog. The D-pad moves between rows and along each row, and typing needs a keyboard or the on-screen one. Controls stay enabled while a change saves, so the D-pad keeps its place. Back returns to the pause menu. Each change reaches the core straight away, and the game runs with it on resume.

## Transfer Pak

An N64 game that uses the Transfer Pak gets a titled card under the Save card on its game page, with a Combobox of None and the library's GB and GBC games, and a muted line saying what it is. Picking one saves it for the next start. In the pause menu, a Transfer Pak entry shows the current game in muted text on its right, like Fast-forward, and opens a full-screen list with a check on the current game. Picking another asks first in an alert dialog, since the game restarts from its save, and Restart starts it with the new pick.

## Buttons inside a tile

A tile can't hold a button, so a corner button sits over the tile instead. Since it lies inside the tile, the D-pad can't reach it by position: link the two with `data-focus-right` on the tile and `data-focus-left` on the button, each naming the other's id.

## Toasts

Toasts sit at the top of the screen as dark pills, as in "Sent 3 to Platinum" after a transfer. A toast for an action the player can undo ends with an Undo button after a middle dot, as in "Save edited · Undo" and "Loaded slot 3 · Undo". An optional next step goes there the same way, as in "Created Radical Red · Add box art". Toasts over the running game sit in the game screen's own stack at the top of the game, built with `Toast inline`.

On Android, an update from Google Play gets a toast on the library, never over a game. "New version available · Update" shows at most once per launch. Once it times out, it stays away until Play has a newer version. Once the update downloads, "Update downloaded · Restart" shows on every launch until the player restarts.

## Achievement unlocks

An unlock shows as a 34px pill at the top of the game's toast stack: the badge at 24px in a 2px ring, then "Boulder Badge · 10 pts", the title 12px semibold and the points 11px muted. It's at most the game screen's width minus 12px, and the title ends in an ellipsis. A badge that isn't downloaded yet shows the pkhemu glyph. The pill is a `role="status"` labelled with the title, points and description. Build it with `UnlockNotifications`.

It's coloured from the system's chosen skin, in every orientation: the skin's `base` fills it, `moulded.face` rings the badge, and `tone` picks white or `#16131f` text. The points are the text at 74% over the fill. Where that reads under 4.5:1, the fill moves toward black on dark skins, or white on light ones, in 4% steps until it passes. `theme/contrast.test.ts` checks every skin.

It drops in at badge size, grows to full width and holds 5s, then shrinks back and rises out. A swipe up or sideways past 70px, or a flick, flings it out, a drag down rubber-bands, and a short drag springs back. A finger on it, a mouse over it or a paused game holds the timer. With a mouse, hovering shows a Dismiss text button at the right over a fade into the fill. Gamepads and keys don't touch it.

Unlocks play one at a time and wait while the game is paused. When 4 or more are waiting, the first plays and the rest fold into one "+4 more achievements" pill. One already showing counts as the first.

Completing a set plays in the same queue as a 40px pill with a 30px badge: "Mastered Emerald · 1,240 pts" in hardcore, "Completed Emerald · 1,240 pts" in softcore, with the game's badge and the set's points. It holds 7s, and one shine crosses it once it has grown. It never folds into "+N more".

A tap on an unlock dismisses it, pauses the game and opens its details sheet. A tap on "+4 more achievements" or on a completed set opens the list instead.

## Achievement indicators

While playing, rcheevos' indicators sit 6px inside the bottom-right of the game's screens, in the unlock notification's colours. A measured achievement that moves forward shows a 22px pill with its 16px badge and "47/100" for 2s, then fades. A newer update replaces it and starts the 2s again, and a paused game holds it. A live challenge shows its 16px badge in a 24px circle ringed in `moulded.face` until rcheevos ends it, to the right of the progress pill. A running leaderboard, hardcore only, shows its tracker ("1:23.45") in a text-only 22px pill between the progress pill and the challenges until rcheevos hides it. Leaderboard messages show in a text-only 22px pill above that row, cut with an ellipsis at 240px: "Leaderboard started · Fastest Elite Four" for 2s, "Submitted 1:23.45" for 3s and "Leaderboard failed" for 2s. A newer message replaces the one showing, and a paused game holds it. Each is a `role="status"`. Build them with `AchievementIndicators`, passed to `Player` as its `corner`.

## Achievement list

Signed in to RetroAchievements, a game with a set gets an Achievements entry in the pause menu, below Cheats, with the tally in muted text on its right, and an Achievements card on its game page, below the Save card. The card shows the tally, a progress bar and an outline "All achievements" button. Its heading row ends with the player's username and a chevron, which open the RetroAchievements page. The tally reads "34/72 · 410 pts", the unlocked count over the set's, then the unlocked points. 3DS games, cloud-only games and games without a set show neither.

Both open a full-screen list headed "Achievements" with the tally on the header's right. Locked achievements come first, then unlocked ones, each in the set's order. A row has the 40px badge, greyed while locked, the title with its points on the right, the description, and a muted line: when it unlocked and in which mode, as in "Today 14:32 · Softcore", or a measured one's progress, as in "47/100". The page lists a game from RetroAchievements and keeps the last list for when it's offline. The game's list comes from rcheevos while it runs, with the progress.

A tap on a row opens the details sheet, a bottom sheet that a wide screen centres. It shows the 64px badge, in a primary ring once unlocked, beside a small uppercase kicker, "Achievement unlocked · 25 pts" or "Locked · 25 pts", and the title. Below are the description, then rows for Points, Unlocked or Progress, and "Players who have it". Over the game it ends with an outline "All achievements" and a primary Resume. Resume, or closing a sheet the notification opened, resumes the game, and unlocks wait until then. A sheet opened from the list closes back to it. On the game page it ends with Close.

## Hardcore

The RetroAchievements page has a Hardcore switch above Sign out, off by default and kept on this device. Its muted line says what it locks, and a smaller line says it applies from the next launch. Turning it off while a game runs in hardcore drops that game to softcore.

A game with a set launches in hardcore while the switch is on. A launch that would resume from a state, the resume point or a slot, first asks "Resume in softcore?" with an outline "Restart (hardcore)" and a primary "Resume (softcore)". Restart boots from the save in game. A save pkhemu changed then warns in an "Edited save" dialog, with an outline "Play hardcore anyway" and a primary "Play in softcore". The back gesture in either quits the game.

In hardcore, the pause menu's Edit save, Undo last edit, Load state, Undo load state and Cheats stay enabled but ask first in an alert dialog titled with what ends hardcore, as in "Cheats end hardcore until you restart the game", with Cancel and a primary "Switch to softcore". Cancel returns to the pause menu. Fast-forward and Save state don't ask.

## Before a game boots

A question about how a game starts, such as the hardcore ones, holds the game on its loading screen until it's answered. Each asks in turn after sync has checked the other devices. The back gesture and Escape quit the game.

When the sideload build was signed without extended virtual addressing or the increased memory limit, a 3DS game first warns "Nintendo 3DS games may crash". It names what's missing and says how to get it: a paid Apple developer account gets both, and AltStore on a free account gets the memory limit. Back is secondary and "Play anyway" primary. It asks at every boot, since the signature doesn't change until the app is installed again.

## Settings rows

Settings sit in titled cards. Each row puts its label on the left and its control on the right. An on/off setting uses a Switch. A choice between a few values, such as fast-forward speed or theme, uses a single-select outline ToggleGroup with one item per value. When the values' names are too long for a ToggleGroup, as with the renderer, use a Select. A number uses `NumberInput`, a short InputGroup with its unit as an inline-end addon; a setting made of several numbers puts one per unit side by side. A line of muted text under the row says what the setting does now, with an outline Reset button on its right while the setting is off its default. A small muted line under that holds any caveat. A card that saves settings shows the save error below its last row. Buttons side by side in a card share one `flex flex-wrap gap-2` row, left-aligned, as the Sync card's Connect and Plus buttons do.

On a narrow screen, a switch stays on the right and its label wraps. A wider control, such as a toggle group, a number or a select, drops below its label, at the left. A card never grows past its width.

Settings shows background work, such as extracting game art, as a muted line like "Extracting · 3 of 12 games" over a Progress bar. When the work is idle, both are hidden. An outline button below starts the work again.

When the work has more to show than fits in a card, as with sync, a status row takes the line's place. Its muted line and a chevron are a ghost button that opens a details sheet with the progress and the list, and a ghost ⟳ icon button at its right end starts the work again. The ⟳ is disabled while the work runs.

Playing has Fewer freezes in 3D games after Renderer, on by default. It covers 3DS and GameCube.

Playing has GameCube resolution after that, as a toggle group of Native, 2× and 3×. It sets Dolphin's internal resolution the next time a game starts. Native is the default on Android and iOS, and 2× on macOS. Widescreen hacks stay off. The game lays out as if it were at native size, so a 3× frame sits where a native one would.

The sideload build has a JIT card after Playing. While JIT is off, a muted line says StikDebug can turn it on until the app closes, over an outline "Enable JIT" button that opens StikDebug. Beside it, an outline "Import pairing file" opens the document picker for a `.mobiledevicepairing` or `.plist` file. A rejected file shows why in destructive text, naming the keys it's missing. An older file without the RemotePairing keys gets a line asking for a new one from iloader. Once JIT is on, the line says so and the buttons go. With a pairing file set, a row reads "Pairing file set" with an outline Remove button on its right, whether JIT is on or off, and importing another replaces it. Store builds leave the card out of their bundle. Other builds have no JIT card.

Appearance has Screen depth and Screen glass after Skins. Screen depth shows only where the device can read tilt.

The Lab card sits before About. It opens with a line saying experiments can change or go away in any update, then one row per experiment like any other setting. It lists every experiment in builds that aren't store builds and the player experiments for a Plus owner in a store build. With nothing to list, it's hidden.

About is the last card. A muted line says "The emulator, the editor and every Pokémon feature are free." A store build that offers sync adds "Plus adds sync, the Lab and more skins." Nothing in the app mentions builds without Plus, since store payment rules forbid pointing elsewhere. An outline "View licences" button opens Licences. While Google Play has an update, a last row says "New version available" with an outline Update button, or "Update downloaded" with an outline Restart button. Dismissing the library's toast doesn't hide it.

## Accounts in settings

Builds that can't use an account, such as Sync, hide its card. Signed out, the card shows a muted line saying what signing in does, over an outline button for each service the build can use, like "Connect Google Drive" and "Connect Dropbox", wrapping in a row. Signed in, the first row has the account's email on the left and an outline Sign out button on the right. A status row below says when the work last ran, as in "Last synced 5 minutes ago", or the run's phase while it runs, as in "Checking · 4 of 12 games" or "Syncing · 46%". It opens the Sync details sheet, and its ⟳ button runs Sync now. An error shows below it in destructive text, in plain words like "Your Google Drive is full". Besides the games, sync carries the skin chosen for each system, and a skin chosen on another device replaces the shown one after the next sync, on an open game screen too. ROMs sync whenever an account is connected, on Wi-Fi only. On Android the card ends with a "Sync on mobile data" switch, on by default, and a line under it says what moves on mobile data. Turning it off holds back everything, saves included. Metered Wi-Fi counts as mobile data.

The Sync details sheet, a bottom sheet that a wide screen centres, starts with the run's error in destructive text, then the same line over a Progress bar while the run has a percent. "Adding 2 games" shows while an import copies ROMs. A list puts each game with something to do on the left and its stage on the right, such as "Uploading saves · 25%", with ROMs waiting for Wi-Fi among them. A conflict's row has an amber stage and a chevron, and opens the conflict sheet. An outline Sync now ends the sheet.

In a store build, signing in to sync needs Plus. Without it, the signed-out card keeps its muted line and puts a primary "Get Plus · $3.99" button, priced by the store, in place of the Connect buttons, with an outline "Restore purchases" button beside it. Android has no Restore purchases, since the app checks Plus at launch and on return and Get Plus unlocks a Plus already owned. A pending purchase adds "Waiting for the payment to finish". A cancelled purchase changes nothing, and a store error shows in destructive text. When the store can't sell Plus, as on a device without Google Play, the card says "Plus can't be bought on this device", over Restore purchases where the platform offers it. Once Plus is bought or restored, the card shows the Connect buttons, or the account if one was connected before. Only the skin picker also asks for Plus. There are no popups, banners or reminders.

While the player is signed in to sync, the app fetches a game's changes before it starts. The starting screen shows "Checking your other devices…" for up to 5s, and when the check fails or runs out of time, the game starts anyway with a toast saying it couldn't check.

A RetroAchievements card follows Sync. Once the player signs in, it moves to the top of Settings, above Games folder, and acts as their profile. Its one row opens the RetroAchievements page and reads "Sign in to earn achievements", or, once the player signs in, their 32px avatar, username, and a muted line like "1,240 hardcore · 85 softcore points". Signed out, the page has Username and Password fields, a primary Sign in, an outline "Create an account" that opens retroachievements.org, and a muted line saying pkhemu doesn't store the password. Signed in, it shows the 64px avatar beside the username, then Hardcore points and Softcore points side by side. Below are "Recent unlocks", the last 5 across games in the achievement list's rows with the game before the time, each opening its details sheet with Close. Then an outline "View profile on RetroAchievements", the page's switches, and an outline Sign out last, below a separator. The page fetches the summary each time it opens. Offline, it shows the last one it fetched, with a muted line saying so, and a dash for points it has never fetched. RetroAchievements has no list of unlocks across games, so the recent ones come from the games' lists pkhemu keeps. An unlock shows over the game as an unlock notification (see Achievement unlocks).

## Coffee

Only the sideload build asks for a coffee, and a coffee unlocks nothing. A "Buy me a coffee" card follows the RetroAchievements card wherever that sits. A muted line says Sync is free in this build and a coffee helps keep pkhemu going, over an outline "Open Ko-fi" button. After 2 hours of play across all games, the library asks once in a dialog, "Enjoying pkhemu?". It says Sync is part of Plus on the App Store and stays free here, and offers a primary "Buy me a coffee", which opens Ko-fi, beside "Already did" and "No thanks". Any button, Escape or the back gesture closes it for good. Store builds leave out the card, the dialog and the link, and their build scripts fail when the bundle has the Ko-fi link.

## Sync conflicts

When the check finds a sync conflict, a sheet titled "This game changed on another device" opens before the game starts. A phone shows it as a bottom sheet, and a wide screen centres it. A conflicted save gets two cards side by side, "This device" and "Cloud". Each card shows the device it was saved on and when, then play time, badges and Pokédex from `ProgressStats` when the engine reads that version. A version written with cheat codes on gets an outline "Cheats on" badge. Each conflicted slot gets a row headed "Slot 2" with the same two cards, each with the slot's screenshot above it. Tapping a card keeps that version, and the game starts once every row has a pick. Closing the sheet returns to the game page and keeps the conflict for next time. The same sheet opens from a tile's conflict badge or the game page's Choose version button. There the last pick closes it instead of starting the game.

## Capturing input

To learn which button does what, as in setting up a controller, a wizard covers the screen and asks for one input per step. Each step lights its target on a pad diagram, names it by position, such as "Right face button (A)", and shows "Step 5 of 19". A list below shows every step with what it's bound to, the current step highlighted. A press binds when it's let go. Holding any button for 2s or tapping Skip leaves the step unbound. A press already bound earlier in the run binds nothing and flashes the row it's bound to. The wizard reads only the device it's setting up, and menus behind it ignore that device while it runs. Cancel and Skip sit in a bar at the bottom, the one bottom bar that doesn't commit changes. Cancel, Escape, the back gesture or 30s without input close it and change nothing. Nothing saves before the last step, which closes the wizard with a "Saved" toast.

The keyboard uses the same wizard without the L2, R2, Menu and stick steps, and shows keys by their `KeyboardEvent.code`. It leaves Tab and keys pressed with a modifier to the app, and Escape cancels it.

A pad with a non-standard layout and no setup drives nothing, so its first press opens an alert dialog titled "Set up this controller?". The dialog names the pad and puts Set up as the main button next to Not now. In a game, the game pauses and the dialog opens over the pause menu. Finishing or cancelling the wizard returns to the pause menu. Not now, or cancelling the wizard, hides the dialog for that pad model until the app restarts.

The Controls settings card starts with the Touch controls switch and, while it's on, Stick sensitivity. Then it lists the keyboard and the connected pads, each with its name and status above Configure and Reset to default, since pad names are too long to share a row with buttons.

## Going back

Every screen with a Back button also goes back with the back gesture on Android, a swipe from the left edge on iOS, and Escape, Cmd+Left, Cmd+[ or Alt+Left on a keyboard. Cmd+Left and Alt+Left leave text fields alone, where they move the cursor. In a game, going back opens the pause menu. On iOS a swipe that starts on the game or its header does nothing. Sheets and screens over the game still go back with it. Mark any other play area with `data-no-back-swipe`. On the library, going back does nothing.

Back closes the topmost sheet or dialog before it leaves a screen. `Dialog` and `AlertDialog` do this for every surface built on them. A dialog that needs other behaviour, like the hardcore prompts that quit the game, leaves out `onOpenChange` and handles back itself.

## Loading

Content that is still being worked out, such as whether a game can take a transfer, shows a Skeleton the size of the content that will replace it. A whole panel that is loading shows "Loading…" text.

A page reloading data it showed before keeps the old data on screen with an "Updating…" line, and disables the actions that need the new data.

A game that is starting shows the step it is on and a bar that fills one step at a time, in its screen area, over its last screenshot dimmed when resuming.

## Motion

Motion follows Material 3. Its duration tokens (`--motion-duration-short1` to `--motion-duration-extra-long4`) and easing tokens (`--motion-easing-standard`, `--motion-easing-emphasized` and their `-decelerate` and `-accelerate` forms) are CSS variables in `app/src/index.css`.

Features don't write animation CSS. Motion lives in `components/ui`, `components/` and `app/src/motion/`. A feature that needs motion the system lacks adds it to the system first. Code review checks this.

The relationship between two screens picks the transition, and the call that changes the screen names it with `navigate("forward" | "back" | "peer" | "play" | "sheet" | "container", update)`. The screen sits in a `<Screen>`. A screen that stays mounted behind another, such as the game page behind its backups, passes `hidden` to its `<Screen>` instead of unmounting. Screens swapped by a ternary each need their own `key`, or React updates one screen instead of swapping two. Every `useBack` path that leaves a screen navigates `"back"`, `"sheet"` when it closes a sheet, or `"container"` when it shrinks a page back into its item.

- Going deeper uses shared axis. The new screen slides in from the right and fades in. Library, Settings and Licences work this way, as do the game page's sub-screens.
- Peers use fade through. `Tabs` from `components/ui` does this on its own.
- Starting and quitting a game use `"play"`, which fades through black.
- The controller setup wizard uses `"sheet"`. It rises from the bottom as a full-screen sheet and leaves downward.
- An item opening into its own page uses container transform. Wrap the shared part, such as a library tile's art, in `<Shared name>` on both screens, and change the screen with `navigate("container", update)`. The rest of the two screens fade through. Only one element per screen may carry a name, so a game shown twice names each tile by where it sits.

Back plays the forward transition in reverse. Screens enter in `medium4` with emphasized decelerate and leave in `short4` with emphasized accelerate. A container transform takes `long2` with emphasized easing. No animation blocks input, and Back during a transition skips to its end and starts the next one.

Surfaces enter from the edge they're attached to and leave the same way. Bottom sheets slide up, side panels slide in from their side, and centered dialogs fade in and scale up from 95%, all entering in `medium2` with emphasized decelerate and leaving in `short3` with emphasized accelerate. Toasts drop from the top. Menus, comboboxes and tooltips grow from the element that opened them. Menus, toasts and the bottom bar enter in `short4` and leave in `short2`. Every modal surface has a dimmed scrim with an 8px backdrop blur. An achievement unlock (`motion-unlock`) drops in over `medium4` with emphasized decelerate, then grows from its badge to full width over `long2` with emphasized easing, its text fading in over `short4` from 260ms into the growth. Leaving, its text fades in `short2`, it shrinks to the badge in `medium2` and rises out in `short4`, both with emphasized accelerate. A fling leaves in `short4` and a spring back takes `short4` with emphasized easing. A completed set's shine crosses it in `extra-long3` with emphasized easing. The progress indicator and the leaderboard pills (`motion-indicator`) rise 6px and fade in over `short4` with emphasized decelerate, and fade out in `short3`.

Build the bottom bar with `BottomBar`. To let a surface play its exit, keep it mounted and close it through its prop: `open` on `BottomBar`, `BottomSheet` and `MenuDialog`, and an empty message on `Toast`.

Menus and the library grid stagger the first time they appear. Put `stagger` on the list container. Each item fades in and rises 8px. The delay grows for the first 8 items and then stops. Re-renders never replay it, so drop the class once the list has appeared if it can remount or gain items. `useStaggerOnce(key, ready)` does this: it returns the class until the first stagger ends and never again for that key. Long, virtualised and filtered lists don't stagger.

Tappable tiles and cards scale to 97% while pressed. Give them the `motion-press` class. Press and state changes take `short1` with standard easing.

A Skeleton crossfades into its content. Wrap both in `WithSkeleton` from `components/`, passing the Skeleton as `skeleton` and the content as children. An "Updating…" refresh crossfades only the values that changed: wrap each value's element in `<Crossfade value>`, which fades the element in when `value` changes but not when it first appears or goes from undefined to a value. Crossfades take `short4` with standard easing.

D-pad focus moves instantly. Nothing animates while a game is running and unpaused, apart from toasts, achievement unlocks and indicators, touch-control press feedback and the portrait screen recess following device tilt, so a screen that closes back into the running game uses a plain state update, not `navigate`.

With `prefers-reduced-motion`, transitions turn into a short crossfade and stagger turns off. An achievement unlock fades in and out in `short3` with no shine, and the progress indicator only fades. The app has no setting of its own for this.
