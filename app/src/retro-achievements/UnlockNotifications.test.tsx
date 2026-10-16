import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { skins } from "@/skins";
import { overGame } from "./fakeRetroAchievements";
import type { AchievementEvent } from "./retroAchievements";
import { COMPLETION_HOLD_MS, HOLD_MS, UnlockNotifications } from "./UnlockNotifications";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const unlock = (id: number, title = `Achievement ${id}`): AchievementEvent => ({
  kind: "unlocked",
  id,
  title,
  description: `Description ${id}`,
  points: 10,
  badge: `0000${id}`,
});

const completed = (hardcore: boolean): AchievementEvent => ({
  kind: "completed",
  game: "Emerald",
  points: 1240,
  badge: "000002",
  hardcore,
});

function show({ paused = false, badges = {} as Record<string, Uint8Array> } = {}) {
  return overGame((paused) => <UnlockNotifications skin={skins.gba[0]} paused={paused} />, { paused, badges });
}

const shown = () => screen.queryByRole("status")?.getAttribute("aria-label");
const wait = (ms: number) => act(async () => vi.advanceTimersByTime(ms));

it("shows an unlock's title and points, and names it in full", async () => {
  const { send } = await show();

  await send(unlock(1, "Boulder Badge"));

  expect(shown()).toBe("Achievement unlocked: Boulder Badge, 10 pts. Description 1");
  expect(screen.getByRole("status").textContent).toContain("Boulder Badge · 10 pts");
});

it("holds an unlock for five seconds", async () => {
  const { send } = await show();

  await send(unlock(1));
  await wait(HOLD_MS - 100);
  expect(shown()).toContain("Achievement 1");
  await wait(100);

  expect(shown()).toBeUndefined();
});

it("plays a burst of five as the first, then one pill for the rest", async () => {
  const { send } = await show();

  await send(...[1, 2, 3, 4, 5].map((id) => unlock(id)));
  expect(shown()).toContain("Achievement 1");
  await wait(HOLD_MS);

  expect(shown()).toBe("+4 more achievements");
  await wait(HOLD_MS);
  expect(shown()).toBeUndefined();
});

it("plays unlocks that come while the game is paused once it resumes", async () => {
  const { send, pause } = await show({ paused: true });

  await send(unlock(1));
  expect(shown()).toBeUndefined();
  await pause(false);

  expect(shown()).toContain("Achievement 1");
});

it("holds the one showing while the game is paused", async () => {
  const { send, pause } = await show();
  await send(unlock(1));
  await wait(1000);

  await pause(true);
  await wait(HOLD_MS);
  expect(shown()).toContain("Achievement 1");
  await pause(false);
  await wait(HOLD_MS - 1000);

  expect(shown()).toBeUndefined();
});

function pill() {
  const pill = screen.getByRole("status");
  pill.setPointerCapture = () => {};
  return pill;
}

it("pauses while a finger is down", async () => {
  const { send } = await show();
  await send(unlock(1));

  fireEvent.pointerDown(pill(), { pointerId: 1, clientX: 100, clientY: 20 });
  await wait(HOLD_MS * 2);

  expect(shown()).toContain("Achievement 1");
});

it("flings an unlock swiped sideways and drops in the next", async () => {
  const { send } = await show();
  await send(unlock(1), unlock(2));

  fireEvent.pointerDown(pill(), { pointerId: 1, clientX: 100, clientY: 20 });
  await wait(1000);
  fireEvent.pointerMove(pill(), { pointerId: 1, clientX: 180, clientY: 22 });
  fireEvent.pointerUp(pill(), { pointerId: 1, clientX: 180, clientY: 22 });
  await act(async () => {});

  expect(shown()).toContain("Achievement 2");
});

it("flings an unlock flicked up", async () => {
  const { send } = await show();
  await send(unlock(1));

  fireEvent.pointerDown(pill(), { pointerId: 1, clientX: 100, clientY: 20 });
  await wait(20);
  fireEvent.pointerUp(pill(), { pointerId: 1, clientX: 100, clientY: 5 });
  await act(async () => {});

  expect(shown()).toBeUndefined();
});

it("springs back from a short drag or one downward, and runs out its time", async () => {
  const { send } = await show();
  await send(unlock(1));

  fireEvent.pointerDown(pill(), { pointerId: 1, clientX: 100, clientY: 20 });
  await wait(1000);
  fireEvent.pointerUp(pill(), { pointerId: 1, clientX: 130, clientY: 20 });
  fireEvent.pointerDown(pill(), { pointerId: 1, clientX: 100, clientY: 20 });
  await wait(1000);
  fireEvent.pointerUp(pill(), { pointerId: 1, clientX: 100, clientY: 300 });
  await act(async () => {});
  expect(shown()).toContain("Achievement 1");

  await wait(HOLD_MS);
  expect(shown()).toBeUndefined();
});

it("pauses while a mouse hovers over it", async () => {
  const { send } = await show();
  await send(unlock(1));

  fireEvent.pointerEnter(pill(), { pointerType: "mouse" });
  await wait(HOLD_MS * 2);
  expect(shown()).toContain("Achievement 1");
  fireEvent.pointerLeave(pill(), { pointerType: "mouse" });
  await wait(HOLD_MS);

  expect(shown()).toBeUndefined();
});

it("keeps an unlock 1.5s after the mouse leaves near the end of its time", async () => {
  const { send } = await show();
  await send(unlock(1));
  await wait(HOLD_MS - 100);

  fireEvent.pointerEnter(pill(), { pointerType: "mouse" });
  fireEvent.pointerLeave(pill(), { pointerType: "mouse" });
  await wait(1400);
  expect(shown()).toContain("Achievement 1");
  await wait(100);

  expect(shown()).toBeUndefined();
});

it("dismisses from its Dismiss button", async () => {
  const { send } = await show();
  await send(unlock(1));

  fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
  await act(async () => {});

  expect(shown()).toBeUndefined();
});

it("shows the badge once it's downloaded, and the pkhemu glyph until then", async () => {
  const { send } = await show({ badges: { "00001": new Uint8Array([1]) } });
  URL.createObjectURL = () => "blob:badge";
  URL.revokeObjectURL = () => {};

  await send(unlock(1));
  await act(async () => {});
  expect(pill().querySelector("img")?.getAttribute("src")).toBe("blob:badge");
  await wait(HOLD_MS);

  await send(unlock(2));
  await act(async () => {});
  expect(pill().querySelector("img")).toBeNull();
  expect(pill().querySelector("svg")).not.toBeNull();
});

it("shows a set completed in hardcore as mastered, with the set's points", async () => {
  const { send } = await show();

  await send(completed(true));

  expect(shown()).toBe("Mastered Emerald, 1,240 pts");
  expect(screen.getByRole("status").textContent).toContain("Mastered Emerald · 1,240 pts");
});

it("shows a set completed in softcore as completed", async () => {
  const { send } = await show();

  await send(completed(false));

  expect(screen.getByRole("status").textContent).toContain("Completed Emerald · 1,240 pts");
});

it("holds a completed set for seven seconds", async () => {
  const { send } = await show();

  await send(completed(true));
  await wait(COMPLETION_HOLD_MS - 100);
  expect(shown()).toContain("Mastered Emerald");
  await wait(100);

  expect(shown()).toBeUndefined();
});

it("plays a completed set after the unlock that completed it", async () => {
  const { send } = await show();

  await send(unlock(1), completed(true));
  expect(shown()).toContain("Achievement 1");
  await wait(HOLD_MS);

  expect(shown()).toContain("Mastered Emerald");
});

it("leaves progress and challenges to the indicators", async () => {
  const { send } = await show();

  await send(
    { kind: "progress", id: 1, title: "Achievement 1", badge: "00001", progress: "47/100" },
    { kind: "challengeShown", id: 2, title: "Achievement 2", badge: "00002" },
  );

  expect(shown()).toBeUndefined();
});

async function showOpening() {
  const onOpen = vi.fn();
  const { send } = await overGame(() => <UnlockNotifications skin={skins.gba[0]} paused={false} onOpen={onOpen} />);
  return { send, onOpen };
}

const tap = async () => {
  fireEvent.pointerDown(pill(), { pointerId: 1, clientX: 100, clientY: 20 });
  fireEvent.pointerUp(pill(), { pointerId: 1, clientX: 102, clientY: 21 });
  await act(async () => {});
};

it("dismisses an unlock tapped and opens it", async () => {
  const { send, onOpen } = await showOpening();
  await send(unlock(1));

  await tap();

  expect(shown()).toBeUndefined();
  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ kind: "unlock", unlock: expect.objectContaining({ id: 1 }) }));
});

it("opens the folded pill as more achievements", async () => {
  const { send, onOpen } = await showOpening();
  await send(...[1, 2, 3, 4, 5].map((id) => unlock(id)));
  await wait(HOLD_MS);

  await tap();

  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ kind: "more", count: 4 }));
});
