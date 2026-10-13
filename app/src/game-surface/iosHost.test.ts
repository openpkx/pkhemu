import { invoke } from "@tauri-apps/api/core";
import { beforeEach, expect, it, vi } from "vitest";
import { iosGameSurfaceHost } from "./iosHost";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(async () => {}) }));

beforeEach(() => vi.mocked(invoke).mockClear());

it("tells Rust when a game starts and stops", () => {
  iosGameSurfaceHost.setPlaying(true);
  iosGameSurfaceHost.setPlaying(false);

  expect(vi.mocked(invoke).mock.calls).toEqual([
    ["screen_set_playing", { playing: true }],
    ["screen_set_playing", { playing: false }],
  ]);
});

it("swallows a failed call", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(invoke).mockRejectedValueOnce("no webview");

  iosGameSurfaceHost.setPlaying(true);
  await vi.waitFor(() => expect(error).toHaveBeenCalled());
  error.mockRestore();
});
