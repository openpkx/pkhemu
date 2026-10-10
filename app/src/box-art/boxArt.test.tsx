import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import { GamesFolderProvider, type GamesFolderHost } from "@/games-folder/gamesFolder";
import type { Game } from "@/library/scan";
import { BoxArtProvider, useBoxArt, useCachedBoxArt, useFindAllBoxArt, type BoxArtHost } from "./boxArt";
import { fakeBoxArt } from "./fakeBoxArt";

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const dataUrl = "data:image/png;base64,iVBORw0KGgo=";
const gba = "Nintendo - Game Boy Advance/Named_Boxarts/";
const gbaListing = "https://thumbnails.libretro.com/Nintendo%20-%20Game%20Boy%20Advance/Named_Boxarts/";
const day = 24 * 60 * 60 * 1000;

const game = (name: string, system: Game["system"] = "gba"): Game => ({ system, name, path: `${system}/${name}.gba` });

const gamesFolder: GamesFolderHost = {
  pickFolder: async () => "/games",
  ensureFolder: async () => {},
  folderExists: async () => true,
  loadSaved: async () => "/games",
  save: async () => {},
  label: (folder) => folder,
};

function wrapper(host: BoxArtHost) {
  return function Providers({ children }: { children: ReactNode }) {
    return (
      <GamesFolderProvider host={gamesFolder}>
        <BoxArtProvider host={host}>{children}</BoxArtProvider>
      </GamesFolderProvider>
    );
  };
}

function find(host: BoxArtHost, of: Game) {
  return renderHook(() => useBoxArt(of), { wrapper: wrapper(host) });
}

it("downloads box art named in the system's listing from thumbnails.libretro.com", async () => {
  const boxArt = fakeBoxArt({ "Nintendo - Game Boy/Named_Boxarts/Pokemon - Red Version (USA, Europe) (SGB Enhanced).png": png });
  const download = vi.spyOn(boxArt.host, "download");

  const { result } = find(boxArt.host, game("Pokemon - Red Version (USA, Europe) (SGB Enhanced)", "gb"));

  await waitFor(() => expect(result.current.url).toBe(dataUrl));
  expect(download.mock.calls).toEqual([
    ["https://thumbnails.libretro.com/Nintendo%20-%20Game%20Boy/Named_Boxarts/"],
    ["https://thumbnails.libretro.com/Nintendo%20-%20Game%20Boy/Named_Boxarts/Pokemon%20-%20Red%20Version%20(USA%2C%20Europe)%20(SGB%20Enhanced).png"],
  ]);
});

it("finds box art for a ROM named differently from the image", async () => {
  const boxArt = fakeBoxArt({ [`${gba}Pokemon - Emerald Version (USA, Europe).png`]: png });

  const { result } = find(boxArt.host, game("Pokemon Emerald"));

  await waitFor(() => expect(result.current.url).toBe(dataUrl));
  expect([...boxArt.cache.keys()]).toEqual(["gba/Pokemon Emerald"]);
});

it("replaces the characters libretro-thumbnails can't use in a file name", async () => {
  const boxArt = fakeBoxArt({ [`${gba}Pokemon _ Mystery_ _Dungeon_ _1_2_.png`]: png });

  const { result } = find(boxArt.host, game('Pokemon & Mystery* `Dungeon` <1:2>'));

  await waitFor(() => expect(result.current.url).toBe(dataUrl));
  expect([...boxArt.cache.keys()]).toEqual(["gba/Pokemon _ Mystery_ _Dungeon_ _1_2_"]);
});

it("knows the listing has no box art for a game without downloading anything else", async () => {
  const boxArt = fakeBoxArt({ [`${gba}Pokemon - Emerald Version (USA, Europe).png`]: png });
  const download = vi.spyOn(boxArt.host, "download");

  const radicalRed = find(boxArt.host, game("Radical Red"));
  await waitFor(() => expect(radicalRed.result.current.loading).toBe(false));
  const rogue = find(boxArt.host, game("Emerald Rogue"));
  await waitFor(() => expect(rogue.result.current.loading).toBe(false));

  expect(radicalRed.result.current.url).toBeUndefined();
  expect(rogue.result.current.url).toBeUndefined();
  expect(download.mock.calls).toEqual([[gbaListing]]);
});

it("keeps the listing with its fetch time and fetches it again after 7 days", async () => {
  const boxArt = fakeBoxArt({ [`${gba}Pokemon - Emerald Version (USA, Europe).png`]: png });
  const download = vi.spyOn(boxArt.host, "download");
  boxArt.listings.set("gba/Named_Boxarts", { fetchedAt: Date.now() - 6 * day, names: [] });

  const fresh = find(boxArt.host, game("Pokemon Emerald"));
  await waitFor(() => expect(fresh.result.current.loading).toBe(false));
  expect(fresh.result.current.url).toBeUndefined();
  expect(download).not.toHaveBeenCalled();

  boxArt.listings.set("gba/Named_Boxarts", { fetchedAt: Date.now() - 8 * day, names: [] });
  const stale = find(boxArt.host, game("Pokemon Emerald"));

  await waitFor(() => expect(stale.result.current.url).toBe(dataUrl));
  expect(boxArt.listings.get("gba/Named_Boxarts")).toEqual({
    fetchedAt: expect.closeTo(Date.now(), -4),
    names: ["Pokemon - Emerald Version (USA, Europe)"],
  });
});

it("keeps using an old listing when fetching it again fails", async () => {
  const boxArt = fakeBoxArt({ [`${gba}Pokemon - Emerald Version (USA, Europe).png`]: png });
  const download = boxArt.host.download;
  vi.spyOn(boxArt.host, "download").mockImplementation((url) => (url === gbaListing ? Promise.reject(new Error("503")) : download(url)));
  const old = { fetchedAt: Date.now() - 30 * day, names: ["Pokemon - Emerald Version (USA, Europe)"] };
  boxArt.listings.set("gba/Named_Boxarts", old);

  const { result } = find(boxArt.host, game("Pokemon Emerald"));

  await waitFor(() => expect(result.current.url).toBe(dataUrl));
  expect(boxArt.listings.get("gba/Named_Boxarts")).toBe(old);
});

it("doesn't keep a download that isn't a PNG", async () => {
  const boxArt = fakeBoxArt({ [`${gba}Pokemon - Emerald Version (USA, Europe).png`]: new TextEncoder().encode("<html>") });

  const { result } = find(boxArt.host, game("Pokemon Emerald"));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.url).toBeUndefined();
  expect(boxArt.cache.size).toBe(0);
});

it("tries again after failing to reach the server", async () => {
  const boxArt = fakeBoxArt({ [`${gba}Pokemon - Emerald Version (USA, Europe).png`]: png });
  boxArt.network.online = false;
  const offline = find(boxArt.host, game("Pokemon - Emerald Version (USA, Europe)"));
  await waitFor(() => expect(offline.result.current.loading).toBe(false));
  expect(offline.result.current.url).toBeUndefined();

  boxArt.network.online = true;
  const online = find(boxArt.host, game("Pokemon - Emerald Version (USA, Europe)"));

  await waitFor(() => expect(online.result.current.url).toBe(dataUrl));
});

function cached(host: BoxArtHost, of: Game) {
  return renderHook(() => useCachedBoxArt(of), { wrapper: wrapper(host) });
}

it("doesn't look up box art missing from the cache when only reading it", async () => {
  const boxArt = fakeBoxArt({ [`${gba}Pokemon - Emerald Version (USA, Europe).png`]: png });
  const download = vi.spyOn(boxArt.host, "download");
  const read = vi.spyOn(boxArt.host, "read");

  const { result } = cached(boxArt.host, game("Pokemon - Emerald Version (USA, Europe)"));

  await waitFor(() => expect(read).toHaveBeenCalled());
  expect(result.current).toBeUndefined();
  expect(download).not.toHaveBeenCalled();
});

it("reads box art from the cache once it was found", async () => {
  const boxArt = fakeBoxArt({ [`${gba}Pokemon - Emerald Version (USA, Europe).png`]: png });
  const found = find(boxArt.host, game("Pokemon - Emerald Version (USA, Europe)"));
  await waitFor(() => expect(found.result.current.url).toBe(dataUrl));

  boxArt.network.online = false;
  const { result } = cached(boxArt.host, game("Pokemon - Emerald Version (USA, Europe)"));

  await waitFor(() => expect(result.current).toBe(dataUrl));
});

const tenGames = Array.from({ length: 10 }, (_, i) => game(`Game ${i}`));
const tenImages = Object.fromEntries(tenGames.map((game) => [`${gba}${game.name}.png`, png]));

function findAll(host: BoxArtHost, games: Game[]) {
  return renderHook(({ games }) => useFindAllBoxArt(games), { wrapper: wrapper(host), initialProps: { games } });
}

it("looks up box art for every game, 4 downloads at a time", async () => {
  const boxArt = fakeBoxArt(tenImages);
  const download = boxArt.host.download;
  let running = 0;
  let most = 0;
  boxArt.host.download = async (url) => {
    if (url === gbaListing) return download(url);
    most = Math.max(most, ++running);
    await new Promise((resolve) => setTimeout(resolve, 5));
    running--;
    return download(url);
  };

  findAll(boxArt.host, tenGames);

  await waitFor(() => expect(boxArt.cache.size).toBe(10));
  expect(most).toBe(4);
});

it("stops looking up box art once offline, and carries on at the next scan", async () => {
  const boxArt = fakeBoxArt(tenImages);
  boxArt.listings.set("gba/Named_Boxarts", { fetchedAt: Date.now(), names: tenGames.map((game) => game.name) });
  const download = vi.spyOn(boxArt.host, "download");
  boxArt.network.online = false;

  const { rerender } = findAll(boxArt.host, tenGames);

  await waitFor(() => expect(download).toHaveBeenCalledTimes(4));
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(download).toHaveBeenCalledTimes(4);

  boxArt.network.online = true;
  rerender({ games: [...tenGames] });

  await waitFor(() => expect(boxArt.cache.size).toBe(10));
});

it("shows box art a background lookup finds on a tile already showing", async () => {
  const boxArt = fakeBoxArt({ [`${gba}Pokemon - Emerald Version (USA, Europe).png`]: png });
  const games = [game("Pokemon Emerald")];

  const tile = renderHook(
    () => {
      useFindAllBoxArt(games);
      return useCachedBoxArt(games[0]);
    },
    { wrapper: wrapper(boxArt.host) },
  );

  await waitFor(() => expect(tile.result.current).toBe(dataUrl));
});

const emerald = game("Pokemon - Emerald Version (USA, Europe)");
const chosenUrl = "data:image/jpeg;base64,/9j/";

it("shows no box art for a game whose player chose none, without looking it up", async () => {
  const boxArt = fakeBoxArt({ [`${gba}${emerald.name}.png`]: png });
  boxArt.cache.set(`gba/${emerald.name}`, png);
  boxArt.choose(emerald.path, { kind: "none" });
  const download = vi.spyOn(boxArt.host, "download");
  const read = vi.spyOn(boxArt.host, "read");

  const shown = cached(boxArt.host, emerald);
  const found = find(boxArt.host, emerald);

  await waitFor(() => expect(found.result.current.loading).toBe(false));
  expect(found.result.current.url).toBeUndefined();
  expect(shown.result.current).toBeUndefined();
  expect(download).not.toHaveBeenCalled();
  expect(read).not.toHaveBeenCalled();
});

it("shows chosen box art over found box art", async () => {
  const boxArt = fakeBoxArt({ [`${gba}${emerald.name}.png`]: png });
  boxArt.cache.set(`gba/${emerald.name}`, png);
  boxArt.choose(emerald.path, { kind: "image", url: chosenUrl });

  const shown = cached(boxArt.host, emerald);
  const found = find(boxArt.host, emerald);

  await waitFor(() => expect(found.result.current.url).toBe(chosenUrl));
  await waitFor(() => expect(shown.result.current).toBe(chosenUrl));
});

it("shows a new choice in every place showing the game", async () => {
  const boxArt = fakeBoxArt();
  boxArt.cache.set(`gba/${emerald.name}`, png);
  const shown = cached(boxArt.host, emerald);
  const found = find(boxArt.host, emerald);
  await waitFor(() => expect(shown.result.current).toBe(dataUrl));

  act(() => boxArt.choose(emerald.path, { kind: "image", url: chosenUrl }));
  await waitFor(() => expect(shown.result.current).toBe(chosenUrl));
  await waitFor(() => expect(found.result.current.url).toBe(chosenUrl));

  act(() => boxArt.choose(emerald.path, undefined));
  await waitFor(() => expect(shown.result.current).toBe(dataUrl));
  await waitFor(() => expect(found.result.current.url).toBe(dataUrl));
});

it("doesn't look up box art in the background for a game with chosen box art", async () => {
  const boxArt = fakeBoxArt({ [`${gba}${emerald.name}.png`]: png });
  boxArt.choose(emerald.path, { kind: "none" });
  const other = game("Pokemon - Ruby Version (USA)");

  findAll(boxArt.host, [emerald, other]);

  await waitFor(() => expect(boxArt.listings.size).toBe(1));
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(boxArt.cache.size).toBe(0);
});
