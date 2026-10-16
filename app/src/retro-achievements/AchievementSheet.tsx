import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/ui/button";
import type { Input } from "@/input/input";
import { Badge } from "./Badge";
import type { Achievement } from "./retroAchievements";
import { earnedLine, kicker, rarityText } from "./tally";

/** Which achievement's sheet is open, and the last one shown, which stays mounted while the sheet closes. */
export function useAchievementSheet() {
  const [open, setOpen] = useState<Achievement>();
  const [shown, setShown] = useState<Achievement>();
  const pick = (achievement: Achievement) => {
    setOpen(achievement);
    setShown(achievement);
  };
  return { open, shown, pick, close: () => setOpen(undefined) };
}

export function AchievementSheet({
  achievement,
  open = true,
  input,
  onAll,
  onResume,
  onClose,
}: {
  achievement: Achievement;
  open?: boolean;
  input?: Input;
  onAll?(): void;
  /** Shown over a paused game, it resumes it. Elsewhere the sheet just closes. */
  onResume?(): void;
  onClose(): void;
}) {
  const facts: [string, string][] = [
    ["Points", `${achievement.points}`],
    achievement.earned
      ? ["Unlocked", earnedLine(achievement.earned, new Date())]
      : ["Progress", achievement.progress ?? "Not yet"],
    ["Players who have it", rarityText(achievement.rarity)],
  ];
  return (
    <BottomSheet
      open={open}
      input={input}
      onClose={onClose}
      centeredFromSm
      className="gap-3.5 sm:max-w-sm"
      title={
        <span className="flex items-center gap-3.5">
          <Badge
            name={achievement.badge}
            locked={!achievement.earned}
            className="size-16 ring-3 ring-primary data-locked:ring-0"
          />
          <span className="grid gap-0.5">
            <span className="text-[10px] font-normal tracking-[0.06em] text-muted-foreground uppercase">{kicker(achievement)}</span>
            <span className="text-base leading-tight font-semibold text-balance">{achievement.title}</span>
          </span>
        </span>
      }
    >
      <p className="px-3 text-sm">{achievement.description}</p>
      <dl className="grid gap-1.5 px-3 text-[13px]">
        {facts.map(([fact, value]) => (
          <div key={fact} className="flex justify-between gap-3 border-t pt-1.5">
            <dt className="text-muted-foreground">{fact}</dt>
            <dd className="text-right tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap justify-end gap-2 px-3">
        {onAll && (
          <Button variant="outline" onClick={onAll}>
            All achievements
          </Button>
        )}
        {onResume ? (
          <Button autoFocus onClick={onResume}>
            Resume
          </Button>
        ) : (
          <Button variant="secondary" autoFocus onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </BottomSheet>
  );
}
