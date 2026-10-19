import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EngineProvider } from "@pkhex-everywhere/react";
import { afterEach, expect, it } from "vitest";
import { BackProvider } from "@/back/back";
import { fakeEngine } from "@/editor/fakeEngine";
import { GamesFolderProvider, type GamesFolderHost } from "@/games-folder/gamesFolder";
import { fakeImport } from "@/import/fakeImport";
import { ImportProvider, useImportFiles } from "@/import/importFiles";
import { fakeFolder } from "@/library/fakeFolder";
import { LibraryProvider, type LibraryHost } from "@/library/library";
import type { ConflictSaveHost } from "./ConflictSheet";
import { fakeSync } from "./fakeSync";
import { SyncProvider, type Conflict } from "./sync";
import { SyncDetailsProvider, useOpenSyncDetails } from "./SyncDetailsSheet";

afterEach(cleanup);

const gamesFolder: GamesFolderHost = {
  makeFolder: async () => "/games",
  listFolders: async () => [],
  ensureFolder: async () => {},
  folderExists: async () => true,
  loadSaved: async () => "/games",
  save: async () => {},
  label: (folder) => folder,
  device: "phone",
};

const library: LibraryHost = {
  listDir: (_folder, path) => fakeFolder(["gba/Emerald.gba"])(path),
  recentlyPlayed: async () => [],
  scanGameArt: async () => {},
  resumeScreenshot: async () => null,
  hasResumeState: async () => false,
  playHistory: async () => ({ lastPlayed: null, playTime: 0 }),
};

const saveHost: ConflictSaveHost = {
  readSave: async () => null,
  saveSummary: async () => null,
  keepSaveSummary: async () => {},
  saveFormat: async () => null,
  stateScreenshot: async () => null,
};

const saveConflict: Conflict = {
  file: "save",
  device: { savedOn: "Pixel 10", modified: 1_000, cheats: false },
  cloud: { savedOn: "MacBook Air", modified: 2_000, cheats: false },
};

function Opener() {
  const open = useOpenSyncDetails();
  const { importFiles } = useImportFiles(() => {}, { takesOpened: false });
  return (
    <>
      <button onClick={open}>Details</button>
      <button onClick={() => void importFiles()}>Import</button>
    </>
  );
}

function renderSheet({ sync = fakeSync({ account: "player@example.com" }), importHost = fakeImport() } = {}) {
  render(
    <EngineProvider engine={fakeEngine().engine}>
      <GamesFolderProvider host={gamesFolder}>
        <SyncProvider host={sync.host}>
          <BackProvider>
            <LibraryProvider host={library} folder="/games" onOpen={() => {}} onPlay={() => {}}>
              <ImportProvider host={importHost}>
                <SyncDetailsProvider host={saveHost} folder="/games">
                  <Opener />
                </SyncDetailsProvider>
              </ImportProvider>
            </LibraryProvider>
          </BackProvider>
        </SyncProvider>
      </GamesFolderProvider>
    </EngineProvider>,
  );
  return sync;
}

const openDetails = async () => {
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Details" })));
  return screen.getByRole("dialog", { name: "Sync" });
};

it("shows the run and each game's stage", async () => {
  const sync = renderSheet();
  await act(async () => {});
  await act(async () => {
    sync.report({ syncing: true });
    sync.game({ path: "gba/Emerald.gba", state: "transferring", done: 1, total: 4, stage: "uploadingSaves" });
    sync.game({ path: "gba/Ruby.gba", state: "queued" });
    sync.game({ path: "gba/Sapphire.gba", state: "synced", lastSynced: 1_000 });
    sync.runProgress({ phase: "transferring", done: 42, total: 100, waitingRoms: ["gba/FireRed.gba"] });
  });

  const sheet = await openDetails();

  expect(within(sheet).getByText("Syncing · 42%")).toBeTruthy();
  expect(within(sheet).getByRole("progressbar", { name: "Sync progress" })).toBeTruthy();
  const games = within(within(sheet).getByRole("list", { name: "Games syncing" }));
  expect(games.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
    "EmeraldUploading saves · 25%",
    "FireRedROM waiting for Wi-Fi",
    "RubyWaiting to sync",
  ]);
  expect(within(sheet).getByRole("button", { name: "Sync now" }).hasAttribute("disabled")).toBe(true);
});

it("wraps a long game error instead of keeping it on one line", async () => {
  const sync = renderSheet();
  await act(async () => {});
  const message = "Google Drive answered 411 Length Required. ".repeat(7).slice(0, 300);
  await act(async () => {
    sync.report({ syncing: true });
    sync.game({ path: "gba/Emerald.gba", state: "error", message });
  });

  const sheet = await openDetails();

  const stage = within(within(sheet).getByRole("list", { name: "Games syncing" })).getByText(message);
  expect(message).toHaveLength(300);
  expect(stage.classList).not.toContain("shrink-0");
});

it("shows only the last sync and Sync now while idle", async () => {
  const sync = renderSheet({ sync: fakeSync({ account: "player@example.com", lastSynced: Date.now() }) });
  await act(async () => {});

  const sheet = await openDetails();

  expect(within(sheet).getByText("Last synced just now")).toBeTruthy();
  expect(within(sheet).queryByRole("list")).toBeNull();
  expect(within(sheet).queryByRole("progressbar")).toBeNull();
  sync.host.syncAll.mockClear();
  await act(async () => fireEvent.click(within(sheet).getByRole("button", { name: "Sync now" })));
  expect(sync.host.syncAll).toHaveBeenCalledWith("/games", true);
});

it("shows the games an import is adding", async () => {
  let finish = () => {};
  const blocked = new Promise<void>((resolve) => (finish = resolve));
  const importHost = fakeImport({
    picked: [
      { file: "/picked/Pokemon Ruby.gba", name: "Pokemon Ruby.gba", modified: 0 },
      { file: "/picked/Pokemon Sapphire.gba", name: "Pokemon Sapphire.gba", modified: 0 },
    ],
    onCopy: () => blocked,
  });
  renderSheet({ importHost });
  await act(async () => {});
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Import" })));

  const sheet = await openDetails();

  expect(within(sheet).getByText("Adding 2 games")).toBeTruthy();
  await act(async () => finish());
  await waitFor(() => expect(within(sheet).queryByText(/^Adding/)).toBeNull());
});

it("shows the run's error at the top", async () => {
  renderSheet({ sync: fakeSync({ account: "player@example.com", error: "Your Google Drive is full" }) });
  await act(async () => {});
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Details" })));
  const sheet = screen.getByRole("dialog", { name: "Sync" });

  expect(within(sheet).getByText("Your Google Drive is full").className).toContain("text-destructive");
});

it("opens the conflict sheet from a conflict row", async () => {
  const sync = renderSheet({ sync: fakeSync({ account: "player@example.com", conflicts: [saveConflict] }) });
  await act(async () => {});
  await act(async () => sync.game({ path: "gba/Emerald.gba", state: "conflict" }));
  const sheet = await openDetails();

  await act(async () => fireEvent.click(within(sheet).getByRole("button", { name: /Emerald/ })));

  expect(await screen.findByRole("dialog", { name: "This game changed on another device" })).toBeTruthy();
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Sync" })).toBeNull());
});
