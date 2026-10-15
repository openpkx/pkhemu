import { createEngine } from "@pkhex-everywhere/engine";
import { EngineProvider } from "@pkhex-everywhere/react";
import { AppUpdateProvider } from "./app-update/appUpdate";
import { AudioSessionProvider } from "./audio-session/audioSession";
import { BackProvider } from "./back/back";
import { BoxArtProvider } from "./box-art/boxArt";
import { ClipboardProvider } from "./editor/clipboard";
import { ExportProvider } from "./editor/exportFile";
import { PokemonFileProvider } from "./editor/pokemonFile";
import { GameArtProvider } from "./game-art/gameArt";
import { GameSurfaceProvider } from "./game-surface/gameSurface";
import { GamesFolderProvider } from "./games-folder/gamesFolder";
import { GravityProvider } from "./gravity/gravity";
import { HapticsProvider } from "./haptics/haptics";
import { Home } from "./Home";
import { ImportProvider } from "./import/importFiles";
import { CalibrationsProvider } from "./input/calibrations";
import { experiments } from "./lab/experiments";
import { ExperimentsProvider } from "./lab/lab";
import { PatchRomProvider } from "./patch-rom/patchRom";
import { hosts } from "./platform/platform";
import { PlusProvider } from "./plus/plus";
import { PreferencesProvider } from "./preferences/preferences";
import { ShadersProvider } from "./shaders/shaders";
import { SyncProvider } from "./sync/sync";
import { SystemBarsProvider } from "./system-bars/systemBars";
import { useAppliedTheme } from "./theme/theme";

const engine = createEngine();

function AppliedTheme() {
  useAppliedTheme();
  return null;
}

export function App() {
  return (
    <EngineProvider engine={engine}>
      <SystemBarsProvider host={hosts.systemBars}>
        <GravityProvider host={hosts.gravity}>
          <ShadersProvider host={hosts.shaders}>
            <GameSurfaceProvider host={hosts.gameSurface}>
              <HapticsProvider host={hosts.haptics}>
                <PreferencesProvider host={hosts.preferences} defaults={hosts.defaultPreferences}>
                  <AppliedTheme />
                  <AudioSessionProvider host={hosts.audioSession}>
                    <GamesFolderProvider host={hosts.gamesFolder}>
                      <PlusProvider host={hosts.plus}>
                        <AppUpdateProvider host={hosts.appUpdate}>
                          <ExperimentsProvider host={hosts.experiments} registry={experiments}>
                            <SyncProvider host={hosts.sync}>
                              <BackProvider host={hosts.back}>
                                <BoxArtProvider host={hosts.boxArt}>
                                  <ExportProvider host={hosts.export}>
                                    <PokemonFileProvider host={hosts.pokemonFile}>
                                      <ClipboardProvider host={hosts.clipboard}>
                                        <CalibrationsProvider host={hosts.calibrations}>
                                          <GameArtProvider host={hosts.gameArt}>
                                            <PatchRomProvider host={hosts.patchRom}>
                                              <ImportProvider host={hosts.import}>
                                                <Home libraryHost={hosts.library} gamePageHost={hosts.gamePage} systems={hosts.systems} />
                                              </ImportProvider>
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
                        </AppUpdateProvider>
                      </PlusProvider>
                    </GamesFolderProvider>
                  </AudioSessionProvider>
                </PreferencesProvider>
              </HapticsProvider>
            </GameSurfaceProvider>
          </ShadersProvider>
        </GravityProvider>
      </SystemBarsProvider>
    </EngineProvider>
  );
}
