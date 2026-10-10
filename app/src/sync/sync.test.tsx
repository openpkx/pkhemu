import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { GamePageHost } from "@/game-page/GamePage";
import { GamesFolderProvider, type GamesFolderHost } from "@/games-folder/gamesFolder";
import { fakePlus } from "@/plus/fakePlus";
import { PlusProvider } from "@/plus/plus";
import { fakeSync } from "./fakeSync";
import { SyncProvider, syncingWrites, useSync, type Sync } from "./sync";

afterEach(cleanup);

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

  expect(host.syncAll).toHaveBeenCalledExactlyOnceWith("/games");
});

it("syncs nothing while signed out", async () => {
  const { host } = await start(fakeSync());
  setVisibility("visible");

  expect(host.syncAll).not.toHaveBeenCalled();
});

it("syncs everything when the app comes back to the foreground", async () => {
  const { host } = await start();
  host.syncAll.mockClear();

  await act(async () => setVisibility("hidden"));
  expect(host.syncAll).not.toHaveBeenCalled();
  await act(async () => setVisibility("visible"));

  expect(host.syncAll).toHaveBeenCalledExactlyOnceWith("/games");
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
  const sync = fakeSync({ account: "player@example.com", syncGames: true, cloudGames: ["gba/Emerald.gba"] });
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
    fakeSync({ account: "player@example.com", syncGames: true, gameSync: "fails" }),
  );
  host.cloudGames.mockClear();

  const downloaded = current.sync!.download("/games", "gba/Emerald.gba");
  await act(async () => downloads[0].finish());

  await expect(downloaded).resolves.toBeUndefined();
  expect(host.syncGame).toHaveBeenCalledOnce();
  expect(host.cloudGames).toHaveBeenCalledWith("/games");
});
