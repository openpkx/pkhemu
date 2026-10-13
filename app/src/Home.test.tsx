import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { act } from "react";
import { createEngine } from "@pkhex-everywhere/engine";
import { EngineProvider } from "@pkhex-everywhere/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider, type BackHost } from "./back/back";
import { BoxArtProvider } from "./box-art/boxArt";
import { fakeGameArt } from "./game-art/fakeGameArt";
import { GameArtProvider } from "./game-art/gameArt";
import { fakeBoxArt } from "./box-art/fakeBoxArt";
import { GamesFolderProvider, type GamesFolderHost } from "./games-folder/gamesFolder";
import { Home } from "./Home";
import { fakeImport } from "./import/fakeImport";
import { ImportProvider } from "./import/importFiles";
import { ExperimentsProvider, type ExperimentValues } from "./lab/lab";
import { experiments as registry } from "./lab/experiments";
import { fakePlus } from "./plus/fakePlus";
import { PlusProvider } from "./plus/plus";
import { pngDataUrl } from "./lib/utils";
import { fakePads, padButtons } from "./input/fakePads";
import { fakeFolder } from "./library/fakeFolder";
import type { LibraryHost } from "./library/library";
import type { Game } from "./library/scan";
import type { GamePageHost } from "./game-page/GamePage";
import { PatchRomProvider, type PatchRomHost } from "./patch-rom/patchRom";
import { PreferencesProvider } from "./preferences/preferences";
import { hideSplash } from "./splash";
import { fakeSync } from "./sync/fakeSync";
import { SyncProvider } from "./sync/sync";
import type { System } from "./systems";

vi.mock("./splash", () => ({ hideSplash: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async () => ({ name: "mGBA", version: "0.10.5" })),
}));

vi.mock("./GameScreen", () => ({
  GameScreen: ({
    game,
    resume,
    cover,
    onQuit,
    onUnsupported,
  }: {
    game: Game;
    resume: boolean;
    cover?: string;
    onQuit(): void;
    onUnsupported(): void;
  }) => (
    <main>
      <h1>{`Playing ${game.name}${resume ? " from the resume state" : ""}`}</h1>
      {cover && <img alt="cover" src={cover} />}
      <button type="button" onClick={onQuit}>
        Quit
      </button>
      <button type="button" onClick={onUnsupported}>
        Fail as unsupported
      </button>
    </main>
  ),
}));

beforeEach(() => {
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
  vi.mocked(hideSplash).mockClear();
  delete (navigator as Partial<Navigator>).getGamepads;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const png = [137, 80, 78, 71];

function launch({
  canOpenFolder = true,
  resume = true,
  screenshot = null as number[] | null,
  boxArt = fakeBoxArt(),
  loadSaved = async () => null as string | null,
  sync = fakeSync({ available: false }),
  listDir = undefined as LibraryHost["listDir"] | undefined,
  makeFolder = vi.fn(async () => "/games" as string | null),
  findFolder = vi.fn(async () => "/games" as string | null),
  canFindFolder = true,
  device = "phone" as GamesFolderHost["device"],
  listFolders = async (_folder: string) => ["gba"],
  systems = undefined as readonly System[] | undefined,
  experiments = undefined as ExperimentValues | undefined,
} = {}) {
  const paths: string[] = [];
  const importHost = fakeImport({ onCopy: (path) => void paths.push(path) });
  const openFolder = vi.fn(async () => {});
  const save = vi.fn(async (_folder: string) => {});
  const gamesFolderHost: GamesFolderHost = {
    pickFolder: async () => "/games",
    makeFolder,
    ...(canFindFolder && { findFolder }),
    listFolders,
    ensureFolder: async (_parent, name) => void paths.push(`${name}/`),
    folderExists: async () => true,
    loadSaved,
    save,
    device,
    label: (folder) => folder,
    ...(canOpenFolder && { openFolder }),
  };
  const list = fakeFolder(paths);
  const libraryHost: LibraryHost = {
    listDir: listDir ?? ((_folder, path) => list(path)),
    recentlyPlayed: async () => [],
    scanGameArt: async () => {},
    resumeScreenshot: async () => null,
    hasResumeState: async () => resume,
    playHistory: async () => ({ lastPlayed: null, playTime: 0 }),
  };
  const gamePageHost: GamePageHost = {
    hasResumeState: async () => resume,
    resumePreview: async () => screenshot && { screenshot },
    resumeInfo: async () => null,
    applyEdit: async () => {},
    writeTransfer: async () => {},
    keptCopies: async () => [],
    keepCopies: async () => {},
    deleteGame: vi.fn(async (_folder: string, path: string) => void paths.splice(paths.indexOf(path), 1)),
    playHistory: async () => ({ lastPlayed: null, playTime: 0 }),
    readSave: async () => null,
    readSaveFiles: async () => [],
    romGameName: async () => null,
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
    baseBuild: async () => "Ruby EN 1.1",
    pick: async () => ({ file: "/patches/Ruby Plus.ips", name: "Ruby Plus.ips", format: "ips" }),
    dropped: async () => ({ file: "/patches/Ruby Plus.ips", name: "Ruby Plus.ips", format: "ips" }),
    checkName: async () => {},
    create: async (_folder, _path, system, name) => {
      paths.push(`${system}/${name}.${system}`);
      return { path: `${system}/${name}.${system}`, sha256: "c0ffee" };
    },
    patchedFrom: async () => null,
    keepPatchedFrom: async () => {},
  };
  let pressBack = () => {};
  const backHost: BackHost = {
    listen: (handler) => {
      pressBack = handler;
      return () => {};
    },
    exit: vi.fn(),
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
        host={{ load: async () => ({}), save: async () => {} }}
        defaults={{ touchControls: false, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, updateDismissedVersion: 0, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1, playInSilentMode: false, renderer: "automatic" }}
      >
        <GamesFolderProvider host={gamesFolderHost}>
          <SyncProvider host={sync.host}>
            <BackProvider host={backHost}>
              <BoxArtProvider host={boxArt.host}>
                <GameArtProvider host={fakeGameArt().host}>
                  <PatchRomProvider host={patchRomHost}>
                    <ImportProvider host={importHost}>
                      {experiments ? (
                        <PlusProvider host={fakePlus({ status: { state: "unlocked" } }).host}>
                          <ExperimentsProvider host={{ load: async () => experiments, save: async () => {} }} registry={registry}>
                            <Home libraryHost={libraryHost} gamePageHost={gamePageHost} systems={systems} />
                          </ExperimentsProvider>
                        </PlusProvider>
                      ) : (
                        <Home libraryHost={libraryHost} gamePageHost={gamePageHost} systems={systems} />
                      )}
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
  return { paths, openFolder, save, makeFolder, gamePageHost, importHost, back: () => act(pressBack), exit: backHost.exit };
}

it("keeps the splash while the games folder loads", async () => {
  const loadSaved = vi.fn(() => new Promise<string | null>(() => {}));
  launch({ loadSaved });

  await waitFor(() => expect(loadSaved).toHaveBeenCalled());

  expect(hideSplash).not.toHaveBeenCalled();
});

it("keeps the splash until the library's first scan is done", async () => {
  let scanned = () => {};
  const gate = new Promise<void>((resolve) => (scanned = resolve));
  const listDir = vi.fn(async () => gate.then(() => []));
  launch({ loadSaved: async () => "/games", listDir });

  await waitFor(() => expect(listDir).toHaveBeenCalled());
  expect(hideSplash).not.toHaveBeenCalled();

  scanned();
  await waitFor(() => expect(hideSplash).toHaveBeenCalled());
});

it("hides the splash once the welcome screen shows", async () => {
  launch();

  await screen.findByRole("button", { name: /I'm new to emulators/ });

  expect(hideSplash).toHaveBeenCalled();
});

it("welcomes a player with no games folder with three ways in", async () => {
  launch();

  expect(await screen.findByRole("button", { name: /I'm new to emulators/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /I have ROMs on this phone/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /I've used pkhemu before/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Delta/ })).toBeNull();
});

it("welcomes a player on a Mac with the Mac's three ways in", async () => {
  launch({ device: "Mac" });

  expect(await screen.findByRole("button", { name: /I'm new to emulators/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /I have ROMs on this Mac/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /I've used pkhemu before/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Delta/ })).toBeNull();
});

it("welcomes a player on an iPhone with games on the iPhone and Delta, not a previous folder", async () => {
  launch({ device: "iPhone", canFindFolder: false });

  expect(await screen.findByRole("button", { name: /I'm new to emulators/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /I have games on this iPhone/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /I'm coming from Delta/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /I've used pkhemu before/ })).toBeNull();
});

it("makes the games folder for a new player on an iPhone", async () => {
  const { save } = launch({ device: "iPhone", canFindFolder: false });

  await chooseFolder();

  expect(save).toHaveBeenCalledWith("/games");
});

async function makeFolder() {
  fireEvent.click(await screen.findByRole("button", { name: /I'm new to emulators/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Make folder" }));
}

async function chooseFolder() {
  await makeFolder();
  return screen.findByTestId("empty-library");
}

it("makes a games folder for a new player and opens the empty library", async () => {
  const { save, paths } = launch();

  await chooseFolder();

  expect(save).toHaveBeenCalledWith("/games");
  expect(paths).toEqual(expect.arrayContaining(["gb/", "gba/"]));
  expect(screen.getByRole("status")).toBeTruthy();
});

it("stays on the folder screen when the picker is cancelled", async () => {
  const { save } = launch({ makeFolder: vi.fn(async () => null) });

  await makeFolder();

  expect(await screen.findByRole("button", { name: "Make folder" })).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
  expect(screen.queryByTestId("empty-library")).toBeNull();
});

it("goes back from the folder screen to the welcome screen", async () => {
  launch();
  fireEvent.click(await screen.findByRole("button", { name: /I'm new to emulators/ }));

  fireEvent.click(await screen.findByRole("button", { name: "Back" }));

  expect(await screen.findByRole("button", { name: /I'm new to emulators/ })).toBeTruthy();
});

async function choosePreviousFolder() {
  fireEvent.click(await screen.findByRole("button", { name: /I've used pkhemu before/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Choose folder" }));
}

it("opens the library from a previous folder that has system folders", async () => {
  const { save } = launch();

  await choosePreviousFolder();

  expect(await screen.findByTestId("empty-library")).toBeTruthy();
  expect(save).toHaveBeenCalledWith("/games");
});

it("warns about a previous folder with no system folders and keeps nothing", async () => {
  const { save } = launch({ findFolder: vi.fn(async () => "/Documents"), listFolders: async () => ["Photos"] });

  await choosePreviousFolder();

  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Choose another folder" })).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});

it("keeps a folder with no system folders when the player uses it anyway", async () => {
  const { save, paths } = launch({ findFolder: vi.fn(async () => "/Documents"), listFolders: async () => [] });
  await choosePreviousFolder();

  fireEvent.click(await screen.findByRole("button", { name: "Use it anyway" }));

  expect(await screen.findByTestId("empty-library")).toBeTruthy();
  expect(save).toHaveBeenCalledWith("/Documents");
  expect(paths).toEqual(expect.arrayContaining(["gb/", "gba/"]));
});

it("picks again from the warning and opens the library once the folder has system folders", async () => {
  const findFolder = vi.fn(async () => "/Documents" as string | null);
  const { save } = launch({ findFolder, listFolders: async (folder) => (folder === "/games" ? ["gb"] : []) });
  await choosePreviousFolder();
  findFolder.mockResolvedValueOnce("/games");

  fireEvent.click(await screen.findByRole("button", { name: "Choose another folder" }));

  expect(await screen.findByTestId("empty-library")).toBeTruthy();
  expect(save).toHaveBeenCalledWith("/games");
});

it("stays on the previous folder screen when the picker is cancelled", async () => {
  const { save } = launch({ findFolder: vi.fn(async () => null) });

  await choosePreviousFolder();

  expect(await screen.findByRole("button", { name: "Choose folder" })).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});

it("asks to set up a pad only once there's a games folder", async () => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  const pads = fakePads();
  Object.defineProperty(navigator, "getGamepads", { configurable: true, value: pads.gamepads });
  const pad = pads.connect({ id: "Odd Pad", mapping: "" });
  launch();
  await screen.findByRole("button", { name: /I'm new to emulators/ });

  pad.press(3);

  expect(screen.queryByRole("alertdialog")).toBeNull();
  await chooseFolder();
  pad.press(3);
  expect(await screen.findByRole("alertdialog")).toBeTruthy();
});

it("goes from first launch to the library once a ROM is added", async () => {
  const { paths } = launch();

  await chooseFolder();
  paths.push("gba/Emerald.gba");
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

  expect(await screen.findByRole("button", { name: /Emerald/ })).toBeTruthy();
  expect(screen.queryByTestId("empty-library")).toBeNull();
});

it("shows the platform's consoles on the welcome screen", async () => {
  launch();

  await screen.findByRole("button", { name: /I'm new to emulators/ });

  expect(screen.getByRole("img", { name: /Game Boy Advance.*Nintendo 64/ })).toBeTruthy();
});

it("shows a chip for each console on the empty library", async () => {
  launch();

  const chips = within(await chooseFolder()).getByRole("img", { name: /Game Boy.*Nintendo DS.*Nintendo 64/ });

  for (const system of ["GB", "GBC", "GBA", "NDS", "N64"]) expect(within(chips).getByText(system)).toBeTruthy();
});

it("leaves N64 off the empty library where the platform doesn't offer it", async () => {
  launch({ systems: ["gb", "gbc", "gba", "nds"] });

  const chips = within(await chooseFolder()).getByRole("img", { name: /Nintendo DS/ });

  expect(within(chips).getByText("NDS")).toBeTruthy();
  expect(within(chips).queryByText("N64")).toBeNull();
  expect(chips.getAttribute("aria-label")).not.toMatch(/Nintendo 64/);
});

it("opens the games folder from the empty library", async () => {
  const { openFolder } = launch();

  const ready = await chooseFolder();
  fireEvent.click(within(ready).getByRole("button", { name: "Open folder" }));

  expect(openFolder).toHaveBeenCalled();
});

it("hides Open folder where the platform can't open it", async () => {
  launch({ canOpenFolder: false });

  const ready = await chooseFolder();

  expect(within(ready).queryByRole("button", { name: "Open folder" })).toBeNull();
});

it("shows why the games folder couldn't be opened", async () => {
  const { openFolder } = launch();
  openFolder.mockRejectedValue(new Error("folder is gone"));

  const ready = await chooseFolder();
  fireEvent.click(within(ready).getByRole("button", { name: "Open folder" }));

  expect(await within(ready).findByText(/folder is gone/)).toBeTruthy();
});

it("copies the demo into the games folder and starts it from the empty library", async () => {
  const { importHost, paths } = launch();

  const ready = await chooseFolder();
  fireEvent.click(within(ready).getByRole("button", { name: "Play a demo" }));

  expect(await screen.findByRole("heading", { name: "Playing Tobu Tobu Girl Deluxe" })).toBeTruthy();
  expect(importHost.copyDemo).toHaveBeenCalledWith("/games");
  expect(importHost.copyDemo).toHaveBeenCalledTimes(1);
  expect(paths).toContain("gbc/Tobu Tobu Girl Deluxe.gbc");
});

it("shows why the demo couldn't be copied and starts nothing", async () => {
  const { importHost } = launch();
  vi.mocked(importHost.copyDemo).mockRejectedValue("gbc/Tobu Tobu Girl Deluxe.gbc is already there");

  const ready = await chooseFolder();
  fireEvent.click(within(ready).getByRole("button", { name: "Play a demo" }));

  expect(await within(ready).findByText(/is already there/)).toBeTruthy();
  expect(screen.queryByRole("heading", { name: /Playing/ })).toBeNull();
});

it("offers no demo once the library has a game", async () => {
  const { paths } = launch();

  await chooseFolder();
  paths.push("gba/Emerald.gba");
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

  expect(await screen.findByRole("button", { name: /Emerald/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Play a demo" })).toBeNull();
});

it("shows the empty library without the demo when the Demo game experiment is off", async () => {
  launch({ experiments: { demoGame: "off" } });

  const ready = await chooseFolder();

  expect(within(ready).getByRole("button", { name: "Import files" })).toBeTruthy();
  expect(within(ready).queryByRole("button", { name: "Play a demo" })).toBeNull();
});

it("exits on back from the library", async () => {
  const { back, exit } = launch();
  await chooseFolder();

  back();

  expect(exit).toHaveBeenCalled();
});

it("goes back from settings to the library", async () => {
  const { back, exit } = launch();
  await chooseFolder();
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  await screen.findByRole("heading", { name: "Settings" });

  back();

  expect(await screen.findByTestId("empty-library")).toBeTruthy();
  expect(exit).not.toHaveBeenCalled();
});

it("goes back from settings to the library with B on a gamepad", async () => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  const pads = fakePads();
  Object.defineProperty(navigator, "getGamepads", { configurable: true, value: pads.gamepads });
  launch();
  await chooseFolder();
  pads.hold();
  screen.getByRole("button", { name: "Settings" }).focus();
  pads.press(padButtons.a);
  await screen.findByRole("heading", { name: "Settings" });

  pads.press(padButtons.b);

  expect(await screen.findByTestId("empty-library")).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Settings" }));
});

async function openGame(paths: string[], name: string) {
  await chooseFolder();
  paths.push("gba/Emerald.gba", "gba/Ruby.gba");
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(name) }));
  await screen.findByRole("heading", { name });
}

it.each([
  ["Resume", "Playing Ruby from the resume state"],
  ["Start", "Playing Ruby"],
])("plays from %s on the game page", async (button, playing) => {
  const { paths } = launch();
  await openGame(paths, "Ruby");

  fireEvent.click(await screen.findByRole("button", { name: button }));

  expect(await screen.findByRole("heading", { name: playing })).toBeTruthy();
});

it("passes the resume screenshot to the game when resuming", async () => {
  const { paths } = launch({ screenshot: png });
  await openGame(paths, "Ruby");

  fireEvent.click(await screen.findByRole("button", { name: "Resume" }));
  await screen.findByRole("heading", { name: "Playing Ruby from the resume state" });

  expect(screen.getByRole("img", { name: "cover" }).getAttribute("src")).toBe(pngDataUrl(png));
});

it("passes no cover when starting a new game", async () => {
  const { paths } = launch({ screenshot: png });
  await openGame(paths, "Ruby");

  fireEvent.click(await screen.findByRole("button", { name: "Start" }));
  await screen.findByRole("heading", { name: "Playing Ruby" });

  expect(screen.queryByRole("img", { name: "cover" })).toBeNull();
});

it("starts a game without a resume state from the game page", async () => {
  const { paths } = launch({ resume: false });
  await openGame(paths, "Ruby");

  fireEvent.click(await screen.findByRole("button", { name: "Start" }));

  expect(await screen.findByRole("heading", { name: "Playing Ruby" })).toBeTruthy();
});

it("opens the patched game's page once it's created", async () => {
  const { paths } = launch();
  await openGame(paths, "Ruby");

  fireEvent.keyDown(screen.getByRole("button", { name: "More" }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("menuitem", { name: "Patch ROM…" }));
  fireEvent.click(await screen.findByRole("button", { name: "Choose patch file" }));
  const create = await screen.findByRole<HTMLButtonElement>("button", { name: "Create" });
  await waitFor(() => expect(create.disabled).toBe(false));
  fireEvent.click(create);

  expect(await screen.findByRole("heading", { name: "Ruby Plus" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("Ruby Plus");
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("shows on the game page that N64 games don't run on this device once one fails to load", async () => {
  const { paths } = launch({ resume: false });
  await chooseFolder();
  paths.push("n64/Stadium.z64", "n64/Stadium 2.z64");
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  fireEvent.click(await screen.findByRole("button", { name: /Stadium 2/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Start" }));

  fireEvent.click(await screen.findByRole("button", { name: "Fail as unsupported" }));

  expect(await screen.findByRole("heading", { name: "Stadium 2" })).toBeTruthy();
  expect(await screen.findByText(/this device/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
});

it("shows that a game whose system this platform doesn't offer isn't supported, without starting it", async () => {
  const { paths } = launch({ resume: false, systems: ["gb", "gbc", "gba", "nds"] });
  await chooseFolder();
  paths.push("n64/Stadium.z64");
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  fireEvent.click(await screen.findByRole("button", { name: /Stadium/ }));

  expect(await screen.findByRole("heading", { name: "Stadium" })).toBeTruthy();
  expect(await screen.findByText(/Not supported on this device yet/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
});

it("opens the page of a game whose system this platform doesn't offer when it's played from the library", async () => {
  const { paths, back } = launch({ systems: ["gb", "gbc", "gba", "nds"] });
  await chooseFolder();
  paths.push("n64/Stadium.z64");
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  fireEvent.click(await screen.findByRole("button", { name: /Stadium/ }));
  await screen.findByText(/Not supported on this device yet/);
  back();
  const card = await screen.findByRole("region", { name: "Continue" });

  fireEvent.click(await within(card).findByRole("button", { name: "Resume" }));

  expect(await screen.findByText(/Not supported on this device yet/)).toBeTruthy();
  expect(screen.queryByRole("heading", { name: /Playing/ })).toBeNull();
});

it("returns to the game page on quit", async () => {
  const { paths } = launch();
  await openGame(paths, "Ruby");
  fireEvent.click(await screen.findByRole("button", { name: "Resume" }));

  fireEvent.click(await screen.findByRole("button", { name: "Quit" }));

  expect(await screen.findByRole("heading", { name: "Ruby" })).toBeTruthy();
  expect(await screen.findByRole("button", { name: "Resume" })).toBeTruthy();
});

it("syncs the game after quitting without waiting for it", async () => {
  const sync = fakeSync({ account: "player@example.com" });
  const { paths } = launch({ sync });
  await openGame(paths, "Ruby");
  fireEvent.click(await screen.findByRole("button", { name: "Resume" }));
  sync.host.syncGame.mockClear();
  sync.host.syncGame.mockImplementation(() => new Promise(() => {}));

  fireEvent.click(await screen.findByRole("button", { name: "Quit" }));

  expect(sync.host.syncGame).toHaveBeenCalledWith("/games", "gba/Ruby.gba");
  expect(await screen.findByRole("button", { name: "Resume" })).toBeTruthy();
});

it("syncs every game once the one quit has synced, so a ROM upload held while it ran goes on", async () => {
  const sync = fakeSync({ account: "player@example.com" });
  const { paths } = launch({ sync });
  await openGame(paths, "Ruby");
  fireEvent.click(await screen.findByRole("button", { name: "Resume" }));
  sync.host.syncGame.mockClear();
  sync.host.syncAll.mockClear();
  let gameSynced = () => {};
  sync.host.syncGame.mockImplementation(
    () => new Promise((resolve) => (gameSynced = () => resolve({ conflicts: [] }))),
  );

  fireEvent.click(await screen.findByRole("button", { name: "Quit" }));

  expect(sync.host.syncGame).toHaveBeenCalledExactlyOnceWith("/games", "gba/Ruby.gba");
  await screen.findByRole("button", { name: "Resume" });
  expect(sync.host.syncAll).not.toHaveBeenCalled();
  gameSynced();
  await waitFor(() => expect(sync.host.syncAll).toHaveBeenCalledExactlyOnceWith("/games"));
});

it("syncs nothing on quit when signed out", async () => {
  const sync = fakeSync();
  const { paths } = launch({ sync });
  await openGame(paths, "Ruby");
  fireEvent.click(await screen.findByRole("button", { name: "Resume" }));

  fireEvent.click(await screen.findByRole("button", { name: "Quit" }));

  expect(await screen.findByRole("button", { name: "Resume" })).toBeTruthy();
  expect(sync.host.syncGame).not.toHaveBeenCalled();
  expect(sync.host.syncAll).not.toHaveBeenCalled();
});

it("puts focus back on the game just played", async () => {
  const { paths, back } = launch();
  await openGame(paths, "Ruby");
  fireEvent.click(await screen.findByRole("button", { name: "Resume" }));
  fireEvent.click(await screen.findByRole("button", { name: "Quit" }));
  await screen.findByRole("button", { name: "Resume" });

  back();

  const [card] = await screen.findAllByRole("button", { name: /Ruby/ });
  expect(card.closest("[data-section]")?.getAttribute("data-section")).toBe("continue");
  expect(document.activeElement).toBe(card);
});

it("resumes from the Continue card and comes back to it", async () => {
  const { paths, back } = launch();
  await openGame(paths, "Ruby");
  back();
  const card = await screen.findByRole("region", { name: "Continue" });

  fireEvent.click(await within(card).findByRole("button", { name: "Resume" }));
  expect(await screen.findByRole("heading", { name: "Playing Ruby from the resume state" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Quit" }));
  await screen.findByRole("heading", { name: "Ruby" });
  back();

  const [ruby] = await screen.findAllByRole("button", { name: /Ruby/ });
  expect(ruby.dataset.tile).toBe("continue:gba/Ruby.gba");
  expect(document.activeElement).toBe(ruby);
});

it("comes back to the Continue card from a game opened in Recently played", async () => {
  const { paths, back } = launch();
  await openGame(paths, "Ruby");
  back();
  fireEvent.click((await screen.findAllByRole("button", { name: /Emerald/ }))[0]);
  await screen.findByRole("heading", { name: "Emerald" });
  back();
  const recent = await screen.findByRole("region", { name: "Recently played" });
  fireEvent.click(within(recent).getByRole("button", { name: /Ruby/ }));
  await screen.findByRole("heading", { name: "Ruby" });

  back();

  await screen.findByRole("heading", { name: "pkhemu" });
  expect(document.activeElement?.getAttribute("data-tile")).toBe("continue:gba/Ruby.gba");
});

it("puts focus back on the tile tapped when coming straight back", async () => {
  const { paths, back } = launch();
  await openGame(paths, "Ruby");

  back();

  const tiles = await screen.findAllByRole("button", { name: /Ruby/ });
  const grid = tiles.find((tile) => tile.closest("[data-section]")?.getAttribute("data-section") === "gba");
  expect(document.activeElement).toBe(grid);
});

it("opens a game at the top and returns the library to where it was scrolled", async () => {
  const { paths, back } = launch();
  vi.stubGlobal("scrollY", 640);
  await openGame(paths, "Ruby");
  expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);

  back();

  await screen.findByRole("heading", { name: "pkhemu" });
  expect(window.scrollTo).toHaveBeenLastCalledWith(0, 640);
});

const boxArtPng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const boxArtUrl = "data:image/png;base64,iVBORw0KGgo=";

it("finds box art for a game a scan adds and shows it on the game's tile", async () => {
  const boxArt = fakeBoxArt({ "Nintendo - Game Boy Advance/Named_Boxarts/Pokemon - Emerald Version (USA, Europe).png": boxArtPng });
  const { paths } = launch({ boxArt });
  await chooseFolder();
  paths.push("gba/Pokemon Emerald.gba");
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

  const tile = await screen.findByRole("button", { name: /Emerald/ });

  await waitFor(() => expect(tile.querySelector("img")?.src).toBe(boxArtUrl));
});

it("finds box art for cloud-only games", async () => {
  const boxArt = fakeBoxArt({ "Nintendo - Game Boy Advance/Named_Boxarts/Pokemon - Sapphire Version (USA, Europe).png": boxArtPng });
  const sync = fakeSync({ account: "player@example.com", syncGames: true, cloudGames: ["gba/Pokemon Sapphire.gba"] });
  launch({ boxArt, sync });
  await makeFolder();

  const tile = await screen.findByRole("button", { name: /Sapphire/ });

  await waitFor(() => expect(tile.querySelector("img")?.src).toBe(boxArtUrl));
});

const cloudMark = (tile: HTMLElement) => within(tile).queryByRole("img", { name: "In the cloud" });

async function openCloudGame(sync: ReturnType<typeof fakeSync>, name: string) {
  await makeFolder();
  const tile = await screen.findByRole("button", { name: new RegExp(name) });
  expect(cloudMark(tile)).toBeTruthy();
  fireEvent.click(tile);
  await screen.findByRole("heading", { name });
  await waitFor(() => expect(sync.host.downloadRom).toHaveBeenCalledWith("/games", `gba/${name}.gba`));
}

it("shows cloud-only games while Sync games is off", async () => {
  launch({ sync: fakeSync({ account: "player@example.com", cloudGames: ["gba/Sapphire.gba"] }) });
  await makeFolder();

  expect(cloudMark(await screen.findByRole("button", { name: /Sapphire/ }))).toBeTruthy();
});

it("downloads a cloud-only game when it opens, with progress, then shows its page", async () => {
  const sync = fakeSync({ account: "player@example.com", syncGames: true, cloudGames: ["gba/Sapphire.gba"] });
  const { paths } = launch({ sync });
  await openCloudGame(sync, "Sapphire");
  expect(screen.queryByRole("alertdialog")).toBeNull();

  act(() => sync.progress({ path: "gba/Sapphire.gba", done: 256 * 1024, total: 1024 * 1024 }));
  expect(screen.getByRole("progressbar", { name: "Downloading" }).getAttribute("aria-valuenow")).toBe("25");
  paths.push("gba/Sapphire.gba");
  sync.host.syncGame.mockClear();
  await act(async () => sync.downloads[0].finish());

  expect(await screen.findByRole("button", { name: "Resume" })).toBeTruthy();
  expect(sync.host.syncGame).toHaveBeenCalledWith("/games", "gba/Sapphire.gba");
});

it("keeps a game cloud-only and says why when its download fails", async () => {
  const sync = fakeSync({ account: "player@example.com", syncGames: true, cloudGames: ["gba/Sapphire.gba"] });
  const { back } = launch({ sync });
  await openCloudGame(sync, "Sapphire");

  await act(async () => sync.downloads[0].fail("Your Google Drive couldn't be reached"));

  expect(await screen.findByText(/Your Google Drive couldn't be reached/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(sync.host.downloadRom).toHaveBeenCalledTimes(2));
  back();
  const tiles = await screen.findAllByRole("button", { name: /Sapphire/ });
  expect(tiles.every(cloudMark)).toBe(true);
});

it("asks before downloading a cloud-only game on mobile data, and Cancel downloads nothing", async () => {
  const sync = fakeSync({
    account: "player@example.com",
    syncGames: true,
    cloudGames: ["gba/Sapphire.gba"],
    metered: true,
    cloudSizes: { "gba/Sapphire.gba": 16 * 1024 * 1024 },
  });
  launch({ sync });
  await makeFolder();
  fireEvent.click(await screen.findByRole("button", { name: /Sapphire/ }));

  const dialog = await screen.findByRole("alertdialog", { name: /Sapphire \(16 MB\)/ });
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

  await waitFor(() => expect(screen.queryByRole("heading", { name: "Sapphire" })).toBeNull());
  expect(screen.getAllByRole("button", { name: /Sapphire/ }).every(cloudMark)).toBe(true);
  expect(sync.host.downloadRom).not.toHaveBeenCalled();
});

it("downloads a cloud-only game on mobile data once the player says so", async () => {
  const sync = fakeSync({
    account: "player@example.com",
    syncGames: true,
    cloudGames: ["gba/Sapphire.gba"],
    metered: true,
    cloudSizes: { "gba/Sapphire.gba": 16 * 1024 * 1024 },
  });
  launch({ sync });
  await makeFolder();
  fireEvent.click(await screen.findByRole("button", { name: /Sapphire/ }));

  const dialog = await screen.findByRole("alertdialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Download" }));

  await waitFor(() => expect(sync.host.downloadRom).toHaveBeenCalledWith("/games", "gba/Sapphire.gba"));
});

async function openMenuItem(name: string) {
  fireEvent.keyDown(screen.getByRole("button", { name: "More" }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("menuitem", { name }));
}

it("removes a game from this device and shows it as cloud-only", async () => {
  const sync = fakeSync({ account: "player@example.com", syncGames: true });
  const { paths } = launch({ sync });
  await openGame(paths, "Ruby");
  sync.host.removeFromDevice.mockImplementationOnce(async (_folder, path) => {
    paths.splice(paths.indexOf(path), 1);
    sync.host.cloudGames.mockResolvedValue([path]);
  });

  await openMenuItem("Remove from this device");

  await screen.findByRole("heading", { name: "pkhemu" });
  expect(sync.host.removeFromDevice).toHaveBeenCalledWith("/games", "gba/Ruby.gba");
  await waitFor(() => expect(screen.getAllByRole("button", { name: /Ruby/ }).every(cloudMark)).toBe(true));
});

it("offers Remove from this device only while Sync games is on", async () => {
  const { paths } = launch({ sync: fakeSync({ account: "player@example.com" }) });
  await openGame(paths, "Ruby");

  fireEvent.keyDown(screen.getByRole("button", { name: "More" }), { key: "Enter" });

  expect(await screen.findByRole("menuitem", { name: "Delete…" })).toBeTruthy();
  expect(screen.queryByRole("menuitem", { name: "Remove from this device" })).toBeNull();
});

it("deletes a game after asking and goes back to the library", async () => {
  const { paths, gamePageHost } = launch({ sync: fakeSync({ account: "player@example.com" }) });
  await openGame(paths, "Ruby");

  await openMenuItem("Delete…");
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));

  await screen.findByRole("heading", { name: "pkhemu" });
  expect(gamePageHost.deleteGame).toHaveBeenCalledWith("/games", "gba/Ruby.gba");
  await waitFor(() => expect(screen.queryByRole("button", { name: /Ruby/ })).toBeNull());
});
