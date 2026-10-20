import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Channel, invoke } from "@tauri-apps/api/core";
import { cn } from "cn";
import { Progress } from "@/components/ui/progress";
import type { Speed } from "./fast-forward/fastForward";
import { origin, type Point, type Size } from "./fit";
import { createFpsCounter, type Rates } from "./fps-counter/fpsCounter";
import { useGameSurface, type Renderer } from "./game-surface/gameSurface";
import { useCanTilt, useGravity } from "./gravity/gravity";
import type { Input } from "./input/input";
import { useExperiment } from "./lab/lab";
import { useReducedMotion } from "./motion/motion";
import { tilt, type Tilt } from "./motion/tilt";
import { usePreferences } from "./preferences/preferences";
import { parallax, rgb, shellIn, shellLook } from "./recess";
import { createScreen, type Frame, type Look, type Parallax, type Rgb } from "./screen";
import { closeToSquare, dualScreen, inPortrait, pointerAt, singleScreen, type Layout, type Rect, type Screens } from "./screens";
import { useAsyncShaders } from "./shaders/shaders";
import type { HandheldDisplay } from "./systems";
import { useVisible } from "./visible";

const HEADER_BYTES = 16;

type Step = "rom" | "save" | "backup" | "core";

const STEPS: Record<Step, { text: string; value: number }> = {
  rom: { text: "Reading the game…", value: 25 },
  save: { text: "Reading the save…", value: 50 },
  backup: { text: "Backing up the save…", value: 75 },
  core: { text: "Starting the game…", value: 100 },
};

type SentInput = { input: number; analog: number[]; triggers: number[]; pointer: [number, number] | null };
const released: SentInput = { input: 0, analog: [0, 0, 0, 0], triggers: [0, 0], pointer: null };

const black: Rgb = [0, 0, 0];

function openings(layout: Layout, canvas: Element): Rect[] {
  const box = canvas.getBoundingClientRect();
  const edge = layout.border;
  return layout.views.map(({ target }) => ({
    x: box.x + (target.x - edge) / devicePixelRatio,
    y: box.y + (target.y - edge) / devicePixelRatio,
    width: (target.width + 2 * edge) / devicePixelRatio,
    height: (target.height + 2 * edge) / devicePixelRatio,
  }));
}

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
  hardcore = false,
  speed,
  input,
  paused,
  screens,
  display,
  wall,
  swapped,
  clockOffset,
  resolution = 1,
  renderer,
  onStacked,
  onScreenWidth,
  onWindows,
  onStarted,
  onFps,
  onNativeFailed,
  onError,
  cover,
  holdMessage,
  className,
  clearance,
  portrait = false,
  corner,
  children,
}: {
  folder: string;
  path: string;
  resume: boolean;
  /** Whether the game starts in RetroAchievements' hardcore. Changing it later doesn't restart the game. */
  hardcore?: boolean;
  input: Input;
  speed: Speed;
  paused: boolean;
  screens?: Screens;
  display?: HandheldDisplay;
  /** The colour of the shell's walls around the opening, given only while the game sits in the shell. */
  wall?: string;
  swapped: boolean;
  clockOffset: number;
  /** The core's internal resolution, as a multiple of the system's own. Changing it later doesn't restart the game. */
  resolution?: number;
  renderer: Renderer;
  onStacked?(stacked: boolean): void;
  /** The widest screen's width, in CSS pixels. */
  onScreenWidth?(width: number): void;
  /** Where the page has to leave the native surface showing, in CSS pixels on the page. */
  onWindows?(windows: Rect[] | undefined): void;
  onStarted?(): Promise<void>;
  onFps?(rates: Rates): void;
  onNativeFailed?(): void;
  onError(message: string): void;
  cover?: string;
  holdMessage?: string;
  className?: string;
  /** Padding that keeps the screens clear of controls at the sides. Two screens side by side only need it on one side. */
  clearance?: string;
  /** Whether the game screen uses the portrait layout, with the controls below. */
  portrait?: boolean;
  /** Drawn under the screen, such as the skin's printing. */
  children?: ReactNode;
  /** Shown inside the screens' bottom-right corner. */
  corner?: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const screenBox = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const steady = useExperiment("steadyFastForward") === "on";
  const blend = useExperiment("motionBlur") === "on";
  const asyncShaders = useAsyncShaders();
  const currentAsyncShaders = useRef(asyncShaders);
  currentAsyncShaders.current = asyncShaders;
  const visible = useVisible();
  const { screenDepth, screenGlass } = usePreferences().preferences;
  const canTilt = useCanTilt();
  const tiltOn = screenDepth && canTilt;
  const reduced = useReducedMotion(tiltOn);
  const tilting = tiltOn && !reduced;
  const currentlyTilting = useRef(tilting);
  currentlyTilting.current = tilting;
  const currentWall = useRef(wall);
  currentWall.current = wall;
  const currentGlass = useRef(screenGlass);
  currentGlass.current = screenGlass;
  const currentlyPaused = useRef(paused);
  currentlyPaused.current = paused;
  const currentlySwapped = useRef(swapped);
  currentlySwapped.current = swapped;
  const currentClearance = useRef(clearance);
  currentClearance.current = clearance;
  const currentPortrait = useRef(portrait);
  currentPortrait.current = portrait;
  const currentOnStacked = useRef(onStacked);
  currentOnStacked.current = onStacked;
  const currentOnScreenWidth = useRef(onScreenWidth);
  currentOnScreenWidth.current = onScreenWidth;
  const currentOnWindows = useRef(onWindows);
  currentOnWindows.current = onWindows;
  const currentOnStarted = useRef(onStarted);
  currentOnStarted.current = onStarted;
  const currentOnFps = useRef(onFps);
  currentOnFps.current = onFps;
  const currentOnError = useRef(onError);
  currentOnError.current = onError;
  const currentClockOffset = useRef(clockOffset);
  currentClockOffset.current = clockOffset;
  const currentResolution = useRef(resolution);
  currentResolution.current = resolution;
  const currentHardcore = useRef(hardcore);
  currentHardcore.current = hardcore;
  const currentOnNativeFailed = useRef(onNativeFailed);
  currentOnNativeFailed.current = onNativeFailed;
  const [nativeAsked] = useState(renderer === "native");
  const layout = useRef<Layout>(undefined);
  const touching = useRef<number>(undefined);
  const [started, setStarted] = useState(false);
  const [recessed, setRecessed] = useState(false);
  const [cornerAt, setCornerAt] = useState<{ x: number; y: number }>();
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
    let shownClearance = currentClearance.current;
    let shownPortrait = currentPortrait.current;
    let shownGlass = currentGlass.current;
    let shownWall = currentWall.current;
    let shownTilt: Point | undefined;
    const scale = currentResolution.current;
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
      const changed =
        shownSwapped !== currentlySwapped.current ||
        shownClearance !== currentClearance.current ||
        shownPortrait !== currentPortrait.current ||
        shownGlass !== currentGlass.current ||
        shownWall !== currentWall.current;
      if (latest && (resized || changed)) {
        shownSwapped = currentlySwapped.current;
        shownClearance = currentClearance.current;
        shownPortrait = currentPortrait.current;
        shownGlass = currentGlass.current;
        shownWall = currentWall.current;
        const shell = display && shownWall ? shellIn(display) : undefined;
        // The clearance pads the screens' box, not the measured space, so whether they stack doesn't feed back into the space.
        const padding = getComputedStyle(screenBox.current!);
        const clear = (Math.max(parseFloat(padding.paddingLeft), parseFloat(padding.paddingRight)) || 0) * devicePixelRatio;
        // A frame the core scaled up lays out as the system's own size, so it snaps and clears the controls as that would.
        const own = { width: latest.width / scale, height: latest.height / scale };
        layout.current = screens
          ? dualScreen(
              own,
              shownPortrait ? inPortrait(screens) : screens,
              space,
              shownSwapped,
              shell,
              clear,
              matchMedia(closeToSquare).matches,
            )
          : singleScreen(own, space, shell, clear);
        look = display && shownWall ? shellLook(display, rgb(shownWall), shownGlass) : undefined;
        lean(tiltState?.shift ?? origin);
        setRecessed(!!look);
        const size = layout.current.canvas;
        currentOnStacked.current?.(size.height > size.width);
        currentOnScreenWidth.current?.(Math.max(...layout.current.views.map(({ target }) => target.width)) / devicePixelRatio);
        canvas.current!.width = size.width;
        canvas.current!.height = size.height;
        canvas.current!.style.width = `${size.width / devicePixelRatio}px`;
        canvas.current!.style.height = `${size.height / devicePixelRatio}px`;
        const corner = layout.current.views
          .map(({ target }) => ({ x: target.x + target.width, y: target.y + target.height }))
          .reduce((furthest, at) => (at.x + at.y > furthest.x + furthest.y ? at : furthest));
        setCornerAt({
          x: canvas.current!.offsetLeft + corner.x / devicePixelRatio,
          y: canvas.current!.offsetTop + corner.y / devicePixelRatio,
        });
        resized = false;
        if (drawnNatively) {
          const surface = onSurface(layout.current, look, canvas.current!, container.current!);
          invoke("set_screen", { layout: surface }).catch((error) => console.error(error));
        }
        currentOnWindows.current?.(drawnNatively && look ? openings(layout.current, canvas.current!) : undefined);
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
        hardcore: currentHardcore.current,
        clockOffset: currentClockOffset.current,
        asyncShaders: await currentAsyncShaders.current,
        resolution: scale,
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
      send({
        input: buttons,
        analog: input.pollAnalog(),
        triggers: input.pollTriggers(),
        pointer: pointer ? [pointer.x, pointer.y] : null,
      });
    };
    raf = requestAnimationFrame(tick);

    return () => {
      stopped = true;
      setNative(false);
      currentOnWindows.current?.(undefined);
      cancelAnimationFrame(raf);
      observer.disconnect();
      themeObserver.disconnect();
      frames.onmessage = () => {};
      steps.onmessage = () => {};
      nativeFailed.onmessage = () => {};
      inOrder(() => invoke("stop")).catch((error) => console.error(error));
    };
  }, [folder, path, resume, input, screens, display, held, nativeAsked]);

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
        !nativeShown && !recessed && "bg-black",
        className,
      )}
    >
      <div ref={screenBox} data-screen className={cn("relative flex", clearance)}>
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
        {children}
        {corner && cornerAt && (
          <div
            className="pointer-events-none absolute -translate-x-full -translate-y-full p-1.5"
            style={{ left: cornerAt.x, top: cornerAt.y }}
          >
            {corner}
          </div>
        )}
      </div>
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
