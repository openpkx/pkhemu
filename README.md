# pkhemu

A Pokémon-focused emulator for GB, GBC, GBA, DS, N64 and 3DS games. Pause the game, edit your save with [PKHeX Everywhere](https://github.com/arleypadua/PKHeX.Everywhere), and keep playing.

Work in progress. Bring your own game files: this repo ships no ROMs or BIOS files.

## Free and Plus

These are free forever: the emulator, save states, cheats, backups, the save editor, transfers, Pokémon files, Showdown export, the overlay and trackers, and every Pokémon feature to come. Nothing free will ever become paid.

Plus is a one-time purchase in Google Play and the App Store that unlocks two things: sync to your own Google Drive or Dropbox, and the Lab, where you can try emulator features before they ship. Later Plus features come at no extra cost. Builds from this source have Plus unlocked. Buying it in a store pays for the work.

pkhemu is built on [PKHeX](https://github.com/kwsch/PKHeX), [mGBA](https://mgba.io), [melonDS](https://melonds.kuribo64.net), [Mupen64Plus-Next](https://github.com/libretro/mupen64plus-libretro-nx) and [Azahar](https://azahar-emu.org). Consider supporting them too.

## Source

[openpkx/pkhemu](https://github.com/openpkx/pkhemu) has the source of each store release, one commit per release, tagged with its version. It doesn't take issues or pull requests. Send feedback through the app's store listing.

## Run it

You need Node, Rust and CMake. The scripts fetch the source of the emulator cores, mGBA, melonDS DS, Mupen64Plus-Next and Azahar, and install npm packages on first run. Extra arguments go through to the Tauri CLI.

Clone without `--recursive`. Mupen64Plus-Next has a nested gitlink with no URL, which stops a recursive clone. The scripts fetch the cores themselves.

| Command | What it does |
| --- | --- |
| `scripts/macos-dev.sh` | Runs the app on macOS with hot reload. |
| `scripts/macos-build.sh` | Builds `pkhemu.app`. |
| `scripts/android-dev.sh` | Runs the app on a connected Android device or emulator with hot reload. |
| `scripts/android-build.sh` | Builds an APK. `--debug` gives a signed debug APK, `--target aarch64` builds for one ABI only, `--aab` adds an App Bundle. |
| `scripts/ios-dev.sh` | Runs the app in the iOS simulator with hot reload. Needs Xcode and XcodeGen. Name a simulator, like `"iPhone 17 Pro"`, to skip the prompt. |
| `scripts/ios-build.sh` | Builds the App Store version and uploads it to TestFlight with the keys in `~/.config/pkh-emu/ios.env`. Refuses to run while Plus or Sync keys are set, in the environment or in `app/src-tauri/sync.env`. `--unlocked` uploads a build that shows every Lab experiment, for internal testing only. |

The first build compiles every core, which takes several minutes. After that, builds in any checkout on the same Mac copy each core from `~/.cache/pkh-emu/cores` while its source and build settings stay the same. A core with uncommitted changes is always built. Set `PKH_EMU_CORE_CACHE` to another folder to move the cache, or to `off` to build every core.

Tests: `npm --prefix app test`.

### CI builds

The Build workflow runs only when started by hand: `gh workflow run build.yml -f platform=android` (or `macos`, `both`). It uploads an arm64 APK and a zipped `pkhemu.app`, kept for 7 days. The APK is signed when the `ANDROID_KEYSTORE_BASE64` and `ANDROID_KEYSTORE_PASSWORD` secrets are set, and unsigned otherwise. The app is unsigned, so macOS quarantines it after download. Clear that with `xattr -dr com.apple.quarantine pkhemu.app`.

### Android setup

The Android scripts need JDK 17, the Android SDK and NDK, and the Rust Android targets. They default to Homebrew's `openjdk@17` and `android-commandlinetools`, and put `adb` on the `PATH` for their run. The app needs Android 8.0 (API 26) or later, the first with AAudio.

```sh
brew install openjdk@17 android-commandlinetools
sdkmanager "platform-tools" "platforms;android-37.0" "build-tools;36.0.0" "ndk;30.0.16248370"
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

To use `adb` from your own shell:

```sh
export PATH="$(brew --prefix)/share/android-commandlinetools/platform-tools:$PATH"
```

### Android over Wi-Fi

You can run the app on your phone without a cable. The phone needs Android 11 or later and must be on the same Wi-Fi network as your Mac.

1. On the phone, turn on Developer options (tap Build number seven times in About phone), then turn on **Developer options → Wireless debugging**.
2. Tap **Pair device with pairing code**. Pair using the IP, port and code it shows:

   ```sh
   adb pair 192.168.1.42:37199
   ```

3. The phone usually connects on its own after pairing. Check with `adb devices`. If it isn't listed, connect using the IP and port on the main Wireless debugging screen. This port differs from the pairing one:

   ```sh
   adb connect 192.168.1.42:41235
   ```

4. Run the app:

   ```sh
   scripts/android-dev.sh
   ```

   The script tunnels the dev server through adb with `adb reverse`, so hot reload works over Wi-Fi and the app only talks to `localhost`. Android 17 blocks apps that target SDK 37 from reaching the Mac's LAN address directly. With more than one device connected, the Tauri CLI asks which one to use.

You only pair once. After the phone reconnects to Wi-Fi or reboots, turn Wireless debugging back on and run `adb connect` again. The port changes each time.

To install a build instead of running dev mode:

```sh
scripts/android-build.sh --debug --target aarch64
adb install -r app/src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```

Release APKs come out unsigned and need signing before `adb install` accepts them.

### Debugging on Android

To inspect the WebView, open `chrome://inspect/#devices` in Chrome on your Mac and click **inspect** under pkhemu. This works over Wi-Fi.

For Rust logs and crashes:

```sh
adb logcat --pid=$(adb shell pidof fyi.openpkx.pkhemu)
```

## License

GPL-3.0-or-later, matching PKHeX Everywhere.
