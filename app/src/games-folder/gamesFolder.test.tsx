import type { ReactNode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { GamesFolderProvider, useGamesFolder, type GamesFolderHost } from "./gamesFolder";

afterEach(cleanup);

function fakeDisk(folders: string[] = []) {
  const disk = new Set(folders);
  let saved: string | null = null;
  let picks: (string | null)[] = [];
  const host: GamesFolderHost = {
    pickFolder: async () => picks.shift() ?? null,
    makeFolder: async () => {
      const made = picks.shift() ?? null;
      if (made) disk.add(made);
      return made;
    },
    findFolder: async () => picks.shift() ?? null,
    listFolders: async (folder) =>
      [...disk].filter((path) => path.startsWith(`${folder}/`)).map((path) => path.slice(folder.length + 1)),
    ensureFolder: async (parent, name) => {
      if (!disk.has(parent)) throw new Error(`${parent} not found`);
      disk.add(`${parent}/${name}`);
    },
    folderExists: async (path) => disk.has(path),
    loadSaved: async () => saved,
    save: async (folder) => {
      saved = folder;
    },
    label: (folder) => folder,
    device: "phone",
  };
  return {
    host,
    disk,
    willPick: (...paths: (string | null)[]) => (picks = paths),
    launch: () =>
      renderHook(useGamesFolder, {
        wrapper: ({ children }: { children: ReactNode }) => (
          <GamesFolderProvider host={host}>{children}</GamesFolderProvider>
        ),
      }),
  };
}

it("asks for a folder on first launch", async () => {
  const { launch } = fakeDisk();
  const { result } = launch();

  await waitFor(() => expect(result.current.status).toBe("none"));
});

it("creates the system folders in the picked folder", async () => {
  const { launch, willPick, disk } = fakeDisk(["/games"]);
  willPick("/games");
  const { result } = launch();
  await waitFor(() => expect(result.current.status).toBe("none"));

  await act(() => result.current.choose!());

  expect(result.current).toMatchObject({ status: "ready", folder: "/games" });
  expect([...disk]).toEqual(expect.arrayContaining(["/games/gb", "/games/gbc", "/games/gba"]));
});

it("reuses system folders that already exist", async () => {
  const { launch, willPick, disk } = fakeDisk(["/roms", "/roms/gba", "/roms/gba/emerald.gba"]);
  willPick("/roms");
  const { result } = launch();
  await waitFor(() => expect(result.current.status).toBe("none"));

  await act(() => result.current.choose!());

  expect(result.current).toMatchObject({ status: "ready", folder: "/roms" });
  expect([...disk]).toEqual(
    expect.arrayContaining(["/roms/gb", "/roms/gbc", "/roms/gba", "/roms/gba/emerald.gba"]),
  );
});

it("opens the saved folder on the next launch", async () => {
  const { launch, willPick } = fakeDisk(["/games"]);
  willPick("/games");
  const first = launch();
  await waitFor(() => expect(first.result.current.status).toBe("none"));
  await act(() => first.result.current.choose!());
  first.unmount();

  const { result } = launch();

  await waitFor(() => expect(result.current).toMatchObject({ status: "ready", folder: "/games" }));
});

it("recreates system folders deleted since the last launch", async () => {
  const { launch, willPick, disk } = fakeDisk(["/games"]);
  willPick("/games");
  const first = launch();
  await waitFor(() => expect(first.result.current.status).toBe("none"));
  await act(() => first.result.current.choose!());
  first.unmount();
  disk.delete("/games/gbc");

  const { result } = launch();

  await waitFor(() => expect(result.current.status).toBe("ready"));
  expect(disk.has("/games/gbc")).toBe(true);
});

it("asks again when the saved folder is gone", async () => {
  const { launch, willPick, disk } = fakeDisk(["/games"]);
  willPick("/games");
  const first = launch();
  await waitFor(() => expect(first.result.current.status).toBe("none"));
  await act(() => first.result.current.choose!());
  first.unmount();
  disk.clear();

  const { result } = launch();

  await waitFor(() => expect(result.current.status).toBe("none"));
});

it("asks again when the saved folder can't be read", async () => {
  const { host, launch } = fakeDisk(["/games"]);
  host.loadSaved = async () => "/games";
  host.folderExists = async () => {
    throw new Error("forbidden path");
  };

  const { result } = launch();

  await waitFor(() => expect(result.current.status).toBe("none"));
});

it("changes to another folder", async () => {
  const { launch, willPick } = fakeDisk(["/games", "/roms"]);
  willPick("/games", "/roms");
  const { result } = launch();
  await waitFor(() => expect(result.current.status).toBe("none"));
  await act(() => result.current.choose!());

  await act(() => result.current.choose!());

  expect(result.current).toMatchObject({ status: "ready", folder: "/roms" });
});

it("keeps the current folder when the picker is cancelled", async () => {
  const { launch, willPick } = fakeDisk(["/games"]);
  willPick("/games", null);
  const { result } = launch();
  await waitFor(() => expect(result.current.status).toBe("none"));
  await act(() => result.current.choose!());

  await act(() => result.current.choose!());

  expect(result.current).toMatchObject({ status: "ready", folder: "/games" });
});

it("reports a folder that can't be set up and keeps the current one", async () => {
  const { host, launch, willPick } = fakeDisk(["/games", "/readonly"]);
  willPick("/games", "/readonly");
  const ensureFolder = host.ensureFolder;
  host.ensureFolder = async (parent, name) => {
    if (parent === "/readonly") throw new Error("permission denied");
    return ensureFolder(parent, name);
  };
  const { result } = launch();
  await waitFor(() => expect(result.current.status).toBe("none"));
  await act(() => result.current.choose!());

  await act(() => result.current.choose!());

  expect(result.current).toMatchObject({ status: "ready", folder: "/games" });
  expect(result.current.error).toMatch(/permission denied/);
});

it("makes a folder and sets it up", async () => {
  const { launch, willPick, disk } = fakeDisk();
  willPick("/Documents/pkhemu");
  const { result } = launch();
  await waitFor(() => expect(result.current.status).toBe("none"));

  let made: string | null = null;
  await act(async () => void (made = await result.current.make()));

  expect(made).toBe("/Documents/pkhemu");
  expect(result.current).toMatchObject({ status: "ready", folder: "/Documents/pkhemu" });
  expect(disk.has("/Documents/pkhemu/gba")).toBe(true);
});

it("stays without a folder when making one is cancelled", async () => {
  const { launch, willPick } = fakeDisk();
  willPick(null);
  const { result } = launch();
  await waitFor(() => expect(result.current.status).toBe("none"));

  let made: string | null = "";
  await act(async () => void (made = await result.current.make()));

  expect(made).toBe(null);
  expect(result.current.status).toBe("none");
});

it("keeps a previous folder that has system folders", async () => {
  const { launch, willPick } = fakeDisk(["/Documents/pkhemu", "/Documents/pkhemu/gba"]);
  willPick("/Documents/pkhemu");
  const { result } = launch();
  await waitFor(() => expect(result.current.status).toBe("none"));

  let unfamiliar: unknown;
  await act(async () => void (unfamiliar = await result.current.pickPrevious!()));

  expect(unfamiliar).toBeNull();
  expect(result.current).toMatchObject({ status: "ready", folder: "/Documents/pkhemu" });
});

it("hands back a previous folder with no system folders without keeping it", async () => {
  const { launch, willPick, disk } = fakeDisk(["/Documents", "/Documents/Photos"]);
  willPick("/Documents");
  const { result } = launch();
  await waitFor(() => expect(result.current.status).toBe("none"));

  let unfamiliar: unknown;
  await act(async () => void (unfamiliar = await result.current.pickPrevious!()));

  expect(unfamiliar).toEqual({ folder: "/Documents", label: "/Documents" });
  expect(result.current.status).toBe("none");
  expect(disk.has("/Documents/gba")).toBe(false);
});

it("keeps a folder with no system folders once the player says so", async () => {
  const { launch, disk } = fakeDisk(["/Documents"]);
  const { result } = launch();
  await waitFor(() => expect(result.current.status).toBe("none"));

  await act(() => result.current.keep("/Documents"));

  expect(result.current).toMatchObject({ status: "ready", folder: "/Documents" });
  expect(disk.has("/Documents/gba")).toBe(true);
});
