import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, FastForward as FastForwardIcon, Lock, Menu } from "lucide-react";
import { cn } from "cn";
import type { FastForward } from "@/fast-forward/fastForward";
import { tap } from "@/haptics";
import { bit, buttons, DPAD, n64Buttons, type Input } from "@/input/input";
import { tilt } from "@/input/stick";
import { usePreferences } from "@/preferences/preferences";
import type { System } from "@/systems";
import { dpadDirection } from "./dpad";

type Press = (pointerId: number, mask: number) => void;

function usePress(input: Input): Press {
  const held = useRef(new Map<number, number>());

  useEffect(() => () => input.touch(0), [input]);

  return (pointerId, mask) => {
    if (mask & ~(held.current.get(pointerId) ?? 0)) tap();
    if (mask) held.current.set(pointerId, mask);
    else held.current.delete(pointerId);
    let all = 0;
    for (const pressed of held.current.values()) all |= pressed;
    input.touch(all);
  };
}

type Hold = { mode: boolean; held: number; switchMode(): void; flip(mask: number): void };

function useHold(input: Input): Hold {
  const [mode, setMode] = useState(false);
  const [held, setHeld] = useState(0);

  useEffect(() => {
    input.hold(held);
    return () => input.hold(0);
  }, [input, held]);

  return {
    mode,
    held,
    switchMode: () => setMode((on) => !on),
    flip(mask) {
      tap();
      setHeld((held) => {
        if (held & mask) return held & ~mask;
        if (mask & DPAD) return (held & ~DPAD) | mask;
        return held | mask;
      });
    },
  };
}

function useOwnPointers(press: Press) {
  const owned = useRef(new Set<number>());
  return {
    down(event: PointerEvent, mask: number) {
      if (event.button !== 0) return false;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      owned.current.add(event.pointerId);
      press(event.pointerId, mask);
      return true;
    },
    move(event: PointerEvent, mask: number) {
      if (!owned.current.has(event.pointerId)) return false;
      press(event.pointerId, mask);
      return true;
    },
    up(event: PointerEvent) {
      if (!owned.current.delete(event.pointerId)) return false;
      press(event.pointerId, 0);
      return true;
    },
  };
}

const padSurface = "bg-pad text-pad-foreground active:bg-pad-pressed data-[pressed=true]:bg-pad-pressed";
const faceSurface =
  "border border-pad-face-border bg-pad-face text-pad-face-foreground active:bg-pad-face-pressed data-[pressed=true]:bg-pad-face-pressed";

function GameButton({
  label,
  button,
  press,
  hold,
  face,
  className,
  children = label,
}: {
  label: string;
  button: number;
  press: Press;
  hold: Hold;
  face?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const pointers = useOwnPointers(press);
  const held = !!(hold.held & bit(button));
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      data-pressed={held}
      className={cn("flex items-center justify-center font-pixel", face ? faceSurface : cn("border border-pad-border", padSurface), className)}
      onPointerDown={(event) => {
        if (event.button === 0 && (hold.mode || held)) hold.flip(bit(button));
        else pointers.down(event, bit(button));
      }}
      onPointerUp={pointers.up}
      onPointerCancel={pointers.up}
      onLostPointerCapture={pointers.up}
    >
      {children}
    </button>
  );
}

function ActionButton({
  label,
  pressed,
  onPress,
  children,
}: {
  label: string;
  pressed?: boolean;
  onPress(): void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      aria-pressed={pressed}
      data-pressed={pressed}
      className={cn(
        "flex size-11 items-center justify-center rounded-full border border-pad-border landscape:size-9 [&_svg]:size-4.5",
        padSurface,
        "data-[pressed=true]:border-primary data-[pressed=true]:bg-primary data-[pressed=true]:text-primary-foreground",
      )}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        tap();
        onPress();
      }}
      // The tap's click would otherwise land on whatever opened under the finger, like the pause menu's Quit.
      onTouchEnd={(event) => event.preventDefault()}
    >
      {children}
    </button>
  );
}

function Dpad({ press, hold, className = "size-36" }: { press: Press; hold: Hold; className?: string }) {
  const pointers = useOwnPointers(press);
  const [direction, setDirection] = useState(0);

  const pointedAt = (event: PointerEvent) => {
    const box = event.currentTarget.getBoundingClientRect();
    const radius = box.width / 2;
    return dpadDirection((event.clientX - box.left - radius) / radius, (event.clientY - box.top - radius) / radius);
  };
  const release = (event: PointerEvent) => pointers.up(event) && setDirection(0);
  const arm = (button: number, className: string, icon: ReactNode) => (
    <div
      data-pressed={!!((direction || hold.held) & bit(button))}
      className={cn("absolute flex size-1/3 items-center justify-center ring-1 ring-pad-border", padSurface, className)}
    >
      {icon}
    </div>
  );

  return (
    <div
      aria-label="D-pad"
      className={cn("relative text-pad-foreground", className)}
      onPointerDown={(event) => {
        const mask = pointedAt(event);
        const single = mask && !(mask & (mask - 1));
        if (event.button === 0 && (hold.mode || (single && hold.held & mask))) {
          if (single) hold.flip(mask);
        } else if (pointers.down(event, mask)) setDirection(mask);
      }}
      onPointerMove={(event) => {
        const mask = pointedAt(event);
        if (pointers.move(event, mask)) setDirection(mask);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      {/* Each arm's ring reaches under the arms drawn after it and the centre, leaving one outline around the cross. */}
      {arm(buttons.up, "top-0 left-1/3 rounded-t-lg", <ChevronUp />)}
      {arm(buttons.down, "bottom-0 left-1/3 rounded-b-lg", <ChevronDown />)}
      {arm(buttons.left, "top-1/3 left-0 rounded-l-lg", <ChevronLeft />)}
      {arm(buttons.right, "top-1/3 right-0 rounded-r-lg", <ChevronRight />)}
      <div className="absolute top-1/3 left-1/3 size-1/3 bg-pad" />
    </div>
  );
}

const STICK_DEAD_ZONE = 0.1;
// Full tilt is this far from where the thumb landed, as a share of the zone's width.
const STICK_REACH = 1 / 3;

type StickTouch = { pointerId: number; x: number; y: number; tilt: [number, number] };

function Stick({ input }: { input: Input }) {
  const { stickSensitivity } = usePreferences().preferences;
  const [touch, setTouch] = useState<StickTouch>();
  const [reach, setReach] = useState(0);

  useEffect(() => () => input.touchStick(0, 0), [input]);

  const release = (event: PointerEvent) => {
    if (event.pointerId !== touch?.pointerId) return;
    setTouch(undefined);
    input.touchStick(0, 0);
  };
  const knob = touch
    ? { left: touch.x + touch.tilt[0] * reach, top: touch.y + touch.tilt[1] * reach }
    : { left: "50%", top: "50%" };

  return (
    <div
      aria-label="Stick"
      className="relative size-32 rounded-full border border-pad-border landscape:size-26"
      onPointerDown={(event) => {
        if (event.button !== 0 || touch) return;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        const box = event.currentTarget.getBoundingClientRect();
        tap();
        setReach(box.width * STICK_REACH);
        setTouch({ pointerId: event.pointerId, x: event.clientX - box.left, y: event.clientY - box.top, tilt: [0, 0] });
        input.touchStick(0, 0);
      }}
      onPointerMove={(event) => {
        if (event.pointerId !== touch?.pointerId) return;
        const box = event.currentTarget.getBoundingClientRect();
        const distance = box.width * STICK_REACH;
        const tilted = tilt(
          (event.clientX - box.left - touch.x) / distance,
          (event.clientY - box.top - touch.y) / distance,
          STICK_DEAD_ZONE,
          stickSensitivity,
        );
        setTouch({ ...touch, tilt: tilted });
        input.touchStick(...tilted);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      {touch && (
        <div
          className="pointer-events-none absolute -translate-1/2 rounded-full border border-pad-border"
          style={{ left: touch.x, top: touch.y, width: reach * 2, height: reach * 2 }}
        />
      )}
      <div
        data-pressed={!!touch}
        className={cn("pointer-events-none absolute size-14 -translate-1/2 rounded-full", faceSurface)}
        style={knob}
      />
    </div>
  );
}

function Side({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("pointer-events-auto flex w-36 flex-col items-center gap-4", className)}>{children}</div>;
}

// A side's 9rem plus a gap, past the same edge padding as the controls. Spelled out whole so Tailwind finds it.
export const clearOfTouchControls = "landscape:px-[calc(max(1.5rem,env(safe-area-inset-left),env(safe-area-inset-right))_+_9.5rem)]";

export function useTouchControlsShown(input: Input) {
  const { preferences } = usePreferences();
  const lastUsed = useSyncExternalStore(input.onLastUsedChange, input.lastUsed);
  return preferences.touchControls && (lastUsed === undefined || lastUsed === "touch");
}

const shoulder = "h-11 w-21 rounded-lg";
const small = "h-11 w-14 rounded-full text-sm landscape:h-9";
const controlsBody =
  "flex touch-none items-end justify-between bg-pad px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] select-none landscape:pointer-events-none landscape:absolute landscape:inset-0 landscape:items-center landscape:bg-transparent landscape:px-[max(1.5rem,env(safe-area-inset-left),env(safe-area-inset-right))] landscape:opacity-70";

function PauseMenuButton({ input }: { input: Input }) {
  return (
    <ActionButton label="Pause menu" onPress={() => input.send("pauseMenu")}>
      <Menu />
    </ActionButton>
  );
}

function ModeButtons({ hold, fastForward }: { hold: Hold; fastForward: FastForward }) {
  return (
    <>
      <ActionButton label="Hold" pressed={hold.mode} onPress={hold.switchMode}>
        <Lock />
      </ActionButton>
      <ActionButton label="Fast-forward" pressed={fastForward.on} onPress={fastForward.toggle}>
        <FastForwardIcon />
      </ActionButton>
    </>
  );
}

function N64Controls({ input, fastForward }: { input: Input; fastForward: FastForward }) {
  const press = usePress(input);
  const hold = useHold(input);
  const n64Shoulder = cn(shoulder, "landscape:h-9");
  const face = "absolute rounded-full text-xl";
  const cButton = "absolute size-11 rounded-full landscape:size-10 [&_svg]:size-5";
  const cButtons = [
    ["C up", n64Buttons.cUp, "top-0 left-1/2 -translate-x-1/2", <ChevronUp />],
    ["C left", n64Buttons.cLeft, "top-1/2 left-0 -translate-y-1/2", <ChevronLeft />],
    ["C right", n64Buttons.cRight, "top-1/2 right-0 -translate-y-1/2", <ChevronRight />],
    ["C down", n64Buttons.cDown, "bottom-0 left-1/2 -translate-x-1/2", <ChevronDown />],
  ] as const;

  return (
    <div className={cn(controlsBody, "relative")} onContextMenu={(event) => event.preventDefault()}>
      <Side className="landscape:gap-2">
        <GameButton label="L" button={buttons.l} press={press} hold={hold} className={n64Shoulder} />
        <Stick input={input} />
        <Dpad press={press} hold={hold} className="size-24" />
        <PauseMenuButton input={input} />
      </Side>
      <div className="pointer-events-auto absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2">
        <GameButton label="Start" button={buttons.start} press={press} hold={hold} className={small} />
      </div>
      <Side className="landscape:gap-2">
        <GameButton label="R" button={buttons.r} press={press} hold={hold} className={n64Shoulder} />
        <div className="relative h-28 w-36 landscape:h-24">
          <GameButton label="Z" button={n64Buttons.z} press={press} hold={hold} face className={cn(face, "top-0 right-1.5 size-11 text-base landscape:size-10")} />
          <GameButton label="B" button={n64Buttons.b} press={press} hold={hold} face className={cn(face, "top-6 left-2 size-14")} />
          <GameButton label="A" button={n64Buttons.a} press={press} hold={hold} face className={cn(face, "right-0 bottom-0 size-14")} />
        </div>
        <div className="relative size-28 landscape:size-26">
          {cButtons.map(([label, button, place, arrow]) => (
            <GameButton key={label} label={label} button={button} press={press} hold={hold} className={cn(cButton, place)}>
              {arrow}
            </GameButton>
          ))}
        </div>
        <div className="flex gap-2">
          <ModeButtons hold={hold} fastForward={fastForward} />
        </div>
      </Side>
    </div>
  );
}

function Controls({ input, system, fastForward }: { input: Input; system: System; fastForward: FastForward }) {
  const press = usePress(input);
  const hold = useHold(input);
  const faceShape = "size-16 rounded-full text-xl";
  const diamond = "absolute size-14 rounded-full text-xl";
  const shoulders = system === "gba" || system === "nds";

  return (
    <div className={controlsBody} onContextMenu={(event) => event.preventDefault()}>
      <Side>
        {shoulders && <GameButton label="L" button={buttons.l} press={press} hold={hold} className={shoulder} />}
        <Dpad press={press} hold={hold} />
        <div className="flex gap-2">
          <GameButton label="Select" button={buttons.select} press={press} hold={hold} className={small} />
          <PauseMenuButton input={input} />
        </div>
      </Side>
      <Side>
        {shoulders && <GameButton label="R" button={buttons.r} press={press} hold={hold} className={shoulder} />}
        {system === "nds" ? (
          <div className="relative size-36">
            <GameButton label="X" button={buttons.x} press={press} hold={hold} face className={cn(diamond, "top-0 left-11")} />
            <GameButton label="Y" button={buttons.y} press={press} hold={hold} face className={cn(diamond, "top-11 left-0")} />
            <GameButton label="A" button={buttons.a} press={press} hold={hold} face className={cn(diamond, "top-11 right-0")} />
            <GameButton label="B" button={buttons.b} press={press} hold={hold} face className={cn(diamond, "bottom-0 left-11")} />
          </div>
        ) : (
          <div className="flex h-36 items-center gap-3">
            <GameButton label="B" button={buttons.b} press={press} hold={hold} face className={cn(faceShape, "mt-12")} />
            <GameButton label="A" button={buttons.a} press={press} hold={hold} face className={cn(faceShape, "mb-12")} />
          </div>
        )}
        <div className="flex gap-2">
          <ModeButtons hold={hold} fastForward={fastForward} />
          <GameButton label="Start" button={buttons.start} press={press} hold={hold} className={small} />
        </div>
      </Side>
    </div>
  );
}

export function TouchControls(props: { input: Input; system: System; fastForward: FastForward }) {
  if (!useTouchControlsShown(props.input)) return null;
  return props.system === "n64" ? <N64Controls {...props} /> : <Controls {...props} />;
}
