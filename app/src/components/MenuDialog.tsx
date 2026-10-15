import { useRef, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "cn";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/ui/button";
import { buttons, type Input } from "@/input/input";

export function MenuEntry({ icon, className, children, ...props }: { icon: ReactNode } & ComponentProps<typeof Button>) {
  return (
    <Button variant="ghost" className={cn("h-11 justify-start gap-3 rounded-lg px-3 text-base", className)} {...props}>
      {icon}
      {children}
    </Button>
  );
}

export function MenuDialog({
  open,
  title,
  input,
  onClose,
  children,
}: {
  open?: boolean;
  title: string;
  input: Input;
  onClose(): void;
  children: ReactNode;
}) {
  const list = useRef<HTMLDivElement>(null);

  const move = (step: number) => {
    const entries = [...list.current!.querySelectorAll<HTMLButtonElement>("button:enabled")];
    const at = entries.indexOf(document.activeElement as HTMLButtonElement);
    entries[at < 0 ? 0 : (at + step + entries.length) % entries.length]?.focus();
  };

  const onPadPress = (button: number) => {
    if (button === buttons.up) move(-1);
    if (button === buttons.down) move(1);
    if (button === buttons.a && list.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).click();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = { ArrowUp: -1, ArrowDown: 1 }[event.key];
    if (!step) return;
    event.preventDefault();
    move(step);
  };

  return (
    <BottomSheet
      open={open}
      title={title}
      input={input}
      onClose={onClose}
      onPadPress={onPadPress}
      centeredFromSm
    >
      <div ref={list} className="stagger grid gap-1" onKeyDown={onKeyDown}>
        {children}
      </div>
    </BottomSheet>
  );
}
