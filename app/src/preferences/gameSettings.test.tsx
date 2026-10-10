import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { patchOrigins, saveFormats, useGameSettings, type GameSettings, type GameSettingsHost } from "./gameSettings";

afterEach(cleanup);

function fakeStore(stored: Record<string, Partial<GameSettings>> = {}) {
  const games = { ...stored };
  const host: GameSettingsHost = {
    load: async (path) => games[path] ?? {},
    save: async (path, settings) => {
      games[path] = settings;
    },
  };
  return { host, launch: (path: string) => renderHook(() => useGameSettings(host, path)) };
}

it("starts with Pokémon info and Randomized off", async () => {
  const { launch } = fakeStore();

  const { result } = launch("gba/Emerald.gba");

  await waitFor(() => expect(result.current.settings).toEqual({ pokemonInfo: false, randomized: false }));
});

it("keeps each game's settings apart across restarts", async () => {
  const { launch } = fakeStore();
  const first = launch("gba/Emerald.gba");
  await waitFor(() => expect(first.result.current.settings).toBeDefined());

  await act(() => first.result.current.change({ pokemonInfo: true }));
  first.unmount();
  const emerald = launch("gba/Emerald.gba");
  const fireRed = launch("gba/FireRed.gba");

  await waitFor(() => expect(emerald.result.current.settings).toEqual({ pokemonInfo: true, randomized: false }));
  await waitFor(() => expect(fireRed.result.current.settings).toEqual({ pokemonInfo: false, randomized: false }));
});

it("ignores a stored value of the wrong type", async () => {
  const { launch } = fakeStore({ "gba/Emerald.gba": { pokemonInfo: "yes" as never } });

  const { result } = launch("gba/Emerald.gba");

  await waitFor(() => expect(result.current.settings).toEqual({ pokemonInfo: false, randomized: false }));
});

it("keeps Randomized apart from Pokémon info", async () => {
  const { launch } = fakeStore({ "gba/Emerald.gba": { pokemonInfo: true } });
  const { result } = launch("gba/Emerald.gba");
  await waitFor(() => expect(result.current.settings).toBeDefined());

  await act(() => result.current.change({ randomized: true }));

  expect(result.current.settings).toEqual({ pokemonInfo: true, randomized: true });
});

it("keeps a game's save format when another setting changes", async () => {
  const { host, launch } = fakeStore({ "gba/Emerald.gba": { formatId: "radicalred", formatChosen: true } });
  const { result } = launch("gba/Emerald.gba");
  await waitFor(() => expect(result.current.settings).toBeDefined());

  await act(() => result.current.change({ pokemonInfo: true }));

  expect(await saveFormats(host).saveFormat("gba/Emerald.gba")).toEqual({ id: "radicalred", chosen: true });
});

it("stores and clears a game's save format without touching its other settings", async () => {
  const { host } = fakeStore({ "gba/Emerald.gba": { pokemonInfo: true } });
  const formats = saveFormats(host);

  await formats.keepSaveFormat("gba/Emerald.gba", { id: "unbound", chosen: false });
  expect(await formats.saveFormat("gba/Emerald.gba")).toEqual({ id: "unbound", chosen: false });
  expect(await formats.saveFormat("gba/FireRed.gba")).toBeNull();

  await formats.keepSaveFormat("gba/Emerald.gba", null);
  expect(await formats.saveFormat("gba/Emerald.gba")).toBeNull();
  expect(await host.load("gba/Emerald.gba")).toEqual({ pokemonInfo: true, randomized: false });
});

const radicalRed = { build: "FireRed EN 1.0", patch: "radical_red.ups", sha256: "abc" };

it("stores where a patched game came from", async () => {
  const { host } = fakeStore();
  const origins = patchOrigins(host);

  await origins.keepPatchedFrom("gba/Radical Red.gba", radicalRed);

  expect(await origins.patchedFrom("gba/Radical Red.gba")).toEqual(radicalRed);
  expect(await origins.patchedFrom("gba/FireRed.gba")).toBeNull();
});

it("keeps where a patched game came from when its other settings change", async () => {
  const { host, launch } = fakeStore({ "gba/Radical Red.gba": { patchedFrom: radicalRed } });
  const { result } = launch("gba/Radical Red.gba");
  await waitFor(() => expect(result.current.settings).toBeDefined());

  await act(() => result.current.change({ pokemonInfo: true }));
  await saveFormats(host).keepSaveFormat("gba/Radical Red.gba", { id: "radicalred", chosen: true });

  expect(await patchOrigins(host).patchedFrom("gba/Radical Red.gba")).toEqual(radicalRed);
});

it("ignores a stored origin of the wrong shape", async () => {
  const { host } = fakeStore({ "gba/Radical Red.gba": { patchedFrom: { build: "FireRed EN 1.0" } as never } });

  expect(await patchOrigins(host).patchedFrom("gba/Radical Red.gba")).toBeNull();
});
