import type { ReactNode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { fakeFolder } from "./fakeFolder";
import { LibraryProvider, useLibrary, type LibraryHost } from "./library";
import type { Game } from "./scan";

afterEach(cleanup);

function setup(paths: string[], played: string[] = []) {
  const list = fakeFolder(paths);
  const host: LibraryHost = {
    listDir: (folder, path) => (folder === "/games" ? list(path) : Promise.reject(new Error(`${folder} not found`))),
    recentlyPlayed: async (limit) => played.slice(0, limit),
    scanGameArt: vi.fn<LibraryHost["scanGameArt"]>(async () => {}),
    resumeScreenshot: async () => null,
    hasResumeState: async () => false,
    playHistory: async () => ({ lastPlayed: null, playTime: 0 }),
  };
  const onOpen = vi.fn<(game: Game) => void>();
  const launch = (folder = "/games") =>
    renderHook(useLibrary, {
      initialProps: undefined,
      wrapper: ({ children }: { children: ReactNode }) => (
        <LibraryProvider host={host} folder={folder} onOpen={onOpen} onPlay={() => {}}>
          {children}
        </LibraryProvider>
      ),
    });
  return { host, onOpen, launch };
}

const names = (games: Game[] | undefined) => games?.map((game) => game.name);
const allGames = (result: { current: ReturnType<typeof useLibrary> }) =>
  names(result.current.library?.sections.flatMap((section) => section.games));

it("scans the folder on launch", async () => {
  const { launch } = setup(["gba/Emerald.gba"]);

  const { result } = launch();

  await waitFor(() => expect(allGames(result)).toEqual(["Emerald"]));
});

it("scans only the folder it was given", async () => {
  const { launch } = setup(["gba/Emerald.gba"]);

  const { result } = launch("/roms");

  await waitFor(() => expect(result.current.error).toMatch(/\/roms not found/));
});

it("rescans when the app regains focus", async () => {
  const paths = ["gba/Emerald.gba"];
  const { launch } = setup(paths);
  const { result } = launch();
  await waitFor(() => expect(allGames(result)).toEqual(["Emerald"]));
  paths.push("gba/FireRed.gba");

  act(() => void window.dispatchEvent(new Event("focus")));

  await waitFor(() => expect(allGames(result)).toEqual(["Emerald", "FireRed"]));
});

it("rescans on refresh", async () => {
  const paths = ["gba/Emerald.gba"];
  const { launch } = setup(paths);
  const { result } = launch();
  await waitFor(() => expect(allGames(result)).toEqual(["Emerald"]));
  paths.splice(0, 1, "gb/Red.gb");

  await act(() => result.current.refresh());

  expect(allGames(result)).toEqual(["Red"]);
});

it("looks for game art in every game it scanned", async () => {
  const paths = ["gba/Emerald.gba", "gb/Red.gb"];
  const { host, launch } = setup(paths);
  const { result } = launch();
  await waitFor(() => expect(host.scanGameArt).toHaveBeenCalledWith("/games", ["gb/Red.gb", "gba/Emerald.gba"]));
  paths.splice(0, 1);

  await act(() => result.current.refresh());

  expect(host.scanGameArt).toHaveBeenLastCalledWith("/games", ["gb/Red.gb"]);
});

it("reports a folder that can't be read", async () => {
  const { host, launch } = setup([]);
  host.listDir = async () => {
    throw new Error("forbidden path");
  };

  const { result } = launch();

  await waitFor(() => expect(result.current.error).toMatch(/forbidden path/));
});

it("opens a game and puts it first in recently played", async () => {
  const { launch, onOpen } = setup(["gb/Red.gb", "gba/Emerald.gba"]);
  const { result } = launch();
  await waitFor(() => expect(result.current.library).toBeDefined());
  const [red, emerald] = result.current.library!.sections.flatMap((section) => section.games);

  act(() => result.current.open(red));
  act(() => result.current.open(emerald));

  expect(onOpen).toHaveBeenLastCalledWith(emerald, undefined);
  expect(names(result.current.recent)).toEqual(["Emerald", "Red"]);
});

const twelve = Array.from({ length: 12 }, (_, i) => `Game ${i + 1}`);
const pathOf = (name: string) => `gba/${name}.gba`;

it("lists the last 10 games played, newest first", async () => {
  const { launch } = setup(twelve.map(pathOf), [...twelve].reverse().map(pathOf));

  const { result } = launch();

  await waitFor(() => expect(names(result.current.recent)).toEqual([...twelve].reverse().slice(0, 10)));
});

it("keeps the last 10 when a game is opened", async () => {
  const { launch } = setup(twelve.map(pathOf), twelve.slice(0, 10).map(pathOf));
  const { result } = launch();
  await waitFor(() => expect(result.current.recent).toHaveLength(10));
  const last = result.current.library!.sections[0].games.find((game) => game.name === "Game 12")!;

  act(() => result.current.open(last));

  expect(names(result.current.recent)).toEqual(["Game 12", ...twelve.slice(0, 9)]);
});

it("leaves games no longer in the folder out of recently played", async () => {
  const paths = ["gb/Red.gb", "gba/Emerald.gba"];
  const { launch } = setup(paths);
  const { result } = launch();
  await waitFor(() => expect(result.current.library).toBeDefined());
  for (const game of result.current.library!.sections.flatMap((section) => section.games))
    act(() => result.current.open(game));
  paths.splice(0, 1);

  await act(() => result.current.refresh());

  expect(names(result.current.recent)).toEqual(["Emerald"]);
});

it("keeps a game opened before recently played loads", async () => {
  const { host, launch } = setup(["gb/Red.gb", "gba/Emerald.gba"]);
  let load!: (paths: string[]) => void;
  host.recentlyPlayed = () => new Promise((resolve) => (load = resolve));
  const { result } = launch();
  await waitFor(() => expect(result.current.library).toBeDefined());

  act(() => result.current.open(result.current.library!.sections[0].games[0]));
  await act(async () => load(["gba/Emerald.gba"]));

  expect(names(result.current.recent)).toEqual(["Red", "Emerald"]);
});

it("reads a game's last screen again once the game is opened", async () => {
  const { host, launch } = setup(["gba/Emerald.gba"]);
  const read = vi.spyOn(host, "resumeScreenshot");
  const { result } = launch();
  await waitFor(() => expect(allGames(result)).toEqual(["Emerald"]));
  await result.current.resumeScreenshot("gba/Emerald.gba");
  await result.current.resumeScreenshot("gba/Emerald.gba");
  expect(read).toHaveBeenCalledTimes(1);

  act(() => result.current.open(result.current.library!.sections[0].games[0]));
  await result.current.resumeScreenshot("gba/Emerald.gba");

  expect(read).toHaveBeenCalledTimes(2);
});
