import { impactFeedback } from "@tauri-apps/plugin-haptics";
import { beforeEach, expect, it, vi } from "vitest";
import { iosHapticsHost } from "./iosHost";

vi.mock("@tauri-apps/plugin-haptics", () => ({ impactFeedback: vi.fn(async () => ({ status: "ok", data: null })) }));

beforeEach(() => vi.mocked(impactFeedback).mockClear());

it("plays a light impact on a tap", () => {
  iosHapticsHost.tap();

  expect(impactFeedback).toHaveBeenCalledWith("light");
});

it("swallows a failed call", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(impactFeedback).mockRejectedValueOnce("no plugin");

  iosHapticsHost.tap();
  await vi.waitFor(() => expect(error).toHaveBeenCalled());
  error.mockRestore();
});
