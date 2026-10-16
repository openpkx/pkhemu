import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { settled } from "@/motion/motion";
import type { Skin } from "@/skins";
import { useRetroAchievements, type AchievementEvent, type Completion } from "./retroAchievements";
import { unlockColours, type UnlockColours } from "./unlockColours";
import { advance, arrive, emptyQueue, finish, type Arrival, type Shown } from "./unlockQueue";
import { BadgeImage } from "./BadgeImage";

export const HOLD_MS = 5000;
export const COMPLETION_HOLD_MS = 7000;
const PILL_PX = 34;
const COMPLETION_PX = 40;
const SCREEN_MARGIN_PX = 12;
const SWIPE_PX = 70;
const TAP_PX = 6;
const FLICK_PX_PER_MS = 0.5;
const FLICK_UP_PX_PER_MS = 0.4;
const LEAST_RESUMED_MS = 1500;
const RUBBER_BAND = 0.2;

type Phase = "in" | "hold" | "back" | "out" | "flung";
type Offset = { x: number; y: number; opacity: number };

export function UnlockNotifications({
  skin,
  paused,
  screenWidth,
  onOpen,
}: {
  skin: Pick<Skin, "base" | "tone" | "moulded">;
  paused: boolean;
  /** The game screen's width in CSS pixels, which the notification stays inside. */
  screenWidth?: number;
  onOpen?(shown: Shown): void;
}) {
  const { onEvent } = useRetroAchievements();
  const [queue, setQueue] = useState(emptyQueue);
  const colours = useMemo(() => unlockColours(skin), [skin]);

  useEffect(
    () =>
      onEvent((event) => {
        const arrival = arrivalOf(event);
        if (arrival) setQueue((queue) => arrive(queue, arrival));
      }),
    [onEvent],
  );

  useEffect(() => {
    if (!paused && !queue.showing && queue.waiting.length) setQueue(advance);
  }, [paused, queue]);

  const { showing } = queue;
  if (!showing) return null;
  return (
    // Clips the drop to the top of the game, so it doesn't pass over the header.
    <div className="[clip-path:inset(-0.75rem_-100vw_-100vh)]">
      <UnlockPill
        key={showing.key}
        shown={showing}
        colours={colours}
        paused={paused}
        screenWidth={screenWidth}
        onDone={() => setQueue((queue) => finish(queue, showing.key))}
        onTap={() => {
          setQueue((queue) => finish(queue, showing.key));
          onOpen?.(showing);
        }}
      />
    </div>
  );
}

function arrivalOf(event: AchievementEvent): Arrival | undefined {
  if (event.kind === "unlocked") return { kind: "unlock", unlock: event };
  if (event.kind === "completed") return { kind: "completion", completion: event };
}

const completionTitle = ({ hardcore, game }: Completion) => `${hardcore ? "Mastered" : "Completed"} ${game}`;

const pointsText = (points: number) => `${points.toLocaleString("en-US")} ${points === 1 ? "pt" : "pts"}`;

function content(shown: Shown): { title: string; points?: number; badge?: string; label: string } {
  if (shown.kind === "unlock") {
    const { title, points, description, badge } = shown.unlock;
    return { title, points, badge, label: `Achievement unlocked: ${title}, ${pointsText(points)}. ${description}` };
  }
  if (shown.kind === "completion") {
    const { points, badge } = shown.completion;
    const title = completionTitle(shown.completion);
    return { title, points, badge, label: `${title}, ${pointsText(points)}` };
  }
  const title = `+${shown.count} more achievements`;
  return { title, label: title };
}

function UnlockPill({
  shown,
  colours,
  paused,
  screenWidth,
  onDone,
  onTap,
}: {
  shown: Shown;
  colours: UnlockColours;
  paused: boolean;
  screenWidth?: number;
  onDone(): void;
  onTap(): void;
}) {
  const pill = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<number>();
  const [stack, setStack] = useState(Infinity);
  const [phase, setPhase] = useState<Phase>("in");
  const [hovering, setHovering] = useState(false);
  const [drag, setDrag] = useState<Offset>();
  const [released, setReleased] = useState<Offset & { to?: { x: string; y: string } }>();
  const [shone, setShone] = useState(false);
  const press = useRef<{ x: number; y: number; at: number }>(undefined);
  const completion = shown.kind === "completion";
  const size = completion ? COMPLETION_PX : PILL_PX;
  const remaining = useRef(completion ? COMPLETION_HOLD_MS : HOLD_MS);
  const { title, points, badge, label } = content(shown);
  const currentOnDone = useRef(onDone);
  currentOnDone.current = onDone;

  useLayoutEffect(() => {
    setNatural((natural) => natural ?? Math.ceil(row.current!.getBoundingClientRect().width));
    setStack(pill.current!.parentElement!.parentElement!.clientWidth || Infinity);
  }, [screenWidth]);

  const measured = natural !== undefined;
  const room = Math.min(screenWidth ?? Infinity, stack) - SCREEN_MARGIN_PX;
  const width = measured ? Math.max(size, Math.min(natural, room)) : undefined;

  useEffect(() => {
    if (!measured || phase === "hold") return;
    let current = true;
    void settled(pill.current).then(() => {
      if (!current) return;
      if (phase === "out" || phase === "flung") currentOnDone.current();
      else setPhase("hold");
    });
    return () => {
      current = false;
    };
  }, [measured, phase]);

  useEffect(() => {
    if (phase === "hold") return () => setShone(true);
  }, [phase]);

  const held = paused || hovering || !!drag;
  useEffect(() => {
    if (phase !== "hold" || held) return;
    const started = Date.now();
    const timer = setTimeout(() => setPhase("out"), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(LEAST_RESUMED_MS, remaining.current - (Date.now() - started));
    };
  }, [phase, held]);

  const fling = (from: Offset) => {
    const sideways = Math.abs(from.x) > Math.abs(from.y);
    const across = (Number.isFinite(stack) ? stack : 0) + 40;
    const to = sideways
      ? { x: `${Math.sign(from.x) * across}px`, y: `${from.y}px` }
      : { x: `${from.x}px`, y: `calc(${Math.min(0, from.y)}px - 200%)` };
    setReleased({ ...from, to });
    setDrag(undefined);
    setPhase("flung");
  };

  const offset = (event: PointerEvent) => {
    const start = press.current!;
    const x = event.clientX - start.x;
    const down = event.clientY - start.y;
    const y = down < 0 ? down : down * RUBBER_BAND;
    return { x, y, opacity: 1 - Math.min(0.6, (Math.abs(x) + Math.abs(Math.min(0, y)) * 2) / 300) };
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (phase !== "hold" || (event.target as Element).closest("button")) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    press.current = { x: event.clientX, y: event.clientY, at: Date.now() };
    setDrag({ x: 0, y: 0, opacity: 1 });
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (press.current) setDrag(offset(event));
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!press.current) return;
    const moved = offset(event);
    const elapsed = Math.max(1, Date.now() - press.current.at);
    press.current = undefined;
    const flick = Math.abs(moved.x) / elapsed > FLICK_PX_PER_MS || moved.y / elapsed < -FLICK_UP_PX_PER_MS;
    const far = Math.abs(moved.x) > SWIPE_PX || moved.y < -SWIPE_PX;
    const tap = Math.hypot(moved.x, moved.y) <= TAP_PX;
    if (!tap && (far || flick)) return fling(moved);
    setDrag(undefined);
    if (tap) return onTap();
    if (moved.x || moved.y) {
      setReleased(moved);
      setPhase("back");
    }
  };

  const onHover = (event: PointerEvent<HTMLDivElement>, entering: boolean) => {
    if (event.pointerType === "mouse") setHovering(entering);
  };

  const at = drag ?? (phase === "flung" ? released : undefined);
  const style = {
    width,
    height: size,
    visibility: measured ? undefined : "hidden",
    background: colours.fill,
    color: colours.text,
    translate: at ? `${at.x}px ${at.y}px` : undefined,
    opacity: at?.opacity,
    "--unlock-badge": `${size}px`,
    "--unlock-x": released ? `${released.x}px` : undefined,
    "--unlock-y": released ? `${released.y}px` : undefined,
    "--unlock-opacity": released?.opacity,
    "--unlock-to-x": released?.to?.x,
    "--unlock-to-y": released?.to?.y,
  } as CSSProperties;

  return (
    <div
      ref={pill}
      role="status"
      aria-label={label}
      data-state={measured ? phase : undefined}
      className="motion-unlock group pointer-events-auto relative touch-none overflow-hidden rounded-full shadow-[0_6px_18px_rgba(0,0,0,.35),inset_0_1px_0_rgba(255,255,255,.14),inset_0_0_0_1px_rgba(0,0,0,.18)] select-none"
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerEnter={(event) => onHover(event, true)}
      onPointerLeave={(event) => onHover(event, false)}
    >
      <div ref={row} className="flex h-full items-center" style={{ width: width ?? "max-content" }}>
        <span className="grid flex-none place-items-center" style={{ width: size, height: size }}>
          <span
            className="overflow-hidden rounded-full"
            style={{ width: size - 10, height: size - 10, boxShadow: `0 0 0 2px ${colours.ring}` }}
          >
            <BadgeImage name={badge} />
          </span>
        </span>
        <span className="motion-unlock-text flex min-w-0 flex-auto items-baseline overflow-hidden pr-3.5 pl-[3px] whitespace-nowrap">
          <span className="min-w-0 truncate text-xs leading-[1.2] font-semibold">{title}</span>
          {points !== undefined && (
            <span className="flex-none text-[11px] leading-[1.2] tabular-nums" style={{ color: colours.muted }}>
              &nbsp;· {pointsText(points)}
            </span>
          )}
        </span>
      </div>
      {completion && !shone && (
        <span
          className="motion-unlock-shine pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,.35)_50%,transparent_65%)] opacity-0"
          onAnimationEnd={() => setShone(true)}
        />
      )}
      <button
        type="button"
        tabIndex={-1}
        className="motion-unlock-dismiss pointer-events-none absolute inset-y-0 right-0 pr-3 pl-6 text-[11px] font-semibold opacity-0 hover:underline pointer-fine:group-hover:pointer-events-auto pointer-fine:group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, transparent, ${colours.fill} 16px)` }}
        onClick={() => phase === "hold" && fling({ x: SWIPE_PX + 10, y: 0, opacity: 1 })}
      >
        Dismiss
      </button>
    </div>
  );
}
