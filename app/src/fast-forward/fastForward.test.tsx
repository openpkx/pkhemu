import type { ReactNode } from "react";
import { act, cleanup, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PreferencesProvider, type Preferences } from "@/preferences/preferences";
import { useFastForward } from "./fastForward";

afterEach(cleanup);

const defaults: Preferences = { touchControls: false, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, updateDismissedVersion: 0, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1, playInSilentMode: false, renderer: "automatic" };

async function launch(stored: Partial<Preferences> = {}, listening = true) {
  const host = { load: async () => stored, save: async () => {} };
  const hook = renderHook(() => useFastForward(listening), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <PreferencesProvider host={host} defaults={defaults}>
        {children}
      </PreferencesProvider>
    ),
  });
  await waitFor(() => expect(hook.result.current).not.toBeNull());
  return hook;
}

it("starts at normal speed", async () => {
  const { result } = await launch();

  expect(result.current.on).toBe(false);
  expect(result.current.speed).toBe(1);
});

it("runs at the speed from settings while on", async () => {
  const { result } = await launch({ fastForwardSpeed: 4 });

  act(() => result.current.toggle());

  expect(result.current.on).toBe(true);
  expect(result.current.speed).toBe(4);
});

it("goes back to normal speed when toggled off", async () => {
  const { result } = await launch();

  act(() => result.current.toggle());
  act(() => result.current.toggle());

  expect(result.current.speed).toBe(1);
});

it("toggles with Tab", async () => {
  const { result } = await launch();

  fireEvent.keyDown(window, { key: "Tab" });
  expect(result.current.speed).toBe(2);

  fireEvent.keyDown(window, { key: "Tab" });
  expect(result.current.speed).toBe(1);
});

it("ignores Tab repeating while held", async () => {
  const { result } = await launch();

  fireEvent.keyDown(window, { key: "Tab" });
  fireEvent.keyDown(window, { key: "Tab", repeat: true });

  expect(result.current.speed).toBe(2);
});

it("keeps Tab from moving focus", async () => {
  await launch();

  const allowed = fireEvent.keyDown(window, { key: "Tab" });

  expect(allowed).toBe(false);
});

it("leaves Tab alone while not listening", async () => {
  const { result } = await launch({}, false);

  const allowed = fireEvent.keyDown(window, { key: "Tab" });

  expect(allowed).toBe(true);
  expect(result.current.speed).toBe(1);
});
