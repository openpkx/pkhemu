import {
  Activity,
  addTransitionType,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  ViewTransition,
  type ReactElement,
  type ReactNode,
} from "react";
import { Slot } from "radix-ui";

export type NavigationKind = "forward" | "back" | "peer" | "play" | "sheet" | "container";

export function navigate(kind: NavigationKind, update: () => void) {
  startTransition(() => {
    addTransitionType(kind);
    update();
  });
}

const screenClass = {
  forward: "nav-forward",
  back: "nav-back",
  peer: "nav-peer",
  play: "nav-play",
  sheet: "nav-sheet",
  container: "nav-container",
  default: "none",
};

export function Screen({ hidden = false, children }: { hidden?: boolean; children: ReactNode }) {
  return (
    <Activity mode={hidden ? "hidden" : "visible"}>
      <ViewTransition enter={screenClass} exit={screenClass} default="none">
        {children}
      </ViewTransition>
    </Activity>
  );
}

const cssIdent = (name: string) => `shared-${name.replace(/[^a-zA-Z0-9-]/g, (char) => `_${char.charCodeAt(0).toString(16)}_`)}`;

export function Shared({ name, children }: { name: string; children: ReactNode }) {
  return (
    <ViewTransition name={cssIdent(name)} share="container-transform" default="none">
      {children}
    </ViewTransition>
  );
}

export function usePresence<T>(value: T | undefined) {
  const node = useRef<Element>(null);
  const ref = useCallback((element: Element | null) => {
    node.current = element;
  }, []);
  const [shown, setShown] = useState(value);
  if (value !== undefined && value !== shown) setShown(value);
  const leaving = value === undefined && shown !== undefined;

  useEffect(() => {
    if (!leaving) return;
    const animations = node.current?.getAnimations?.() ?? [];
    if (!animations.length) return setShown(undefined);
    let current = true;
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => current && setShown(undefined));
    return () => {
      current = false;
    };
  }, [leaving]);

  return { ref, shown, state: leaving ? "closed" : "open" } as const;
}

export async function settled(element: Element | null) {
  const animations = element?.getAnimations?.({ subtree: true }) ?? [];
  await Promise.allSettled(animations.map((animation) => animation.finished));
}

const staggered = new Set<string>();

export function useStaggerOnce(key: string, ready: boolean) {
  const ref = useRef<HTMLElement>(null);
  const [done, setDone] = useState(() => staggered.has(key));

  useEffect(() => {
    if (done || !ready) return;
    staggered.add(key);
    const animations = (ref.current?.getAnimations?.({ subtree: true }) ?? []).filter(
      (animation) => "animationName" in animation && animation.animationName === "motion-rise-in",
    );
    let current = true;
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => current && setDone(true));
    return () => {
      current = false;
    };
  }, [done, ready, key]);

  return { ref, stagger: done ? undefined : "stagger" };
}

export function Crossfade({ value, children }: { value: unknown; children: ReactElement }) {
  const [seen, setSeen] = useState({ value, changes: 0 });
  if (!Object.is(seen.value, value)) setSeen({ value, changes: seen.value === undefined ? seen.changes : seen.changes + 1 });
  return (
    <Slot.Root key={seen.changes} className={seen.changes ? "motion-crossfade-in" : undefined}>
      {children}
    </Slot.Root>
  );
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export function useReducedMotion(watch: boolean) {
  const [reduced, setReduced] = useState(() => watch && matchMedia(REDUCED_MOTION).matches);

  useEffect(() => {
    if (!watch) return;
    const query = matchMedia(REDUCED_MOTION);
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [watch]);

  return reduced;
}
