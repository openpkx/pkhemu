import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useNextSave } from "./saveFirst";
import type { SaveHost } from "./editSession";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function game(sinceSave: number) {
  let savedAt = Date.now() - sinceSave * 1000;
  const host: SaveHost = {
    read: async () => new Uint8Array(),
    apply: async () => {},
    playTimeSinceSave: async () => (Date.now() - savedAt) / 1000,
  };
  return {
    host,
    play: (seconds: number) => act(() => vi.advanceTimersByTimeAsync(seconds * 1000)),
    save: () => (savedAt = Date.now()),
  };
}

it("waits for the game to save, and for the save to settle", async () => {
  const { host, play, save } = game(120);
  const onSaved = vi.fn();
  renderHook(() => useNextSave(host, true, onSaved));

  await play(30);
  expect(onSaved).not.toHaveBeenCalled();

  save();
  await play(0.5);
  expect(onSaved).not.toHaveBeenCalled();

  await play(2);
  expect(onSaved).toHaveBeenCalledOnce();
});

it("waits until the game stops writing", async () => {
  const { host, play, save } = game(120);
  const onSaved = vi.fn();
  renderHook(() => useNextSave(host, true, onSaved));
  await play(1);

  save();
  await play(0.5);
  save();
  await play(0.5);
  expect(onSaved).not.toHaveBeenCalled();

  await play(2);
  expect(onSaved).toHaveBeenCalledOnce();
});

it("stops waiting when told to", async () => {
  const { host, play, save } = game(120);
  const onSaved = vi.fn();
  const { rerender } = renderHook(({ waiting }) => useNextSave(host, waiting, onSaved), {
    initialProps: { waiting: true },
  });
  await play(1);

  rerender({ waiting: false });
  save();
  await play(5);

  expect(onSaved).not.toHaveBeenCalled();
});
