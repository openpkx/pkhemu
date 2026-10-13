import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PreferencesProvider, usePreferences, type Preferences, type PreferencesState } from "@/preferences/preferences";
import { AudioSessionProvider } from "./audioSession";

afterEach(cleanup);

const defaults: Preferences = { touchControls: true, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, updateDismissedVersion: 0, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1, playInSilentMode: false, renderer: "automatic" };

it("sets the audio session from the stored setting at launch and on every change", async () => {
  const host = { silentSwitch: true, playInSilentMode: vi.fn(async () => {}) };
  let preferences: PreferencesState | undefined;
  function Grab() {
    preferences = usePreferences();
    return null;
  }
  render(
    <PreferencesProvider host={{ load: async () => ({ playInSilentMode: true }), save: async () => {} }} defaults={defaults}>
      <AudioSessionProvider host={host}>
        <Grab />
      </AudioSessionProvider>
    </PreferencesProvider>,
  );
  await waitFor(() => expect(host.playInSilentMode).toHaveBeenLastCalledWith(true));

  await act(() => preferences!.change({ playInSilentMode: false }));

  expect(host.playInSilentMode).toHaveBeenLastCalledWith(false);
});
