import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import type { ComponentProps, ReactElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GameSurfaceProvider, type GameSurfaceHost } from "./game-surface/gameSurface";
import { createInput } from "./input/input";
import { GravityProvider, type Gravity, type GravityHost } from "./gravity/gravity";
import { experiments } from "./lab/experiments";
import { ExperimentsProvider } from "./lab/lab";
import { Player } from "./Player";
import { PreferencesProvider, type Preferences, type PreferencesHost } from "./preferences/preferences";
import type { Parallax } from "./screen";
import { dualScreens } from "./screens";
import { ShadersProvider } from "./shaders/shaders";
import { defaultSkins } from "./skins";
import { handheld } from "./systems";

type FakeChannel<T> = { onmessage?(message: T): void };
const played = vi.hoisted(
  () => [] as { onFrame: FakeChannel<ArrayBuffer>; onStep: FakeChannel<string>; native: boolean; onNativeFailed: FakeChannel<null> }[],
);

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (command: string, args: (typeof played)[number]) => {
    if (command !== "play") return undefined;
    played.push(args);
    return 60;
  }),
  Channel: class {},
}));

type Shift = { x: number; y: number };
const drawn = vi.hoisted(() => [] as { look?: unknown; windows: Parallax[] }[]);

vi.mock("./screen", () => ({
  createScreen: () => (_frame: unknown, _layout: unknown, look?: unknown, windows: Parallax[] = []) =>
    void drawn.push({ look, windows }),
}));

const shifts = () => drawn.map(({ windows }) => windows[0]?.shift);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.mocked(invoke).mockClear();
  played.length = 0;
  drawn.length = 0;
  gravity = undefined;
  stored = {};
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const input = createInput(() => []);
let gravity: GravityHost | undefined;
const noSensor: GravityHost = { tilts: true, start() {}, stop() {}, read: () => undefined };
const onError = () => {};
let stored: Partial<Preferences> = {};
const preferencesHost: PreferencesHost = { load: async () => stored, save: async () => {} };
const preferences: Preferences = { touchControls: false, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, updateDismissedVersion: 0, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1, playInSilentMode: false, renderer: "automatic", skins: defaultSkins, skinHintSeen: false, screenDepth: false, screenGlass: false, asyncShaders: false };

async function rendered(ui: ReactElement) {
  const result = render(ui);
  await act(async () => {});
  return result;
}

function player(props: Partial<ComponentProps<typeof Player>> = {}) {
  return (
    <GravityProvider host={gravity ?? noSensor}>
      <PreferencesProvider host={preferencesHost} defaults={preferences}>
        <Player
          folder="/games"
          path="gba/Ruby.gba"
          resume={false}
          speed={1}
          input={input}
          paused={false}
          display={handheld.gba}
          wall="#252437"
          swapped={false}
          clockOffset={0}
          renderer="native"
          onError={onError}
          {...props}
        />
      </PreferencesProvider>
    </GravityProvider>
  );
}

async function playing() {
  await vi.waitFor(() => expect(played).not.toHaveLength(0));
  return played.at(-1)!;
}

async function sendStep(step: string) {
  const { onStep } = await playing();
  act(() => onStep.onmessage!(step));
}

function frame(width: number, height: number, counts = { frames: 0, skipped: 0, repeated: 0 }) {
  const buffer = new ArrayBuffer(16 + width * height * 2);
  const view = new DataView(buffer);
  view.setUint32(0, counts.frames, true);
  view.setUint16(4, width, true);
  view.setUint16(6, height, true);
  view.setUint32(8, counts.skipped, true);
  view.setUint32(12, counts.repeated, true);
  return buffer;
}

async function sendFrame(width = 2, height = 2) {
  const { onFrame } = await playing();
  act(() => {
    onFrame.onmessage!(frame(width, height));
    vi.advanceTimersToNextFrame();
  });
}

function header(width: number, height: number) {
  return frame(width, height).slice(0, 16);
}

async function sendNativeFrame(width = 2, height = 2) {
  const { onFrame } = await playing();
  act(() => {
    onFrame.onmessage!(header(width, height));
    vi.advanceTimersToNextFrame();
  });
}

function sent(command: string) {
  return vi
    .mocked(invoke)
    .mock.calls.filter(([name]) => name === command)
    .map(([, args]) => args);
}

function tick() {
  act(() => void vi.advanceTimersToNextFrame());
}

it("shows Starting… until the first frame", async () => {
  await rendered(player());
  tick();
  expect(screen.getByRole("status").textContent).toBe("Starting…");

  await sendFrame();

  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.queryByRole("progressbar")).toBeNull();
});

it("starts the bar empty before any step", async () => {
  await rendered(player());

  expect(screen.getByRole("status").textContent).toBe("Starting…");
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
});

it("shows the step the start is on", async () => {
  render(player());

  await sendStep("rom");

  expect(screen.getByRole("status").textContent).toBe("Reading the game…");
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("25");
});

it("fills the bar on the last step", async () => {
  render(player());

  await sendStep("core");

  expect(screen.getByRole("status").textContent).toBe("Starting the game…");
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");
});

it("doesn't spin while starting", () => {
  const { container } = render(player());

  expect(container.querySelector("svg.animate-spin")).toBeNull();
});

it("says Resuming… when resuming", async () => {
  await rendered(player({ resume: true }));

  expect(screen.getByRole("status").textContent).toBe("Resuming…");
});

it("shows the cover behind the status until the first frame", async () => {
  const cover = "data:image/png;base64,AAAA";
  const { container } = await rendered(player({ resume: true, cover }));
  expect(container.querySelector("img")?.getAttribute("src")).toBe(cover);

  await sendFrame();

  expect(container.querySelector("img")).toBeNull();
});

it("doesn't show the status again after pausing", async () => {
  const { rerender } = render(player());
  await sendFrame();

  rerender(player({ paused: true }));
  tick();
  rerender(player({ paused: false }));
  tick();

  expect(screen.queryByRole("status")).toBeNull();
});

it("starts the game with the clock offset", async () => {
  render(player({ clockOffset: 3 * 86400 }));

  await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("play", expect.objectContaining({ clockOffset: 3 * 86400 })));
});

it.each([false, true])("starts the game with async shaders %s as the preference says", async (asyncShaders) => {
  stored = { asyncShaders };
  render(<ShadersProvider host={{ offered: async () => true, onLine: "" }}>{player()}</ShadersProvider>);

  await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("play", expect.objectContaining({ asyncShaders })));
});

it("starts the game without async shaders where the core can't draw while shaders compile", async () => {
  stored = { asyncShaders: true };
  render(<ShadersProvider host={{ offered: async () => false, onLine: "" }}>{player()}</ShadersProvider>);

  await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith("play", expect.objectContaining({ asyncShaders: false })));
});

it("plays an N64 game once and stops it only when the player leaves", async () => {
  const commands = () => vi.mocked(invoke).mock.calls.map(([command]) => command);
  const n64 = (onStarted: () => Promise<void>) =>
    player({ path: "n64/Stadium.z64", display: handheld.n64, onError: () => {}, onStarted });
  const onStarted = vi.fn(async () => {});
  const { rerender, unmount } = render(n64(onStarted));
  await sendFrame();
  await vi.waitFor(() => expect(onStarted).toHaveBeenCalled());

  rerender(n64(async () => {}));
  rerender(n64(async () => {}));
  tick();
  await act(async () => {});

  expect(commands().filter((command) => command === "play")).toHaveLength(1);
  expect(commands()).not.toContain("stop");

  unmount();
  await vi.waitFor(() => expect(commands()).toContain("stop"));
  expect(commands().filter((command) => command === "play")).toHaveLength(1);
});

function withExperiment(id: string, value: string, props: Partial<ComponentProps<typeof Player>>) {
  return (
    <ExperimentsProvider host={{ load: async () => ({ [id]: value }), save: async () => {} }} registry={experiments}>
      {player(props)}
    </ExperimentsProvider>
  );
}

function lastPacing() {
  const calls = vi.mocked(invoke).mock.calls.filter(([command]) => command === "pace");
  return (calls.at(-1)?.[1] as { pacing: object } | undefined)?.pacing;
}

function sentInputs() {
  return vi
    .mocked(invoke)
    .mock.calls.filter(([command]) => command === "set_input")
    .map(([, args]) => args as { input: number; analog: number[]; pointer: number[] | null });
}

it("has Rust run the game at the speed asked for", async () => {
  render(player({ speed: 4 }));

  await vi.waitFor(() => expect(lastPacing()).toEqual({ paused: false, speed: 4, steady: false, blend: false }));
});

it("pauses the game in Rust while paused", async () => {
  const { rerender } = render(player());

  rerender(player({ paused: true }));

  await vi.waitFor(() => expect(lastPacing()).toMatchObject({ paused: true }));
});

it("pauses the game in Rust while the app is hidden", async () => {
  render(player());
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");

  act(() => void document.dispatchEvent(new Event("visibilitychange")));

  await vi.waitFor(() => expect(lastPacing()).toMatchObject({ paused: true }));
});

it.each([
  ["motionBlur", { blend: true }],
  ["steadyFastForward", { steady: true }],
] as const)("passes the %s experiment on to Rust", async (id, pacing) => {
  render(withExperiment(id, "on", { speed: 4 }));

  await vi.waitFor(() => expect(lastPacing()).toMatchObject(pacing));
});

function pressing() {
  const pressed = createInput(() => []);
  let buttons = 0;
  vi.spyOn(pressed, "poll").mockImplementation(() => buttons);
  return { input: pressed, press: (mask: number) => (buttons = mask) };
}

it("sends input to Rust only when it changes", async () => {
  const pad = pressing();
  render(player({ input: pad.input }));
  await playing();
  tick();
  tick();
  expect(sentInputs()).toEqual([{ input: 0, analog: [0, 0, 0, 0], pointer: null }]);

  pad.press(1 << 8);
  tick();
  tick();

  expect(sentInputs()).toHaveLength(2);
  expect(sentInputs()[1]).toMatchObject({ input: 1 << 8 });
});

it("lets go of every button in Rust while paused", async () => {
  const pad = pressing();
  pad.press(1 << 3);
  const { rerender } = render(player({ input: pad.input }));
  await playing();
  tick();

  rerender(player({ input: pad.input, paused: true }));
  tick();

  expect(sentInputs().map(({ input }) => input)).toEqual([1 << 3, 0]);
});

it("draws a frame as soon as it arrives", async () => {
  render(player());
  await sendFrame();
  const before = drawn.length;
  const { onFrame } = await playing();

  act(() => onFrame.onmessage!(frame(2, 2)));

  expect(drawn.length).toBe(before + 1);
});

it("reports the frames Rust skipped and repeated", async () => {
  const onFps = vi.fn();
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  render(player({ onFps }));
  const { onFrame } = await playing();

  for (let i = 0; i <= 60; i++) {
    now = (i * 1000) / 60;
    act(() => onFrame.onmessage!(frame(2, 2, { frames: i, skipped: i, repeated: 2 * i })));
  }

  expect(onFps).toHaveBeenLastCalledWith({ fps: 60, drawn: 60, skipped: 60, repeated: 120 });
});

function media({ portrait = true, reduced = false } = {}) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: (query.includes("portrait") && portrait) || (query.includes("reduce") && reduced),
    addEventListener() {},
    removeEventListener() {},
  }));
}

function sensor(read: () => Gravity | undefined = () => undefined, tilts = true) {
  const calls: string[] = [];
  gravity = { tilts, start: () => void calls.push("start"), stop: () => void calls.push("stop"), read };
  return calls;
}

function withDepth(props: Partial<ComponentProps<typeof Player>> = {}, screenDepth = true) {
  stored = { screenDepth };
  return player(props);
}

const level = (shift?: Shift) => !shift || (shift.x === 0 && shift.y === 0);

it("runs the gravity sensor while a game shows in the shell with the tilt on", async () => {
  media();
  const calls = sensor();
  const { rerender, unmount } = render(withDepth());
  await playing();
  expect(calls).toEqual([]);

  await sendFrame();
  expect(calls).toEqual(["start"]);

  rerender(withDepth({ paused: true }));
  expect(calls).toEqual(["start", "stop"]);

  rerender(withDepth({ paused: false }));
  unmount();
  expect(calls).toEqual(["start", "stop", "start", "stop"]);
});

it.each([
  ["with Screen depth off", false, {}, {}, true],
  ["out of the shell, as in landscape", true, {}, { wall: undefined }, true],
  ["with reduced motion", true, { reduced: true }, {}, true],
  ["on a device that can't read tilt", true, {}, {}, false],
])("keeps the screen still and the sensor off %s", async (_, screenDepth, options, props, tilts) => {
  media(options);
  let reading = { x: 0, y: 6.94, z: 6.94 };
  const calls = sensor(() => reading, tilts);
  render(withDepth(props, screenDepth));
  await sendFrame();

  reading = { x: 4, y: 6.3, z: 6.3 };
  for (let i = 0; i < 10; i++) tick();

  expect(calls).toEqual([]);
  expect(shifts().every(level)).toBe(true);
});

it("keeps the screen still without a gravity reading", async () => {
  media();
  sensor();
  render(withDepth());
  await sendFrame();

  for (let i = 0; i < 10; i++) tick();

  expect(shifts().every(level)).toBe(true);
});

it("shifts the game image toward the edge the phone tilts up", async () => {
  media();
  let reading = { x: 0, y: 6.94, z: 6.94 };
  sensor(() => reading);
  render(withDepth());
  await sendFrame();
  for (let i = 0; i < 10; i++) tick();

  reading = { x: 2.5, y: 6.7, z: 6.7 };
  for (let i = 0; i < 10; i++) tick();

  expect(shifts().at(-1)!.x).toBeGreaterThan(0);
});

function tilted(reading: () => Gravity) {
  media();
  sensor(reading);
}

const rolledRight = { x: 6.94, y: 4.9, z: 4.9 };

it("shifts past the margin, up to the most the tilt gives", async () => {
  let reading = { x: 0, y: 6.94, z: 6.94 };
  tilted(() => reading);
  render(withDepth());
  await sendFrame();
  for (let i = 0; i < 10; i++) tick();

  reading = rolledRight;
  for (let i = 0; i < 30; i++) tick();

  expect(shifts().at(-1)).toEqual({ x: 5, y: 0 });
  expect(shifts().at(-1)!.x).toBeGreaterThan(handheld.gba!.marginDp);
});

it("draws plain black with the sensor off for a system without a handheld display", async () => {
  media();
  const calls = sensor(() => ({ x: 0, y: 6.94, z: 6.94 }));
  const { container } = render(withDepth({ display: undefined }));
  await sendFrame();
  for (let i = 0; i < 10; i++) tick();

  expect(container.firstElementChild!.className).toContain("bg-black");
  expect(calls).toEqual([]);
  expect(drawn.every(({ look, windows }) => look === undefined && windows.length === 0)).toBe(true);
});

it("maps a touch on the tilted DS touchscreen, which moves half as far", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private report: ResizeObserverCallback) {}
      observe() {
        this.report([{ contentRect: { width: 264, height: 600 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
      disconnect() {}
    },
  );
  let reading = { x: 0, y: 6.94, z: 6.94 };
  tilted(() => reading);
  const { marginDp, gapDp } = handheld.nds!;
  const touches = createInput(() => []);
  const touched = vi.spyOn(touches, "touchScreen");
  const { container } = render(withDepth({ screens: dualScreens.nds, display: handheld.nds, input: touches }));
  await sendFrame(256, 384);
  for (let i = 0; i < 10; i++) tick();
  reading = rolledRight;
  for (let i = 0; i < 30; i++) tick();

  const [top, bottom] = drawn.at(-1)!.windows;
  expect(bottom.exact.x).toBeCloseTo(top.exact.x / 2);
  expect(bottom.shift.x).toBeGreaterThan(0);
  const canvas = container.querySelector("canvas")!;
  canvas.setPointerCapture = () => {};
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: canvas.width, height: canvas.height } as DOMRect);
  const screenHeight = 192;
  const bottomScreen = { x: marginDp + bottom.shift.x, y: screenHeight + 2 * marginDp + gapDp + marginDp + bottom.shift.y };

  fireEvent.pointerDown(canvas, { button: 0, pointerId: 1, clientX: bottomScreen.x, clientY: bottomScreen.y });

  expect(touched).toHaveBeenLastCalledWith({ x: -0x7fff, y: 0 });
});

it("leaves a frame Rust drew natively to Rust and tells it where the game shows", async () => {
  render(player());

  await sendNativeFrame(240, 160);

  expect(drawn).toHaveLength(0);
  expect(screen.queryByRole("status")).toBeNull();
  expect(sent("set_screen")).toEqual([
    {
      layout: expect.objectContaining({
        canvas: { x: expect.any(Number), y: expect.any(Number) },
        views: [expect.objectContaining({ window: 0 })],
      }),
    },
  ]);
});

it("walls the opening in the colour it's given", async () => {
  media();
  const { rerender } = render(player({ wall: "#ff0000" }));
  await sendFrame();

  rerender(player({ wall: "#0000ff" }));
  tick();

  expect(drawn.map(({ look }) => (look as { shell: number[] } | undefined)?.shell)).toEqual([[1, 0, 0], [0, 0, 1]]);
});

it.each([
  [true, true],
  [false, false],
])("draws the glass as Screen glass says: %s", async (screenGlass, glass) => {
  media();
  stored = { screenGlass };
  render(player());
  await sendFrame();

  expect(drawn.at(-1)!.look).toMatchObject({ glass });
});

it("keeps the game area black without a wall colour", async () => {
  media();
  const { container } = render(player({ wall: undefined }));
  await sendFrame();

  expect(container.firstElementChild!.className).toContain("bg-black");
  expect(drawn.every(({ look }) => look === undefined)).toBe(true);
});

it("leaves the page clear over each window while Rust draws natively, and whole after", async () => {
  media();
  const onWindows = vi.fn();
  const { unmount } = render(player({ screens: dualScreens.nds, display: handheld.nds, onWindows }));

  await sendNativeFrame(256, 384);
  expect(onWindows).toHaveBeenLastCalledWith([
    { x: expect.any(Number), y: expect.any(Number), width: expect.any(Number), height: expect.any(Number) },
    { x: expect.any(Number), y: expect.any(Number), width: expect.any(Number), height: expect.any(Number) },
  ]);

  unmount();
  expect(onWindows).toHaveBeenLastCalledWith(undefined);
});

it("leaves the page whole while WebGL draws", async () => {
  media();
  const onWindows = vi.fn();
  render(player({ onWindows }));

  await sendFrame();

  expect(onWindows).not.toHaveBeenCalledWith(expect.any(Array));
});

it("clears the page over the game while Rust draws it natively", async () => {
  const { unmount } = render(player());
  expect(document.documentElement.hasAttribute("data-native-screen")).toBe(false);

  await sendNativeFrame();
  expect(document.documentElement.hasAttribute("data-native-screen")).toBe(true);

  unmount();
  expect(document.documentElement.hasAttribute("data-native-screen")).toBe(false);
});

it("draws with WebGL once Rust sends the pixels again", async () => {
  render(player());
  await sendNativeFrame();

  await sendFrame();

  expect(drawn).toHaveLength(1);
  expect(document.documentElement.hasAttribute("data-native-screen")).toBe(false);
});

it("sends the tilt to Rust while it draws natively", async () => {
  media();
  let reading = { x: 0, y: 6.94, z: 6.94 };
  sensor(() => reading);
  render(withDepth());
  await sendNativeFrame();
  for (let i = 0; i < 10; i++) tick();

  reading = { x: 2.5, y: 6.7, z: 6.7 };
  for (let i = 0; i < 10; i++) tick();

  const parallax = sent("set_parallax").at(-1) as { parallax: Parallax[] };
  expect(parallax.parallax[0].shift.x).not.toBe(0);
});

it("paints the page again while a game is held", async () => {
  const { rerender } = render(player());
  await sendNativeFrame();

  rerender(player({ holdMessage: "Checking your other devices…" }));

  expect(document.documentElement.hasAttribute("data-native-screen")).toBe(false);
});

it.each([
  ["native", true],
  ["compatible", false],
] as const)("asks Rust to draw natively only for the %s renderer", async (renderer, native) => {
  render(player({ renderer }));

  expect((await playing()).native).toBe(native);
});

function onSurface(host: GameSurfaceHost, props: Partial<ComponentProps<typeof Player>>) {
  return <GameSurfaceProvider host={host}>{player(props)}</GameSurfaceProvider>;
}

it("shows the native surface only for the native renderer, as the game started", async () => {
  const calls: boolean[] = [];
  const host: GameSurfaceHost = { renderers: ["native", "compatible"], setPlaying: (playing) => void calls.push(playing) };
  const { rerender, unmount } = render(onSurface(host, { renderer: "compatible" }));
  await playing();

  rerender(onSurface(host, { renderer: "native" }));
  unmount();

  expect(calls).toEqual([]);
});

it("says when the native renderer fails", async () => {
  const onNativeFailed = vi.fn();
  render(player({ renderer: "native", onNativeFailed }));

  const played = await playing();
  act(() => played.onNativeFailed.onmessage!(null));

  expect(onNativeFailed).toHaveBeenCalledOnce();
});
