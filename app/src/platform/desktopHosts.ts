import { noAudioSessionHost } from "@/audio-session/audioSession";
import { desktopBackHost } from "@/back/desktopHost";
import { desktopExportHost, desktopPokemonFileHost } from "@/editor/desktopHost";
import { noGameSurfaceHost } from "@/game-surface/gameSurface";
import { desktopGamesFolderHost } from "@/games-folder/desktopHost";
import { desktopGravityHost } from "@/gravity/desktopHost";
import { desktopHapticsHost } from "@/haptics/desktopHost";
import { desktopLibraryHost } from "@/library/desktopHost";
import { desktopPatchRomHost } from "@/patch-rom/desktopHost";
import { desktopSystemBarsHost } from "@/system-bars/desktopHost";
import { systems } from "@/systems";
import { sharedHosts, sharedPreferences, type Hosts } from "./hosts";

export const desktopHosts: Hosts = {
  ...sharedHosts,
  systems,
  defaultPreferences: { ...sharedPreferences, touchControls: false },
  gamesFolder: desktopGamesFolderHost,
  back: desktopBackHost,
  export: desktopExportHost,
  pokemonFile: desktopPokemonFileHost,
  patchRom: desktopPatchRomHost,
  library: desktopLibraryHost,
  gravity: desktopGravityHost,
  haptics: desktopHapticsHost,
  systemBars: desktopSystemBarsHost,
  gameSurface: noGameSurfaceHost,
  audioSession: noAudioSessionHost,
};
