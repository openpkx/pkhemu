import type { ReactNode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { defaultSkins, type SkinChoice } from "@/skins";
import type { System } from "@/systems";
import { PreferencesProvider, usePreferences, type Preferences, type PreferencesHost } from "./preferences";

afterEach(cleanup);

const defaults: Preferences = { touchControls: false, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, updateDismissedVersion: 0, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1, playInSilentMode: false, renderer: "automatic", skins: defaultSkins, skinHintSeen: false, screenDepth: true, screenGlass: true, asyncShaders: false };

function launchWith(host: PreferencesHost, launchDefaults = defaults) {
  return renderHook(usePreferences, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <PreferencesProvider host={host} defaults={launchDefaults}>
        {children}
      </PreferencesProvider>
    ),
  });
}

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
    launch: (launchDefaults = defaults) => launchWith(host, launchDefaults),
  };
}

function syncedSkins(stored: Record<string, unknown> = {}, loaded: Promise<void> = Promise.resolve()) {
  let skins = stored;
  const chosen: [System, SkinChoice][] = [];
  const listeners = new Set<(won: Partial<Record<System, unknown>>) => void>();
  const host: PreferencesHost = {
    load: async () => {
      const read = skins;
      await loaded;
      return { skins: read as Preferences["skins"] };
    },
    save: async () => {},
    chooseSkin: async (system, choice) => {
      chosen.push([system, choice]);
      skins = { ...skins, [system]: { ...choice, changedAt: chosen.length } };
    },
    onSkinsChanged: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    host,
    chosen,
    stored: () => skins,
    syncDown: (won: Partial<Record<System, unknown>>) => {
      skins = { ...skins, ...won };
      for (const listener of listeners) listener(won);
    },
  };
}

it("starts with the platform defaults", async () => {
  const { launch } = fakeStore();

  const { result } = launch({ touchControls: true, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, updateDismissedVersion: 0, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1, playInSilentMode: false, renderer: "automatic", skins: defaultSkins, skinHintSeen: false, screenDepth: true, screenGlass: true, asyncShaders: false });

  await waitFor(() =>
    expect(result.current.preferences).toEqual({
      touchControls: true,
      fastForwardSpeed: 2,
      showFps: false,
      theme: "system",
      eventsNoticeDismissed: false,
      updateDismissedVersion: 0,
      gameClockOffset: { days: 0, hours: 0 },
      restoreBackupsKept: 10,
      stickSensitivity: 1,
      playInSilentMode: false,
      renderer: "automatic",
      skins: defaultSkins,
      skinHintSeen: false,
      screenDepth: true,
      screenGlass: true,
      asyncShaders: false,
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
  await act(() => first.result.current.change({ updateDismissedVersion: 42 }));
  await act(() => first.result.current.change({ gameClockOffset: { days: 3, hours: 6 } }));
  await act(() => first.result.current.change({ restoreBackupsKept: 3 }));
  await act(() => first.result.current.change({ stickSensitivity: 1.5 }));
  await act(() => first.result.current.change({ playInSilentMode: true }));
  await act(() => first.result.current.change({ renderer: "native" }));
  await act(() => first.result.current.change({ skins: { ...defaultSkins, gba: { skin: "glacier", look: "frosted" } } }));
  await act(() => first.result.current.change({ skinHintSeen: true }));
  await act(() => first.result.current.change({ screenDepth: false }));
  await act(() => first.result.current.change({ screenGlass: false }));
  await act(() => first.result.current.change({ asyncShaders: true }));
  first.unmount();
  const { result } = launch();

  await waitFor(() =>
    expect(result.current.preferences).toEqual({
      touchControls: true,
      fastForwardSpeed: 4,
      showFps: true,
      theme: "dark",
      eventsNoticeDismissed: true,
      updateDismissedVersion: 42,
      gameClockOffset: { days: 3, hours: 6 },
      restoreBackupsKept: 3,
      stickSensitivity: 1.5,
      playInSilentMode: true,
      renderer: "native",
      skins: { ...defaultSkins, gba: { skin: "glacier", look: "frosted" } },
      skinHintSeen: true,
      screenDepth: false,
      screenGlass: false,
      asyncShaders: true,
    }),
  );
});

it("fills in preferences that were never stored", async () => {
  const { launch } = fakeStore({ fastForwardSpeed: 4 });

  const { result } = launch({ touchControls: true, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, updateDismissedVersion: 0, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1, playInSilentMode: false, renderer: "automatic", skins: defaultSkins, skinHintSeen: false, screenDepth: true, screenGlass: true, asyncShaders: false });

  await waitFor(() =>
    expect(result.current.preferences).toEqual({
      touchControls: true,
      fastForwardSpeed: 4,
      showFps: false,
      theme: "system",
      eventsNoticeDismissed: false,
      updateDismissedVersion: 0,
      gameClockOffset: { days: 0, hours: 0 },
      restoreBackupsKept: 10,
      stickSensitivity: 1,
      playInSilentMode: false,
      renderer: "automatic",
      skins: defaultSkins,
      skinHintSeen: false,
      screenDepth: true,
      screenGlass: true,
      asyncShaders: false,
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

it("ignores a stored silent mode setting that isn't a switch", async () => {
  const { launch } = fakeStore({ playInSilentMode: "on" as unknown as boolean });

  const { result } = launch();

  await waitFor(() => expect(result.current.preferences.playInSilentMode).toBe(false));
});

it.each(["screenDepth", "screenGlass"] as const)("ignores a stored %s setting that isn't a switch", async (key) => {
  const { launch } = fakeStore({ [key]: "off" as unknown as boolean });

  const { result } = launch();

  await waitFor(() => expect(result.current.preferences[key]).toBe(true));
});

it("ignores a stored async shaders setting that isn't a switch", async () => {
  const { launch } = fakeStore({ asyncShaders: "on" as unknown as boolean });

  const { result } = launch();

  await waitFor(() => expect(result.current.preferences.asyncShaders).toBe(false));
});

it("ignores a stored theme it doesn't know", async () => {
  const { launch } = fakeStore({ theme: "sepia" as Preferences["theme"] });

  const { result } = launch();

  await waitFor(() => expect(result.current.preferences.theme).toBe("system"));
});

it("ignores a stored renderer it doesn't know", async () => {
  const { launch } = fakeStore({ renderer: "vulkan" as Preferences["renderer"] });

  const { result } = launch();

  await waitFor(() => expect(result.current.preferences.renderer).toBe("automatic"));
});

it("starts every system on pkhemu, Moulded", () => {
  expect(Object.values(defaultSkins)).toEqual(Array(6).fill({ skin: "pkhemu", look: "moulded" }));
});

it.each([
  ["a skin the system doesn't have", { skin: "glacier", look: "moulded" }],
  ["a look it doesn't know", { skin: "pkhemu", look: "glossy" }],
  ["text", "glacier"],
  ["nothing", null],
])("ignores a stored skin choice of %s and keeps the other systems'", async (_, gb) => {
  const { launch } = fakeStore({
    skins: { gb, n64: { skin: "gold", look: "frosted" } } as unknown as Preferences["skins"],
  });

  const { result } = launch();

  await waitFor(() =>
    expect(result.current.preferences.skins).toEqual({
      ...defaultSkins,
      n64: { skin: "gold", look: "frosted" },
    }),
  );
});

it("keeps a 3DS skin choice", async () => {
  const { launch } = fakeStore({
    skins: { "3ds": { skin: "aqua-blue", look: "moulded" } } as Preferences["skins"],
  });

  const { result } = launch();

  await waitFor(() => expect(result.current.preferences.skins["3ds"]).toEqual({ skin: "aqua-blue", look: "moulded" }));
});

it("shows a skin chosen on another device once sync brings it down", async () => {
  const { host, syncDown } = syncedSkins({
    gb: { skin: "classic-grey", look: "moulded", changedAt: 1 },
    gba: { skin: "indigo", look: "moulded", changedAt: 1 },
  });
  const { result } = launchWith(host);
  await waitFor(() => expect(result.current.preferences.skins.gba).toEqual({ skin: "indigo", look: "moulded" }));

  act(() => syncDown({ gba: { skin: "glacier", look: "frosted", changedAt: 2 } }));

  expect(result.current.preferences.skins).toEqual({
    ...defaultSkins,
    gb: { skin: "classic-grey", look: "moulded" },
    gba: { skin: "glacier", look: "frosted" },
  });
});

it("shows a skin that came down while the preferences were loading", async () => {
  let finishLoading = () => {};
  const { host, syncDown } = syncedSkins({}, new Promise((resolve) => (finishLoading = resolve)));
  const { result } = launchWith(host);

  act(() => syncDown({ gba: { skin: "glacier", look: "frosted", changedAt: 2 } }));
  finishLoading();

  await waitFor(() => expect(result.current.preferences.skins.gba).toEqual({ skin: "glacier", look: "frosted" }));
});

it("saves pkhemu when the player chooses it over a synced skin this build doesn't have", async () => {
  const { host, chosen, stored } = syncedSkins({ gba: { skin: "a-later-skin", look: "moulded", changedAt: 2 } });
  const { result } = launchWith(host);
  await waitFor(() => expect(result.current.preferences.skins).toEqual(defaultSkins));

  await act(() => result.current.chooseSkin("gba", { skin: "pkhemu", look: "moulded" }));

  expect(chosen).toEqual([["gba", { skin: "pkhemu", look: "moulded" }]]);
  expect(stored().gba).toMatchObject({ skin: "pkhemu", look: "moulded" });
});

it("keeps a chosen skin across restarts on a host that doesn't sync skins", async () => {
  const { launch } = fakeStore();
  const first = launch();
  await waitFor(() => expect(first.result.current.preferences.skins).toEqual(defaultSkins));

  await act(() => first.result.current.chooseSkin("n64", { skin: "gold", look: "frosted" }));
  first.unmount();
  const { result } = launch();

  await waitFor(() => expect(result.current.preferences.skins.n64).toEqual({ skin: "gold", look: "frosted" }));
});

it("saves only the system whose skin the player changed", async () => {
  const { host, chosen } = syncedSkins();
  const { result } = launchWith(host);
  await waitFor(() => expect(result.current.preferences.skins).toEqual(defaultSkins));

  await act(() => result.current.change({ skins: { ...result.current.preferences.skins, gb: { skin: "classic-grey", look: "frosted" } } }));
  await act(() => result.current.change({ showFps: true }));

  expect(chosen).toEqual([["gb", { skin: "classic-grey", look: "frosted" }]]);
});

it("shows pkhemu for a synced skin this build doesn't have and keeps the choice for later", async () => {
  const later = { skin: "a-later-skin", look: "moulded", changedAt: 2 };
  const { host, chosen, stored, syncDown } = syncedSkins();
  const { result } = launchWith(host);
  await waitFor(() => expect(result.current.preferences.skins).toEqual(defaultSkins));

  act(() => syncDown({ gba: later }));
  await act(() => result.current.change({ skins: { ...result.current.preferences.skins, gb: { skin: "classic-grey", look: "moulded" } } }));

  expect(result.current.preferences.skins.gba).toEqual({ skin: "pkhemu", look: "moulded" });
  expect(chosen.map(([system]) => system)).toEqual(["gb"]);
  expect(stored().gba).toEqual(later);
});

it("ignores a stored events notice dismissal that isn't a switch", async () => {
  const { launch } = fakeStore({ eventsNoticeDismissed: "true" as unknown as boolean });

  const { result } = launch();

  await waitFor(() => expect(result.current.preferences.eventsNoticeDismissed).toBe(false));
});

it("ignores a stored update dismissal that isn't a version code", async () => {
  const { launch } = fakeStore({ updateDismissedVersion: "42" as unknown as number });

  const { result } = launch();

  await waitFor(() => expect(result.current.preferences.updateDismissedVersion).toBe(0));
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
