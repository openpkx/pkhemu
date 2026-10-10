import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useHiddenSystemBars } from "./systemBars";

afterEach(() => {
  cleanup();
  delete window.androidSystemBars;
});

it("hides the system bars while mounted and shows them again after", () => {
  const calls: boolean[] = [];
  window.androidSystemBars = { setHidden: (hidden) => void calls.push(hidden), setLight: () => {} };

  const { unmount } = renderHook(useHiddenSystemBars);
  expect(calls).toEqual([true]);

  unmount();
  expect(calls).toEqual([true, false]);
});

it("does nothing where the bridge doesn't exist, as on macOS", () => {
  const { unmount } = renderHook(useHiddenSystemBars);

  unmount();
});
