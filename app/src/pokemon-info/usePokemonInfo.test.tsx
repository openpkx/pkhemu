import type { ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { EngineProvider } from "@pkhex-everywhere/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fakeEngine } from "@/editor/fakeEngine";
import { openGameMemory, type GameMemory } from "@/game-memory/gameMemory";
import emeraldOverworld from "@/game-memory/snapshots/emerald-overworld.json";
import { snapshotMemory } from "@/game-memory/snapshots/snapshotMemory";
import { READ_EVERY_MS, usePokemonInfo } from "./usePokemonInfo";

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function countingMemory() {
  let reads = 0;
  const memory: GameMemory = {
    build: "Emerald EN",
    read: async () => {
      reads++;
      return { build: "Emerald EN", format: "pk3", version: 3, party: [], battle: null };
    },
  };
  return { memory, reads: () => reads };
}

function launch(memory: GameMemory, active: boolean) {
  const { engine } = fakeEngine();
  return renderHook(({ active }) => usePokemonInfo(memory, active, "all"), {
    initialProps: { active },
    wrapper: ({ children }: { children: ReactNode }) => <EngineProvider engine={engine}>{children}</EngineProvider>,
  });
}

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

it("reads a few times a second while active", async () => {
  const { memory, reads } = countingMemory();
  const { result } = launch(memory, true);

  await wait(1000);

  expect(reads()).toBeGreaterThanOrEqual(2);
  expect(result.current).toEqual({ party: [], battle: null });
});

it("doesn't read while inactive", async () => {
  const { memory, reads } = countingMemory();
  launch(memory, false);

  await wait(1000);

  expect(reads()).toBe(0);
});

it("stops reading once inactive and keeps what it read", async () => {
  const { memory, reads } = countingMemory();
  const hook = launch(memory, true);
  await wait(READ_EVERY_MS);

  hook.rerender({ active: false });
  const before = reads();
  await wait(1000);

  expect(reads()).toBe(before);
  expect(hook.result.current).toEqual({ party: [], battle: null });
});

it("reads afresh when the save format changes", async () => {
  const memory = await openGameMemory("gba", snapshotMemory(emeraldOverworld));
  if (memory === "unsupported") throw new Error("unsupported");
  const { engine } = fakeEngine({
    inMemory: { TORCHIC: { species: 255 }, WURMPLE: { species: 265 }, WINGULL: { species: 278 } },
    memoryFormat: { id: "unbound", species: [] },
  });
  const hook = renderHook(({ formatId }) => usePokemonInfo(memory, true, "all", formatId), {
    initialProps: { formatId: undefined as string | undefined },
    wrapper: ({ children }: { children: ReactNode }) => <EngineProvider engine={engine}>{children}</EngineProvider>,
  });
  await wait(READ_EVERY_MS);
  expect(hook.result.current?.party.map(({ state }) => state)).toEqual(["unreadable", "unreadable", "unreadable"]);

  hook.rerender({ formatId: "unbound" });
  await wait(READ_EVERY_MS);

  expect(hook.result.current?.party.map(({ state }) => state)).toEqual(["read", "read", "read"]);
});
