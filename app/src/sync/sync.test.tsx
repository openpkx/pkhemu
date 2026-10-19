import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { GamePageHost } from "@/game-page/GamePage";
import { GamesFolderProvider, type GamesFolderHost } from "@/games-folder/gamesFolder";
import { fakePlus } from "@/plus/fakePlus";
import { PlusProvider } from "@/plus/plus";
import { fakeSync } from "./fakeSync";
import { SyncProvider, syncingWrites, useSync, type Sync } from "./sync";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
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

async function start(sync = fakeSync({ account: "player@example.com" })) {
  const current: { sync?: Sync } = {};
  function Probe() {
    current.sync = useSync();
    return null;
  }
  render(
    <GamesFolderProvider host={gamesFolder}>
      <SyncProvider host={sync.host}>
        <Probe />
      </SyncProvider>
    </GamesFolderProvider>,
  );
  await act(async () => {});
  return { ...sync, current };
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}

it("syncs everything when the app starts", async () => {
  const { host } = await start();

  expect(host.syncAll).toHaveBeenCalledExactlyOnceWith("/games", false);
});

it("syncs nothing while signed out", async () => {
  const { host } = await start(fakeSync());
  setVisibility("visible");

  expect(host.syncAll).not.toHaveBeenCalled();
});

const minutes = (count: number) => count * 60_000;

async function comeBack() {
  await act(async () => setVisibility("hidden"));
  await act(async () => setVisibility("visible"));
}

it("skips a return's full sync within 10 minutes of the last one", async () => {
  vi.useFakeTimers();
  const { host } = await start();
  host.syncAll.mockClear();

  vi.advanceTimersByTime(minutes(5));
  await comeBack();
  expect(host.syncAll).not.toHaveBeenCalled();

  vi.advanceTimersByTime(minutes(6));
  await comeBack();
  expect(host.syncAll).toHaveBeenCalledExactlyOnceWith("/games", false);
});

it("syncs on return after a run that failed", async () => {
  vi.useFakeTimers();
  const { host, current } = await start();
  host.syncAll.mockRejectedValueOnce(new Error("No connection"));
  vi.spyOn(console, "error").mockImplementation(() => {});

  vi.advanceTimersByTime(minutes(1));
  await act(async () => current.sync!.syncNow());
  host.syncAll.mockClear();
  vi.advanceTimersByTime(minutes(1));
  await comeBack();

  expect(host.syncAll).toHaveBeenCalledExactlyOnceWith("/games", false);
});

it("syncs on return after a run that held games back", async () => {
  vi.useFakeTimers();
  const sync = fakeSync({ account: "player@example.com" });
  sync.host.syncAll.mockImplementationOnce(async () => {
    sync.report({ syncing: true });
    sync.game({ path: "gba/Emerald.gba", state: "waiting", reason: "mobileData" });
    sync.report({ syncing: false });
  });
  const { host } = await start(sync);
  host.syncAll.mockClear();

  vi.advanceTimersByTime(minutes(1));
  await comeBack();

  expect(host.syncAll).toHaveBeenCalledExactlyOnceWith("/games", false);
});

it("syncs on return after a run that held a ROM back", async () => {
  vi.useFakeTimers();
  const sync = fakeSync({ account: "player@example.com" });
  sync.host.syncAll.mockImplementationOnce(async () => {
    sync.report({ syncing: true });
    sync.runProgress({ phase: "transferring", done: 1, total: 1, waitingRoms: ["gba/Emerald.gba"] });
    sync.game({ path: "gba/Emerald.gba", state: "synced", lastSynced: Date.now() });
    sync.report({ syncing: false });
  });
  const { host } = await start(sync);
  host.syncAll.mockClear();

  vi.advanceTimersByTime(minutes(1));
  await comeBack();

  expect(host.syncAll).toHaveBeenCalledExactlyOnceWith("/games", false);
});

it("syncs on Sync now within 10 minutes of the last run", async () => {
  vi.useFakeTimers();
  const { host, current } = await start();
  host.syncAll.mockClear();

  vi.advanceTimersByTime(minutes(1));
  await act(async () => current.sync!.syncNow());

  expect(host.syncAll).toHaveBeenCalledExactlyOnceWith("/games", true);
});

it("syncs a quit game within 10 minutes of the last run, and skips the full sync after it", async () => {
  vi.useFakeTimers();
  const { host, current } = await start();
  host.syncAll.mockClear();

  vi.advanceTimersByTime(minutes(1));
  await act(async () => current.sync!.played("/games", "gba/Emerald.gba"));

  expect(host.syncGame).toHaveBeenCalledExactlyOnceWith("/games", "gba/Emerald.gba");
  expect(host.syncAll).not.toHaveBeenCalled();
});

it("syncs everything after quitting a game that opened while a run went on, since the run held back its ROMs", async () => {
  vi.useFakeTimers();
  const sync = fakeSync({ account: "player@example.com" });
  let finish = () => {};
  sync.host.syncAll.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));
  const { host, current } = await start(sync);
  await act(async () => void (await current.sync!.beforeOpen("/games", "gba/Emerald.gba")));
  await act(async () => finish());
  host.syncAll.mockClear();

  vi.advanceTimersByTime(minutes(1));
  await act(async () => current.sync!.played("/games", "gba/Emerald.gba"));

  expect(host.syncAll).toHaveBeenCalledExactlyOnceWith("/games", false);
});

it("syncs everything after quitting a game that was open when a run started", async () => {
  vi.useFakeTimers();
  const { host, current } = await start();
  await act(async () => void (await current.sync!.beforeOpen("/games", "gba/Emerald.gba")));
  vi.advanceTimersByTime(minutes(11));
  await comeBack();
  host.syncAll.mockClear();

  vi.advanceTimersByTime(minutes(1));
  await act(async () => current.sync!.played("/games", "gba/Emerald.gba"));

  expect(host.syncAll).toHaveBeenCalledExactlyOnceWith("/games", false);
});

it("skips the full sync after quitting once a run has finished with no game open", async () => {
  vi.useFakeTimers();
  const { host, current } = await start();
  await act(async () => void (await current.sync!.beforeOpen("/games", "gba/Emerald.gba")));
  vi.advanceTimersByTime(minutes(11));
  await comeBack();
  await act(async () => current.sync!.played("/games", "gba/Emerald.gba"));
  await act(async () => void (await current.sync!.beforeOpen("/games", "gba/Ruby.gba")));
  host.syncAll.mockClear();

  vi.advanceTimersByTime(minutes(1));
  await act(async () => current.sync!.played("/games", "gba/Ruby.gba"));

  expect(host.syncAll).not.toHaveBeenCalled();
});

it("syncs the games an edit or a transfer wrote", async () => {
  const { host, current } = await start();
  const writes = syncingWrites<Pick<GamePageHost, "applyEdit" | "writeTransfer">>(
    { applyEdit: async () => {}, writeTransfer: async () => {} },
    current.sync!.synced,
  );

  await writes.applyEdit("/games", "gba/Emerald.gba", new Uint8Array());
  await writes.writeTransfer(
    "/games",
    { path: "nds/Platinum.nds", save: new Uint8Array(), note: "" },
    { path: "gba/Emerald.gba", save: new Uint8Array(), note: "" },
  );

  expect(host.syncGame.mock.calls).toEqual([
    ["/games", "gba/Emerald.gba"],
    ["/games", "nds/Platinum.nds"],
    ["/games", "gba/Emerald.gba"],
  ]);
});

it("doesn't sync a write that failed", async () => {
  const { host, current } = await start();
  const writes = syncingWrites<Pick<GamePageHost, "applyEdit" | "writeTransfer">>(
    { applyEdit: async () => Promise.reject(new Error("disk full")), writeTransfer: async () => {} },
    current.sync!.synced,
  );

  await expect(writes.applyEdit("/games", "gba/Emerald.gba", new Uint8Array())).rejects.toThrow("disk full");

  expect(host.syncGame).not.toHaveBeenCalled();
});

it("tells each game's sync state and last synced time by ROM path", async () => {
  const { current, game } = await start(
    fakeSync({ account: "player@example.com", gamesLastSynced: { "gba/Emerald.gba": 1_000 } }),
  );
  expect(current.sync!.gameLastSynced).toEqual({ "gba/Emerald.gba": 1_000 });

  await act(async () => {
    game({ path: "gba/Ruby.gba", state: "transferring", done: 4, total: 8, stage: "uploadingSaves" });
    game({ path: "gba/Emerald.gba", state: "synced", lastSynced: 2_000 });
  });

  expect(current.sync!.gameSync).toEqual({
    "gba/Ruby.gba": { state: "transferring", done: 4, total: 8, stage: "uploadingSaves" },
    "gba/Emerald.gba": { state: "synced", lastSynced: 2_000 },
  });
  expect(current.sync!.gameLastSynced).toEqual({ "gba/Emerald.gba": 2_000 });
});

it("keeps an error or a conflict on a game until it next syncs cleanly", async () => {
  const { current, game } = await start();

  await act(async () => {
    game({ path: "gba/Emerald.gba", state: "error", message: "Your Google Drive is full" });
    game({ path: "gba/Ruby.gba", state: "conflict" });
    game({ path: "gba/Emerald.gba", state: "queued" });
    game({ path: "gba/Ruby.gba", state: "transferring", done: 1, total: 2, stage: "downloadingSaves" });
  });
  expect(current.sync!.gameSync["gba/Emerald.gba"]).toEqual({ state: "error", message: "Your Google Drive is full" });
  expect(current.sync!.gameSync["gba/Ruby.gba"]).toEqual({ state: "conflict" });

  await act(async () => game({ path: "gba/Emerald.gba", state: "synced", lastSynced: 3_000 }));
  expect(current.sync!.gameSync["gba/Emerald.gba"]).toEqual({ state: "synced", lastSynced: 3_000 });
});

it("tells the run's phase while it syncs and forgets transfers once it stops", async () => {
  const { current, game, runProgress, report } = await start();

  await act(async () => {
    report({ syncing: true });
    runProgress({ phase: "checking", done: 4, total: 12 });
  });
  expect(current.sync!.run).toEqual({ phase: "checking", done: 4, total: 12 });

  await act(async () => {
    runProgress({ phase: "transferring", done: 10, total: 40, waitingRoms: ["gba/Emerald.gba"] });
    game({ path: "gba/Ruby.gba", state: "queued" });
    game({ path: "gba/Sapphire.gba", state: "waiting", reason: "offline" });
  });
  expect(current.sync!.run).toEqual({ phase: "transferring", done: 10, total: 40, waitingRoms: ["gba/Emerald.gba"] });

  await act(async () => report({ syncing: false }));
  expect(current.sync!.run).toBeUndefined();
  expect(current.sync!.gameSync).toEqual({ "gba/Sapphire.gba": { state: "waiting", reason: "offline" } });
});

it("shows cloud games once the run reads the catalog, while it still syncs", async () => {
  const { host, current, report, catalog } = await start();
  host.cloudGames.mockResolvedValue(["gba/Emerald.gba"]);

  await act(async () => {
    report({ syncing: true });
    catalog();
  });

  expect(current.sync!.syncing).toBe(true);
  expect(current.sync!.cloudGames).toEqual(["gba/Emerald.gba"]);
});

it("shows cloud games after signing in without waiting for the first run to end", async () => {
  const { host, current, report, catalog } = await start(fakeSync());
  host.syncAll.mockImplementation(async () => report({ syncing: true }));
  await act(async () => current.sync!.connect("google"));
  expect(host.syncAll).toHaveBeenCalledOnce();
  expect(current.sync!.cloudGames).toEqual([]);

  host.cloudGames.mockResolvedValue(["gba/Emerald.gba"]);
  await act(async () => catalog());

  expect(current.sync!.cloudGames).toEqual(["gba/Emerald.gba"]);
});

it("forgets every game's sync on sign-out", async () => {
  const { current, game } = await start(
    fakeSync({ account: "player@example.com", gamesLastSynced: { "gba/Emerald.gba": 1_000 } }),
  );
  await act(async () => game({ path: "gba/Ruby.gba", state: "error", message: "No connection" }));

  await act(async () => current.sync!.signOut());

  expect(current.sync!.gameSync).toEqual({});
  expect(current.sync!.gameLastSynced).toEqual({});
});

it("reads the account again when Plus changes, and syncs while Plus lets it", async () => {
  const sync = fakeSync();
  const plus = fakePlus();
  const current: { sync?: Sync } = {};
  function Probe() {
    current.sync = useSync();
    return null;
  }
  render(
    <GamesFolderProvider host={gamesFolder}>
      <PlusProvider host={plus.host}>
        <SyncProvider host={sync.host}>
          <Probe />
        </SyncProvider>
      </PlusProvider>
    </GamesFolderProvider>,
  );
  await act(async () => {});
  expect(sync.host.syncAll).not.toHaveBeenCalled();

  sync.host.account.mockResolvedValue("player@example.com");
  await act(async () => plus.report({ state: "owned" }));
  expect(current.sync!.account).toBe("player@example.com");
  expect(sync.host.syncAll).toHaveBeenCalledOnce();

  sync.host.account.mockResolvedValue(null);
  await act(async () => plus.report({ state: "notOwned", price: "$3.99" }));
  expect(current.sync!.account).toBeNull();

  sync.host.account.mockResolvedValue("player@example.com");
  await act(async () => plus.report({ state: "owned" }));
  expect(sync.host.syncAll).toHaveBeenCalledTimes(2);
});

it("syncs a downloaded game's files even after the page that started the download is gone", async () => {
  const sync = fakeSync({ account: "player@example.com", cloudGames: ["gba/Emerald.gba"] });
  const current: { sync?: Sync } = {};
  function Probe() {
    current.sync = useSync();
    return null;
  }
  const tree = (probe: boolean) => (
    <GamesFolderProvider host={gamesFolder}>
      <SyncProvider host={sync.host}>{probe && <Probe />}</SyncProvider>
    </GamesFolderProvider>
  );
  const { rerender } = render(tree(true));
  await act(async () => {});

  const downloaded = current.sync!.download("/games", "gba/Emerald.gba");
  rerender(tree(false));
  await act(async () => {
    sync.downloads[0].finish();
    await downloaded;
  });

  expect(sync.host.syncGame).toHaveBeenCalledExactlyOnceWith("/games", "gba/Emerald.gba");
});

it("finishes a download and reads the cloud games when syncing the game's files fails", async () => {
  const { host, current, downloads } = await start(
    fakeSync({ account: "player@example.com", gameSync: "fails" }),
  );
  host.cloudGames.mockClear();

  const downloaded = current.sync!.download("/games", "gba/Emerald.gba");
  await act(async () => downloads[0].finish());

  await expect(downloaded).resolves.toBeUndefined();
  expect(host.syncGame).toHaveBeenCalledOnce();
  expect(host.cloudGames).toHaveBeenCalledWith("/games");
});

const conflict = {
  file: "save",
  device: { savedOn: "Pixel 10", modified: 1_000, cheats: false },
  cloud: { savedOn: "MacBook", modified: 2_000, cheats: false },
};

it("reads a game's conflicts from the host", async () => {
  const { host, current } = await start(fakeSync({ account: "player@example.com", conflicts: [conflict] }));

  await expect(current.sync!.conflicts("/games", "gba/Emerald.gba")).resolves.toEqual([conflict]);
  expect(host.conflicts).toHaveBeenCalledWith("/games", "gba/Emerald.gba");
});

it("reads no conflicts while signed out", async () => {
  const { host, current } = await start(fakeSync({ conflicts: [conflict] }));

  await expect(current.sync!.conflicts("/games", "gba/Emerald.gba")).resolves.toEqual([]);
  expect(host.conflicts).not.toHaveBeenCalled();
});
