import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GravityProvider, type GravityHost } from "@/gravity/gravity";
import { PreferencesProvider, type Preferences } from "@/preferences/preferences";
import { defaultSkins } from "@/skins";
import { PreviewScreen } from "./PreviewScreen";

const drawn = vi.hoisted(() => [] as { look: unknown }[]);

vi.mock("@/screen", () => ({ createScreen: () => (_frame: unknown, _layout: unknown, look: unknown) => void drawn.push({ look }) }));

const defaults: Preferences = { touchControls: true, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, updateDismissedVersion: 0, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1, playInSilentMode: false, renderer: "automatic", skins: defaultSkins, skinHintSeen: false, screenDepth: true, screenGlass: true, asyncShaders: false };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private report: ResizeObserverCallback) {}
      observe() {
        this.report([{ contentRect: { width: 300, height: 400 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

afterEach(() => {
  cleanup();
  drawn.length = 0;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function preview(stored: Partial<Preferences>) {
  const calls: string[] = [];
  const gravity: GravityHost = { tilts: true, start: () => void calls.push("start"), stop: () => void calls.push("stop"), read: () => undefined };
  render(
    <GravityProvider host={gravity}>
      <PreferencesProvider host={{ load: async () => stored, save: async () => {} }} defaults={defaults}>
        <PreviewScreen system="gb" frame={{ width: 160, height: 144, pixels: new Uint16Array(160 * 144) }} wall={[0.2, 0.2, 0.2]} />
      </PreferencesProvider>
    </GravityProvider>,
  );
  await act(async () => {});
  act(() => void vi.advanceTimersToNextFrame());
  return calls;
}

it.each([true, false])("draws the preview with Screen glass %s", async (screenGlass) => {
  await preview({ screenGlass });

  expect(drawn.at(-1)!.look).toMatchObject({ glass: screenGlass });
});

it.each([
  [true, ["start"]],
  [false, []],
])("reads the tilt only with Screen depth %s", async (screenDepth, calls) => {
  expect(await preview({ screenDepth })).toEqual(calls);
});
