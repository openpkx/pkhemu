import { iosAudioSessionHost } from "@/audio-session/iosHost";
import { iosBackHost } from "@/back/iosHost";
import { iosExportHost, iosPokemonFileHost } from "@/editor/iosHost";
import { iosGameSurfaceHost } from "@/game-surface/iosHost";
import { iosGamesFolderHost } from "@/games-folder/iosHost";
import { desktopGravityHost } from "@/gravity/desktopHost";
import { iosHapticsHost } from "@/haptics/iosHost";
import { desktopLibraryHost } from "@/library/desktopHost";
import { desktopPatchRomHost } from "@/patch-rom/desktopHost";
import { iosSystemBarsHost } from "@/system-bars/iosHost";
import { sharedHosts, sharedPreferences, type Hosts } from "./hosts";

export const iosHosts: Hosts = {
  ...sharedHosts,
  systems: ["gb", "gbc", "gba", "nds"],
  defaultPreferences: { ...sharedPreferences, touchControls: true },
  gamesFolder: iosGamesFolderHost,
  back: iosBackHost,
  export: iosExportHost,
  pokemonFile: iosPokemonFileHost,
  patchRom: desktopPatchRomHost,
  library: desktopLibraryHost,
  gravity: desktopGravityHost,
  haptics: iosHapticsHost,
  systemBars: iosSystemBarsHost,
  gameSurface: iosGameSurfaceHost,
  audioSession: iosAudioSessionHost,
};
