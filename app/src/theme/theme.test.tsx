import type { ReactNode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { PreferencesProvider, usePreferences, type Preferences, type Theme } from "@/preferences/preferences";
import { useAppliedTheme } from "./theme";

let deviceDark: boolean;
let listeners: Set<() => void>;
let barsLight: boolean[];

beforeEach(() => {
  deviceDark = true;
  listeners = new Set();
  barsLight = [];
  window.matchMedia = (query: string) =>
    ({
      media: query,
      get matches() {
        return deviceDark;
      },
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    }) as unknown as MediaQueryList;
  window.androidSystemBars = { setHidden: () => {}, setLight: (light) => void barsLight.push(light), splashHidden: () => {} };
});

afterEach(() => {
  cleanup();
  delete window.androidSystemBars;
  delete document.documentElement.dataset.theme;
});

function changeDevice(dark: boolean) {
  deviceDark = dark;
  act(() => listeners.forEach((listener) => listener()));
}

function applyTheme(theme: Theme) {
  const defaults: Preferences = { touchControls: false, fastForwardSpeed: 2, showFps: false, theme, eventsNoticeDismissed: false, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1 };
  return renderHook(
    () => {
      useAppliedTheme();
      return usePreferences();
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <PreferencesProvider host={{ load: async () => ({}), save: async () => {} }} defaults={defaults}>
          {children}
        </PreferencesProvider>
      ),
    },
  );
}

it("follows the device while set to system", async () => {
  applyTheme("system");
  await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
  expect(barsLight).toEqual([false]);

  changeDevice(false);

  expect(document.documentElement.dataset.theme).toBe("light");
  expect(barsLight).toEqual([false, true]);
});

it("stays light on a dark device", async () => {
  applyTheme("light");
  await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));

  changeDevice(false);
  changeDevice(true);

  expect(document.documentElement.dataset.theme).toBe("light");
  expect(barsLight).toEqual([true]);
});

it("goes dark when set to dark", async () => {
  deviceDark = false;
  applyTheme("dark");

  await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
  expect(barsLight).toEqual([false]);
});

it("stops listening to the device once unmounted", async () => {
  const { unmount } = applyTheme("system");
  await waitFor(() => expect(listeners.size).toBe(1));

  unmount();

  expect(listeners.size).toBe(0);
});

it("stops listening to the device once set to light", async () => {
  const { result } = applyTheme("system");
  await waitFor(() => expect(listeners.size).toBe(1));

  await act(() => result.current.change({ theme: "light" }));
  changeDevice(true);

  expect(listeners.size).toBe(0);
  expect(document.documentElement.dataset.theme).toBe("light");
});
