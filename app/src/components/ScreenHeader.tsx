import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScreenHeader({ title, onBack, children }: { title: ReactNode; onBack?(): void; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur">
      {onBack && (
        <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack}>
          <ChevronLeft />
        </Button>
      )}
      <h1 className="min-w-0 flex-1 truncate font-heading text-lg font-medium">{title}</h1>
      {children}
    </header>
  );
}
