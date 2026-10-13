import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { usePresence } from "@/motion/motion";

export const TOAST_MS = 3000;

export function useToast() {
  const [toast, setToast] = useState<string>();
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(undefined), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);
  return [toast, setToast] as const;
}

export function Toast({ children, inline = false }: { children?: ReactNode; inline?: boolean }) {
  const { ref, shown, state } = usePresence(children || undefined);
  if (shown === undefined) return null;
  const toast = (
    <p
      ref={ref}
      role="status"
      data-state={state}
      className={cn(
        "motion-toast w-fit rounded-full bg-overlay/70 px-3 py-1 text-sm text-white data-[state=closed]:**:pointer-events-none",
        inline ? "text-center" : "pointer-events-none fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] z-40 mx-auto",
      )}
    >
      {shown}
    </p>
  );
  return inline ? toast : createPortal(toast, document.body);
}

export function WithAction({ children, action, onAction }: { children: ReactNode; action: string; onAction(): void }) {
  return (
    <>
      {children} ·{" "}
      <button className="pointer-events-auto -mr-2 rounded-full px-2 font-medium hover:bg-white/20" onClick={onAction}>
        {action}
      </button>
    </>
  );
}
