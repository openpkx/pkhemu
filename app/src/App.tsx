import { createEngine } from "@pkhex-everywhere/engine";
import { EngineProvider } from "@pkhex-everywhere/react";
import { platform } from "@tauri-apps/plugin-os";
import { BackProvider } from "./back/back";
import { androidBackHost } from "./back/androidHost";
import { desktopBackHost } from "./back/desktopHost";
import { BoxArtProvider } from "./box-art/boxArt";
import { tauriBoxArtHost } from "./box-art/tauriHost";
import { androidExportHost, androidPokemonFileHost } from "./editor/androidHost";
import { ClipboardProvider } from "./editor/clipboard";
import { ExportProvider } from "./editor/exportFile";
import { PokemonFileProvider } from "./editor/pokemonFile";
import { tauriClipboardHost, tauriExportHost, tauriPokemonFileHost } from "./editor/tauriHost";
import { GameArtProvider } from "./game-art/gameArt";
import { tauriGameArtHost } from "./game-art/tauriHost";
import { tauriGamePageHost } from "./game-page/tauriHost";
import { androidGamesFolderHost } from "./games-folder/androidHost";
import { GamesFolderProvider } from "./games-folder/gamesFolder";
import { tauriGamesFolderHost } from "./games-folder/tauriHost";
import { Home } from "./Home";
import { CalibrationsProvider } from "./input/calibrations";
import { tauriCalibrationsHost } from "./input/tauriHost";
import { experiments } from "./lab/experiments";
import { ExperimentsProvider } from "./lab/lab";
import { tauriExperimentsHost } from "./lab/tauriHost";
import { androidLibraryHost } from "./library/androidHost";
import { tauriLibraryHost } from "./library/tauriHost";
import { PatchRomProvider } from "./patch-rom/patchRom";
import { androidPatchRomHost, tauriPatchRomHost } from "./patch-rom/tauriHost";
import { PlusProvider } from "./plus/plus";
import { tauriPlusHost } from "./plus/tauriHost";
import { PreferencesProvider, type Preferences } from "./preferences/preferences";
import { tauriPreferencesHost } from "./preferences/tauriHost";
import { SyncProvider } from "./sync/sync";
import { tauriSyncHost } from "./sync/tauriHost";
import { useAppliedTheme } from "./theme/theme";

const engine = createEngine();
const android = platform() === "android";
const gamesFolderHost = android ? androidGamesFolderHost : tauriGamesFolderHost;
const libraryHost = android ? androidLibraryHost : tauriLibraryHost;
const backHost = android ? androidBackHost : desktopBackHost;
const exportHost = android ? androidExportHost : tauriExportHost;
const pokemonFileHost = android ? androidPokemonFileHost : tauriPokemonFileHost;
const patchRomHost = android ? androidPatchRomHost : tauriPatchRomHost;
const defaultPreferences: Preferences = {
  touchControls: android,
  fastForwardSpeed: 2,
  showFps: false,
  theme: "system",
  eventsNoticeDismissed: false,
  gameClockOffset: { days: 0, hours: 0 },
  restoreBackupsKept: 10,
  stickSensitivity: 1,
};

function AppliedTheme() {
  useAppliedTheme();
  return null;
}

export function App() {
  return (
    <EngineProvider engine={engine}>
      <PreferencesProvider host={tauriPreferencesHost} defaults={defaultPreferences}>
        <AppliedTheme />
        <GamesFolderProvider host={gamesFolderHost}>
          <PlusProvider host={tauriPlusHost}>
            <ExperimentsProvider host={tauriExperimentsHost} registry={experiments}>
              <SyncProvider host={tauriSyncHost}>
                <BackProvider host={backHost}>
                  <BoxArtProvider host={tauriBoxArtHost}>
                    <ExportProvider host={exportHost}>
                      <PokemonFileProvider host={pokemonFileHost}>
                        <ClipboardProvider host={tauriClipboardHost}>
                          <CalibrationsProvider host={tauriCalibrationsHost}>
                            <GameArtProvider host={tauriGameArtHost}>
                              <PatchRomProvider host={patchRomHost}>
                                <Home libraryHost={libraryHost} gamePageHost={tauriGamePageHost} />
                              </PatchRomProvider>
                            </GameArtProvider>
                          </CalibrationsProvider>
                        </ClipboardProvider>
                      </PokemonFileProvider>
                    </ExportProvider>
                  </BoxArtProvider>
                </BackProvider>
              </SyncProvider>
            </ExperimentsProvider>
          </PlusProvider>
        </GamesFolderProvider>
      </PreferencesProvider>
    </EngineProvider>
  );
}
