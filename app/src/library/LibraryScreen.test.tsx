import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EngineProvider } from "@pkhex-everywhere/react";
import { BackProvider, type BackHost } from "@/back/back";
import { fakeBackHost } from "@/back/fakeBackHost";
import { BoxArtProvider } from "@/box-art/boxArt";
import { fakeBoxArt } from "@/box-art/fakeBoxArt";
import { fakeEngine } from "@/editor/fakeEngine";
import { fakePads, padButtons } from "@/input/fakePads";
import { GamesFolderProvider, type GamesFolderHost } from "@/games-folder/gamesFolder";
import { createInput } from "@/input/input";
import { PadNavigation } from "@/pad-navigation/PadNavigation";
import type { ConflictSaveHost } from "@/sync/ConflictSheet";
import { fakeSync } from "@/sync/fakeSync";
import { TICK_MS } from "@/sync/gameStatus";
import { SyncProvider, type Conflict } from "@/sync/sync";
import { fakeFolder } from "./fakeFolder";
import type { Start } from "@/game-page/GamePage";
import { systems } from "@/systems";
import { LibraryProvider, type LibraryHost, type OpenedFrom } from "./library";
import { LibraryScreen } from "./LibraryScreen";
import type { Game } from "./scan";

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const gamesFolder: GamesFolderHost = {
  pickFolder: async () => "/games",
  makeFolder: async () => "/games",
  findFolder: async () => "/games",
  listFolders: async () => [],
  ensureFolder: async () => {},
  folderExists: async () => true,
  loadSaved: async () => "/games",
  save: async () => {},
  label: (folder) => folder,
  device: "phone",
};

function renderLibrary(
  paths: string[],
  {
    pads = () => [],
    boxArt = fakeBoxArt(),
    screenshots = {},
    recent = [],
    sync = fakeSync({ available: false }),
    resumes = [],
    lastPlayed = {},
    back,
  }: {
    pads?: () => (Gamepad | null)[];
    boxArt?: ReturnType<typeof fakeBoxArt>;
    screenshots?: Record<string, number[]>;
    recent?: string[];
    sync?: ReturnType<typeof fakeSync>;
    resumes?: string[];
    lastPlayed?: Record<string, number>;
    back?: BackHost;
  } = {},
) {
  const list = fakeFolder(paths);
  const host: LibraryHost = {
    listDir: (_folder, path) => list(path),
    recentlyPlayed: async () => recent,
    scanGameArt: async () => {},
    resumeScreenshot: vi.fn(async (_folder: string, path: string) => screenshots[path] ?? null),
    hasResumeState: async (_folder, path) => resumes.includes(path),
    playHistory: async (path) => ({ lastPlayed: lastPlayed[path] ?? null, playTime: 0 }),
  };
  const saveHost = {
    readSave: vi.fn(async () => null),
    saveSummary: vi.fn(async () => null),
    keepSaveSummary: vi.fn(async () => {}),
    saveFormat: vi.fn(async () => null),
    stateScreenshot: vi.fn(async () => null),
  } satisfies ConflictSaveHost;
  const { engine } = fakeEngine();
  const onOpen = vi.fn<(game: Game, from?: OpenedFrom) => void>();
  const onPlay = vi.fn<(game: Game, start: Start, from: OpenedFrom) => void>();
  const onSettings = vi.fn();
  const tree = (key: number) => (
    <EngineProvider engine={engine}>
      <GamesFolderProvider host={gamesFolder}>
        <SyncProvider host={sync.host}>
          <BoxArtProvider host={boxArt.host}>
            <BackProvider host={back}>
              <LibraryProvider host={host} folder="/games" onOpen={onOpen} onPlay={onPlay}>
                <PadNavigation input={createInput(pads)} />
                <LibraryScreen key={key} host={saveHost} folder="/games" systems={systems} onSettings={onSettings} />
              </LibraryProvider>
            </BackProvider>
          </BoxArtProvider>
        </SyncProvider>
      </GamesFolderProvider>
    </EngineProvider>
  );
  const { rerender } = render(tree(0));
  return { onOpen, onPlay, onSettings, host, remount: () => rerender(tree(1)) };
}

const tileOf = (button: HTMLElement) => button.parentElement!;

const continueCard = () => within(screen.getByRole("region", { name: "Continue" })).getAllByRole("button")[0];
const continueButton = () => within(screen.getByRole("region", { name: "Continue" })).getAllByRole("button")[1];

const gamesIn = (section: HTMLElement) =>
  within(section)
    .getAllByRole("button")
    .map((button) => button.dataset.game);

it("shows games by system, hacks in their own section, and counts loose games", async () => {
  renderLibrary([
    "Loose.gba",
    "gb/Red.gb",
    "gba/Emerald.gba",
    "gba/Emerald.sav",
    "gba/Emerald/states/resume.state",
    "gba/hacks/Radical Red.gba",
  ]);

  const sections = await screen.findAllByRole("region");

  expect(sections.map((section) => section.dataset.section)).toEqual(["gb", "gba", "gba/hacks"]);
  expect(sections.map(gamesIn)).toEqual([
    ["gb/Red.gb"],
    ["gba/Emerald.gba"],
    ["gba/hacks/Radical Red.gba"],
  ]);
  expect(screen.getByTestId("outside-system-folders").textContent).toMatch(/\b1\b/);
});

it("lists an N64 game under Nintendo 64", async () => {
  renderLibrary(["nds/HeartGold.nds", "n64/Stadium.z64"]);

  const section = await screen.findByRole("region", { name: "Nintendo 64" });

  expect(gamesIn(section)).toEqual(["n64/Stadium.z64"]);
});

it("opens a tapped game and continues it from the top of the library", async () => {
  const { onOpen } = renderLibrary(["gb/Red.gb"]);
  const [red] = await screen.findAllByRole("button", { name: /Red/ });

  act(() => fireEvent.click(red));

  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ path: "gb/Red.gb" }), expect.anything());
  const sections = screen.getAllByRole("region");
  expect(sections.map((section) => section.dataset.section)).toEqual(["continue", "gb"]);
  expect(continueCard().dataset.game).toBe("gb/Red.gb");
});

it("hands the tapped tile and its last screen to the game it opens", async () => {
  const { onOpen } = renderLibrary(["gba/Emerald.gba"], { screenshots: { "gba/Emerald.gba": [137, 80, 78, 71] } });
  const tile = await screen.findByRole("button", { name: /Emerald/ });
  await waitFor(() => expect(tile.querySelector("img")).toBeTruthy());

  act(() => fireEvent.click(tile));

  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ path: "gba/Emerald.gba" }), {
    tile: "grid:gba/Emerald.gba",
    screenshot: "data:image/png;base64,iVBORw==",
  });
});

it("rescans when the window gets focus", async () => {
  const paths = ["gb/Red.gb"];
  renderLibrary(paths);
  await screen.findByRole("region");
  paths.push("gbc/Crystal.gbc");

  fireEvent.focus(window);

  expect(await screen.findByRole("button", { name: /Crystal/ })).toBeTruthy();
});

it("has no refresh button in the header", async () => {
  renderLibrary(["gb/Red.gb"]);
  await screen.findByRole("region");

  expect(screen.queryByRole("button", { name: "Refresh" })).toBeNull();
});

it("opens settings from the header", async () => {
  const { onSettings } = renderLibrary(["gb/Red.gb"]);

  fireEvent.click(screen.getByRole("button", { name: "Settings" }));

  expect(onSettings).toHaveBeenCalled();
});

it("launches a game with a gamepad alone", async () => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  Element.prototype.scrollIntoView = () => {};
  const pads = fakePads();
  const { onOpen } = renderLibrary(["gb/Red.gb"], { pads: pads.gamepads });
  await screen.findByRole("region");
  pads.hold();

  pads.press(padButtons.down);
  pads.press(padButtons.a);

  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ path: "gb/Red.gb" }), expect.anything());
});

it("shows cached box art on a game's tile, and its name otherwise", async () => {
  const boxArt = fakeBoxArt({ "Nintendo - Game Boy/Named_Boxarts/Pokemon - Blue Version (USA, Europe) (SGB Enhanced).png": new Uint8Array([1]) });
  const download = vi.spyOn(boxArt.host, "download");
  boxArt.cache.set("gb/Pokemon - Red Version (USA, Europe) (SGB Enhanced)", new Uint8Array([137, 80, 78, 71]));

  renderLibrary(["gb/Pokemon - Red Version (USA, Europe) (SGB Enhanced).gb", "gb/Pokemon - Blue Version (USA, Europe) (SGB Enhanced).gb"], { boxArt });

  const red = await screen.findByRole("button", { name: /Red Version/ });
  await waitFor(() => expect(red.querySelector("img")?.src).toBe("data:image/png;base64,iVBORw=="));
  expect(screen.getByRole("button", { name: /Blue Version/ }).querySelector("img")).toBeNull();
  expect(download).not.toHaveBeenCalled();
});

const shown = (element: HTMLElement) => !element.closest(".sr-only");

it("shows the system chip but not the name on a tile with box art", async () => {
  const boxArt = fakeBoxArt();
  boxArt.cache.set("gb/Pokemon - Red Version (USA, Europe) (SGB Enhanced)", new Uint8Array([137, 80, 78, 71]));
  renderLibrary(["gb/Pokemon - Red Version (USA, Europe) (SGB Enhanced).gb"], { boxArt });

  const red = await screen.findByRole("button", { name: /Red Version/ });
  await waitFor(() => expect(red.querySelector("img")).toBeTruthy());

  expect(shown(within(red).getByText("GB"))).toBe(true);
  expect(shown(within(red).getByText(/Red Version/))).toBe(false);
});

it("shows a game's last screen on the Continue card and its tile", async () => {
  renderLibrary(["gba/Emerald.gba"], { screenshots: { "gba/Emerald.gba": [137, 80, 78, 71] }, recent: ["gba/Emerald.gba"] });

  const tiles = await screen.findAllByRole("button", { name: /Emerald/ });

  expect(tiles).toHaveLength(2);
  for (const tile of tiles) {
    await waitFor(() => expect(tile.querySelector("img")?.src).toBe("data:image/png;base64,iVBORw=="));
    expect(shown(within(tile).getByText("GBA"))).toBe(true);
    expect(shown(within(tile).getByText("Emerald"))).toBe(true);
  }
});

it("shows a DS game's top screen on the Continue card and its tile", async () => {
  renderLibrary(["nds/Platinum.nds"], { screenshots: { "nds/Platinum.nds": [137, 80, 78, 71] }, recent: ["nds/Platinum.nds"] });

  const tiles = await screen.findAllByRole("button", { name: /Platinum/ });

  expect(tiles).toHaveLength(2);
  for (const tile of tiles) {
    await waitFor(() => expect(tile.querySelector("img")?.style.height).toBe("200%"));
  }
});

it("shows a tile's last screen as soon as the library shows again", async () => {
  const { remount } = renderLibrary(["gba/Emerald.gba"], { screenshots: { "gba/Emerald.gba": [137, 80, 78, 71] } });
  const tile = await screen.findByRole("button", { name: /Emerald/ });
  await waitFor(() => expect(tile.querySelector("img")).toBeTruthy());

  remount();

  expect(screen.getByRole("button", { name: /Emerald/ }).querySelector("img")?.src).toBe("data:image/png;base64,iVBORw==");
});

it("shows the name alone on a game without a last screen", async () => {
  const { host } = renderLibrary(["gb/Red.gb"]);

  const red = await screen.findByRole("button", { name: /Red/ });

  await waitFor(() => expect(host.resumeScreenshot).toHaveBeenCalledWith("/games", "gb/Red.gb"));
  expect(red.querySelector("img")).toBeNull();
  expect(red.textContent).toContain("Red");
});

it("reads a visible tile's last screen again on refresh", async () => {
  const { host } = renderLibrary(["gb/Red.gb"]);
  await screen.findByRole("button", { name: /Red/ });
  await waitFor(() => expect(host.resumeScreenshot).toHaveBeenCalledTimes(1));

  fireEvent.focus(window);

  await waitFor(() => expect(host.resumeScreenshot).toHaveBeenCalledTimes(2));
});

it("marks a game that's only in the cloud", async () => {
  const sync = fakeSync({ account: "player@example.com", syncGames: true, cloudGames: ["gba/Ruby.gba"] });
  renderLibrary(["gba/Emerald.gba"], { sync });

  const ruby = tileOf(await screen.findByRole("button", { name: /Ruby/ }));

  expect(within(ruby).getByRole("img", { name: "In the cloud" })).toBeTruthy();
  expect(within(tileOf(screen.getByRole("button", { name: /Emerald/ }))).queryByRole("img", { name: "In the cloud" })).toBeNull();
});

it("shows a cloud-only game's chosen box art and follows a change sync brings down", async () => {
  const sync = fakeSync({ account: "player@example.com", syncGames: true, cloudGames: ["gba/Ruby.gba"] });
  const boxArt = fakeBoxArt();
  boxArt.choose("gba/Ruby.gba", { kind: "image", url: "data:image/png;base64,cnVieQ==" });
  renderLibrary(["gba/Emerald.gba"], { sync, boxArt });

  const ruby = await screen.findByRole("button", { name: /Ruby/ });
  await waitFor(() => expect(ruby.querySelector("img")?.src).toBe("data:image/png;base64,cnVieQ=="));

  act(() => boxArt.choose("gba/Ruby.gba", { kind: "none" }));
  await waitFor(() => expect(ruby.querySelector("img")).toBeNull());
});

const signedIn = (options: Parameters<typeof fakeSync>[0] = {}) => fakeSync({ account: "player@example.com", ...options });

it.each([
  [{ state: "transferring", done: 46, total: 100, stage: "uploadingRom" }, "progressbar", "Uploading ROM · 46%"],
  [{ state: "queued" }, "img", "Waiting to sync"],
  [{ state: "waiting", reason: "mobileData" }, "img", "Waiting for Wi-Fi"],
  [{ state: "waiting", reason: "offline" }, "img", "Waiting for a connection"],
  [{ state: "waiting", reason: "stopped" }, "img", "Sync stopped"],
  [{ state: "conflict" }, "button", "Changed on another device. Choose a version to keep"],
  [{ state: "error", message: "Your Google Drive is full" }, "img", "Your Google Drive is full"],
] as const)("badges a tile while its game syncs: %o", async (game, role, label) => {
  const sync = signedIn();
  renderLibrary(["gba/Emerald.gba"], { sync });
  const emerald = tileOf(await screen.findByRole("button", { name: /Emerald/ }));

  await act(async () => sync.game({ path: "gba/Emerald.gba", ...game }));

  expect(within(emerald).getByRole(role, { name: label })).toBeTruthy();
});

it("shows no badge on a game in sync", async () => {
  const sync = signedIn();
  renderLibrary(["gba/Emerald.gba"], { sync });
  const emerald = tileOf(await screen.findByRole("button", { name: /Emerald/ }));

  await act(async () => sync.game({ path: "gba/Emerald.gba", state: "synced", lastSynced: 1_000 }));

  expect(within(emerald).queryByRole("img")).toBeNull();
  expect(within(emerald).queryByRole("progressbar")).toBeNull();
});

it("fills the ring by bytes, then ticks and goes away once the game is in sync", async () => {
  const sync = signedIn();
  renderLibrary(["gba/Emerald.gba"], { sync });
  const emerald = tileOf(await screen.findByRole("button", { name: /Emerald/ }));

  await act(async () => sync.game({ path: "gba/Emerald.gba", state: "transferring", done: 1, total: 4, stage: "uploadingSaves" }));
  expect(within(emerald).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("25");

  await act(async () => sync.game({ path: "gba/Emerald.gba", state: "transferring", done: 3, total: 4, stage: "uploadingSaves" }));
  expect(within(emerald).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("75");

  vi.useFakeTimers();
  await act(async () => sync.game({ path: "gba/Emerald.gba", state: "synced", lastSynced: 1_000 }));
  expect(within(emerald).getByRole("img", { name: "Synced" })).toBeTruthy();

  act(() => vi.advanceTimersByTime(TICK_MS));
  expect(within(emerald).queryByRole("img", { name: "Synced" })).toBeNull();
});

it("shows no tick when a transfer ends in an error", async () => {
  const sync = signedIn();
  renderLibrary(["gba/Emerald.gba"], { sync });
  const emerald = tileOf(await screen.findByRole("button", { name: /Emerald/ }));

  await act(async () => sync.game({ path: "gba/Emerald.gba", state: "transferring", done: 1, total: 4, stage: "uploadingSaves" }));
  await act(async () => sync.game({ path: "gba/Emerald.gba", state: "error", message: "No connection" }));

  expect(within(emerald).getByRole("img", { name: "No connection" })).toBeTruthy();
  expect(within(emerald).queryByRole("img", { name: "Synced" })).toBeNull();
});

it("keeps a cloud-only game's cloud and rings it only while its ROM downloads", async () => {
  const sync = signedIn({ syncGames: true, cloudGames: ["gba/Ruby.gba"] });
  renderLibrary(["gba/Emerald.gba"], { sync });
  const ruby = tileOf(await screen.findByRole("button", { name: /Ruby/ }));

  await act(async () => sync.game({ path: "gba/Ruby.gba", state: "queued" }));
  expect(within(ruby).getByRole("img", { name: "In the cloud" })).toBeTruthy();
  expect(within(ruby).queryByRole("img", { name: "Waiting to sync" })).toBeNull();

  await act(async () => sync.progress({ path: "gba/Ruby.gba", done: 4, total: 16 }));
  expect(within(ruby).getByRole("img", { name: "In the cloud" })).toBeTruthy();
  expect(within(ruby).getByRole("progressbar", { name: "Downloading ROM · 25%" })).toBeTruthy();
});

const saveConflict: Conflict = {
  file: "save",
  device: { savedOn: "Pixel 10", modified: 1_000, cheats: false },
  cloud: { savedOn: "MacBook Air", modified: 2_000, cheats: false },
};

async function conflictedTile(back?: BackHost) {
  const sync = signedIn({ conflicts: [saveConflict] });
  const library = renderLibrary(["gba/Emerald.gba"], { sync, back });
  const emerald = tileOf(await screen.findByRole("button", { name: /Emerald/ }));
  await act(async () => sync.game({ path: "gba/Emerald.gba", state: "conflict" }));
  const badge = within(emerald).getAllByRole("button").find((button) => !button.dataset.game)!;
  return { ...library, sync, badge };
}

it("opens the conflict sheet from a tile's conflict badge, and not the game", async () => {
  const { onOpen, badge } = await conflictedTile();

  await act(async () => fireEvent.click(badge));

  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(onOpen).not.toHaveBeenCalled();
});

it("closes the conflict sheet on back instead of leaving the app", async () => {
  const back = fakeBackHost();
  const { badge } = await conflictedTile(back.host);
  await act(async () => fireEvent.click(badge));

  back.press();

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(back.exits()).toBe(0);
});

it("syncs the game again once a version is picked from the tile, and closes the sheet", async () => {
  const { sync, badge } = await conflictedTile();
  await act(async () => fireEvent.click(badge));
  const [device] = within(screen.getByRole("group")).getAllByRole("button");

  await act(async () => fireEvent.click(device));

  expect(sync.host.resolve).toHaveBeenCalledExactlyOnceWith("/games", "gba/Emerald.gba", "save", "device");
  expect(sync.host.syncGame).toHaveBeenCalledExactlyOnceWith("/games", "gba/Emerald.gba");
  expect(sync.host.resolve.mock.invocationCallOrder[0]).toBeLessThan(sync.host.syncGame.mock.invocationCallOrder[0]);
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("opens the game from a tile's badge that isn't a conflict", async () => {
  const sync = signedIn();
  const { onOpen } = renderLibrary(["gba/Emerald.gba"], { sync });
  const emerald = tileOf(await screen.findByRole("button", { name: /Emerald/ }));
  await act(async () => sync.game({ path: "gba/Emerald.gba", state: "waiting", reason: "offline" }));

  act(() => fireEvent.click(within(emerald).getByRole("img")));

  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ path: "gba/Emerald.gba" }), expect.anything());
});

const syncRing = () => screen.queryByRole("button", { name: /^(Checking|Syncing)/ });

it("shows no sync ring in the header while sync is idle", async () => {
  const sync = signedIn();
  renderLibrary(["gba/Emerald.gba"], { sync });
  await screen.findByRole("button", { name: /Emerald/ });

  await act(async () => sync.report({ syncing: false, lastSynced: 1_000 }));

  expect(syncRing()).toBeNull();
});

it("spins the header ring while sync checks, and fills it by bytes while it transfers", async () => {
  const sync = signedIn();
  renderLibrary(["gba/Emerald.gba"], { sync });
  await screen.findByRole("button", { name: /Emerald/ });

  await act(async () => sync.report({ syncing: true }));
  await act(async () => sync.runProgress({ phase: "checking", done: 4, total: 12 }));
  expect(screen.getByRole("button", { name: "Checking · 4 of 12 games" })).toBeTruthy();

  await act(async () => sync.runProgress({ phase: "transferring", done: 46, total: 100, waitingRoms: [] }));
  expect(screen.getByRole("button", { name: "Syncing · 46%" })).toBeTruthy();
});

it("warns in the header about a problem with the account", async () => {
  const sync = signedIn();
  renderLibrary(["gba/Emerald.gba"], { sync });
  await screen.findByRole("button", { name: /Emerald/ });

  await act(async () => sync.report({ syncing: true }));
  await act(async () =>
    sync.report({ syncing: false, error: "Sign in to Google Drive again", accountError: "Sign in to Google Drive again" }),
  );

  expect(screen.getByRole("button", { name: "Sign in to Google Drive again" })).toBeTruthy();
});

it("doesn't warn in the header while offline", async () => {
  const sync = signedIn();
  renderLibrary(["gba/Emerald.gba"], { sync });
  await screen.findByRole("button", { name: /Emerald/ });

  await act(async () => sync.report({ syncing: true }));
  await act(async () => sync.report({ syncing: false, error: "No connection. pkhemu will try again" }));

  expect(syncRing()).toBeNull();
  expect(screen.queryByRole("button", { name: "No connection. pkhemu will try again" })).toBeNull();
});

it("opens Settings from the header ring", async () => {
  const sync = signedIn();
  const { onSettings } = renderLibrary(["gba/Emerald.gba"], { sync });
  await screen.findByRole("button", { name: /Emerald/ });

  await act(async () => sync.report({ syncing: true }));
  await act(async () => sync.runProgress({ phase: "transferring", done: 46, total: 100, waitingRoms: [] }));
  fireEvent.click(screen.getByRole("button", { name: "Syncing · 46%" }));

  expect(onSettings).toHaveBeenCalled();
});

const hoursAgo = (hours: number) => Date.now() - hours * 3600 * 1000;

it("continues the last game played and leaves it out of recently played", async () => {
  renderLibrary(["gba/Emerald.gba", "gba/Ruby.gba"], {
    recent: ["gba/Emerald.gba", "gba/Ruby.gba"],
    screenshots: { "gba/Emerald.gba": [137, 80, 78, 71] },
    lastPlayed: { "gba/Emerald.gba": hoursAgo(2) },
  });

  const card = await screen.findByRole("region", { name: "Continue" });

  await waitFor(() => expect(continueCard().querySelector("img")?.src).toBe("data:image/png;base64,iVBORw=="));
  expect(card.textContent).toContain("GBA");
  expect(card.textContent).toContain("Emerald");
  expect(card.textContent).toMatch(/2 hours ago/);
  const sections = screen.getAllByRole("region");
  expect(sections.map((section) => section.dataset.section)).toEqual(["continue", "recent", "gba"]);
  expect(gamesIn(sections[1])).toEqual(["gba/Ruby.gba"]);
});

it("hides recently played when the Continue card has its only game", async () => {
  renderLibrary(["gba/Emerald.gba"], { recent: ["gba/Emerald.gba"] });

  await screen.findByRole("region", { name: "Continue" });

  expect(screen.getAllByRole("region").map((section) => section.dataset.section)).toEqual(["continue", "gba"]);
});

it("shows no Continue card when nothing has been played", async () => {
  renderLibrary(["gba/Emerald.gba"]);

  await screen.findByRole("button", { name: /Emerald/ });

  expect(screen.queryByRole("region", { name: "Continue" })).toBeNull();
});

it("resumes the last game from its resume point", async () => {
  const { onPlay } = renderLibrary(["gba/Emerald.gba"], {
    recent: ["gba/Emerald.gba"],
    resumes: ["gba/Emerald.gba"],
    screenshots: { "gba/Emerald.gba": [137, 80, 78, 71] },
  });
  await waitFor(() => expect(continueButton().textContent).toBe("Resume"));
  await waitFor(() => expect(continueCard().querySelector("img")).toBeTruthy());

  fireEvent.click(continueButton());

  await waitFor(() => expect(onPlay).toHaveBeenCalled());
  expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({ path: "gba/Emerald.gba" }), "resume", {
    tile: "continue:gba/Emerald.gba",
    screenshot: "data:image/png;base64,iVBORw==",
  });
});

it("plays the last game from its save when it has no resume point", async () => {
  const { onPlay } = renderLibrary(["gba/Emerald.gba"], { recent: ["gba/Emerald.gba"] });
  await waitFor(() => expect(continueButton().textContent).toBe("Play"));

  fireEvent.click(continueButton());

  await waitFor(() => expect(onPlay).toHaveBeenCalled());
  expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({ path: "gba/Emerald.gba" }), "new", { tile: "continue:gba/Emerald.gba" });
});

it("opens the last game's page from the card around the button", async () => {
  const { onOpen, onPlay } = renderLibrary(["gba/Emerald.gba"], {
    recent: ["gba/Emerald.gba"],
    screenshots: { "gba/Emerald.gba": [137, 80, 78, 71] },
  });
  await waitFor(() => expect(continueCard().querySelector("img")).toBeTruthy());

  fireEvent.click(continueCard());
  fireEvent.click(screen.getByRole("region", { name: "Continue" }));

  expect(onOpen).toHaveBeenCalledTimes(2);
  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ path: "gba/Emerald.gba" }), {
    tile: "continue:gba/Emerald.gba",
    screenshot: "data:image/png;base64,iVBORw==",
  });
  expect(onPlay).not.toHaveBeenCalled();
});

it("opens a cloud-only last game's page from its button, so the download asks first", async () => {
  const sync = signedIn({ syncGames: true, cloudGames: ["gba/Ruby.gba"] });
  const { onOpen, onPlay } = renderLibrary(["gba/Emerald.gba"], { recent: ["gba/Ruby.gba"], sync });
  await screen.findByRole("region", { name: "Continue" });

  expect(within(continueCard()).getByRole("img", { name: "In the cloud" })).toBeTruthy();
  fireEvent.click(continueButton());

  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ path: "gba/Ruby.gba" }), { tile: "continue:gba/Ruby.gba" });
  expect(onPlay).not.toHaveBeenCalled();
});

it("reaches the Continue card and its button with the D-pad", async () => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  Element.prototype.scrollIntoView = () => {};
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const at: Record<string, number> = { "continue:gba/Emerald.gba": 0, Resume: 112, "grid:gba/Emerald.gba": 200 };
    const y = at[this.dataset.tile ?? this.textContent ?? ""];
    return y === undefined ? new DOMRect() : new DOMRect(0, y, 300, 80);
  });
  const pads = fakePads();
  const { onPlay } = renderLibrary(["gba/Emerald.gba"], { pads: pads.gamepads, recent: ["gba/Emerald.gba"], resumes: ["gba/Emerald.gba"] });
  await waitFor(() => expect(continueButton().textContent).toBe("Resume"));
  pads.hold();

  pads.press(padButtons.down);
  expect(document.activeElement).toBe(continueCard());
  pads.press(padButtons.down);
  expect(document.activeElement).toBe(continueButton());
  pads.press(padButtons.down);
  expect(document.activeElement?.getAttribute("data-tile")).toBe("grid:gba/Emerald.gba");
  pads.press(padButtons.up);
  pads.press(padButtons.a);

  await waitFor(() => expect(onPlay).toHaveBeenCalled());
  expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({ path: "gba/Emerald.gba" }), "resume", expect.anything());
});

const longPress = async (element: HTMLElement) => {
  fireEvent.pointerDown(element, { pointerType: "touch", button: 0, clientX: 10, clientY: 10 });
  await act(() => new Promise((resolve) => setTimeout(resolve, 600)));
  fireEvent.pointerUp(element, { pointerType: "touch", button: 0, clientX: 10, clientY: 10 });
  fireEvent.click(element);
};

it("opens the box art sheet on a long press without opening the game", async () => {
  const { onOpen } = renderLibrary(["gba/Emerald.gba"]);
  const tile = await screen.findByRole("button", { name: /Emerald/ });

  await longPress(tile);

  expect(await screen.findByRole("dialog", { name: "Box art" })).toBeTruthy();
  expect(onOpen).not.toHaveBeenCalled();
});

it("opens the box art sheet on a long press on a tile's badge", async () => {
  const sync = signedIn();
  const { onOpen } = renderLibrary(["gba/Emerald.gba"], { sync });
  const emerald = tileOf(await screen.findByRole("button", { name: /Emerald/ }));
  await act(async () => sync.game({ path: "gba/Emerald.gba", state: "waiting", reason: "offline" }));

  await longPress(within(emerald).getByRole("img"));

  expect(await screen.findByRole("dialog", { name: "Box art" })).toBeTruthy();
  expect(onOpen).not.toHaveBeenCalled();
});

it("holds back the browser's own long press on the sheet it opened", async () => {
  renderLibrary(["gba/Emerald.gba"]);
  const tile = await screen.findByRole("button", { name: /Emerald/ });
  fireEvent.pointerDown(tile, { pointerType: "touch", button: 0 });
  await act(() => new Promise((resolve) => setTimeout(resolve, 600)));
  const sheet = await screen.findByRole("dialog", { name: "Box art" });

  expect(fireEvent.contextMenu(sheet)).toBe(false);
  fireEvent.pointerUp(sheet, { pointerType: "touch", button: 0 });
  expect(fireEvent.contextMenu(sheet)).toBe(true);
});

it("opens the game on a click after a long click released over the box art sheet", async () => {
  const { onOpen } = renderLibrary(["gba/Emerald.gba"]);
  const tile = await screen.findByRole("button", { name: /Emerald/ });
  fireEvent.pointerDown(tile, { pointerType: "mouse", button: 0 });
  await act(() => new Promise((resolve) => setTimeout(resolve, 600)));
  const sheet = await screen.findByRole("dialog", { name: "Box art" });

  fireEvent.pointerUp(sheet, { pointerType: "mouse", button: 0 });
  fireEvent.keyDown(sheet, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await act(() => new Promise((resolve) => setTimeout(resolve, 600)));
  fireEvent.click(tile);

  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ path: "gba/Emerald.gba" }), expect.anything());
});

it("opens the box art sheet on a right click", async () => {
  const { onOpen } = renderLibrary(["gba/Emerald.gba"], { recent: ["gba/Emerald.gba"] });
  const [card] = await screen.findAllByRole("button", { name: /Emerald/ });

  fireEvent.pointerDown(card, { button: 2 });
  fireEvent.contextMenu(card);
  fireEvent.pointerUp(card, { button: 2 });

  expect(await screen.findByRole("dialog", { name: "Box art" })).toBeTruthy();
  expect(onOpen).not.toHaveBeenCalled();
});

it("saves a gallery pick as the game's box art", async () => {
  const image = new Uint8Array([137, 80, 78, 71, 1]);
  const boxArt = fakeBoxArt({ "Nintendo - Game Boy Advance/Named_Boxarts/Pokemon - Emerald Version (USA, Europe).png": image });
  const choose = vi.spyOn(boxArt.host, "choose");
  renderLibrary(["gba/Pokemon Emerald.gba"], { boxArt });
  await longPress(await screen.findByRole("button", { name: /Emerald/ }));

  fireEvent.click(await screen.findByRole("button", { name: "Pokemon - Emerald Version (USA, Europe)" }));

  await waitFor(() => expect(choose).toHaveBeenCalledWith("/games", "gba/Pokemon Emerald.gba", image));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByRole("status").textContent).toBe("Box art changed");
});
