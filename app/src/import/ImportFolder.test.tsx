import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createEngine } from "@pkhex-everywhere/engine";
import { EngineProvider } from "@pkhex-everywhere/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider, type BackHost } from "@/back/back";
import { BoxArtProvider } from "@/box-art/boxArt";
import { fakeBoxArt } from "@/box-art/fakeBoxArt";
import { fakeGameArt } from "@/game-art/fakeGameArt";
import { GameArtProvider } from "@/game-art/gameArt";
import type { GamePageHost } from "@/game-page/GamePage";
import { GamesFolderProvider, type GamesFolderHost } from "@/games-folder/gamesFolder";
import { Home } from "@/Home";
import { fakeFolder } from "@/library/fakeFolder";
import type { LibraryHost } from "@/library/library";
import { PreferencesProvider } from "@/preferences/preferences";
import { fakeSync } from "@/sync/fakeSync";
import { SyncProvider } from "@/sync/sync";
import { fakeImport } from "./fakeImport";
import type { FolderScan } from "./folder";
import { ImportProvider, type ExistingSave, type PickedFolder } from "./importFiles";
import type { ImportFile } from "./match";

vi.mock("@/splash", () => ({ hideSplash: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(async () => null) }));

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
  vi.unstubAllGlobals();
});

const file = (path: string, more: Partial<ImportFile> = {}): ImportFile => ({
  file: `/RetroArch/${path}`,
  name: path.slice(path.lastIndexOf("/") + 1),
  modified: 0,
  size: 1024 * 1024,
  ...more,
});
const retroArch: PickedFolder = { folder: "/RetroArch/roms", name: "roms" };
const retroArchSaves: PickedFolder = { folder: "/RetroArch/saves", name: "saves" };

function launch({
  games,
  onboarding = !games,
  folders,
  scans,
  sha1s,
  saves,
  onCopy,
  device = "phone",
}: {
  device?: GamesFolderHost["device"];
  games?: string[];
  onboarding?: boolean;
  folders: (PickedFolder | null)[];
  scans: Record<string, FolderScan>;
  sha1s?: Record<string, string>;
  saves?: Record<string, ExistingSave>;
  onCopy?(path: string): void | Promise<void>;
}) {
  const paths = [...(games ?? [])];
  const gamesFolderHost: GamesFolderHost = {
    pickFolder: async () => "/games",
    makeFolder: async () => "/games",
    findFolder: async () => "/games",
    listFolders: async () => [],
    ensureFolder: async (_parent, name) => void paths.push(`${name}/.keep`),
    folderExists: async () => true,
    loadSaved: async () => (onboarding ? null : "/games"),
    save: async () => {},
    device,
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
  const host = fakeImport({
    folders,
    scans,
    sha1s,
    saves,
    onCopy: async (path) => {
      await onCopy?.(path);
      paths.push(path);
    },
  });
  let pressBack = () => {};
  const backHost: BackHost = {
    listen: (handler) => {
      pressBack = handler;
      return () => {};
    },
    exit: vi.fn(),
  };
  const engine = createEngine({
    host: { ready: () => new Promise(() => {}), onChange: () => {}, onEvent: () => {}, getAssemblyExports: () => new Promise(() => {}) },
  });
  render(
    <EngineProvider engine={engine}>
      <PreferencesProvider
        host={{ load: async () => ({}), save: async () => {} }}
        defaults={{ touchControls: false, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, updateDismissedVersion: 0, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1, playInSilentMode: false, renderer: "automatic" }}
      >
        <GamesFolderProvider host={gamesFolderHost}>
          <SyncProvider host={fakeSync({ available: false }).host}>
            <BackProvider host={backHost}>
              <BoxArtProvider host={fakeBoxArt().host}>
                <GameArtProvider host={fakeGameArt().host}>
                  <ImportProvider host={host}>
                    <Home libraryHost={libraryHost} gamePageHost={{} as GamePageHost} />
                  </ImportProvider>
                </GameArtProvider>
              </BoxArtProvider>
            </BackProvider>
          </SyncProvider>
        </GamesFolderProvider>
      </PreferencesProvider>
    </EngineProvider>,
  );
  return { host, paths, back: () => act(pressBack), exit: backHost.exit };
}

async function importFolderFromLibrary() {
  const trigger = await screen.findByRole("button", { name: "Import" });
  act(() => {
    fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" });
  });
  fireEvent.click(await screen.findByRole("menuitem", { name: "Import folder" }));
}

const toast = () => screen.findByRole("status");
const listed = () =>
  within(screen.getByRole("list", { name: "Games found" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

it("imports a RetroArch folder with its saves from the welcome screen", async () => {
  const { host, paths } = launch({
    folders: [retroArch, retroArchSaves],
    scans: {
      [retroArch.folder]: { files: [file("roms/gba/Emerald.gba"), file("roms/gbc/Crystal.gbc"), file("roms/gbc/Crystal.sav")], other: 1 },
      [retroArchSaves.folder]: { files: [file("saves/Emerald.srm"), file("saves/Tetris.srm")], other: 0 },
    },
  });

  fireEvent.click(await screen.findByRole("button", { name: /I have ROMs on this phone/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Choose folder" }));

  expect(await screen.findByRole("heading", { name: "Found 2 games" })).toBeTruthy();
  expect(listed()).toEqual(["GBCCrystalSave", "GBAEmeraldNo save"]);
  expect(host.scan).toHaveBeenCalledWith(retroArch.folder, false);

  fireEvent.click(screen.getByRole("button", { name: "Add a folder with saves" }));

  await waitFor(() => expect(listed()).toEqual(["GBCCrystalSave", "GBAEmeraldSave"]));
  expect(screen.queryByRole("button", { name: "Add a folder with saves" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(await screen.findByRole("button", { name: "Make folder" }));

  expect((await toast()).textContent).toBe("Copied 2 games and 2 saves");
  expect(host.copyRom).toHaveBeenCalledWith("/games", "/RetroArch/roms/gba/Emerald.gba", "gba/Emerald.gba");
  expect(host.copyRom).toHaveBeenCalledWith("/games", "/RetroArch/roms/gbc/Crystal.gbc", "gbc/Crystal.gbc");
  expect(host.copySave).toHaveBeenCalledWith("/games", { file: file("saves/Emerald.srm"), game: "gba/Emerald.gba" });
  expect(host.copySave).toHaveBeenCalledWith("/games", { file: file("roms/gbc/Crystal.sav"), game: "gbc/Crystal.gbc" });
  expect(host.copySave).toHaveBeenCalledTimes(2);
  expect(paths).toEqual(expect.arrayContaining(["gba/Emerald.gba", "gbc/Crystal.gbc"]));
  expect(await screen.findByRole("button", { name: /Emerald/ })).toBeTruthy();
});

it("copies a Delta library under the games' own names, each save with its clock", async () => {
  const delta: PickedFolder = { folder: "/Delta/Database", name: "Database" };
  const sha1 = "c".repeat(40);
  const games = (name: string, more: Partial<ImportFile> = {}) => ({ ...file(`Games/${name}`, more), file: `/Delta/Database/Games/${name}` });
  const { host } = launch({
    games: ["gb/Red.gb"],
    folders: [delta],
    scans: { [delta.folder]: { files: [games(`${sha1}.gbc`, { title: "Crystal" }), games(`${sha1}.sav`), games(`${sha1}.rtc`)], other: 0 } },
  });

  await importFolderFromLibrary();
  expect(await screen.findByRole("heading", { name: "Found 1 game" })).toBeTruthy();
  expect(listed()).toEqual(["GBCCrystalSave"]);
  fireEvent.click(screen.getByRole("button", { name: "Copy 1 game" }));

  expect((await toast()).textContent).toBe("Copied 1 game and 1 save");
  expect(host.copyRom).toHaveBeenCalledWith("/games", `/Delta/Database/Games/${sha1}.gbc`, "gbc/Crystal.gbc");
  expect(host.copySave).toHaveBeenCalledWith("/games", { file: games(`${sha1}.sav`), game: "gbc/Crystal.gbc", clock: games(`${sha1}.rtc`) });
});

it("opens the picker straight from the library and copies what it found", async () => {
  const { host } = launch({
    games: ["gb/Red.gb"],
    folders: [retroArch],
    scans: { [retroArch.folder]: { files: [file("Emerald.gba"), file("Ruby.gba")], other: 0 } },
  });

  await importFolderFromLibrary();
  fireEvent.click(await screen.findByRole("button", { name: "Copy 2 games" }));

  expect((await toast()).textContent).toBe("Copied 2 games");
  expect(host.copyRom).toHaveBeenCalledTimes(2);
  expect(await screen.findByRole("button", { name: /Ruby/ })).toBeTruthy();
});

it("skips games the new folder already has when it was there before", async () => {
  const { host } = launch({
    games: ["gba/Emerald.gba"],
    onboarding: true,
    folders: [retroArch],
    scans: { [retroArch.folder]: { files: [file("Pokemon Emerald.gba", { sha1: "e1" }), file("Ruby.gba", { sha1: "r1" })], other: 0 } },
    sha1s: { "gba/Emerald.gba": "e1" },
  });

  fireEvent.click(await screen.findByRole("button", { name: /I have ROMs on this phone/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Choose folder" }));
  fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
  fireEvent.click(await screen.findByRole("button", { name: "Make folder" }));

  expect((await toast()).textContent).toBe("Copied 1 game");
  expect(host.scan).toHaveBeenLastCalledWith(retroArch.folder, true);
  expect(host.copyRom).toHaveBeenCalledTimes(1);
  expect(host.copyRom).toHaveBeenCalledWith("/games", "/RetroArch/Ruby.gba", "gba/Ruby.gba");
});

it("copies once however often the button is tapped", async () => {
  const { host } = launch({
    games: ["gba/Emerald.gba"],
    folders: [retroArch],
    scans: { [retroArch.folder]: { files: [file("Ruby.gba"), file("Emerald.srm")], other: 0 } },
    saves: { "gba/Emerald.gba": { modified: 1, same: true } },
  });

  await importFolderFromLibrary();
  const copy = await screen.findByRole("button", { name: "Copy 1 game" });
  fireEvent.click(copy);
  fireEvent.click(copy);

  await toast();
  expect(host.copyRom).toHaveBeenCalledTimes(1);
  expect(host.existingSave).toHaveBeenCalledTimes(1);
});

it("stays on the library when the picker is cancelled", async () => {
  const { host } = launch({ games: ["gb/Red.gb"], folders: [null], scans: {} });

  await importFolderFromLibrary();

  await waitFor(() => expect(host.pickFolder).toHaveBeenCalled());
  expect(host.scan).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: /Red/ })).toBeTruthy();
});

it("imports Delta's folder from the welcome screen on an iPhone", async () => {
  const delta: PickedFolder = { folder: "/Delta", name: "Delta" };
  const { host } = launch({
    device: "iPhone",
    folders: [delta],
    scans: { [delta.folder]: { files: [{ ...file("Games/Crystal.gbc"), file: "/Delta/Database/Games/Crystal.gbc" }], other: 0 } },
  });

  fireEvent.click(await screen.findByRole("button", { name: /I'm coming from Delta/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Choose folder" }));

  expect(await screen.findByRole("heading", { name: "Found 1 game" })).toBeTruthy();
  expect(host.scan).toHaveBeenCalledWith(delta.folder, false);
});

it("goes back from Delta's folder to the welcome screen", async () => {
  const { back } = launch({ device: "iPhone", folders: [], scans: {} });

  fireEvent.click(await screen.findByRole("button", { name: /I'm coming from Delta/ }));
  await screen.findByRole("button", { name: "Choose folder" });
  back();

  expect(await screen.findByRole("button", { name: /I'm coming from Delta/ })).toBeTruthy();
});

it("goes back from where the games are to the welcome screen", async () => {
  const { host, back } = launch({ folders: [], scans: {} });

  fireEvent.click(await screen.findByRole("button", { name: /I have ROMs on this phone/ }));
  await screen.findByRole("button", { name: "Choose folder" });
  back();

  expect(await screen.findByRole("button", { name: /I'm new to emulators/ })).toBeTruthy();
  expect(host.pickFolder).not.toHaveBeenCalled();
});

it("offers another folder when the one picked has no games", async () => {
  const downloads = { folder: "/Download", name: "Download" };
  const { host } = launch({
    folders: [downloads, retroArch],
    scans: {
      [downloads.folder]: { files: [file("Emerald.srm")], other: 4 },
      [retroArch.folder]: { files: [file("Emerald.gba")], other: 0 },
    },
  });

  fireEvent.click(await screen.findByRole("button", { name: /I have ROMs on this phone/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Choose folder" }));
  fireEvent.click(await screen.findByRole("button", { name: "Choose another folder" }));

  expect(await screen.findByRole("heading", { name: "Found 1 game" })).toBeTruthy();
  expect(host.scan).toHaveBeenLastCalledWith(retroArch.folder, false);
});

it("keeps the games copied so far when cancelled", async () => {
  let release = () => {};
  const { host, paths, back } = launch({
    games: ["gb/Red.gb"],
    folders: [retroArch],
    scans: { [retroArch.folder]: { files: [file("Crystal.gbc"), file("Emerald.gba"), file("Ruby.gba")], other: 0 } },
    onCopy: (path) => (path === "gbc/Crystal.gbc" ? new Promise<void>((resolve) => (release = resolve)) : undefined),
  });

  await importFolderFromLibrary();
  fireEvent.click(await screen.findByRole("button", { name: "Copy 3 games" }));
  expect(await screen.findByRole("heading", { name: "Copying games" })).toBeTruthy();
  back();
  expect(screen.getByRole("heading", { name: "Copying games" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  release();

  expect((await toast()).textContent).toBe("Copied 1 of 3 games");
  expect(host.copyRom).toHaveBeenCalledTimes(1);
  expect(paths).toContain("gbc/Crystal.gbc");
});

it("asks once about saves pkhemu has, and replaces only the ticked ones", async () => {
  const { host } = launch({
    games: ["gba/Emerald.gba", "gba/Ruby.gba", "gba/Sapphire.gba"],
    folders: [retroArch],
    scans: {
      [retroArch.folder]: {
        files: [file("Emerald.gba", { sha1: "e1" }), file("Emerald.srm"), file("Ruby.srm"), file("Sapphire.srm")],
        other: 0,
      },
    },
    sha1s: { "gba/Emerald.gba": "e1", "gba/Ruby.gba": "r1", "gba/Sapphire.gba": "s1" },
    saves: {
      "gba/Emerald.gba": { modified: 1, same: false },
      "gba/Ruby.gba": { modified: 1, same: false },
      "gba/Sapphire.gba": { modified: 1, same: true },
    },
  });

  await importFolderFromLibrary();
  fireEvent.click(await screen.findByRole("button", { name: "Copy 3 saves" }));

  expect(await screen.findByRole("heading", { name: "2 saves are already in pkhemu" })).toBeTruthy();
  const boxes = screen.getAllByRole("checkbox");
  expect(boxes.map((box) => box.getAttribute("aria-checked"))).toEqual(["false", "false"]);
  fireEvent.click(screen.getByRole("checkbox", { name: /Ruby/ }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  expect((await toast()).textContent).toBe("Copied 1 save");
  expect(host.copyRom).not.toHaveBeenCalled();
  expect(host.copySave).toHaveBeenCalledTimes(1);
  expect(host.copySave).toHaveBeenCalledWith("/games", { file: file("Ruby.srm"), game: "gba/Ruby.gba" });
});

it("hashes the ROMs it finds only when the library has games to compare them with", async () => {
  const { host } = launch({
    games: ["gb/Red.gb"],
    folders: [retroArch],
    scans: { [retroArch.folder]: { files: [file("Emerald.gba")], other: 0 } },
    sha1s: { "gb/Red.gb": "r1" },
  });

  await importFolderFromLibrary();

  await screen.findByRole("heading", { name: "Found 1 game" });
  expect(host.scan).toHaveBeenCalledWith(retroArch.folder, true);
});

it("goes back from the summary to the library without copying", async () => {
  const { host, back } = launch({
    games: ["gb/Red.gb"],
    folders: [retroArch],
    scans: { [retroArch.folder]: { files: [file("Emerald.gba")], other: 0 } },
  });

  await importFolderFromLibrary();
  await screen.findByRole("heading", { name: "Found 1 game" });
  back();

  expect(await screen.findByRole("button", { name: /Red/ })).toBeTruthy();
  expect(host.copyRom).not.toHaveBeenCalled();
});
