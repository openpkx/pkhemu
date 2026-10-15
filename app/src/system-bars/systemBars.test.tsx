import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SystemBarsProvider, useBarsTone, useHiddenSystemBars, useSystemBars } from "./systemBars";

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

it("gives the bars a tone while one is asked for, and the app's back after", () => {
  const calls: boolean[] = [];
  const host = { setHidden: () => {}, setLight: (light: boolean) => void calls.push(light), splashHidden: () => {} };
  const { result, rerender, unmount } = renderHook(
    ({ light }: { light?: boolean }) => {
      useBarsTone(light);
      return useSystemBars();
    },
    { initialProps: { light: true } as { light?: boolean }, wrapper: ({ children }) => <SystemBarsProvider host={host}>{children}</SystemBarsProvider> },
  );

  result.current.setLight(false);
  expect(calls).toEqual([true, true]);

  rerender({ light: undefined });
  expect(calls.at(-1)).toBe(false);

  rerender({ light: true });
  unmount();
  expect(calls.slice(-2)).toEqual([true, false]);
});
