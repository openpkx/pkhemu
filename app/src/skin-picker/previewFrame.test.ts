import { expect, test, vi } from "vitest";
import { lastScreenshotOn, type PreviewFrameHost } from "./previewFrame";

function host(recent: string[], screenshots: Record<string, number[]>): PreviewFrameHost {
  return {
    pausedScreenshot: vi.fn(async () => null),
    recentlyPlayed: vi.fn(async () => recent),
    lastScreenshot: vi.fn(async (_folder: string, path: string) => screenshots[path] ?? null),
  };
}

test("takes the last screenshot of the game most recently played on the system", async () => {
  const games = host(["gba/Emerald.gba", "gb/Red.gb", "gb/Blue.gb"], { "gb/Red.gb": [1], "gb/Blue.gb": [2] });

  expect(await lastScreenshotOn(games, "/games", "gb")).toEqual([1]);
  expect(games.lastScreenshot).toHaveBeenCalledWith("/games", "gb/Red.gb");
});

test("has no screenshot when nothing on the system was played or it left none", async () => {
  expect(await lastScreenshotOn(host(["gba/Emerald.gba"], {}), "/games", "gb")).toBeUndefined();
  expect(await lastScreenshotOn(host(["gb/Red.gb"], {}), "/games", "gb")).toBeUndefined();
});

test("tells GB from GBC by the system folder", async () => {
  const games = host(["gbc/Crystal.gbc", "gb/Red.gb"], { "gbc/Crystal.gbc": [3], "gb/Red.gb": [1] });

  expect(await lastScreenshotOn(games, "/games", "gb")).toEqual([1]);
});
