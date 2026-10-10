import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReadMemory } from "./builds";
import emeraldOverworld from "./snapshots/emerald-overworld.json";
import { snapshotMemory } from "./snapshots/snapshotMemory";
import { useGameMemory } from "./useGameMemory";

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

it("waits for the game to run before reading it", async () => {
  const read = vi.fn(snapshotMemory(emeraldOverworld));
  const hook = renderHook(({ running }) => useGameMemory("gba", running, read), { initialProps: { running: false } });
  await wait(0);
  expect(read).not.toHaveBeenCalled();

  hook.rerender({ running: true });
  await wait(0);

  expect(hook.result.current).toMatchObject({ build: "Emerald EN" });
});

it("tries again when a read fails, rather than calling the game unsupported", async () => {
  const memory = snapshotMemory(emeraldOverworld);
  let failures = 1;
  const read: ReadMemory = async (ranges) => {
    if (failures-- > 0) throw new Error("No game running");
    return memory(ranges);
  };
  const { result } = renderHook(() => useGameMemory("gba", true, read));
  await wait(0);
  expect(result.current).toBeUndefined();

  await wait(1000);

  expect(result.current).toMatchObject({ build: "Emerald EN" });
});

it("reports a game it has no addresses for", async () => {
  const { result } = renderHook(() => useGameMemory("gb", true, vi.fn()));

  await wait(0);

  expect(result.current).toBe("unsupported");
});
