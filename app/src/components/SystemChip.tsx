import type { CSSProperties } from "react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { systemColors, systemNames, type System } from "@/systems";

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

export function SystemChips({ systems }: { systems: readonly System[] }) {
  const names = systems.map((system) => systemNames[system]);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names.join("");
  return (
    <div role="img" aria-label={`Plays ${list} games`} className="flex flex-wrap justify-center gap-2">
      {systems.map((system) => (
        <SystemChip key={system} system={system} />
      ))}
    </div>
  );
}
