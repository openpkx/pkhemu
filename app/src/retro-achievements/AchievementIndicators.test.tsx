import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { skins } from "@/skins";
import { AchievementIndicators, LEADERBOARD_MS, PROGRESS_MS, SUBMITTED_MS } from "./AchievementIndicators";
import { overGame } from "./fakeRetroAchievements";
import type { AchievementEvent } from "./retroAchievements";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const progress = (count: number): AchievementEvent => ({
  kind: "progress",
  id: 1,
  title: "Gotta Catch 'Em",
  badge: "00001",
  progress: `${count}/100`,
});

const challenge = (id: number): AchievementEvent => ({
  kind: "challengeShown",
  id,
  title: `Challenge ${id}`,
  badge: `0000${id}`,
});

function show({ paused = false, badges = {} as Record<string, Uint8Array> } = {}) {
  return overGame((paused) => <AchievementIndicators skin={skins.gba[0]} paused={paused} />, { paused, badges });
}

const shownProgress = () => screen.queryByRole("status", { name: /^Gotta Catch 'Em/ })?.textContent;
const challenges = () => screen.queryAllByRole("status", { name: /^Challenge/ }).map((badge) => badge.getAttribute("aria-label"));
const wait = (ms: number) => act(async () => vi.advanceTimersByTime(ms));

it("shows a measured achievement's progress for two seconds", async () => {
  const { send } = await show();

  await send(progress(47));
  expect(shownProgress()).toBe("47/100");
  expect(screen.getByRole("status").getAttribute("aria-label")).toBe("Gotta Catch 'Em: 47/100");
  await wait(PROGRESS_MS - 100);
  expect(shownProgress()).toBe("47/100");
  await wait(100);

  expect(shownProgress()).toBeUndefined();
});

it("replaces the progress with a newer update, and holds that for two seconds", async () => {
  const { send } = await show();
  await send(progress(47));
  await wait(1500);

  await send(progress(48));
  expect(shownProgress()).toBe("48/100");
  await wait(PROGRESS_MS - 100);
  expect(shownProgress()).toBe("48/100");
  await wait(100);

  expect(shownProgress()).toBeUndefined();
});

it("holds the progress while the game is paused", async () => {
  const { send, pause } = await show();
  await send(progress(47));
  await wait(500);

  await pause(true);
  await wait(PROGRESS_MS * 2);
  expect(shownProgress()).toBe("47/100");
  await pause(false);
  await wait(PROGRESS_MS - 500);

  expect(shownProgress()).toBeUndefined();
});

it("shows a challenge until it ends", async () => {
  const { send } = await show();

  await send(challenge(1));
  await wait(60_000);
  expect(challenges()).toEqual(["Challenge: Challenge 1"]);
  await send({ kind: "challengeHidden", id: 1 });

  expect(challenges()).toEqual([]);
});

it("shows every challenge that's live, and each until it ends", async () => {
  const { send } = await show();

  await send(challenge(1), challenge(2), challenge(1));
  expect(challenges()).toEqual(["Challenge: Challenge 1", "Challenge: Challenge 2"]);
  await send({ kind: "challengeHidden", id: 1 });

  expect(challenges()).toEqual(["Challenge: Challenge 2"]);
});

it("shows the progress beside the challenges", async () => {
  const { send } = await show();

  await send(challenge(1), progress(47));

  expect(screen.getAllByRole("status").map((status) => status.getAttribute("aria-label"))).toEqual([
    "Gotta Catch 'Em: 47/100",
    "Challenge: Challenge 1",
  ]);
});

it("shows the badges once they're downloaded", async () => {
  URL.createObjectURL = () => "blob:badge";
  URL.revokeObjectURL = () => {};
  const { send } = await show({ badges: { "00001": new Uint8Array([1]) } });

  await send(progress(47), challenge(1));
  await act(async () => {});

  const badges = screen.getAllByRole("status").map((status) => status.querySelector("img")?.getAttribute("src"));
  expect(badges).toEqual(["blob:badge", "blob:badge"]);
});

it("leaves unlocks to the notification", async () => {
  const { send } = await show();

  await send({ kind: "unlocked", id: 1, title: "Boulder Badge", description: "", points: 10, badge: "00001" });

  expect(screen.queryByRole("status")).toBeNull();
});

const started: AchievementEvent = { kind: "leaderboardStarted", id: 201, title: "Speedrun" };
const tracker = (value: string): AchievementEvent => ({ kind: "tracker", id: 1, value });
const labels = () => screen.queryAllByRole("status").map((status) => status.getAttribute("aria-label"));
const message = () => labels().find((label) => !label?.startsWith("Leaderboard:"));

it("shows a leaderboard's start with its title for two seconds", async () => {
  const { send } = await show();

  await send(started);
  expect(message()).toContain("Speedrun");
  await wait(LEADERBOARD_MS - 100);
  expect(message()).toContain("Speedrun");
  await wait(100);

  expect(message()).toBeUndefined();
});

it("shows a leaderboard's tracker until it ends", async () => {
  const { send } = await show();

  await send(tracker("0:00.01"), started, tracker("0:00.02"));
  await wait(60_000);
  expect(labels()).toEqual(["Leaderboard: 0:00.02"]);
  await send({ kind: "trackerHidden", id: 1 });

  expect(labels()).toEqual([]);
});

it("shows a submitted score for three seconds", async () => {
  const { send } = await show();

  await send(
    started,
    { kind: "trackerHidden", id: 1 },
    { kind: "leaderboardSubmitted", id: 201, title: "Speedrun", score: "1:23:45" },
  );
  expect(message()).toContain("1:23:45");
  await wait(SUBMITTED_MS - 100);
  expect(message()).toContain("1:23:45");
  await wait(100);

  expect(message()).toBeUndefined();
});

it("shows a failed leaderboard for two seconds", async () => {
  const { send } = await show();

  await send({ kind: "leaderboardFailed", id: 201, title: "Speedrun" });
  expect(message()).toBeDefined();
  await wait(LEADERBOARD_MS);

  expect(message()).toBeUndefined();
});

it("holds a leaderboard message while the game is paused", async () => {
  const { send, pause } = await show();
  await send(started);

  await pause(true);
  await wait(LEADERBOARD_MS * 2);
  expect(message()).toContain("Speedrun");
  await pause(false);
  await wait(LEADERBOARD_MS);

  expect(message()).toBeUndefined();
});

it("shows a leaderboard message above the tracker, progress and challenges", async () => {
  const { send } = await show();

  await send(challenge(1), tracker("0:00.01"), progress(47), started);

  const [first, ...rest] = labels();
  expect(first).toContain("Speedrun");
  expect(rest).toEqual([
    "Gotta Catch 'Em: 47/100",
    "Leaderboard: 0:00.01",
    "Challenge: Challenge 1",
  ]);
});
