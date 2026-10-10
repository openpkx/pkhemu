import { when } from "@/backups/backups";
import type { SavedState } from "@/save-states/StatesScreen";

export type PlayHistory = { lastPlayed: number | null; playTime: number };

export function gameTitle(name: string) {
  return name.replace(/(\s*(\([^()]*\)|\[[^\]]*\]))+$/, "") || name;
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function ago(seconds: number) {
  for (const [unit, size] of units) if (seconds >= size) return relative.format(-Math.floor(seconds / size), unit);
  return "just now";
}

function total(seconds: number) {
  return seconds >= 3600 ? `${Math.floor(seconds / 3600)} h` : `${Math.max(1, Math.floor(seconds / 60))} min`;
}

export function playedSummary({ lastPlayed, playTime }: PlayHistory, now: number) {
  if (lastPlayed === null) return undefined;
  return `Last played ${ago((now - lastPlayed) / 1000)} · ${total(playTime)} total`;
}

export function savedSummary(modified: number, now: number) {
  return `Saved ${ago((now - modified) / 1000)}`;
}

export function resumedFrom(slot: number | undefined, slots: SavedState[], now: Date) {
  const saved = slots.find((saved) => saved.slot === slot);
  return saved && `From slot ${saved.slot} · saved ${when(new Date(saved.savedAt), now)}`;
}
