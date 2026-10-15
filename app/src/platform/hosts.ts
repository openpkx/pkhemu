import type { AppUpdateHost } from "@/app-update/appUpdate";
import { tauriAppUpdateHost } from "@/app-update/tauriHost";
import type { AudioSessionHost } from "@/audio-session/audioSession";
import { tauriBoxArtHost } from "@/box-art/tauriHost";
import type { BackHost } from "@/back/back";
import type { BoxArtHost } from "@/box-art/boxArt";
import type { ClipboardHost } from "@/editor/clipboard";
import type { ExportHost } from "@/editor/exportFile";
import type { PokemonFileHost } from "@/editor/pokemonFile";
import { tauriClipboardHost } from "@/editor/tauriHost";
import type { GameArtHost } from "@/game-art/gameArt";
import { tauriGameArtHost } from "@/game-art/tauriHost";
import type { GamePageHost } from "@/game-page/GamePage";
import { tauriGamePageHost } from "@/game-page/tauriHost";
import type { GameSurfaceHost } from "@/game-surface/gameSurface";
import type { GamesFolderHost } from "@/games-folder/gamesFolder";
import type { GravityHost } from "@/gravity/gravity";
import type { HapticsHost } from "@/haptics/haptics";
import type { ImportHost } from "@/import/importFiles";
import type { CalibrationsHost } from "@/input/calibrations";
import { tauriCalibrationsHost } from "@/input/tauriHost";
import type { ExperimentsHost } from "@/lab/lab";
import { tauriExperimentsHost } from "@/lab/tauriHost";
import type { LibraryHost } from "@/library/library";
import type { PatchRomHost } from "@/patch-rom/patchRom";
import type { PlusHost } from "@/plus/plus";
import { tauriPlusHost } from "@/plus/tauriHost";
import type { Preferences, PreferencesHost } from "@/preferences/preferences";
import { tauriPreferencesHost } from "@/preferences/tauriHost";
import type { ShadersHost } from "@/shaders/shaders";
import type { SyncHost } from "@/sync/sync";
import type { SystemBarsHost } from "@/system-bars/systemBars";
import { defaultSkins } from "@/skins";
import { tauriSyncHost } from "@/sync/tauriHost";
import type { System } from "@/systems";

export type Hosts = {
  systems: readonly System[];
  defaultPreferences: Preferences;
  preferences: PreferencesHost;
  gamesFolder: GamesFolderHost;
  plus: PlusHost;
  appUpdate: AppUpdateHost;
  experiments: ExperimentsHost;
  sync: SyncHost;
  back: BackHost;
  boxArt: BoxArtHost;
  export: ExportHost;
  pokemonFile: PokemonFileHost;
  clipboard: ClipboardHost;
  calibrations: CalibrationsHost;
  gameArt: GameArtHost;
  patchRom: PatchRomHost;
  import: ImportHost;
  library: LibraryHost;
  gamePage: GamePageHost;
  gravity: GravityHost;
  haptics: HapticsHost;
  systemBars: SystemBarsHost;
  audioSession: AudioSessionHost;
  gameSurface: GameSurfaceHost;
  shaders: ShadersHost;
};

export const sharedPreferences: Omit<Preferences, "touchControls" | "asyncShaders"> = {
  fastForwardSpeed: 2,
  showFps: false,
  theme: "system",
  eventsNoticeDismissed: false,
  updateDismissedVersion: 0,
  gameClockOffset: { days: 0, hours: 0 },
  restoreBackupsKept: 10,
  stickSensitivity: 1,
  playInSilentMode: false,
  renderer: "automatic",
  skins: defaultSkins,
  skinHintSeen: false,
  screenDepth: true,
  screenGlass: true,
};

export const sharedHosts = {
  preferences: tauriPreferencesHost,
  plus: tauriPlusHost,
  appUpdate: tauriAppUpdateHost,
  experiments: tauriExperimentsHost,
  sync: tauriSyncHost,
  boxArt: tauriBoxArtHost,
  clipboard: tauriClipboardHost,
  calibrations: tauriCalibrationsHost,
  gameArt: tauriGameArtHost,
  gamePage: tauriGamePageHost,
} satisfies Partial<Hosts>;
