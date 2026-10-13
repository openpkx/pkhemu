import { invoke } from "@tauri-apps/api/core";
import { beforeEach, expect, it, vi } from "vitest";
import { iosSystemBarsHost } from "./iosHost";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(async () => {}) }));

beforeEach(() => vi.mocked(invoke).mockClear());

it("hides and shows the system bars through Rust", () => {
  iosSystemBarsHost.setHidden(true);
  iosSystemBarsHost.setHidden(false);

  expect(vi.mocked(invoke).mock.calls).toEqual([
    ["system_bars_set_hidden", { hidden: true }],
    ["system_bars_set_hidden", { hidden: false }],
  ]);
});

it("sets the status bar style from the theme", () => {
  iosSystemBarsHost.setLight(true);

  expect(invoke).toHaveBeenCalledWith("system_bars_set_light", { light: true });
});

it("swallows a failed call", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(invoke).mockRejectedValueOnce("no window");

  iosSystemBarsHost.setHidden(true);
  await vi.waitFor(() => expect(error).toHaveBeenCalled());
  error.mockRestore();
});
