import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createEngine } from "@pkhex-everywhere/engine";
import { EngineProvider } from "@pkhex-everywhere/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider } from "@/back/back";
import { fakeBoxArt } from "@/box-art/fakeBoxArt";
import { BoxArtProvider } from "@/box-art/boxArt";
import { TOAST_MS } from "@/components/Toast";
import { fakeGameArt } from "@/game-art/fakeGameArt";
import { GameArtProvider } from "@/game-art/gameArt";
import type { GamePageHost } from "@/game-page/GamePage";
import { GamesFolderProvider, type GamesFolderHost } from "@/games-folder/gamesFolder";
import { Home } from "@/Home";
import { fakeImport } from "@/import/fakeImport";
import { ImportProvider } from "@/import/importFiles";
import { fakeFolder } from "@/library/fakeFolder";
import type { LibraryHost } from "@/library/library";
import type { Game } from "@/library/scan";
import { PatchRomProvider, type PatchRomHost } from "@/patch-rom/patchRom";
import { PreferencesProvider, type Preferences } from "@/preferences/preferences";
import { fakeSync } from "@/sync/fakeSync";
import { SyncProvider } from "@/sync/sync";
import { AppUpdateProvider, type UpdateCheck } from "./appUpdate";
import { fakeAppUpdate } from "./fakeAppUpdate";
import { defaultSkins } from "@/skins";

vi.mock("@/splash", () => ({ hideSplash: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(async () => ({ name: "mGBA", version: "0.10.5" })) }));

vi.mock("@/GameScreen", () => ({
  GameScreen: ({ game, onQuit }: { game: Game; onQuit(): void }) => (
    <main>
      <h1>{`Playing ${game.name}`}</h1>
      <button type="button" onClick={onQuit}>
        Quit
      </button>
    </main>
  ),
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"], shouldAdvanceTime: true });
  Element.prototype.scrollIntoView = () => {};
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const defaults: Preferences = { touchControls: false, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, updateDismissedVersion: 0, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1, playInSilentMode: false, renderer: "automatic", skins: defaultSkins, skinHintSeen: false, screenDepth: true, screenGlass: true, asyncShaders: false, gameCubeResolution: 1 };

const available = (versionCode: number): UpdateCheck => ({ available: true, versionCode, downloaded: false });
const downloaded: UpdateCheck = { available: true, versionCode: 7, downloaded: true };

function device() {
  let saved: Partial<Preferences> = {};
  const launch = (update = fakeAppUpdate()) => {
    const paths = ["gba/Ruby.gba"];
    const gamesFolderHost: GamesFolderHost = {
      pickFolder: async () => "/games",
      makeFolder: async () => "/games",
      listFolders: async () => ["gba"],
      ensureFolder: async () => {},
      folderExists: async () => true,
      loadSaved: async () => "/games",
      save: async () => {},
      device: "phone",
      label: (folder) => folder,
    };
    const list = fakeFolder(paths);
    const libraryHost: LibraryHost = {
      listDir: (_folder, path) => list(path),
      recentlyPlayed: async () => [],
      scanGameArt: async () => {},
      resumeScreenshot: async () => null,
      hasResumeState: async () => false,
      playHistory: async () => ({ lastPlayed: null, playTime: 0 }),
    };
    const gamePageHost: GamePageHost = {
      hasResumeState: async () => false,
      resumePreview: async () => null,
      resumeInfo: async () => null,
      applyEdit: async () => {},
      writeTransfer: async () => {},
      keptCopies: async () => [],
      keepCopies: async () => {},
      deleteGame: async () => {},
      playHistory: async () => ({ lastPlayed: null, playTime: 0 }),
      readSave: async () => null,
      readSaveFiles: async () => [],
      romGameName: async () => null,
      threeDsUpdate: async () => null,
      saveSummary: async () => null,
      keepSaveSummary: async () => {},
      saveFormat: async () => null,
      keepSaveFormat: async () => {},
      listBackups: async () => [],
      readBackup: async () => new Uint8Array(),
      restoreBackup: async () => {},
      deleteBackup: async () => {},
      listStates: async () => ({ current: null, slots: [], canUndoLoad: false }),
      stateScreenshot: async () => null,
      deleteState: async () => {},
      transferPak: async () => null,
      chooseTransferPak: async () => {},
    };
    const patchRomHost: PatchRomHost = {
      baseBuild: async () => null,
      pick: async () => null,
      bases: async () => ({ checked: true, games: [] }),
      dropped: async () => Promise.reject(new Error("No patch")),
      checkName: async () => {},
      create: async () => ({ path: "", sha256: "", baseChecked: false }),
      patchedFrom: async () => null,
      keepPatchedFrom: async () => {},
    };
    const idleEngine = createEngine({
      host: {
        ready: () => new Promise(() => {}),
        onChange: () => {},
        onEvent: () => {},
        getAssemblyExports: () => new Promise(() => {}),
      },
    });
    render(
      <EngineProvider engine={idleEngine}>
        <PreferencesProvider
          host={{ load: async () => saved, save: async (preferences) => void (saved = preferences) }}
          defaults={defaults}
        >
          <GamesFolderProvider host={gamesFolderHost}>
            <SyncProvider host={fakeSync({ available: false }).host}>
              <BackProvider host={{ listen: () => () => {}, exit: () => {} }}>
                <BoxArtProvider host={fakeBoxArt().host}>
                  <GameArtProvider host={fakeGameArt().host}>
                    <PatchRomProvider host={patchRomHost}>
                      <ImportProvider host={fakeImport()}>
                        <AppUpdateProvider host={update.host}>
                          <Home libraryHost={libraryHost} gamePageHost={gamePageHost} />
                        </AppUpdateProvider>
                      </ImportProvider>
                    </PatchRomProvider>
                  </GameArtProvider>
                </BoxArtProvider>
              </BackProvider>
            </SyncProvider>
          </GamesFolderProvider>
        </PreferencesProvider>
      </EngineProvider>,
    );
    return update;
  };
  const relaunch = (update = fakeAppUpdate()) => {
    cleanup();
    return launch(update);
  };
  return { launch, relaunch };
}

const update = () => screen.queryByRole("button", { name: "Update" });
const restart = () => screen.queryByRole("button", { name: "Restart" });

async function library() {
  await screen.findByRole("button", { name: /Ruby/ });
  await act(async () => {});
}

async function timeOut() {
  await act(async () => vi.advanceTimersByTime(TOAST_MS));
}

it("offers an available update on the library and starts it", async () => {
  const fake = device().launch(fakeAppUpdate({ check: available(7) }));
  await library();

  expect(update()).toBeTruthy();
  fireEvent.click(update()!);

  expect(fake.host.start).toHaveBeenCalled();
});

it("doesn't offer an update again after its toast times out, until a newer one", async () => {
  const { launch, relaunch } = device();
  launch(fakeAppUpdate({ check: available(7) }));
  await library();
  await timeOut();

  relaunch(fakeAppUpdate({ check: available(7) }));
  await library();
  expect(update() ?? restart()).toBeNull();

  relaunch(fakeAppUpdate({ check: available(8) }));
  await library();
  expect(update()).toBeTruthy();
});

it("shows no toast without an update", async () => {
  device().launch();
  await library();

  expect(update() ?? restart()).toBeNull();
});

it("offers to restart into a downloaded update on every launch", async () => {
  const { launch, relaunch } = device();
  const fake = launch(fakeAppUpdate({ check: downloaded }));
  await library();

  expect(restart()).toBeTruthy();
  fireEvent.click(restart()!);
  expect(fake.host.complete).toHaveBeenCalled();

  relaunch(fakeAppUpdate({ check: downloaded }));
  await library();
  await timeOut();
  relaunch(fakeAppUpdate({ check: downloaded }));
  await library();
  expect(restart()).toBeTruthy();
});

it("offers to restart once the update finishes downloading", async () => {
  const fake = device().launch(fakeAppUpdate({ check: available(7) }));
  await library();
  await timeOut();

  act(() => fake.download());

  expect(restart()).toBeTruthy();
});

it("shows no toast while a game is open", async () => {
  const fake = device().launch(fakeAppUpdate({ check: available(7) }));
  await library();
  await timeOut();
  fireEvent.click(screen.getByRole("button", { name: /Ruby/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Start" }));
  await screen.findByRole("heading", { name: "Playing Ruby" });

  act(() => fake.download());

  expect(update() ?? restart()).toBeNull();
});

it("shows nothing when the check fails", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  device().launch(fakeAppUpdate({ check: new Error("Google Play is missing") }));
  await library();

  expect(update() ?? restart()).toBeNull();
});
