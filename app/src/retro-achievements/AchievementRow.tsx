import { Button } from "@/components/ui/button";
import { Badge } from "./Badge";
import type { Achievement } from "./retroAchievements";
import { pointsText } from "./tally";

export function AchievementRow({
  achievement,
  line,
  autoFocus,
  onOpen,
}: {
  achievement: Achievement;
  line: string | null;
  autoFocus?: boolean;
  onOpen(): void;
}) {
  return (
    <Button
      variant="ghost"
      autoFocus={autoFocus}
      className="h-auto w-full items-start justify-start gap-3 rounded-lg px-3 py-2.5 text-left font-normal whitespace-normal"
      onClick={onOpen}
    >
      <Badge name={achievement.badge} locked={!achievement.earned} className="size-10" />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 font-medium break-words">{achievement.title}</span>
          <span className="flex-none text-sm text-muted-foreground tabular-nums">{pointsText(achievement.points)}</span>
        </span>
        <span className="text-sm break-words text-muted-foreground">{achievement.description}</span>
        {line && <span className="text-xs text-muted-foreground tabular-nums">{line}</span>}
      </span>
    </Button>
  );
}
