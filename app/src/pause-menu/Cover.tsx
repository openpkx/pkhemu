import type { ReactNode } from "react";
import { buttons, type Input } from "@/input/input";
import { usePadPresses } from "@/input/padPresses";

export function Cover({ input, onBack, children }: { input: Input; onBack(): void; children: ReactNode }) {
  usePadPresses(input, (button) => button === buttons.b && onBack());

  return <div className="fixed inset-0 z-20 overflow-y-auto bg-background">{children}</div>;
}
