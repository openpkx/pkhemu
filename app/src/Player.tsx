import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Channel, invoke } from "@tauri-apps/api/core";
import { cn } from "cn";
import { Progress } from "@/components/ui/progress";
import type { Speed } from "./fast-forward/fastForward";
import { origin, type Point, type Shell, type Size } from "./fit";
import { createFpsCounter, type Rates } from "./fps-counter/fpsCounter";
import { useGameSurface, type Renderer } from "./game-surface/gameSurface";
import { useGravity } from "./gravity/gravity";
import type { Input } from "./input/input";
import { useExperiment } from "./lab/lab";
import { useReducedMotion } from "./motion/motion";
import { TILT, tilt, type Tilt } from "./motion/tilt";
import { createScreen, type Frame, type Look, type Parallax, type Rgb } from "./screen";
import { dualScreen, pointerAt, singleScreen, type Layout, type Rect } from "./screens";
import type { HandheldDisplay, HandheldWindow } from "./systems";
import { useVisible } from "./visible";

const HEADER_BYTES = 16;

type Step = "rom" | "save" | "backup" | "core";

const STEPS: Record<Step, { text: string; value: number }> = {
  rom: { text: "Reading the game…", value: 25 },
  save: { text: "Reading the save…", value: 50 },
  backup: { text: "Backing up the save…", value: 75 },
  core: { text: "Starting the game…", value: 100 },
};

const PLATE_SHADE = 0.3;

type SentInput = { input: number; analog: number[]; pointer: [number, number] | null };
const released: SentInput = { input: 0, analog: [0, 0, 0, 0], pointer: null };

// Whole pixels, because a shift by part of one would resample the game's pixels unevenly as it moves.
function inPixels(dp: Point, mostDp: number): Point {
  const most = Math.round(mostDp * devicePixelRatio);
  const pixels = (value: number) => Math.max(-most, Math.min(most, Math.round(value * devicePixelRatio)));
  return { x: pixels(dp.x), y: pixels(dp.y) };
}

function parallax(windows: HandheldWindow[], dp: Point): Parallax[] {
  return windows.map(({ depth }) => {
    const deep = { x: dp.x * depth, y: dp.y * depth };
    return {
      shift: inPixels(deep, TILT.maxDp * depth),
      exact: { x: deep.x * devicePixelRatio, y: deep.y * devicePixelRatio },
      lean: { x: deep.x / TILT.maxDp, y: deep.y / TILT.maxDp },
    };
  });
}

function rgb(hex: string): Rgb {
  const value = parseInt(hex.trim().slice(1), 16);
  return [(value >> 16) / 255, ((value >> 8) & 0xff) / 255, (value & 0xff) / 255];
}

const black: Rgb = [0, 0, 0];

function inDevicePixels(element: Element): Rect {
  const { x, y, width, height } = element.getBoundingClientRect();
  return { x: x * devicePixelRatio, y: y * devicePixelRatio, width: width * devicePixelRatio, height: height * devicePixelRatio };
}

// The native surface lies under the page at its size, and paints what the page leaves clear over it.
function onSurface(layout: Layout, look: Look | undefined, canvas: Element, area: Element) {
  const { x, y } = inDevicePixels(canvas);
  return {
    page: rgb(getComputedStyle(area).getPropertyValue("--background")),
    area: inDevicePixels(area),
    areaColor: look?.shell ?? black,
    canvas: { x, y },
    border: layout.border,
    views: layout.views,
    look: look ?? null,
  };
}

function shellLook(element: Element, display: HandheldDisplay, glass: boolean): Look {
  const style = getComputedStyle(element);
  return {
    shell: rgb(style.getPropertyValue("--pad")),
    plate: rgb(style.getPropertyValue("--pad-border")).map((channel) => channel * PLATE_SHADE) as Rgb,
    dp: devicePixelRatio,
    radius: display.radiusDp * devicePixelRatio,
    glass,
  };
}

// A late stop would end the next game, and a play racing a stop could read a half-written save.
let lifecycle: Promise<unknown> = Promise.resolve();
function inOrder<T>(run: () => Promise<T>): Promise<T> {
  const next = lifecycle.then(run);
  lifecycle = next.catch(() => {});
  return next;
}

export function Player({
  folder,
  path,
  resume,
  speed,
  input,
  paused,
  dual,
  display,
  swapped,
  clockOffset,
  renderer,
  onStacked,
  onStarted,
  onFps,
  onNativeFailed,
  onError,
  cover,
  holdMessage,
  className,
}: {
  folder: string;
  path: string;
  resume: boolean;
  input: Input;
  speed: Speed;
  paused: boolean;
  dual: boolean;
  display?: HandheldDisplay;
  swapped: boolean;
  clockOffset: number;
  renderer: Renderer;
  onStacked?(stacked: boolean): void;
  onStarted?(): Promise<void>;
  onFps?(rates: Rates): void;
  onNativeFailed?(): void;
  onError(message: string): void;
  cover?: string;
  holdMessage?: string;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const steady = useExperiment("steadyFastForward") === "on";
  const blend = useExperiment("motionBlur") === "on";
  const visible = useVisible();
  const tiltOn = useExperiment("tiltScreen") === "on";
  const tilting = tiltOn && !useReducedMotion(tiltOn);
  const currentlyTilting = useRef(tilting);
  currentlyTilting.current = tilting;
  const currentGlass = useRef(false);
  currentGlass.current = useExperiment("displayGlass") === "on";
  const currentlyPaused = useRef(paused);
  currentlyPaused.current = paused;
  const currentlySwapped = useRef(swapped);
  currentlySwapped.current = swapped;
  const currentOnStacked = useRef(onStacked);
  currentOnStacked.current = onStacked;
  const currentOnStarted = useRef(onStarted);
  currentOnStarted.current = onStarted;
  const currentOnFps = useRef(onFps);
  currentOnFps.current = onFps;
  const currentOnError = useRef(onError);
  currentOnError.current = onError;
  const currentClockOffset = useRef(clockOffset);
  currentClockOffset.current = clockOffset;
  const currentOnNativeFailed = useRef(onNativeFailed);
  currentOnNativeFailed.current = onNativeFailed;
  const [nativeAsked] = useState(renderer === "native");
  const layout = useRef<Layout>(undefined);
  const touching = useRef<number>(undefined);
  const [started, setStarted] = useState(false);
  const [recessed, setRecessed] = useState(false);
  const [native, setNative] = useState(false);
  const [step, setStep] = useState<Step>();
  const shownStep = step === undefined ? undefined : STEPS[step];
  const held = holdMessage !== undefined;
  const shifts = useRef<Point[]>([]);
  const readGravity = useGravity(started && !held && !paused && recessed && tilting);
  const currentReadGravity = useRef(readGravity);
  currentReadGravity.current = readGravity;
  const nativeShown = native && started;
  useGameSurface(!held && nativeAsked);

  useEffect(() => {
    if (!nativeShown) return;
    document.documentElement.toggleAttribute("data-native-screen", true);
    return () => void document.documentElement.toggleAttribute("data-native-screen", false);
  }, [nativeShown]);

  useEffect(() => {
    invoke("pace", { pacing: { paused: paused || !visible, speed, steady, blend } }).catch((error) => console.error(error));
  }, [paused, visible, speed, steady, blend]);

  useEffect(() => {
    if (held) return;
    let draw: ReturnType<typeof createScreen> | undefined;
    let drawnNatively = false;
    let latest: Frame | undefined;
    let fresh = false;
    let space: Size = { width: 0, height: 0 };
    let resized = true;
    let sent = "";
    let stopped = false;
    let wasPaused = false;
    let shownSwapped = currentlySwapped.current;
    let shownGlass = currentGlass.current;
    let shownTilt: Point | undefined;
    let windows: Parallax[] = [];
    let drawn = false;
    let look: Look | undefined;
    let tiltState: Tilt | undefined;
    shifts.current = [];
    const fpsCounter = createFpsCounter();

    const lean = (dp: Point) => {
      shownTilt = dp;
      windows = look && display ? parallax(display.windows, dp) : [];
      shifts.current = windows.map(({ shift }) => shift);
      fresh = true;
      if (drawnNatively) invoke("set_parallax", { parallax: windows }).catch((error) => console.error(error));
    };

    const layOut = () => {
      if (latest && (resized || shownSwapped !== currentlySwapped.current || shownGlass !== currentGlass.current)) {
        shownSwapped = currentlySwapped.current;
        shownGlass = currentGlass.current;
        const shell: Shell | undefined =
          display && matchMedia("(orientation: portrait)").matches
            ? { border: Math.round(display.marginDp * devicePixelRatio), gap: Math.round(display.gapDp * devicePixelRatio) }
            : undefined;
        layout.current = dual ? dualScreen(latest, space, shownSwapped, shell) : singleScreen(latest, space, shell);
        look = display && shell ? shellLook(container.current!, display, shownGlass) : undefined;
        lean(tiltState?.shift ?? origin);
        setRecessed(!!look);
        const size = layout.current.canvas;
        currentOnStacked.current?.(size.height > size.width);
        canvas.current!.width = size.width;
        canvas.current!.height = size.height;
        canvas.current!.style.width = `${size.width / devicePixelRatio}px`;
        canvas.current!.style.height = `${size.height / devicePixelRatio}px`;
        resized = false;
        if (drawnNatively) {
          const surface = onSurface(layout.current, look, canvas.current!, container.current!);
          invoke("set_screen", { layout: surface }).catch((error) => console.error(error));
        }
      }
    };

    const paint = () => {
      if (latest && fresh && layout.current) {
        if (!drawnNatively) (draw ??= createScreen(canvas.current!))(latest, layout.current, look, windows);
        fresh = false;
        if (!drawn) {
          drawn = true;
          setStarted(true);
        }
      }
    };

    const frames = new Channel<ArrayBuffer>();
    frames.onmessage = (buffer) => {
      const view = new DataView(buffer);
      const width = view.getUint16(4, true);
      const height = view.getUint16(6, true);
      // Rust sends a frame without its pixels when it drew it on the native surface.
      const natively = buffer.byteLength === HEADER_BYTES;
      if (latest?.width !== width || latest?.height !== height || natively !== drawnNatively) resized = true;
      if (natively !== drawnNatively) {
        drawnNatively = natively;
        setNative(natively);
      }
      latest = { width, height, pixels: new Uint16Array(buffer, HEADER_BYTES, natively ? 0 : width * height) };
      fresh = true;
      layOut();
      paint();
      const onFps = currentOnFps.current;
      if (!onFps || currentlyPaused.current) {
        fpsCounter.reset();
        return;
      }
      const counts = { frames: view.getUint32(0, true), skipped: view.getUint32(8, true), repeated: view.getUint32(12, true) };
      const rates = fpsCounter.add(counts, performance.now());
      if (rates) onFps(rates);
    };
    const steps = new Channel<Step>();
    steps.onmessage = setStep;
    const nativeFailed = new Channel<null>();
    nativeFailed.onmessage = () => currentOnNativeFailed.current?.();
    inOrder(async () => {
      await invoke("play", {
        folder,
        path,
        resume,
        clockOffset: currentClockOffset.current,
        onFrame: frames,
        onStep: steps,
        native: nativeAsked,
        onNativeFailed: nativeFailed,
      });
      if (!stopped) await currentOnStarted.current?.();
    }).catch((error) => !stopped && currentOnError.current(String(error)));

    const send = (input: SentInput) => {
      const key = JSON.stringify(input);
      if (key === sent || stopped) return;
      sent = key;
      invoke("set_input", input).catch((error) => console.error(error));
    };

    const observer = new ResizeObserver(([entry]) => {
      const box = entry.devicePixelContentBoxSize?.[0];
      space = box
        ? { width: box.inlineSize, height: box.blockSize }
        : {
            width: Math.round(entry.contentRect.width * devicePixelRatio),
            height: Math.round(entry.contentRect.height * devicePixelRatio),
          };
      resized = true;
    });
    observer.observe(container.current!);
    const themeObserver = new MutationObserver(() => (resized = true));
    themeObserver.observe(document.documentElement, { attributeFilter: ["data-theme"] });

    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      layOut();
      const gravity = look && currentlyTilting.current ? currentReadGravity.current() : undefined;
      tiltState = gravity && tilt(tiltState, gravity, now);
      const dp = tiltState?.shift ?? origin;
      if (dp.x !== shownTilt?.x || dp.y !== shownTilt?.y) lean(dp);
      paint();
      if (currentlyPaused.current) {
        fpsCounter.reset();
        wasPaused = true;
        send(released);
        return;
      }
      if (wasPaused) input.ignoreHeld();
      wasPaused = false;
      const buttons = input.poll(now);
      const pointer = input.pollPointer();
      send({ input: buttons, analog: input.pollAnalog(), pointer: pointer ? [pointer.x, pointer.y] : null });
    };
    raf = requestAnimationFrame(tick);

    return () => {
      stopped = true;
      setNative(false);
      cancelAnimationFrame(raf);
      observer.disconnect();
      themeObserver.disconnect();
      frames.onmessage = () => {};
      steps.onmessage = () => {};
      nativeFailed.onmessage = () => {};
      inOrder(() => invoke("stop")).catch((error) => console.error(error));
    };
  }, [folder, path, resume, input, dual, display, held, nativeAsked]);

  const pointedAt = (event: PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const scale = event.currentTarget.width / box.width;
    return layout.current && pointerAt(layout.current, { x: (event.clientX - box.left) * scale, y: (event.clientY - box.top) * scale }, shifts.current);
  };
  const release = (event: PointerEvent) => {
    if (event.pointerId !== touching.current) return;
    touching.current = undefined;
    input.touchScreen(undefined);
  };

  return (
    <div
      ref={container}
      className={cn(
        "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden",
        !nativeShown && (recessed ? "bg-pad" : "bg-black"),
        className,
      )}
    >
      <canvas
        ref={canvas}
        className="touch-none select-none [image-rendering:pixelated]"
        onPointerDown={(event) => {
          const at = event.button === 0 ? pointedAt(event) : undefined;
          if (!at) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          touching.current = event.pointerId;
          input.touchScreen(at);
        }}
        onPointerMove={(event) => event.pointerId === touching.current && input.touchScreen(pointedAt(event))}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        onContextMenu={(event) => event.preventDefault()}
      />
      {!started && (
        <>
          {cover && (
            <img src={cover} alt="" className="absolute inset-0 size-full object-contain opacity-40 [image-rendering:pixelated]" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <p role="status" className="text-sm text-white/70">
              {shownStep?.text ?? holdMessage ?? (resume ? "Resuming…" : "Starting…")}
            </p>
            <Progress value={shownStep?.value ?? 0} className="w-40 bg-white/20 *:bg-white/70" />
          </div>
        </>
      )}
    </div>
  );
}
