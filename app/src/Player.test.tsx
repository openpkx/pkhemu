import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createInput } from "./input/input";
import { experiments } from "./lab/experiments";
import { ExperimentsProvider } from "./lab/lab";
import { Player } from "./Player";
import type { Parallax } from "./screen";
import { handheld } from "./systems";

type FakeChannel<T> = { onmessage?(message: T): void };
const played = vi.hoisted(() => [] as { onFrame: FakeChannel<ArrayBuffer>; onStep: FakeChannel<string> }[]);

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
  delete window.androidGravity;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const input = createInput(() => []);
const onError = () => {};

function player(props: Partial<ComponentProps<typeof Player>> = {}) {
  return (
    <Player
      folder="/games"
      path="gba/Ruby.gba"
      resume={false}
      speed={1}
      input={input}
      paused={false}
      dual={false}
      display={handheld.gba}
      swapped={false}
      clockOffset={0}
      onError={onError}
      {...props}
    />
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

async function sendFrame(width = 2, height = 2) {
  const { onFrame } = await playing();
  const buffer = new ArrayBuffer(16 + width * height * 2);
  const view = new DataView(buffer);
  view.setUint16(4, width, true);
  view.setUint16(6, height, true);
  act(() => {
    onFrame.onmessage!(buffer);
    vi.advanceTimersToNextFrame();
  });
}

function tick() {
  act(() => void vi.advanceTimersToNextFrame());
}

it("shows Starting… until the first frame", async () => {
  render(player());
  tick();
  expect(screen.getByRole("status").textContent).toBe("Starting…");

  await sendFrame();

  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.queryByRole("progressbar")).toBeNull();
});

it("starts the bar empty before any step", () => {
  render(player());

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

it("says Resuming… when resuming", () => {
  render(player({ resume: true }));

  expect(screen.getByRole("status").textContent).toBe("Resuming…");
});

it("shows the cover behind the status until the first frame", async () => {
  const cover = "data:image/png;base64,AAAA";
  const { container } = render(player({ resume: true, cover }));
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

async function runFramesCalls(refreshes: number) {
  await playing();
  await act(async () => {});
  for (let i = 0; i < refreshes; i++) await act(async () => void vi.advanceTimersToNextFrame());
  return vi
    .mocked(invoke)
    .mock.calls.filter(([command]) => command === "run_frames")
    .map(([, args]) => args as { count: number; fastForward: boolean; blend: boolean });
}

it("keeps fast-forward silent", async () => {
  render(player({ speed: 2 }));

  const calls = await runFramesCalls(20);

  expect(calls.length).toBeGreaterThan(0);
  expect(calls.every((call) => call.fastForward)).toBe(true);
});

it("plays sound at normal speed", async () => {
  render(player({ speed: 1 }));

  const calls = await runFramesCalls(20);

  expect(calls.length).toBeGreaterThan(0);
  expect(calls.every((call) => !call.fastForward)).toBe(true);
});

it("runs whole refreshes of fast-forward", async () => {
  render(player({ speed: 4 }));

  const calls = await runFramesCalls(20);

  expect(calls.every((call) => call.count % 4 === 0)).toBe(true);
});

it.each([
  ["off", false],
  ["on", true],
] as const)("asks for blending with motion blur %s", async (value, blend) => {
  render(withExperiment("motionBlur", value, { speed: 4 }));

  const calls = await runFramesCalls(20);

  expect(calls.length).toBeGreaterThan(0);
  expect(calls.every((call) => call.blend === blend)).toBe(true);
});

function media({ portrait = true, reduced = false } = {}) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: (query.includes("portrait") && portrait) || (query.includes("reduce") && reduced),
    addEventListener() {},
    removeEventListener() {},
  }));
}

function sensor(read: () => string | null = () => null) {
  const calls: string[] = [];
  window.androidGravity = { start: () => void calls.push("start"), stop: () => void calls.push("stop"), read };
  return calls;
}

const level = (shift?: Shift) => !shift || (shift.x === 0 && shift.y === 0);

it("runs the gravity sensor while a game shows in the shell with the tilt on", async () => {
  media();
  const calls = sensor();
  const { rerender, unmount } = render(withExperiment("tiltScreen", "on", {}));
  await playing();
  expect(calls).toEqual([]);

  await sendFrame();
  expect(calls).toEqual(["start"]);

  rerender(withExperiment("tiltScreen", "on", { paused: true }));
  expect(calls).toEqual(["start", "stop"]);

  rerender(withExperiment("tiltScreen", "on", { paused: false }));
  unmount();
  expect(calls).toEqual(["start", "stop", "start", "stop"]);
});

it.each([
  ["with the tilt off", "off", {}],
  ["in landscape", "on", { portrait: false }],
  ["with reduced motion", "on", { reduced: true }],
])("keeps the screen still and the sensor off %s", async (_, value, options) => {
  media(options);
  let reading = "0,6.94,6.94";
  const calls = sensor(() => reading);
  render(withExperiment("tiltScreen", value, {}));
  await sendFrame();

  reading = "4,6.3,6.3";
  for (let i = 0; i < 10; i++) tick();

  expect(calls).toEqual([]);
  expect(shifts().every(level)).toBe(true);
});

it("keeps the screen still without a gravity reading", async () => {
  media();
  sensor();
  render(withExperiment("tiltScreen", "on", {}));
  await sendFrame();

  for (let i = 0; i < 10; i++) tick();

  expect(shifts().every(level)).toBe(true);
});

it("shifts the game image toward the edge the phone tilts up", async () => {
  media();
  let reading = "0,6.94,6.94";
  sensor(() => reading);
  render(withExperiment("tiltScreen", "on", {}));
  await sendFrame();
  for (let i = 0; i < 10; i++) tick();

  reading = "2.5,6.7,6.7";
  for (let i = 0; i < 10; i++) tick();

  expect(shifts().at(-1)!.x).toBeGreaterThan(0);
});

function tilted(reading: () => string) {
  media();
  sensor(reading);
}

const rolledRight = "6.94,4.9,4.9";

it("shifts past the margin, up to the most the tilt gives", async () => {
  let reading = "0,6.94,6.94";
  tilted(() => reading);
  render(withExperiment("tiltScreen", "on", {}));
  await sendFrame();
  for (let i = 0; i < 10; i++) tick();

  reading = rolledRight;
  for (let i = 0; i < 30; i++) tick();

  expect(shifts().at(-1)).toEqual({ x: 5, y: 0 });
  expect(shifts().at(-1)!.x).toBeGreaterThan(handheld.gba!.marginDp);
});

it("draws plain black with the sensor off for a system without a handheld display", async () => {
  media();
  const calls = sensor(() => "0,6.94,6.94");
  const { container } = render(withExperiment("tiltScreen", "on", { display: undefined }));
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
  let reading = "0,6.94,6.94";
  tilted(() => reading);
  const { marginDp, gapDp } = handheld.nds!;
  const touches = createInput(() => []);
  const touched = vi.spyOn(touches, "touchScreen");
  const { container } = render(withExperiment("tiltScreen", "on", { dual: true, display: handheld.nds, input: touches }));
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
