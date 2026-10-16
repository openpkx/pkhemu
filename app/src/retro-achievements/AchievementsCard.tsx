import { useId } from "react";
import { ChevronRight, Trophy } from "lucide-react";
import { sectionHeading } from "@/components/sectionHeading";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRetroAchievements, type Achievement } from "./retroAchievements";
import { tallyText } from "./tally";

export function AchievementsCard({
  achievements,
  onOpen,
  onAccount,
}: {
  achievements: Achievement[];
  onOpen(): void;
  onAccount(): void;
}) {
  const headingId = useId();
  const { account } = useRetroAchievements();
  const earned = achievements.filter((achievement) => achievement.earned).length;
  return (
    <section aria-labelledby={headingId} className="grid content-start gap-3 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className={sectionHeading}>
          Achievements
        </h2>
        <Button variant="ghost" size="sm" className="-my-1 -mr-2 min-w-0 font-normal text-muted-foreground" onClick={onAccount}>
          <span className="truncate">{account}</span>
          <ChevronRight />
        </Button>
      </div>
      <p className="text-sm tabular-nums">{tallyText(achievements)}</p>
      <Progress value={(earned / achievements.length) * 100} aria-label="Achievements unlocked" />
      <Button variant="outline" onClick={onOpen}>
        <Trophy />
        All achievements
      </Button>
    </section>
  );
}
