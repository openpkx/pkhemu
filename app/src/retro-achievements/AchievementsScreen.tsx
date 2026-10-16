import { useBack } from "@/back/back";
import { ScreenHeader } from "@/components/ScreenHeader";
import type { Input } from "@/input/input";
import { moveFocusWithArrows, PadNavigation } from "@/pad-navigation/PadNavigation";
import { AchievementRow } from "./AchievementRow";
import { AchievementSheet, useAchievementSheet } from "./AchievementSheet";
import type { Achievement } from "./retroAchievements";
import { earnedLine, tallyText } from "./tally";

export function AchievementsScreen({
  achievements,
  input,
  onBack,
  onResume,
}: {
  achievements: Achievement[];
  /** The game's input, so a pad can move through the list over a paused game. */
  input?: Input;
  onBack(): void;
  /** Over a paused game, a details sheet's Resume resumes it. */
  onResume?(): void;
}) {
  const { open, shown, pick, close } = useAchievementSheet();
  const now = new Date();
  const back = () => (open ? close() : onBack());
  useBack(back);

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-background px-safe pb-safe">
      {input && <PadNavigation input={input} />}
      <ScreenHeader title="Achievements" onBack={back}>
        <span className="flex-none text-sm text-muted-foreground tabular-nums">{tallyText(achievements)}</span>
      </ScreenHeader>
      <main className="mx-auto max-w-2xl p-4" onKeyDown={moveFocusWithArrows}>
        <ul className="grid gap-1">
          {achievements.map((achievement, index) => (
            <li key={achievement.id}>
              <AchievementRow
                achievement={achievement}
                line={achievement.earned ? earnedLine(achievement.earned, now) : achievement.progress}
                autoFocus={!!input && index === 0}
                onOpen={() => pick(achievement)}
              />
            </li>
          ))}
        </ul>
      </main>
      {shown && (
        <AchievementSheet
          achievement={shown}
          open={!!open}
          onAll={onResume && close}
          onResume={onResume}
          onClose={close}
        />
      )}
    </div>
  );
}
