import type { ReactNode } from "react";
import { cn } from "cn";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { buttons, type Input } from "@/input/input";
import { usePadPresses } from "@/input/padPresses";
import { usePresence } from "@/motion/motion";

export function BottomSheet({
  open = true,
  title,
  input,
  onClose,
  onPadPress,
  centeredFromSm,
  className,
  children,
}: {
  open?: boolean;
  title: ReactNode;
  input?: Input;
  onClose(): void;
  onPadPress?(button: number): void;
  centeredFromSm?: boolean;
  className?: string;
  children: ReactNode;
}) {
  usePadPresses(input, (button) => (button === buttons.b ? onClose() : onPadPress?.(button)), open);
  // Radix opens an already mounted dialog a render late, and it then hides dialogs opened in the same update from screen readers.
  const { ref, shown } = usePresence(open || undefined);
  if (shown === undefined) return null;
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        ref={ref}
        showCloseButton={false}
        aria-describedby={undefined}
        motion={centeredFromSm ? "sheet-dialog" : "sheet"}
        className={cn(
          "top-auto bottom-0 left-0 max-h-[calc(100%-env(safe-area-inset-top))] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-b-none pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]",
          centeredFromSm &&
            "sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-w-xs sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:px-4 sm:pb-4",
          className,
        )}
      >
        <DialogTitle className="px-3 pt-1">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
