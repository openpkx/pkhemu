import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it } from "vitest";
import { GravityProvider, useCanTilt, useGravity, type GravityHost } from "./gravity";

afterEach(() => {
  cleanup();
  setVisibility("visible");
});

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}

function recordCalls() {
  const calls: string[] = [];
  const host: GravityHost = { tilts: true, start: () => void calls.push("start"), stop: () => void calls.push("stop"), read: () => undefined };
  const wrapper = ({ children }: { children: ReactNode }) => <GravityProvider host={host}>{children}</GravityProvider>;
  return { calls, wrapper };
}

it("reads the host's latest gravity", () => {
  const host: GravityHost = { tilts: true, start() {}, stop() {}, read: () => ({ x: 0.5, y: -9.7, z: 1.25 }) };
  const { result } = renderHook(() => useGravity(false), {
    wrapper: ({ children }) => <GravityProvider host={host}>{children}</GravityProvider>,
  });

  expect(result.current()).toEqual({ x: 0.5, y: -9.7, z: 1.25 });
});

it("runs the sensor only while the game plays", () => {
  const { calls, wrapper } = recordCalls();

  const { rerender, unmount } = renderHook(({ playing }) => useGravity(playing), { initialProps: { playing: false }, wrapper });
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
  const { calls, wrapper } = recordCalls();
  renderHook(() => useGravity(true), { wrapper });

  act(() => setVisibility("hidden"));
  expect(calls).toEqual(["start", "stop"]);

  act(() => setVisibility("visible"));
  expect(calls).toEqual(["start", "stop", "start"]);
});

it("reads nothing without a host", () => {
  const { result, unmount } = renderHook(() => useGravity(true));

  act(() => setVisibility("hidden"));
  expect(result.current()).toBeUndefined();
  unmount();
});

it("can't tilt without a host that reads tilt", () => {
  const { result } = renderHook(useCanTilt);

  expect(result.current).toBe(false);
});
