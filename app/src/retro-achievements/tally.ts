import { when } from "@/backups/backups";
import type { Achievement, Earned, Profile } from "./retroAchievements";

export const pointsText = (points: number) => `${points} ${points === 1 ? "pt" : "pts"}`;

export const countText = (count: number) => count.toLocaleString("en-US");

export const profilePoints = ({ hardcore, softcore }: Profile) =>
  `${countText(hardcore)} hardcore · ${countText(softcore)} softcore points`;

export function tallyText(achievements: Achievement[]) {
  const earned = achievements.filter((achievement) => achievement.earned);
  const points = earned.reduce((sum, achievement) => sum + achievement.points, 0);
  return `${earned.length}/${achievements.length} · ${pointsText(points)}`;
}

export function earnedLine({ at, hardcore }: Earned, now: Date) {
  const mode = hardcore ? "Hardcore" : "Softcore";
  return at === null ? mode : `${when(new Date(at * 1000), now)} · ${mode}`;
}

export const rarityText = (rarity: number) => `${rarity < 1 ? rarity.toFixed(1) : Math.round(rarity)}%`;

export const kicker = ({ earned, points }: Achievement) =>
  `${earned ? "Achievement unlocked" : "Locked"} · ${pointsText(points)}`;
