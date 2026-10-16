import type { CSSProperties } from "react";
import { cn } from "cn";
import { BadgeImage } from "./BadgeImage";

export function Badge({ name, locked, className, style }: { name?: string; locked?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <span
      data-locked={locked || undefined}
      className={cn("block flex-none overflow-hidden rounded-full data-locked:opacity-60 data-locked:grayscale", className)}
      style={style}
    >
      <BadgeImage name={name} />
    </span>
  );
}
