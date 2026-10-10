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

In light:

| System | Chip fill | Chip text | Pattern |
| --- | --- | --- | --- |
| GB | `#dcefd2` | `#2d5a1e` | `#5c9c3e` |
| GBC | `#f8e6c4` | `#6b4708` | `#c98a1e` |
| GBA | `#e6e0ff` | `#4a2fb8` | `#7c5cff` |
| NDS | `#d6ecfa` | `#12507c` | `#2f93d1` |
| N64 | `#fadadc` | `#7c1820` | `#d63a45` |

A system chip is `SystemChip` from `components/`. The dot grid is the `dot-grid` utility, which takes the pattern from `--pattern` and `--pattern-dark`.

### Type

Geist sets everything except five things, which use Pixelify Sans: the wordmark, section headings, system chips, the save card's numbers (play time, badges, Pokédex) and the touch controls' labels. Titles, body text and buttons stay in Geist. Section headings are the library's sections, the game page's Save heading and every `TitledCard` title, styled with `sectionHeading` from `components/`: 15px, muted, spaced 0.04em. A caption beside one, such as the system under a folder's name, stays in Geist. Pixelify Sans is the `font-pixel` utility, at weights 400 and 600. Fonts that copy Nintendo's lettering stay out, as Pokémon does from the app's name and icon.

### Shapes

Buttons are pills. On a touch screen (`pointer: coarse`) every button is at least 44px tall and icon buttons are 44px circles; with a mouse they keep their smaller sizes. Menu rows follow the same rule: at least 44px tall with 16px text on a touch screen. The touch controls' small buttons are an exception, at 36px in landscape (see Small-button row), and so are the N64 shoulders, Z and C buttons in landscape (see N64 controls). A screen or dialog has at most one primary button, for its main action such as Resume. The rest are outline buttons, or `secondary` muted fills for a dismissal like "Not now" or Cancel. A destructive button is an outline with red text. Rows and tiles built from `Button`, such as menu entries and save state tiles, keep `rounded-lg`, and so do toggle group items, inputs and the buttons inside them. Cards round to 16px (`rounded-xl`) and library tiles to 14px (`rounded-tile`), both steps of the `--radius` scale.

### Library

The library opens with a Continue card for the last game played, as in "Continue card" below. The header's `h1` is the icon and the "pkhemu" wordmark in Pixelify Sans, in place of "Library".

A tile without art shows the system chip top left and the name bottom left, over a dot grid in the system's colour that fades out from the top-left corner. Box art and the last screen cover it as they do today.

### Game page

Without art, the hero's ground is the system's hero ground, `#1e1247` for GBA, with its dot grid fading out from the top-left corner. Box art and the last screen keep their blurred backdrop. A system chip in its dark colours sits above the title. Text on the hero is `--hero-text` (`#c4c2d6`), and the version line `--hero-version` (`#d4caff`), in both themes. `contrast.test.ts` checks both on every hero ground. Resume is the primary button, or Start when there's nothing to resume, and the rest are outline buttons. Once a game fails to start because the device can't run its system, a muted line like "Nintendo 64 games don't run on this device." takes the play buttons' place on that system's pages until the app restarts. The save card's play time, badges and Pokédex numbers use Pixelify Sans.

### Touch controls

In portrait the controls and the game area share one `--pad` body, with no line between them. Each game screen sits on a plate below an opening in the shell, `--pad-border` at 30% brightness, with a shadow under the shell's lip that's darkest along the top. The WebGL pass in `screen.ts` draws the opening, its walls when the tilt shows them, and the Lab's glass, so CSS layers never cover it. Each system's `handheld` entry in `systems.ts` sets the opening: a 4dp margin around the game, reserved first so `fit.ts` scales the game into the space left by its usual rules, and a depth per window. DS gets one window per screen, with an 8dp strip of shell between them when stacked, and a touchscreen at half depth. A system without an entry, and landscape, keep the game area black. Buttons and the D-pad use the `--pad` tokens, `#1f1c33` with an `#3a3652` outline in dark. A and B, X and Y on DS, and Z on N64 use the `--pad-face` tokens, `#2a2152` with a `#5b45c4` outline. A pressed button takes the next step lighter, or darker in light theme. Labels use Pixelify Sans. A mode toggle that's on, such as Fast-forward, fills with the primary. In landscape the controls lie over the game at 70% opacity.

### Name

The app is pkhemu: one word, lowercase, also at the start of a sentence. Players see it in the app, the store listings, the site and the sign-in screens. The bundle id is `fyi.openpkx.pkhemu`, and it stays fixed from the first Play upload, since Play never lets a package name change. The repos, the core forks' `pkh-emu` branches and the Rust crate keep the hyphen, since players never see them.

### Screenshots

`app/screenshots/` renders screens with the test fakes and captures them at 390px and 1280px in both themes, with a touch pointer and a mouse. The playing screens are shot with touch only, at 390×844 and 844×390. Its README says how to run it. A change to the look adds the screens it touches and attaches before and after shots to its PR.

### Icon

The icon is a white D-pad and two buttons on a `#6d4aff` rounded square. It reads at 16px and works as Android's round and monochrome icons. The masters live in `branding/`, and `npm run branding` in `app/` makes every app icon and store graphic from them (`branding/README.md`). The splash in `app/index.html` builds the glyph and wordmark from the same masters.

### Splash

Every cold start opens on `#6d4aff` in both themes, with the white glyph at 120px and the wordmark 24px below it. The D-pad's bars slide in from the top and left, the buttons fall toward the screen and wobble flat, and the wordmark types in one letter at a time, about 1.4s in all (`app/src/splash.ts`). It's the one animation outside the motion system and the colour tokens, since it runs before `index.css` loads and keeps the prototype's timings. With reduced motion the finished logo fades in. The splash fades out once the animation has ended and the app knows whether to show the welcome screen or the library. A tap skips the animation. Android's system splash is the same violet with no icon, and the bars stay violet with light icons until the web splash hides.

## Onboarding

With no games folder saved, the splash hands over to the welcome screen. It centres the icon at 56px beside the wordmark, the heading "Let's get your games in" and a muted "This app doesn't include any games." It says nothing about where to get games. Below sit three full-width choice rows, outline buttons with a primary-tinted round icon, a title, a muted line and a chevron. "I'm new to emulators" goes forward to "A folder for your games", which shows `Documents/pkhemu` in a bordered box in monospace and ends with Back and a primary "Make folder". "I have ROMs on this phone" starts the folder import (see Importing games). "I've used pkhemu before" goes forward to "Pick your pkhemu folder", laid out like "A folder for your games", with Back and a primary "Choose folder". Its picker opens at `Documents/pkhemu` when that exists, or at Documents, and never makes the folder. A folder with any system folder becomes the games folder and the library opens. Any other folder keeps the player on the screen with an alert naming it, and the buttons stack into a primary "Choose another folder" over an outline "Use it anyway". Android says which taps its picker needs next. The Mac makes the folder without a dialog, so it skips that note, and copy says "Mac" where Android's says "phone". Once "Make folder" saves the folder, the player lands on the library with a toast. A cancelled picker leaves them where they were. The pad setup prompt waits until there's a games folder.

## Components

Build the UI from shadcn/ui. The components live in `app/src/components/ui`; add a missing one from `app/` with `npx shadcn@latest add <name>`. Write a custom component only when shadcn has nothing that fits, and build it from shadcn parts where it can. Don't use a plain `<button>`, `<select>` or `<input>` where shadcn has a component.

## Picking from a list

Use a Combobox. Typing filters the list, and a row can show a sprite next to its name. A row loads its sprite only when it scrolls into view. Don't use a native select, even for short lists.

## Adding a Pokémon

The plus button in the Boxes header opens a species page: a search box stuck to the top over every species in the game, each row with its sprite, name and number. Picking one opens its encounters in this game, one row each, like "Route 101 · Lv. 2–4", with the form below when it isn't the default and tags for an egg or a fixed ball. With none, the page says "No Mudkip encounters in Emerald". Tapping a row asks first in a dialog with a short card for the encounter: sprite, species and level, location, form, PKHeX's name for the encounter and the egg and ball tags. Confirming adds the Pokémon to the first empty box slot and replaces both pages with its editor, where the legality chip shows the check. A failed check never blocks the add.

"From a file" is next to the search and opens the system file picker for one Pokémon file. The app adds the Pokémon to the first empty box slot and opens it in the editor, like an encounter. A file the real games couldn't move into this game asks first, in the same dialog, with the "Not possible in the real games" alert. Other files add right away. If the engine can't add it, the reason shows under the search until the next pick or search. A Wonder Card (.pgt, .pcd or .wc4) gets "Wonder Cards aren't supported yet" and never reaches the engine. On a save with no encounter data, the plus button opens the file picker straight away and the reason shows under the Boxes heading.

When no box has an empty slot, the plus button is disabled and "Your boxes are full" shows under the Boxes heading. If the engine finds them full during an add, the add pages close to this state with no error.

## Teams

A Stadium save has registered teams but no party, trainer or bag, so its editor shows a Teams tile in their place. Other saves get no tile. The Teams page groups teams under their cup's name as a section heading. Pocket Monsters Stadium doesn't sort teams by cup, so it has no headings. Each team is a card titled by its place in the cup, as in "Team 2", with the name of the trainer who registered it below. The card shows its members as party slots. Tapping a member opens it in the Pokémon editor. A member's corner button asks in an alert dialog, then removes it. The members after it move up a slot. "Add from box" in the card's header opens the boxes, and picking a Pokémon copies it into the first empty slot and returns to Teams. A full team's "Add from box" is disabled.

## List controls

A list's search, filters and add button sit above the list and stick to the top of the page while it scrolls, as on the Events and Bag pages. The bottom bar is only for committing changes.

## Committing changes

A page that changes data commits from a bar stuck to the bottom of the page. The bar appears once something changed, says what changed on the left, and puts its buttons on the right. Pages put no actions in the header. When a wide screen shows a page beside the one on top, as the editor does, only the top page's bar keeps a primary button.

## Actions on one item

Since pages put no actions in the header, actions on one item, such as exporting a Pokémon's file, go in a ⋯ menu in the item's top-right corner, as on the Pokémon hero, the game page's hero and Save card, and a backup's summary card. An action that saves a file shows a toast like "Saved BULBASAUR.pk3" and nothing when the player cancels. On Android it opens the share sheet instead and shows no toast, since the app can't tell whether the player finished sharing.

A menu's first line can be a short muted note about the item, as in the game page's "Game art isn't available for this ROM" or "Patched from FireRed EN 1.0 with radical_red.ups". The actions go below it.

Actions that take the item away go last, below a separator: the game page's "Remove from this device", shown only while Sync games is on, and a destructive "Delete…". Delete asks first in an alert dialog that says where the game is removed from: all devices while signed in to sync, this device otherwise. Both return to the library with a toast like "Deleted Ruby".

## Dialogs that make something

An action that makes something new from a few inputs, such as Patch ROM, opens a centered dialog. Show what the player needs to check first, such as the base ROM's build. Picking a file is an outline button that opens the system file picker, with the file's name below it. On desktop the dialog also takes a file dropped anywhere on the window, and gets a primary ring while one hovers. A problem shows inline in destructive text under the field it's about, and the field gets `aria-invalid`. The main button stays disabled until every input is valid. While the work runs, the main button shows a `Spinner` from `components/ui` and the other controls are disabled. Escape, a tap outside and the back gesture don't close the dialog then. On success the dialog closes and a toast confirms it, as in "Created Radical Red".

## Unsaved play

Before an action that starts from the save, warn when play isn't in it yet. The dialog is titled "Save in game first?", says what would be lost, and offers the way to save in game as the main button with a way to go on anyway next to it.

## Box art and screenshots

Show box art or a screenshot over a blurred, darkened copy of itself that fills the space, so art of any shape fits. Draw screenshots with pixelated scaling and box art smooth. A library tile prefers box art, then the game's last screen. On library tiles and the Continue card, box art fades in from transparent at the top-left corner to opaque 20% along the diagonal, over the system's dot grid, with the system chip in that corner and the name hidden. The game page hero and the pause menu show box art unfaded. The last screen fills the tile, with the system chip top left and the name in white over a dark gradient from the bottom. A DS last screen shows its top screen only. A tile with neither shows the chip top left and the name bottom left over the system's dot grid, fading out from the top-left corner. Without art, the game page uses the system's hero ground and dot grid.

## Choosing box art

"Change box art" in the game page's ⋯ menu, a long press on a library tile or the Continue card, and a right-click or long click with a mouse all open one sheet titled "Box art". A long press doesn't also open the game. Cloud-only games don't open it. A phone shows it as a bottom sheet, and a wide screen centres it. Rows at the top offer Choose image, From URL, and No box art, or Use default once the game has a choice. From URL shows a field with a Use button. Below the rows, a search prefilled with the game's name and Box art and Title screens tabs stick to the top over a grid of the system's libretro thumbnails, ranked by the matcher. Each result shows its name with the region tags on a second line. A pick closes the sheet with a "Box art changed" toast. A failure shows inline and keeps the sheet open. Offline, the grid says "Connect to the internet to browse box art" and the rows still work.

## Importing games

The + button in the library header, before Refresh, opens a menu with "Import files" and "Import folder". An empty library says "This app doesn't include any games." over a primary "Import files" button, with "Import folder" and, on desktop, "Open folder" as outline buttons beside it. The app never says where to get games. Imports copy the files and leave the originals alone. While an import runs, the + button and the empty library's button show a `Spinner`.

Questions during an import open one at a time. A save that matches no game by name opens a dialog titled "Which game is this save for?" with a Combobox of the library's games. "Skip this save" is the secondary button, and the primary "Use for Emerald" stays disabled until the player picks a game. Replacing a save asks first in an alert dialog, "Replace Emerald's save?", with both saves' dates, a muted "pkhemu's save goes to Backups first." line, and "Keep pkhemu's" next to the primary "Replace". The replaced save shows in Backups as "Before import". The import ends with a toast like "Added 2 games and 1 save", or "Already in pkhemu" when nothing was new.

"Import folder" opens the folder picker, then shows full-screen steps laid out like the onboarding screens, with Back and the main button side by side at the bottom. From the welcome screen it starts with "Where are your games?" and a "Choose folder" button. A spinner shows while the app looks through every folder inside the pick. The summary shows three stats in cards: games, games with a save, and size to copy. When some games have no save, an alert below offers an outline "Add a folder with saves" button. A list follows with each game's system chip and "Save" or "No save". From the welcome screen its main button is "Continue", which leads to the games folder screen, and from the library it's "Copy 6 games". When games already in pkhemu have a save and the folder brings one too, one screen lists them with a checkbox each, unticked, and both saves' dates. Copying shows a Progress bar over "3 of 6 · FireRed" and a secondary Cancel, which stops after the current file. Back does nothing while it copies. It ends on the library with a toast like "Copied 6 games and 4 saves" or "Copied 3 of 6 games", or "Already in pkhemu" when nothing was new.

## Continue card

The library starts with a Continue card for the game played last. Recently played leaves that game out, and hides when it has no other games. The card shows the last screen, or box art, or the system's dot grid, with the system chip, the name and "Played 2 hours ago". Its button is the screen's primary button. It says Resume and starts from the resume point, or Play and starts from the save when there's no resume point. A tap anywhere else on the card opens the game page, with the same container transform as a tile, grown from the thumbnail. A cloud-only game shows its cloud pill on the thumbnail, and its button opens the game page, which runs the download. On a phone the button sits under the thumbnail and text. On a wide screen it sits on the right. With nothing played there's no card.

## Cloud-only games

A cloud-only game's library tile has a cloud icon in a small dark round pill in its top-right corner, labelled "In the cloud". Box art comes from the game's name as usual. Decoded game art and the last screen wait for the ROM.

On mobile data, opening one first asks in an alert dialog like "Download Emerald (16 MB) on mobile data?", whatever the switches say. Cancel returns to the library. On Wi-Fi it downloads without asking.

Opening one shows the game page's hero. Below it, in place of the play buttons, a muted line like "Downloading · 12 of 512 MB" sits over a Progress bar. Once the ROM is down, the line says "Checking your other devices…" while the game syncs. Then the full game page replaces it. A failed download shows the reason in destructive text above a Try again button, and the game stays cloud-only. Its ⋯ menu has only Delete.

## Sync on the tile

A library tile shows what sync is doing with its game in a small dark round pill in its top-right corner, like the cloud icon. A game in sync shows nothing.

- While the game's files move, a ring fills clockwise with bytes done over total. When they finish, a tick draws in, stays about 1.5s, then fades.
- An arrow shows while the game waits its turn in a run, or while its saves can't go up.
- A sync conflict or an error gets an amber attention icon.

A cloud-only game keeps its cloud pill and shows the ring left of it only while its ROM downloads.

On a computer, hovering the badge shows a Tooltip with the stage, such as "Uploading ROM · 46%" or "Waiting for Wi-Fi". The badge's accessible label is the same text. On a phone, tapping the badge opens the game like the rest of the tile.

The game page's hero shows the same text in a muted line under the play history, or "Last synced 5 minutes ago" when the game is idle, and "Not synced yet" before its first sync. Signed out of sync, the line is hidden.

The ring fills in `medium2` with standard easing, and the tick draws in `medium2` with emphasized decelerate. The badge fades in and out in `short4`. With reduced motion, the ring jumps to its new fill and the tick appears without drawing.

## Sync in the header

The library header shows sync's whole run as a ghost icon button left of Refresh, hidden while sync is idle. While sync checks the games, a quarter ring spins. While files move, the ring fills clockwise with the run's bytes done over total. A problem with the account, such as an expired sign-in or a full Drive, shows an amber attention icon until the next run. Being offline isn't a warning, since the tiles show their arrows. The button's accessible label and tooltip give the same text as Settings, such as "Syncing · 46%" or "Sign in to Google Drive again". Tapping it opens Settings. It fades in and out like the tile badge.

## Game art

Pokémon art uses the menu icon at `size-12` and below and the front sprite above, falling back to whichever the ROM has. The editor's artwork slot scales the front sprite by a whole number with pixelated rendering. The artwork slot plays the animated sprite when the ROM has one, and shows the still sprite when the OS asks for reduced motion. Everywhere else shows the still sprite, and menu icons never animate.

When game art has no image for a Pokémon, show a neutral tile with its national dex number and name, or just its name for a ROM hack species with no dex number, tinted by its first type with `typeColor` from `app/src/game-art/typeColors.ts`. An item with no icon gets a neutral tile with its name. Gen 1 and 2 games and Ruby and Sapphire never had item icons, so they hide the icon column instead.

## Two screens

DS games show both screens at the same size, scaled like a single screen. They stack when the space is less than 4:3 wide and sit side by side otherwise, top screen first. The Swap screens button in the game's header exchanges them. Only the bottom screen takes touch or clicks, wherever it sits.

With touch controls showing, the DS screens stay clear of them, since the bottom one takes touches. In portrait the controls sit below. In landscape the screens shrink to fit between the controls at the edges, with 0.5rem to spare beside each 9rem side. At 844×390 they sit side by side. DS face buttons form a diamond with X on top and Y on the left.

## N64 controls

N64 games get their own touch layout. L and R sit in the top corners. The left side stacks the stick, a smaller 96px D-pad and the pause menu. The right side stacks B, A and Z, with Z a smaller face button above A, then the C buttons as a diamond of 44px circles with arrows, then Hold and Fast-forward. N64 has no Select, and Start sits alone in the middle of the bottom edge. In landscape the shoulders shrink to 36px tall, and Z and the C buttons to 40px, so each side fits under the header.

## Stick zone

A stick is a 128px circle, 104px in landscape, with a face-token knob at its centre. The stick measures from where the thumb lands inside the zone, not from the centre. While touched, a ring at the landing point shows the reach, a third of the zone's width, and the knob follows the tilt inside it. A slide shorter than a tenth of the reach doesn't tilt. Past the reach the tilt stays full, clamped to a circle. A thumb that slides out of the zone still moves the stick. "Stick sensitivity" in the Playing settings scales the tilt: Low, Medium and High are 0.75×, 1× and 1.5×.

## Small-button row

Select and Start each sit in a row of small buttons at the bottom of their side of the touch controls. The left row adds the pause menu and the right row adds Hold and Fast-forward, as round icon buttons. Select and Start are 56×44 pills and the round buttons are 44px, 8px apart. Mode toggles go in these rows as icon buttons with `aria-pressed`, which fill with the primary while on.

The right row is 160px, wider than the side's 9rem. In portrait it reaches 8px past the side into the edge padding. In landscape the small buttons shrink to 36px tall, so the row fits the 9rem and stays clear of DS screens side by side. Don't shrink them below 36px.

## Two sides

Transfer shows this game's party and boxes next to a "Send to" list of the other games. A Stadium save has no party, so its side shows only boxes. Picking a game adds a status line under the list's heading, such as "12 empty slots in HeartGold". A phone stacks the Pokémon above the list. A wide screen puts the Pokémon on the left and the list on the right. Only this game's slots are selectable, and they reuse the editor's party slots and box switcher. Tapping a slot toggles a check mark. Slots are selectable before a game is picked. Picking a game checks the selection against it, greys out the Pokémon it refuses, and shows the first reason in the bottom bar. Picking another game checks the player's picks again. A slot that can't be picked is greyed out, and tapping it shows why in the bottom bar.

Each game in the list shows its version name with the ROM's file name under it, so two copies of FireRed can be told apart. The file name is left out when it matches the version name.

A game the player can only reach by an unofficial transfer stays pickable, with "Not possible in the real games" under its name and a note under the status line.

A dot left of each game's name shows its route: green when the real games reach it, amber for an unofficial transfer, red when it can't receive, and grey while it's being checked.

## Pokémon info

While a game runs, the app can show the opponent in battle and the live party, read from the game's memory. It's off by default and turns on per game from the "Pokémon info" switch in the pause menu. A "Randomized" switch sits below it, also per game. The switches are missing for games whose memory the app can't read. Neither the panel nor the pill pauses the game. Memory is read a few times a second while the game runs and stops while it's paused. Outside battle on a phone, the app reads only enough to notice a battle starting.

A card shows one Pokémon: its sprite, "Poochyena · Lv. 3" with a Shiny badge, the held item or "No item", the nature and ability, as in "Adamant · Intimidate", the six IVs in a row under their short names, and the moves in two columns. When the engine can't read the Pokémon, as in a ROM hack that moves memory around, the card says "Can't read this game". With Randomized on, the card must leave out anything the engine looks up in its species tables, such as the ability and types.

A wide screen, in landscape or at least 48rem across, puts a panel to the right of the game. In battle, the opponent's card sits on top, both cards in a double battle, with "3 left" under them in a trainer battle, and the party shrinks to a row of sprites below. Outside battle the panel lists the party, and each row expands to its card.

A phone in portrait shows a pill at the top of the game, only in battle, like the toasts: "Poochyena · Shiny · Adamant · 31/31/28/…", one line per opponent. Tapping it pauses the game and opens the cards in a bottom sheet, and closing the sheet resumes.

## Bottom sheets

A phone shows menus and pop-up details, such as the pause menu and the opponent cards, in a sheet that rises from the bottom. B, Escape, the back gesture or a tap outside closes it. Build one with `BottomSheet`.

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

Toasts sit at the top of the screen as dark pills, as in "Sent 3 to Platinum" after a transfer. A toast for an action the player can undo ends with an Undo button after a middle dot, as in "Save edited · Undo" and "Loaded slot 3 · Undo". Toasts over the running game sit in the game screen's own stack at the top of the game, built with `Toast inline`.

## Settings rows

Settings sit in titled cards. Each row puts its label on the left and its control on the right. An on/off setting uses a Switch. A choice between a few values, such as fast-forward speed or theme, uses a single-select outline ToggleGroup with one item per value. A number uses `NumberInput`, a short InputGroup with its unit as an inline-end addon; a setting made of several numbers puts one per unit side by side. A line of muted text under the row says what the setting does now, with an outline Reset button on its right while the setting is off its default. A small muted line under that holds any caveat. A card that saves settings shows the save error below its last row.

Settings shows background work, such as extracting game art, as a muted line like "Extracting · 3 of 12 games" over a Progress bar. When the work is idle, both are hidden. An outline button below starts the work again.

The Lab card sits before About. It opens with a line saying experiments can change or go away in any update, then one row per experiment like any other setting. It lists every experiment in builds that aren't store builds and the player experiments for a Plus owner in a store build. With nothing to list, it's hidden.

About is the last card. A muted line says "The emulator, the editor and every Pokémon feature are free." A store build that offers sync adds "Plus adds sync." Nothing in the app mentions builds without Plus, since store payment rules forbid pointing elsewhere. Below it, "Built on PKHeX, melonDS and mGBA" links each name to that project's sponsor or donation page, opening in the system browser. An outline "View licences" button opens Licences.

## Accounts in settings

Builds that can't use an account, such as Sync, hide its card. Signed out, the card shows a muted line saying what signing in does, over an outline button for each service the build can use, like "Connect Google Drive" and "Connect Dropbox", wrapping in a row. Signed in, the first row has the account's email on the left and an outline Sign out button on the right. A muted line below says when the work last ran, as in "Last synced 5 minutes ago". While sync runs, that line gives the run's phase over a Progress bar, as in "Checking · 4 of 12 games" or "Syncing · 46%", and a list below it puts each game with something to do on the left and its stage on the right, such as "Uploading saves · 25%", with ROMs waiting for Wi-Fi among them. An error shows below that in destructive text, in plain words like "Your Google Drive is full". An outline Sync now button starts the work again. Sync's card ends with a "Sync games" switch, off by default. A line under it says what syncs. Games already in the cloud show in the library with the switch on or off. On Android two more switches follow. "Sync on mobile data" is on by default, and turning it off holds back everything, saves included. "Include ROMs" is off by default, shows only while Sync games is on, and is disabled while Sync on mobile data is off. Metered Wi-Fi counts as mobile data.

In a store build, signing in to sync needs Plus. Without it, the signed-out card keeps its muted line and puts a primary "Get Plus · $3.99" button, priced by the store, in place of the Connect buttons, with an outline "Restore purchases" button under it. A pending purchase adds "Waiting for the payment to finish". A cancelled purchase changes nothing, and a store error shows in destructive text. When the store can't sell Plus, as on a device without Google Play, the card says "Plus can't be bought on this device" over Restore purchases. Once Plus is bought or restored, the card shows the Connect buttons, or the account if one was connected before. Nothing else in the app asks for Plus: no popups, banners or reminders.

While the player is signed in to sync, the app fetches a game's changes before it starts. The starting screen shows "Checking your other devices…" for up to 5s, and when the check fails or runs out of time, the game starts anyway with a toast saying it couldn't check.

## Sync conflicts

When the check finds a sync conflict, a sheet titled "This game changed on another device" opens before the game starts. A phone shows it as a bottom sheet, and a wide screen centres it. A conflicted save gets two cards side by side, "This device" and "Cloud". Each card shows the device it was saved on and when, then play time, badges and Pokédex from `ProgressStats` when the engine reads that version. A version written with cheat codes on gets an outline "Cheats on" badge. Each conflicted slot gets a row headed "Slot 2" with the same two cards, each with the slot's screenshot above it. Tapping a card keeps that version, and the game starts once every row has a pick. Closing the sheet returns to the game page and keeps the conflict for next time.

## Capturing input

To learn which button does what, as in setting up a controller, a wizard covers the screen and asks for one input per step. Each step lights its target on a pad diagram, names it by position, such as "Right face button (A)", and shows "Step 5 of 17". A list below shows every step with what it's bound to, the current step highlighted. A press binds when it's let go. Holding any button for 2s or tapping Skip leaves the step unbound. A press already bound earlier in the run binds nothing and flashes the row it's bound to. The wizard reads only the device it's setting up, and menus behind it ignore that device while it runs. Cancel and Skip sit in a bar at the bottom, the one bottom bar that doesn't commit changes. Cancel, Escape, the back gesture or 30s without input close it and change nothing. Nothing saves before the last step, which closes the wizard with a "Saved" toast.

The keyboard uses the same wizard without the L2, R2, Menu and left stick steps, and shows keys by their `KeyboardEvent.code`. It leaves Tab and keys pressed with a modifier to the app, and Escape cancels it.

A pad with a non-standard layout and no setup drives nothing, so its first press opens an alert dialog titled "Set up this controller?". The dialog names the pad and puts Set up as the main button next to Not now. In a game, the game pauses and the dialog opens over the pause menu. Finishing or cancelling the wizard returns to the pause menu. Not now, or cancelling the wizard, hides the dialog for that pad model until the app restarts.

The Controllers settings card lists the keyboard, then connected pads, each with its name and status above Configure and Reset to default, since pad names are too long to share a row with buttons.

## Going back

Every screen with a Back button also goes back with the back gesture on Android, and with Escape, Cmd+Left, Cmd+[ or Alt+Left on a computer. Cmd+Left and Alt+Left leave text fields alone, where they move the cursor. In a game, going back opens the pause menu. On the library, it does nothing.

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

Surfaces enter from the edge they're attached to and leave the same way. Bottom sheets slide up, side panels slide in from their side, and centered dialogs fade in and scale up from 95%, all entering in `medium2` with emphasized decelerate and leaving in `short3` with emphasized accelerate. Toasts drop from the top. Menus, comboboxes and tooltips grow from the element that opened them. Menus, toasts and the bottom bar enter in `short4` and leave in `short2`. Every modal surface has a dimmed scrim with an 8px backdrop blur.

Build the bottom bar with `BottomBar`. To let a surface play its exit, keep it mounted and close it through its prop: `open` on `BottomBar`, `BottomSheet` and `MenuDialog`, and an empty message on `Toast`.

Menus and the library grid stagger the first time they appear. Put `stagger` on the list container. Each item fades in and rises 8px. The delay grows for the first 8 items and then stops. Re-renders never replay it, so drop the class once the list has appeared if it can remount or gain items. `useStaggerOnce(key, ready)` does this: it returns the class until the first stagger ends and never again for that key. Long, virtualised and filtered lists don't stagger.

Tappable tiles and cards scale to 97% while pressed. Give them the `motion-press` class. Press and state changes take `short1` with standard easing.

A Skeleton crossfades into its content. Wrap both in `WithSkeleton` from `components/`, passing the Skeleton as `skeleton` and the content as children. An "Updating…" refresh crossfades only the values that changed: wrap each value's element in `<Crossfade value>`, which fades the element in when `value` changes but not when it first appears or goes from undefined to a value. Crossfades take `short4` with standard easing.

D-pad focus moves instantly. Nothing animates while a game is running and unpaused, apart from toasts, touch-control press feedback and the portrait screen recess following device tilt, so a screen that closes back into the running game uses a plain state update, not `navigate`.

With `prefers-reduced-motion`, transitions turn into a short crossfade and stagger turns off. The app has no setting of its own for this.
