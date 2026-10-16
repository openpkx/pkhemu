import { iosAudioSessionHost } from "@/audio-session/iosHost";
import { iosBackHost } from "@/back/iosHost";
import { iosExportHost, iosPokemonFileHost } from "@/editor/iosHost";
import { iosGameSurfaceHost } from "@/game-surface/iosHost";
import { iosGamesFolderHost } from "@/games-folder/iosHost";
import { desktopGravityHost } from "@/gravity/desktopHost";
import { iosHapticsHost } from "@/haptics/iosHost";
import { iosImportHost } from "@/import/iosHost";
import { desktopLibraryHost } from "@/library/desktopHost";
import { desktopPatchRomHost } from "@/patch-rom/desktopHost";
import { iosShadersHost } from "@/shaders/iosHost";
import { iosSystemBarsHost } from "@/system-bars/iosHost";
import { systems } from "@/systems";
import { sharedHosts, sharedPreferences, type Hosts } from "./hosts";

export const iosHosts: Hosts = {
  ...sharedHosts,
  systems,
  defaultPreferences: { ...sharedPreferences, touchControls: true, asyncShaders: true },
  gamesFolder: iosGamesFolderHost,
  import: iosImportHost,
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
  shaders: iosShadersHost,
};
