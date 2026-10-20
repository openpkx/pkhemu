import { useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "cn";
import { usePresence } from "@/plugin-kit/motion";

export function BottomBar({
  open = true,
  className,
  children,
  ...props
}: { open?: boolean; children: ReactNode } & Omit<ComponentProps<"div">, "children">) {
  const { ref, shown, state } = usePresence(open ? children : undefined);
  const [openOnMount, setOpenOnMount] = useState(open);
  if (openOnMount && !open) setOpenOnMount(false);
  if (shown === undefined) return null;
  return (
    <div
      ref={ref}
      data-state={openOnMount ? undefined : state}
      inert={state === "closed"}
      className={cn(
        "motion-bottom-bar sticky bottom-0 flex flex-wrap items-center gap-x-3 gap-y-2 border-t bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur",
        className,
      )}
      {...props}
    >
      {shown}
    </div>
  );
}
