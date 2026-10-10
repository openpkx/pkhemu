import type { ReactNode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PreferencesProvider, usePreferences, type Preferences, type PreferencesHost } from "./preferences";

afterEach(cleanup);

const defaults: Preferences = { touchControls: false, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1 };

function fakeStore(stored: Partial<Preferences> = {}) {
  let saved = stored;
  const host: PreferencesHost = {
    load: async () => saved,
    save: async (preferences) => {
      saved = preferences;
    },
  };
  return {
    host,
    saved: () => saved,
    launch: (launchDefaults = defaults) =>
      renderHook(usePreferences, {
        wrapper: ({ children }: { children: ReactNode }) => (
          <PreferencesProvider host={host} defaults={launchDefaults}>
            {children}
          </PreferencesProvider>
        ),
      }),
  };
}

it("starts with the platform defaults", async () => {
  const { launch } = fakeStore();

  const { result } = launch({ touchControls: true, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1 });

  await waitFor(() =>
    expect(result.current.preferences).toEqual({
      touchControls: true,
      fastForwardSpeed: 2,
      showFps: false,
      theme: "system",
      eventsNoticeDismissed: false,
      gameClockOffset: { days: 0, hours: 0 },
      restoreBackupsKept: 10,
      stickSensitivity: 1,
    }),
  );
});

it("keeps changes across restarts", async () => {
  const { launch } = fakeStore();
  const first = launch();
  await waitFor(() => expect(first.result.current).not.toBeNull());

  await act(() => first.result.current.change({ touchControls: true }));
  await act(() => first.result.current.change({ fastForwardSpeed: 4 }));
  await act(() => first.result.current.change({ showFps: true }));
  await act(() => first.result.current.change({ theme: "dark" }));
  await act(() => first.result.current.change({ eventsNoticeDismissed: true }));
  await act(() => first.result.current.change({ gameClockOffset: { days: 3, hours: 6 } }));
  await act(() => first.result.current.change({ restoreBackupsKept: 3 }));
  await act(() => first.result.current.change({ stickSensitivity: 1.5 }));
  first.unmount();
  const { result } = launch();

  await waitFor(() =>
    expect(result.current.preferences).toEqual({
      touchControls: true,
      fastForwardSpeed: 4,
      showFps: true,
      theme: "dark",
      eventsNoticeDismissed: true,
      gameClockOffset: { days: 3, hours: 6 },
      restoreBackupsKept: 3,
      stickSensitivity: 1.5,
    }),
  );
});

it("fills in preferences that were never stored", async () => {
  const { launch } = fakeStore({ fastForwardSpeed: 4 });

  const { result } = launch({ touchControls: true, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1 });

  await waitFor(() =>
    expect(result.current.preferences).toEqual({
      touchControls: true,
      fastForwardSpeed: 4,
      showFps: false,
      theme: "system",
      eventsNoticeDismissed: false,
      gameClockOffset: { days: 0, hours: 0 },
      restoreBackupsKept: 10,
      stickSensitivity: 1,
    }),
  );
});

it("ignores a stored speed it doesn't support", async () => {
  const { launch } = fakeStore({ fastForwardSpeed: 3 as Preferences["fastForwardSpeed"] });

  const { result } = launch();

  await waitFor(() => expect(result.current.preferences.fastForwardSpeed).toBe(2));
});

it("ignores a stored FPS setting that isn't a switch", async () => {
  const { launch } = fakeStore({ showFps: "yes" as unknown as boolean });

  const { result } = launch();

  await waitFor(() => expect(result.current.preferences.showFps).toBe(false));
});

it("ignores a stored theme it doesn't know", async () => {
  const { launch } = fakeStore({ theme: "sepia" as Preferences["theme"] });

  const { result } = launch();

  await waitFor(() => expect(result.current.preferences.theme).toBe("system"));
});

it("ignores a stored events notice dismissal that isn't a switch", async () => {
  const { launch } = fakeStore({ eventsNoticeDismissed: "true" as unknown as boolean });

  const { result } = launch();

  await waitFor(() => expect(result.current.preferences.eventsNoticeDismissed).toBe(false));
});

it.each([
  ["days past a year", { days: 366, hours: 0 }],
  ["hours past a day", { days: 0, hours: 24 }],
  ["negative days", { days: -1, hours: 0 }],
  ["fractional hours", { days: 1, hours: 1.5 }],
  ["text", { days: "3", hours: 0 }],
  ["a number", 86400],
  ["nothing", null],
])("ignores a stored game clock offset of %s", async (_, gameClockOffset) => {
  const { launch } = fakeStore({ gameClockOffset: gameClockOffset as unknown as Preferences["gameClockOffset"] });

  const { result } = launch();

  await waitFor(() => expect(result.current.preferences.gameClockOffset).toEqual({ days: 0, hours: 0 }));
});

it("keeps a stored game clock offset at the limits", async () => {
  const { launch } = fakeStore({ gameClockOffset: { days: 365, hours: 23 } });

  const { result } = launch();

  await waitFor(() => expect(result.current.preferences.gameClockOffset).toEqual({ days: 365, hours: 23 }));
});

it.each([
  ["none", 0],
  ["over 50", 51],
  ["a fraction", 2.5],
  ["text", "3"],
])("ignores a stored restore backup count of %s", async (_, restoreBackupsKept) => {
  const { launch } = fakeStore({ restoreBackupsKept: restoreBackupsKept as number });

  const { result } = launch();

  await waitFor(() => expect(result.current.preferences.restoreBackupsKept).toBe(10));
});

it.each([1, 50])("keeps a stored restore backup count of %s", async (restoreBackupsKept) => {
  const { launch } = fakeStore({ restoreBackupsKept });

  const { result } = launch();

  await waitFor(() => expect(result.current.preferences.restoreBackupsKept).toBe(restoreBackupsKept));
});

it("falls back to the defaults when the store can't be read", async () => {
  const { host, launch } = fakeStore();
  host.load = async () => {
    throw new Error("corrupt store");
  };

  const { result } = launch();

  await waitFor(() => expect(result.current.preferences).toEqual(defaults));
});

it("reports a change that couldn't be saved and keeps it for this session", async () => {
  const { host, launch } = fakeStore();
  host.save = async () => {
    throw new Error("disk full");
  };
  const { result } = launch();
  await waitFor(() => expect(result.current).not.toBeNull());

  await act(() => result.current.change({ touchControls: true }));

  expect(result.current.preferences.touchControls).toBe(true);
  expect(result.current.error).toMatch(/disk full/);
});
