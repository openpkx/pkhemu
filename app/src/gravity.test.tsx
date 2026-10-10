import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { readGravity, useGravity } from "./gravity";

afterEach(() => {
  cleanup();
  delete window.androidGravity;
  setVisibility("visible");
});

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}

function recordCalls() {
  const calls: string[] = [];
  window.androidGravity = {
    start: () => void calls.push("start"),
    stop: () => void calls.push("stop"),
    read: () => null,
  };
  return calls;
}

it("reads nothing where the bridge doesn't exist, as on macOS", () => {
  expect(readGravity()).toBeUndefined();
});

it("reads the latest gravity from the bridge", () => {
  window.androidGravity = { start: () => {}, stop: () => {}, read: () => "0.5,-9.7,1.25" };

  expect(readGravity()).toEqual({ x: 0.5, y: -9.7, z: 1.25 });
});

it("reads nothing before the sensor reports or where the device has none", () => {
  window.androidGravity = { start: () => {}, stop: () => {}, read: () => null };

  expect(readGravity()).toBeUndefined();
});

it("runs the sensor only while the game plays", () => {
  const calls = recordCalls();

  const { rerender, unmount } = renderHook(({ playing }) => useGravity(playing), { initialProps: { playing: false } });
  expect(calls).toEqual([]);

  rerender({ playing: true });
  expect(calls).toEqual(["start"]);

  rerender({ playing: false });
  expect(calls).toEqual(["start", "stop"]);

  rerender({ playing: true });
  unmount();
  expect(calls).toEqual(["start", "stop", "start", "stop"]);
});

it("stops the sensor while the app is in the background", () => {
  const calls = recordCalls();
  renderHook(() => useGravity(true));

  act(() => setVisibility("hidden"));
  expect(calls).toEqual(["start", "stop"]);

  act(() => setVisibility("visible"));
  expect(calls).toEqual(["start", "stop", "start"]);
});

it("does nothing where the bridge doesn't exist", () => {
  const { unmount } = renderHook(() => useGravity(true));

  act(() => setVisibility("hidden"));
  unmount();
});
