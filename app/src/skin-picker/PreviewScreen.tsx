import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "cn";
import { origin, type Point, type Size } from "@/fit";
import { useCanTilt, useGravity } from "@/gravity/gravity";
import { useReducedMotion } from "@/plugin-kit/motion";
import { tilt, type Tilt } from "@/motion/tilt";
import { usePreferences } from "@/preferences/preferences";
import { parallax, shellIn, shellLook } from "@/recess";
import { createScreen, type Frame, type Rgb } from "@/screen";
import { dualScreen, dualScreens, inPortrait, singleScreen, type Layout } from "@/screens";
import { handheld, type System } from "@/systems";

export function PreviewScreen({
  system,
  frame,
  wall,
  className,
  children,
}: {
  system: System;
  frame: Frame;
  wall: Rgb;
  className?: string;
  children?: ReactNode;
}) {
  const area = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const display = handheld[system]!;
  const screens = dualScreens[system];
  const { screenDepth, screenGlass } = usePreferences().preferences;
  const canTilt = useCanTilt();
  const tiltOn = screenDepth && canTilt;
  const reduced = useReducedMotion(tiltOn);
  const tilting = tiltOn && !reduced;
  const readGravity = useGravity(tilting);
  const currentWall = useRef(wall);
  currentWall.current = wall;

  useEffect(() => {
    let draw: ReturnType<typeof createScreen> | undefined;
    let layout: Layout | undefined;
    let space: Size | undefined;
    let shownWall: Rgb | undefined;
    let shownTilt: Point | undefined;
    let tiltState: Tilt | undefined;
    let dirty = true;

    const observer = new ResizeObserver(([entry]) => {
      space = {
        width: Math.round(entry.contentRect.width * devicePixelRatio),
        height: Math.round(entry.contentRect.height * devicePixelRatio),
      };
      layout = screens ? dualScreen(frame, inPortrait(screens), space, false, shellIn(display)) : singleScreen(frame, space, shellIn(display));
      canvas.current!.width = layout.canvas.width;
      canvas.current!.height = layout.canvas.height;
      canvas.current!.style.width = `${layout.canvas.width / devicePixelRatio}px`;
      canvas.current!.style.height = `${layout.canvas.height / devicePixelRatio}px`;
      dirty = true;
    });
    observer.observe(area.current!);

    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const gravity = tilting ? readGravity() : undefined;
      tiltState = gravity && tilt(tiltState, gravity, now);
      const dp = tiltState?.shift ?? origin;
      if (dp.x !== shownTilt?.x || dp.y !== shownTilt?.y || currentWall.current !== shownWall) dirty = true;
      if (!dirty || !layout) return;
      dirty = false;
      shownTilt = dp;
      shownWall = currentWall.current;
      (draw ??= createScreen(canvas.current!))(frame, layout, shellLook(display, shownWall, screenGlass), parallax(display.windows, dp));
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [frame, display, screens, tilting, readGravity, screenGlass]);

  return (
    <div ref={area} className={cn("relative flex min-h-0 flex-1 justify-center overflow-hidden", className)}>
      <div data-screen className="relative flex">
        <canvas ref={canvas} className="[image-rendering:pixelated]" />
        {children}
      </div>
    </div>
  );
}
