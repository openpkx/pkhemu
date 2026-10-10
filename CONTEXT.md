# pkhemu

An emulator for GB, GBC, GBA and DS Pokémon games with save editing built in. These are the words the app, its issues and its code use for what the player plays, saves and moves.

## Playing

**Game**:
A ROM in the player's library, together with everything the app keeps beside it.
_Avoid_: Title, cartridge

**Save file**:
The game's own save, written when the player saves in game. It's the only progress the game itself knows about. An N64 game's save file is several files, one for each kind of save memory the game writes: `.eep`, `.mpk` for the Controller Paks, `.sra` and `.fla`. Backups, sync and export treat them as one save.
_Avoid_: Save data, SRAM, in-game save (as a noun)

**Save format**:
How the engine reads a game's save file, such as Radical Red's or the original game's, remembered per game. The engine recognises some hacks outright. For saves that could be from more than one game, the player picks once on the game page.
_Avoid_: Save type, hack id

**Resume state**:
The automatic snapshot of where the player quit. Resume always continues from it.
_Avoid_: Continue state, autosave

**Save state**:
A snapshot of the running game that the player saves into a slot on purpose. It carries a copy of the save file from the same moment.
_Avoid_: Quicksave, snapshot

**Slot**:
One of a game's ten numbered places for a save state.

**Current slot**:
The slot the player last saved to or loaded from. It names the timeline the resume state came from.
_Avoid_: Default slot, active slot

**Held button**:
A game button the player set to stay pressed from the touch controls. It stays down until the player taps it again, quits the game, or uses a gamepad or keyboard, which hides the touch controls.
_Avoid_: Sticky button, latched button, toggle

**Build**:
One exact ROM release, such as FireRed EN 1.1. The app tells builds apart by the game code and revision in the ROM header. Game Boy headers have no game code, so there it uses the title and the global checksum.
_Avoid_: Version, ROM version

**Game memory**:
The running game's RAM, read while it plays. Where the party and the battle sit in it depends on the build.
_Avoid_: Live RAM, WRAM

**Pokémon info**:
The opponent in battle and the live party, read from game memory while the game runs. The player turns it on per game.
_Avoid_: Tracker, overlay, HUD

**Randomized**:
A game the player marks as coming from a randomizer, per game. The engine's species tables, such as abilities and types, don't match its ROM, so features leave out what they take from them.
_Avoid_: Random, randomizer mode

**Game clock**:
The time games see: real time plus the offset the player sets in Settings.
_Avoid_: RTC, system time

**Box art**:
The cover image for a game. The player chooses it, or the app finds it on libretro-thumbnails by the ROM's name. Not part of game art.
_Avoid_: Cover, artwork, thumbnail

**Game art**:
Images the app decodes from the player's ROM: sprites, menu icons and item icons. A game shows its own ROM's art. A game whose ROM gives none borrows sprites and menu icons from a retail ROM in the library.
_Avoid_: Sprites (as the umbrella term), assets, artwork

**Retail ROM**:
A ROM whose SHA-1 matches a No-Intro dump of a main-series game. Only a retail ROM lends its art, since a hack's sprites may not be the species' own.
_Avoid_: Official ROM, clean ROM

**Sprite**:
One Pokémon image from game art, such as a front sprite or its shiny version.

**Animated sprite**:
A sprite's animation from game art, played only in the editor's artwork slot. Some games' ROMs store none.
_Avoid_: GIF, animation frames

**Menu icon**:
The small Pokémon icon the game shows in the party and in boxes, part of game art.

**Species index**:
The number a game's own tables and saves use for a species. In Gen 3 games and their ROM hacks it differs from the national dex number. Game art keys a hack's species by it when the ROM gives no national dex number and form for them.
_Avoid_: Internal id, raw species

## Controls

**Standard layout**:
The buttons of a standard controller, named by position: south, east, west and north face buttons, L1, R1, L2, R2, Select, Start, Guide, the D-pad and the left stick. Console buttons are fixed to it: south is B, east is A, west is Y, north is X.
_Avoid_: Default mapping, profile

**Calibration**:
What a pad model's own buttons, axes and hat mean in the standard layout, saved once per model. The keyboard has one too. A pad that reports the standard layout itself needs none.
_Avoid_: Mapping, binding, remap

## Editing

**Edit**:
A change the player makes to a save file in the editor. It takes effect when the player applies it.

**Backup**:
A copy of a save file taken before the app changes it, labelled with why it was taken. It can carry a note naming what changed.

**Cheat code**:
A code the player enters that the emulator applies to the game's memory while it runs. It changes the save only when the game saves.
_Avoid_: Cheat, patch (a patch changes the ROM)

## Moving Pokémon

**Transfer**:
Moving Pokémon from one of the player's games to another. The Pokémon leaves the source game.
_Avoid_: Copy, send (as a noun), migrate

**Transfer Pak**:
The N64 accessory that plugs a Game Boy game into the controller, so a game like Stadium reads its Pokémon. Each N64 game that uses one has a setting naming a GB or GBC game from the library. The core plays from a working copy of that game's save, and the app merges it back.
_Avoid_: Transfer (that's moving Pokémon between saves)

**Route**:
The way the games themselves move a Pokémon between two games: link trade, Time Capsule, Pal Park or Poké Transfer. A transfer without one is unofficial.

**Unofficial transfer**:
A transfer on a route no game has, such as Platinum to Ruby. The Pokémon may fail the legality check and loses what the destination can't hold.

**Kept copy**:
A Pokémon as it was before a transfer to an older game, kept in the app's data. A later transfer forward puts back what the older game dropped and anything the player didn't change there.

## Sync

**Sync**:
Keeping a player's games the same on all their devices through their own Google Drive or Dropbox.
_Avoid_: Cloud save, backup (for the cloud copy)

**Cloud-only game**:
A game whose ROM is in the player's cloud storage but not yet on this device. It downloads the first time the player opens it.

**Sync conflict**:
A save or state that changed on this device and in the cloud since the last sync. The player picks one, and the other becomes a backup.

**Deletion log**:
The synced files the app deleted itself, with each one's SHA-1. A sync deletes a file from the cloud only when it's in the log. Sign-in and sign-out clear it.
_Avoid_: Tombstone, trash

**Plus**:
The one-time purchase that unlocks sync and the Lab in a store build. Builds from source have it unlocked.
_Avoid_: Pro, premium, subscription

**Store build**:
A build for Google Play or the App Store, where Plus is sold. Every other build is a build from source, with Plus unlocked.

## Lab

**Lab**:
The card in Settings that lists experiments. A store build shows it while the Plus switch is on and the player owns Plus, with only the experiments for players. A build from source shows it with every experiment.
_Avoid_: Lab build

**Experiment**:
A behaviour change we turn on and off in the Lab to compare before keeping one. Its first value is off and the default. Each experiment says whether players see it. An experiment the Lab doesn't show runs at its first value.
_Avoid_: Feature flag, toggle
