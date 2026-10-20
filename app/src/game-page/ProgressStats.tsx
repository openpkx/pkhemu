import { BookOpen, Clock, Medal } from "lucide-react";
import type { GameProgress } from "@pkhex-everywhere/engine";
import { Crossfade } from "@/plugin-kit/motion";

export function ProgressStats({
  progress: { playTime, badges, pokedex },
  withPokedex = true,
  pixel = false,
}: {
  progress: GameProgress;
  withPokedex?: boolean;
  pixel?: boolean;
}) {
  const number = (text: string | number) => (pixel ? <span className="font-pixel">{text}</span> : text);
  const stats = [
    playTime && {
      label: "Play time",
      Icon: Clock,
      value: `${playTime.hours}:${String(playTime.minutes).padStart(2, "0")}`,
      shown: number(`${playTime.hours}:${String(playTime.minutes).padStart(2, "0")}`),
    },
    badges && { label: "Badges", Icon: Medal, value: `${badges.earned} / ${badges.total}`, shown: number(`${badges.earned} / ${badges.total}`) },
    withPokedex &&
      pokedex && {
        label: "Pokédex",
        Icon: BookOpen,
        value: `${pokedex.seen} ${pokedex.caught}`,
        shown: (
          <>
            Seen {number(pokedex.seen)} · Caught {number(pokedex.caught)}
          </>
        ),
      },
  ].filter((stat) => !!stat);
  if (stats.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
      {stats.map(({ label, Icon, value, shown }) => (
        <Crossfade key={label} value={value}>
          <span title={label} className="inline-flex items-center gap-1 tabular-nums">
            <Icon aria-hidden className="size-4" />
            <span className="sr-only">{label} </span>
            {shown}
          </span>
        </Crossfade>
      ))}
    </span>
  );
}
