import type { CSSProperties } from "react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { systemColors, type System } from "@/systems";

export function SystemChip({ system, className }: { system: System; className?: string }) {
  const { dark, light } = systemColors[system];
  const colors = {
    "--chip": light.chip,
    "--chip-text": light.chipText,
    "--chip-dark": dark.chip,
    "--chip-text-dark": dark.chipText,
  } as CSSProperties;
  return (
    <Badge
      style={colors}
      className={cn(
        "rounded-sm bg-(--chip) px-1.5 font-pixel font-normal tracking-[0.06em] text-(--chip-text) dark:bg-(--chip-dark) dark:text-(--chip-text-dark)",
        className,
      )}
    >
      {system.toUpperCase()}
    </Badge>
  );
}
