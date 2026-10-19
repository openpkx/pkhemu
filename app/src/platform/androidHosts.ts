import { noAudioSessionHost } from "@/audio-session/audioSession";
import { androidBackHost } from "@/back/androidHost";
import { androidExportHost, androidPokemonFileHost } from "@/editor/androidHost";
import { androidGameSurfaceHost } from "@/game-surface/androidHost";
import { androidGamesFolderHost } from "@/games-folder/androidHost";
import { androidGravityHost } from "@/gravity/androidHost";
import { androidHapticsHost } from "@/haptics/androidHost";
import { androidImportHost } from "@/import/androidHost";
import { androidLibraryHost } from "@/library/androidHost";
import { tauriPatchRomHost } from "@/patch-rom/tauriHost";
import { androidPlusHost } from "@/plus/androidHost";
import { androidShadersHost } from "@/shaders/androidHost";
import { androidSystemBarsHost } from "@/system-bars/androidHost";
import { systems } from "@/systems";
import { sharedHosts, sharedPreferences, type Hosts } from "./hosts";

export const androidHosts: Hosts = {
  ...sharedHosts,
  systems,
  defaultPreferences: { ...sharedPreferences, touchControls: true, asyncShaders: true },
  gamesFolder: androidGamesFolderHost,
  import: androidImportHost,
  back: androidBackHost,
  export: androidExportHost,
  pokemonFile: androidPokemonFileHost,
  patchRom: tauriPatchRomHost,
  library: androidLibraryHost,
  gravity: androidGravityHost,
  haptics: androidHapticsHost,
  systemBars: androidSystemBarsHost,
  audioSession: noAudioSessionHost,
  gameSurface: androidGameSurfaceHost,
  shaders: androidShadersHost,
  plus: androidPlusHost,
};
