import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SystemBarsProvider, useHiddenSystemBars } from "./systemBars";

afterEach(cleanup);

it("hides the system bars while mounted and shows them again after", () => {
  const calls: boolean[] = [];
  const host = { setHidden: (hidden: boolean) => void calls.push(hidden), setLight: () => {}, splashHidden: () => {} };

  const { unmount } = renderHook(useHiddenSystemBars, {
    wrapper: ({ children }) => <SystemBarsProvider host={host}>{children}</SystemBarsProvider>,
  });
  expect(calls).toEqual([true]);

  unmount();
  expect(calls).toEqual([true, false]);
});

it("does nothing without a host", () => {
  const { unmount } = renderHook(useHiddenSystemBars);

  unmount();
});
