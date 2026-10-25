import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight, Lock, Menu } from "lucide-react";
import { cn } from "cn";
import { useBack } from "@/back/back";
import { ScreenHeader } from "@/plugin-kit/ScreenHeader";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useHaptics } from "@/haptics/haptics";
import { useReducedMotion } from "@/plugin-kit/motion";
import { easeInOut, easeOut, linear, tween, type Tween } from "@/motion/tween";
import { wipe } from "@/motion/wipe";
import { usePlus, type PlusState } from "@/plus/plus";
import { usePreferences } from "@/preferences/preferences";
import { rgb } from "@/recess";
import type { Frame, Rgb } from "@/screen";
import { dualScreens } from "@/screens";
import { blendLooks, lookVariables, mixColour, type LookVariables } from "@/skin-look/skinLook";
import { PlasticPhoto } from "@/skin-plastic/SkinPlastic";
import { chosenSkin, lookNames, offeredSkins, skinLocked, skinLooks, wallColour, type Skin, type SkinLook } from "@/skins";
import { handheld, systemNames, type System } from "@/systems";
import { controlsLift } from "@/touch-controls/controlsLift";
import { padScale } from "@/touch-controls/padScale";
import { StillTouchControls } from "@/touch-controls/TouchControls";
import { dragged, lands, step, tapped, type Direction } from "./carousel";
import { darkFrame } from "./previewFrame";
import { PreviewScreen } from "./PreviewScreen";

type Move = { to: number; direction: 1 | -1; progress: number; landing: boolean };
type Blend = { from: SkinLook; t: number };
type View = { index: number; look: SkinLook; move?: Move; blend?: Blend };
type Drag = { downX: number; startX: number; left: number; width: number; moved: boolean; samples: { x: number; t: number }[] };

const inks = { light: "#1c1b22", dark: "#ffffff" };
const SLOP = 8;
const FLICK_WINDOW_MS = 90;
const REDUCED_MS = 150;
const LOOK_MS = 560;
const HINT = { delay: 1000, reach: 0.2, out: 520, hold: 160 };

const mix = (from: Rgb, to: Rgb, t: number) => from.map((channel, i) => channel + (to[i] - channel) * t) as Rgb;

function usePortraitSize() {
  const measure = () => ({ width: Math.min(innerWidth, innerHeight), height: Math.max(innerWidth, innerHeight) });
  const [size, setSize] = useState(measure);
  useEffect(() => {
    const resize = () => setSize(measure());
    addEventListener("resize", resize);
    return () => removeEventListener("resize", resize);
  }, []);
  return size;
}

function useFit(stage: { width: number; height: number }) {
  const slot = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setRoom({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(slot.current!);
    return () => observer.disconnect();
  }, []);
  return { slot, scale: Math.max(0, Math.min(room.width / stage.width, room.height / stage.height)) };
}

function Plastic({ skin, style, incoming }: { skin: Skin; style?: CSSProperties; incoming?: boolean }) {
  return (
    <div
      aria-hidden
      data-incoming={incoming ? skin.id : undefined}
      className="pointer-events-none absolute inset-0 -z-10"
      style={{ backgroundColor: skin.base, ...style }}
    >
      <PlasticPhoto image={skin.image} />
    </div>
  );
}

function Name({ skin, plus }: { skin: Skin; plus?: PlusState }) {
  return (
    <>
      {skin.name}
      {skinLocked(skin, plus) && <Lock role="img" aria-label="Plus" className="ml-1.5 inline size-4 align-[-2px]" />}
    </>
  );
}

type PickerProps = { system: System; frame?: Frame; game?: string; onClose(): void };

export function SkinPicker(props: PickerProps) {
  const plus = usePlus().status?.state;
  const list = offeredSkins(props.system, plus);
  // The carousel indexes into the list, so it starts over when Plus's status arrives or changes the list.
  return <Picker key={plus ? list.length : "unknown"} {...props} list={list} plus={plus} />;
}

function Picker({
  system,
  frame,
  game = systemNames[system],
  onClose,
  list,
  plus,
}: PickerProps & { list: Skin[]; plus?: PlusState }) {
  const { preferences, chooseSkin, change } = usePreferences();
  const { buy } = usePlus();
  const saved = preferences.skins[system];
  const current = chosenSkin(system, saved, plus);
  const [buying, setBuying] = useState(false);
  const { tap } = useHaptics();
  const reduced = useReducedMotion(true);
  useBack(onClose);

  const view = useRef<View>({ index: list.indexOf(current), look: saved.look });
  const [, render] = useReducer((renders: number) => renders + 1, 0);
  const update = (next: Partial<View>) => {
    view.current = { ...view.current, ...next };
    render();
  };
  const moving = useRef<Tween>(undefined);
  const switching = useRef<Tween>(undefined);
  const stopHint = useRef<() => void>(() => {});
  const drag = useRef<Drag>(undefined);
  const hintSeen = useRef(preferences.skinHintSeen);
  hintSeen.current ||= preferences.skinHintSeen;

  const land = (to: number) => {
    update({ index: to, move: undefined });
    tap();
    if (hintSeen.current) return;
    hintSeen.current = true;
    void change({ skinHintSeen: true });
  };

  const settle = (to: 0 | 1) => {
    const move = view.current.move;
    if (!move) return;
    moving.current?.cancel();
    const from = move.progress;
    const distance = Math.abs(to - from);
    const settling = { ...move, landing: to === 1 };
    const run = reduced
      ? tween(REDUCED_MS * distance, linear, (t) => update({ move: { ...settling, progress: from + (to - from) * t } }))
      : tween(420 * distance + 140, easeOut, (t) => update({ move: { ...settling, progress: from + (to - from) * t } }));
    moving.current = run;
    void run.done.then((finished) => {
      if (!finished) return;
      if (to === 1) land(move.to);
      else update({ move: undefined });
    });
  };

  const go = (to: number, direction: 1 | -1) => {
    stopHint.current();
    const { move } = view.current;
    if (move) {
      moving.current?.cancel();
      if (move.landing) land(move.to);
      else update({ move: undefined });
    }
    if (to === view.current.index) return;
    update({ move: { to, direction, progress: 0, landing: true } });
    settle(1);
  };

  const stepBy = (direction: Direction) => {
    if (!direction) return;
    const { index, move } = view.current;
    const from = move?.landing ? move.to : index;
    go(step(from, direction, list.length), direction);
  };

  const switchLook = (next: SkinLook) => {
    const { look, blend } = view.current;
    if (next === look) return;
    switching.current?.cancel();
    const start = blend ? 1 - blend.t : 0;
    tap();
    update({ look: next, blend: { from: look, t: start } });
    const duration = (reduced ? REDUCED_MS : LOOK_MS) * (1 - start);
    const run = tween(duration, reduced ? linear : easeInOut, (t) => update({ blend: { from: look, t: start + (1 - start) * t } }));
    switching.current = run;
    void run.done.then((finished) => finished && update({ blend: undefined }));
  };

  const applySkin = async (skin: Skin, chosen: SkinLook) => {
    try {
      await chooseSkin(system, { skin: skin.id, look: chosen });
      onClose();
    } catch (reason) {
      console.error(reason);
    }
  };

  const buyPlus = async (skin: Skin, chosen: SkinLook) => {
    setBuying(true);
    try {
      if ((await buy()) === "purchased") await applySkin(skin, chosen);
    } catch (reason) {
      console.error(reason);
    } finally {
      setBuying(false);
    }
  };

  const currentStepBy = useRef(stepBy);
  currentStepBy.current = stepBy;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") currentStepBy.current(-1);
      if (event.key === "ArrowRight") currentStepBy.current(1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (hintSeen.current || reduced || list.length < 2) return;
    let cancelled = false;
    let run: Tween | undefined;
    let hold: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      cancelled = true;
      clearTimeout(start);
      clearTimeout(hold);
      run?.cancel();
    };
    const start = setTimeout(async () => {
      if (view.current.move || drag.current) return;
      const peek = { to: step(view.current.index, 1, list.length), direction: 1 as const, landing: false };
      run = tween(HINT.out, easeOut, (t) => update({ move: { ...peek, progress: HINT.reach * t } }));
      if (!(await run.done) || cancelled) return;
      hold = setTimeout(() => settle(0), HINT.hold);
    }, HINT.delay);
    stopHint.current = stop;
    return stop;
    // Plays once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      moving.current?.cancel();
      switching.current?.cancel();
    },
    [],
  );

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const { left, width } = event.currentTarget.getBoundingClientRect();
    const move = view.current.move;
    drag.current = {
      downX: event.clientX,
      startX: event.clientX + (move ? move.direction * move.progress * width : 0),
      left,
      width,
      moved: false,
      samples: [{ x: event.clientX, t: performance.now() }],
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current) return;
    const now = performance.now();
    current.samples = [...current.samples.filter((sample) => now - sample.t < FLICK_WINDOW_MS), { x: event.clientX, t: now }];
    if (!current.moved && Math.abs(event.clientX - current.downX) < SLOP) return;
    if (!current.moved) {
      current.moved = true;
      stopHint.current();
      moving.current?.cancel();
      if (view.current.move?.landing && view.current.move.progress > 0.5) {
        land(view.current.move.to);
        current.startX = event.clientX;
      }
    }
    const { direction, progress } = dragged(current.startX - event.clientX, current.width);
    update({
      move: direction ? { to: step(view.current.index, direction, list.length), direction, progress, landing: false } : undefined,
    });
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    drag.current = undefined;
    if (!current) return;
    if (!current.moved) return stepBy(tapped(event.clientX - current.left, current.width));
    const move = view.current.move;
    if (!move) return;
    const now = performance.now();
    const first = current.samples.find((sample) => now - sample.t < FLICK_WINDOW_MS) ?? { x: event.clientX, t: now };
    const velocity = (event.clientX - first.x) / Math.max(1, now - first.t);
    settle(lands(move.progress, -velocity * move.direction) ? 1 : 0);
  };

  const onPointerCancel = () => {
    if (drag.current?.moved) settle(0);
    drag.current = undefined;
  };

  const { index, look, move, blend } = view.current;
  const here = list[index];
  const there = move && list[move.to];
  const progress = move?.progress ?? 0;
  const looksOf = (skin: Skin): LookVariables =>
    blend ? blendLooks(lookVariables(skin, blend.from), lookVariables(skin, look), blend.t) : lookVariables(skin, look);
  const wallOf = (skin: Skin) =>
    blend ? mix(rgb(wallColour(skin, blend.from)), rgb(wallColour(skin, look)), blend.t) : rgb(wallColour(skin, look));
  const variables = there ? blendLooks(looksOf(here), looksOf(there), progress) : looksOf(here);
  const wall = there ? mix(wallOf(here), wallOf(there), progress) : wallOf(here);
  const ink = there ? mixColour(inks[here.tone], inks[there.tone], progress) : inks[here.tone];
  const frosted = blend ? (look === "frosted" ? blend.t : 1 - blend.t) : look === "frosted" ? 1 : 0;
  const previewed = move && (move.landing || move.progress > 0.5) ? list[move.to] : here;
  const inUse = current.id === previewed.id && saved.look === look;
  const locked = skinLocked(previewed, plus);
  const revealed = move && wipe(move.direction > 0 ? "right" : "left", progress, reduced);

  const stage = usePortraitSize();
  const { slot, scale } = useFit(stage);
  const display = handheld[system]!;
  const dual = !!dualScreens[system];
  const shownFrame = useMemo(() => frame ?? darkFrame(system), [frame, system]);
  const [spare, setSpare] = useState(0);
  const pad = padScale(stage.width, stage.height);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background px-safe pb-safe">
      <ScreenHeader title={`${systemNames[system]} skin`} onClose={onClose} className="border-transparent" />
      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-4 px-4 pt-2 pb-4 [grid-template-areas:'look'_'card'_'name'_'use'] landscape:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] landscape:grid-rows-[1fr_auto_auto_auto_1fr] landscape:gap-x-8 landscape:[grid-template-areas:'card_.'_'card_look'_'card_name'_'card_use'_'card_.']">
        <div
          role="radiogroup"
          aria-label="Look"
          className="relative mx-auto grid h-13 w-58 grid-cols-2 rounded-full bg-muted p-1 [grid-area:look]"
        >
          <span
            aria-hidden
            className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-background shadow-sm dark:bg-accent"
            style={{ translate: `${frosted * 100}% 0` }}
          />
          {skinLooks.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={option === look}
              className="relative rounded-full text-sm font-medium text-muted-foreground aria-checked:text-foreground"
              onClick={() => switchLook(option)}
            >
              {lookNames[option]}
            </button>
          ))}
        </div>

        <div ref={slot} className="flex min-h-0 items-center justify-center [grid-area:card]">
          <div
            aria-label="Preview"
            className="relative cursor-grab touch-none overflow-hidden rounded-xl shadow-lg ring-1 ring-foreground/10 select-none active:cursor-grabbing"
            style={{ width: stage.width * scale, height: stage.height * scale }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onLostPointerCapture={onPointerCancel}
          >
            <div
              inert
              data-portrait
              data-skin
              className="absolute top-0 left-0 isolate flex origin-top-left flex-col"
              style={{
                width: stage.width,
                height: stage.height,
                transform: `scale(${scale})`,
                ...(variables as CSSProperties),
                "--skin-screen-radius": `${display.radiusDp}px`,
                "--preview-ink": ink,
              } as CSSProperties}
            >
              <Plastic skin={here} />
              {there && <Plastic skin={there} incoming style={revealed?.layer} />}
              <ScreenHeader
                title={game}
                onBack={() => {}}
                className="border-transparent bg-transparent text-(--preview-ink) backdrop-blur-none"
              >
                {dual && (
                  <Button variant="ghost" size="icon" aria-label="Swap screens">
                    <ArrowLeftRight />
                  </Button>
                )}
                <Button variant="ghost" size="icon" aria-label="Pause menu">
                  <Menu />
                </Button>
              </ScreenHeader>
              <div className="flex min-h-0 flex-1 flex-col">
                <PreviewScreen
                  system={system}
                  frame={shownFrame}
                  wall={wall}
                  className={cn("px-6 pt-6", dual ? "pb-6" : "pb-14")}
                  onSpare={setSpare}
                >
                  {!dual && (
                    <span
                      aria-hidden
                      className="absolute top-full left-0.5 mt-6 font-pixel text-[17px] font-semibold tracking-[0.04em] text-(--skin-wordmark)"
                    >
                      pkhemu
                    </span>
                  )}
                </PreviewScreen>
                <StillTouchControls system={system} scale={pad} lift={controlsLift(spare, pad)} />
              </div>
            </div>
            {revealed?.light && (
              <div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-soft-light" style={revealed.light} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 [grid-area:name]">
          <Button variant="outline" size="icon" aria-label="Previous skin" onClick={() => stepBy(-1)}>
            <ChevronLeft />
          </Button>
          <div className="flex min-w-0 flex-1 flex-col items-center">
            <div className="relative h-6 w-full text-center text-lg font-medium">
              <span
                role="status"
                className="absolute inset-0 truncate"
                style={{ opacity: Math.max(0, 1 - 2 * progress), translate: `${-(move?.direction ?? 0) * progress * 24}px 0` }}
              >
                <Name skin={here} plus={plus} />
              </span>
              {there && (
                <span
                  aria-hidden
                  className="absolute inset-0 truncate"
                  style={{ opacity: Math.max(0, 2 * progress - 1), translate: `${move.direction * (1 - progress) * 24}px 0` }}
                >
                  <Name skin={there} plus={plus} />
                </span>
              )}
            </div>
            <div className="flex items-center">
              {list.map((skin, i) => {
                const weight = i === index ? 1 - progress : i === move?.to ? progress : 0;
                return (
                  <button
                    key={skin.id}
                    type="button"
                    aria-label={skin.name}
                    aria-current={i === index || undefined}
                    className="flex h-11 items-center px-1"
                    onClick={() => go(i, i > (move?.landing ? move.to : index) ? 1 : -1)}
                  >
                    <span
                      className={cn("block h-1.5 rounded-full", weight > 0.5 ? "bg-foreground" : "bg-muted-foreground")}
                      style={{ width: 6 + 14 * weight, opacity: 0.45 + 0.55 * weight }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <Button variant="outline" size="icon" aria-label="Next skin" onClick={() => stepBy(1)}>
            <ChevronRight />
          </Button>
        </div>

        <Button
          size="lg"
          variant={inUse ? "secondary" : "default"}
          disabled={inUse || buying || !plus}
          className="w-full [grid-area:use]"
          onClick={() => void (locked ? buyPlus(previewed, look) : applySkin(previewed, look))}
        >
          {buying && <Spinner />}
          {inUse ? "In use" : locked ? "Get Plus" : "Use this skin"}
        </Button>
      </div>
    </div>
  );
}
