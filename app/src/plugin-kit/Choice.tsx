import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Choice({ icon, title, line, onClick }: { icon: ReactNode; title: string; line: string; onClick(): void }) {
  return (
    <Button
      variant="outline"
      className="motion-press h-auto w-full justify-start gap-3 rounded-lg px-4 py-3.5 text-left whitespace-normal"
      onClick={onClick}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary [&_svg]:size-5">
        {icon}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-base font-medium">{title}</span>
        <span className="text-sm font-normal text-muted-foreground">{line}</span>
      </span>
      <ChevronRight className="text-muted-foreground" />
    </Button>
  );
}
