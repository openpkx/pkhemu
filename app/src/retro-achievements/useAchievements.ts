import { useEffect, useState } from "react";
import { useRetroAchievements, type Achievement } from "./retroAchievements";

/** The running game's list, read again on each unlock and whenever `refresh` changes, as when the game pauses. */
export function usePlayingAchievements(running: boolean, refresh: unknown) {
  const { playing, onEvent } = useRetroAchievements();
  const [achievements, setAchievements] = useState<Achievement[] | null>(null);
  const [unlocks, setUnlocks] = useState(0);

  useEffect(() => onEvent((event) => event.kind === "unlocked" && setUnlocks((unlocks) => unlocks + 1)), [onEvent]);

  useEffect(() => {
    if (!running) return;
    let current = true;
    playing().then(
      (achievements) => current && setAchievements(achievements),
      (reason) => console.error("RetroAchievements:", reason),
    );
    return () => {
      current = false;
    };
  }, [playing, running, refresh, unlocks]);

  return running ? achievements : null;
}

export function useGameAchievements(folder: string, path: string, skip: boolean, refresh: unknown) {
  const { game } = useRetroAchievements();
  const [listed, setListed] = useState<{ path: string; achievements: Achievement[] | null }>();

  useEffect(() => {
    if (skip) return;
    let current = true;
    game(folder, path).then(
      (achievements) => current && setListed({ path, achievements }),
      (reason) => console.error("RetroAchievements:", reason),
    );
    return () => {
      current = false;
    };
  }, [game, folder, path, skip, refresh]);

  return !skip && listed?.path === path ? listed.achievements : null;
}
