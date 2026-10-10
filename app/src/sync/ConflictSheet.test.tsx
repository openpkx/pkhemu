import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { EngineProvider } from "@pkhex-everywhere/react";
import type { GameProgress } from "@pkhex-everywhere/engine";
import { afterEach, expect, it, vi } from "vitest";
import { fakeEngine } from "@/editor/fakeEngine";
import type { SaveFile, SaveSummary } from "@/game-page/saveSummary";
import { createInput } from "@/input/input";
import { ConflictSheet, type ConflictSaveHost } from "./ConflictSheet";
import { fakeSync } from "./fakeSync";
import type { Conflict } from "./sync";

afterEach(cleanup);

const path = "gba/Emerald.gba";
const hour = 3600_000;
const now = Date.now();

const deviceSave: SaveFile = { bytes: [1], modified: now - hour, sha256: "device" };
const cloudSave: SaveFile = { bytes: [2], modified: now - 2 * hour, sha256: "cloud" };

const progressOf: Record<number, GameProgress> = {
  1: { playTime: { hours: 12, minutes: 5, seconds: 0 }, badges: { earned: 3, total: 8 }, pokedex: { seen: 40, caught: 20 } },
  2: { playTime: { hours: 15, minutes: 30, seconds: 0 }, badges: { earned: 5, total: 8 }, pokedex: { seen: 60, caught: 31 } },
};

const saveConflict: Conflict = {
  file: "save",
  device: { savedOn: "Pixel 8", modified: deviceSave.modified, cheats: false },
  cloud: { savedOn: "MacBook Air", modified: cloudSave.modified, cheats: false },
};

const slotConflict = (slot: number): Conflict => ({
  file: `slot-${slot}`,
  device: { savedOn: "Pixel 8", modified: now - slot * hour, cheats: false },
  cloud: { savedOn: "MacBook Air", modified: now - slot * 2 * hour, cheats: false },
});

function fakeSaveHost() {
  const summaries = new Map<string, SaveSummary>();
  return {
    readSave: vi.fn(async () => deviceSave),
    saveSummary: vi.fn(async (sha256: string) => summaries.get(sha256) ?? null),
    keepSaveSummary: vi.fn(async (sha256: string, summary: SaveSummary) => void summaries.set(sha256, summary)),
    saveFormat: vi.fn(async () => null),
    stateScreenshot: vi.fn(async () => [1, 2, 3]),
  } satisfies ConflictSaveHost;
}

async function open(conflicts: Conflict[], { readable = true } = {}) {
  const host = fakeSaveHost();
  const sync = fakeSync({ account: "player@example.com", conflicts, cloudSave, cloudScreenshots: { "slot-1": [4], "slot-2": [5] } });
  const engine = fakeEngine();
  vi.spyOn(engine.engine.game, "progress").mockImplementation(async () => progressOf[engine.loaded()![0]]);
  if (!readable) vi.spyOn(engine.engine.game, "load").mockRejectedValue(new Error("invalid-save"));
  const onResolved = vi.fn();
  const onClose = vi.fn();
  render(
    <EngineProvider engine={engine.engine}>
      <ConflictSheet
        host={host}
        cloud={sync.host}
        folder="/games"
        path={path}
        conflicts={conflicts}
        input={createInput(() => [])}
        onResolved={onResolved}
        onClose={onClose}
      />
    </EngineProvider>,
  );
  await act(async () => {});
  return { sync, host, onResolved, onClose };
}

const card = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });

it("shows both versions of the save with their progress, and keeps the one picked", async () => {
  const { sync, onResolved } = await open([saveConflict]);

  expect(screen.getByRole("dialog", { name: "This game changed on another device" })).toBeTruthy();
  const device = card("This device");
  expect(within(device).getByText("Pixel 8")).toBeTruthy();
  expect(within(device).getByText("12:05")).toBeTruthy();
  expect(within(device).getByText("3 / 8")).toBeTruthy();
  const cloud = card("Cloud");
  expect(within(cloud).getByText("MacBook Air")).toBeTruthy();
  expect(within(cloud).getByText("15:30")).toBeTruthy();
  expect(within(cloud).getByText("5 / 8")).toBeTruthy();
  expect(within(cloud).getByText("Seen 60 · Caught 31")).toBeTruthy();

  await act(async () => fireEvent.click(cloud));

  expect(sync.host.resolve).toHaveBeenCalledExactlyOnceWith("/games", path, "save", "cloud");
  expect(onResolved).toHaveBeenCalledOnce();
});

it("shows only the device and time for a save the engine can't read", async () => {
  await open([saveConflict], { readable: false });

  const device = card("This device");
  expect(within(device).getByText("Pixel 8")).toBeTruthy();
  expect(within(device).queryByText("Badges")).toBeNull();
  expect(within(card("Cloud")).getByText("MacBook Air")).toBeTruthy();
  expect(within(card("Cloud")).queryByText("Play time")).toBeNull();
});

it("marks the version written with cheats on", async () => {
  await open([{ ...saveConflict, cloud: { ...saveConflict.cloud, cheats: true } }]);

  expect(within(card("Cloud")).getByText("Cheats on")).toBeTruthy();
  expect(within(card("This device")).queryByText("Cheats on")).toBeNull();
});

it("asks about each conflicted slot on its own row", async () => {
  const { sync, host, onResolved } = await open([slotConflict(1), slotConflict(2)]);

  const rows = screen.getAllByRole("group");
  expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual(["Slot 1", "Slot 2"]);
  expect(host.stateScreenshot.mock.calls).toEqual([
    ["/games", path, 1],
    ["/games", path, 2],
  ]);
  expect(sync.host.cloudScreenshot.mock.calls).toEqual([
    ["/games", path, "slot-1"],
    ["/games", path, "slot-2"],
  ]);

  await act(async () => fireEvent.click(within(rows[0]).getByRole("button", { name: /^This device/ })));
  expect(sync.host.resolve).toHaveBeenLastCalledWith("/games", path, "slot-1", "device");
  expect(onResolved).not.toHaveBeenCalled();
  expect(screen.getAllByRole("group")).toHaveLength(1);

  await act(async () => fireEvent.click(within(screen.getByRole("group", { name: "Slot 2" })).getByRole("button", { name: /^Cloud/ })));
  expect(sync.host.resolve).toHaveBeenLastCalledWith("/games", path, "slot-2", "cloud");
  expect(onResolved).toHaveBeenCalledOnce();
});

it("keeps everything as it was when closed without picking", async () => {
  const { sync, onResolved, onClose } = await open([saveConflict]);

  await act(async () => fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" }));

  expect(onClose).toHaveBeenCalledOnce();
  expect(onResolved).not.toHaveBeenCalled();
  expect(sync.host.resolve).not.toHaveBeenCalled();
});
