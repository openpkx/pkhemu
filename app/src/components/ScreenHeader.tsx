import type { ReactNode } from "react";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

export function ScreenHeader({
  title,
  onBack,
  onClose,
  className,
  children,
}: {
  title: ReactNode;
  onBack?(): void;
  onClose?(): void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 box-content flex h-14 items-center gap-2 border-b bg-background/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur",
        className,
      )}
    >
      {onBack && (
        <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack}>
          <ChevronLeft />
        </Button>
      )}
      {onClose && (
        <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
          <X />
        </Button>
      )}
      <h1 className="min-w-0 flex-1 truncate font-heading text-lg font-medium">{title}</h1>
      {children}
    </header>
  );
}
