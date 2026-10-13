import { useEffect, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBack } from "@/back/back";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { useCapturePads } from "@/input/padPresses";
import type { SetupEvent, SetupStep } from "@/input/padSetup";
import { cn } from "@/lib/utils";
import { Screen } from "@/motion/motion";
import { PadDiagram } from "./PadDiagram";
import type { SetupDriver } from "./setupDrivers";

const FLASH_MS = 600;

const stepLabels: Record<SetupStep, string> = {
  up: "D-pad up",
  down: "D-pad down",
  left: "D-pad left",
  right: "D-pad right",
  east: "Right face button (A)",
  south: "Bottom face button (B)",
  north: "Top face button (X)",
  west: "Left face button (Y)",
  l1: "Left shoulder (L)",
  r1: "Right shoulder (R)",
  l2: "Left trigger (L2)",
  r2: "Right trigger (R2)",
  select: "Left centre button (Select)",
  start: "Right centre button (Start)",
  guide: "Middle button (Menu)",
  stickUp: "Left stick up",
  stickLeft: "Left stick left",
  rightStickUp: "Right stick up",
  rightStickLeft: "Right stick left",
};

export function ControllerSetup<T>({
  driver: createDriver,
  onDone,
  onCancel,
}: {
  driver: () => SetupDriver<T>;
  onDone(calibration: T): void;
  onCancel(): void;
}) {
  useCapturePads();
  useBack(onCancel);
  const [setup] = useState(createDriver);
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const [flash, setFlash] = useState<{ step: SetupStep }>();
  const layer = useRef<HTMLDivElement>(null);
  const latest = useRef({ onDone, onCancel });
  latest.current = { onDone, onCancel };
  const steps = setup.steps;
  const step = setup.step() ?? steps[steps.length - 1];

  useEffect(() => {
    const handle = (event: SetupEvent) => {
      if (event.type === "idle") latest.current.onCancel();
      else if (event.type === "duplicate") setFlash({ step: event.of });
      else if (!setup.step()) latest.current.onDone(setup.calibration());
      else rerender();
    };
    return setup.start(handle, () => latest.current.onCancel());
  }, [setup]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(undefined), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    const before = document.activeElement;
    const behind = [...document.body.children].filter((element) => element !== layer.current && !element.hasAttribute("inert"));
    for (const element of behind) element.setAttribute("inert", "");
    layer.current?.focus();
    return () => {
      for (const element of behind) element.removeAttribute("inert");
      if (before instanceof HTMLElement) before.focus();
    };
  }, []);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      latest.current.onCancel();
    };
    window.addEventListener("keydown", keydown, true);
    return () => window.removeEventListener("keydown", keydown, true);
  }, []);

  const skip = () => {
    setup.skip();
    if (setup.step()) rerender();
    else onDone(setup.calibration());
  };

  return createPortal(
    <Screen>
      <div ref={layer} tabIndex={-1} className="fixed inset-0 px-safe z-30 flex flex-col bg-background outline-none">
        <ScreenHeader title={setup.title} onBack={onCancel} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto grid max-w-sm gap-4 p-4">
            <PadDiagram target={step} label={stepLabels[step]} />
            <div className="grid gap-1 text-center">
              <p className="text-sm text-muted-foreground">
                Step {steps.indexOf(step) + 1} of {steps.length}
              </p>
              <p className="font-heading text-lg font-medium">Press {stepLabels[step]}</p>
              {setup.device && <p className="text-sm text-muted-foreground break-all">{setup.device}</p>}
              <p className="text-sm text-muted-foreground">{setup.hint}</p>
            </div>
            <ol className="grid text-sm">
              {steps.map((each) => (
                <li
                  key={each}
                  aria-current={each === step ? "step" : undefined}
                  data-flash={flash?.step === each || undefined}
                  className={cn(
                    "flex justify-between gap-3 rounded-md px-2 py-1.5 transition-colors",
                    each === step && "bg-muted font-medium",
                    flash?.step === each && "bg-destructive/20",
                  )}
                >
                  <span>{stepLabels[each]}</span>
                  <span className="text-muted-foreground tabular-nums">{setup.bound(each)}</span>
                </li>
              ))}
            </ol>
          </div>
        </main>
        <div className="flex items-center justify-end gap-2 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={skip}>Skip</Button>
        </div>
      </div>
    </Screen>,
    document.body,
  );
}
