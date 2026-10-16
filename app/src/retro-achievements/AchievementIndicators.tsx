import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { settled } from "@/motion/motion";
import type { Skin } from "@/skins";
import { useRetroAchievements, type AchievementEvent } from "./retroAchievements";
import { unlockColours, type UnlockColours } from "./unlockColours";
import { BadgeImage } from "./BadgeImage";

export const PROGRESS_MS = 2000;
export const LEADERBOARD_MS = 2000;
export const SUBMITTED_MS = 3000;
const LEAST_RESUMED_MS = 1500;

type Progress = Extract<AchievementEvent, { kind: "progress" }>;
type Challenge = Extract<AchievementEvent, { kind: "challengeShown" }>;
type Tracker = { id: number; value: string; leaving: boolean };
type Timed<T> = { item: T; ms: number; key: number; update: number; leaving: boolean };

function useTimed<T>(paused: boolean) {
  const [shown, setShown] = useState<Timed<T>>();
  const left = useRef({ update: 0, ms: 0 });

  const show = useCallback(
    (item: T, ms: number) =>
      setShown((shown) => ({
        item,
        ms,
        key: !shown || shown.leaving ? (shown?.key ?? 0) + 1 : shown.key,
        update: (shown?.update ?? 0) + 1,
        leaving: false,
      })),
    [],
  );
  const clear = useCallback(() => setShown(undefined), []);
  const gone = (key: number) => setShown((now) => (now?.key === key && now.leaving ? undefined : now));

  const update = shown?.update;
  const ms = shown?.ms;
  const leaving = shown?.leaving;
  useEffect(() => {
    if (update === undefined || ms === undefined || leaving || paused) return;
    if (left.current.update !== update) left.current = { update, ms };
    const started = Date.now();
    const timer = setTimeout(() => setShown((shown) => shown && { ...shown, leaving: true }), left.current.ms);
    return () => {
      clearTimeout(timer);
      left.current.ms = Math.max(LEAST_RESUMED_MS, left.current.ms - (Date.now() - started));
    };
  }, [update, ms, leaving, paused]);

  return { shown, show, clear, gone };
}

function leaderboardMessage(event: AchievementEvent): [string, number] | undefined {
  if (event.kind === "leaderboardStarted") return [`Leaderboard started · ${event.title}`, LEADERBOARD_MS];
  if (event.kind === "leaderboardSubmitted") return [`Submitted ${event.score}`, SUBMITTED_MS];
  if (event.kind === "leaderboardFailed") return ["Leaderboard failed", LEADERBOARD_MS];
}

export function AchievementIndicators({ skin, paused }: { skin: Pick<Skin, "base" | "tone" | "moulded">; paused: boolean }) {
  const { onEvent } = useRetroAchievements();
  const colours = useMemo(() => unlockColours(skin), [skin]);
  const progress = useTimed<Progress>(paused);
  const message = useTimed<string>(paused);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const { show: showProgress, clear: clearProgress } = progress;
  const { show: showMessage, clear: clearMessage } = message;

  useEffect(() => {
    const stop = onEvent((event) => {
      const leaderboard = leaderboardMessage(event);
      if (leaderboard) {
        showMessage(...leaderboard);
      } else if (event.kind === "progress") {
        showProgress(event, PROGRESS_MS);
      } else if (event.kind === "challengeShown") {
        setChallenges((live) => (live.some(({ id }) => id === event.id) ? live : [...live, event]));
      } else if (event.kind === "challengeHidden") {
        setChallenges((live) => live.filter(({ id }) => id !== event.id));
      } else if (event.kind === "tracker") {
        const tracker = { id: event.id, value: event.value, leaving: false };
        setTrackers((live) =>
          live.some(({ id }) => id === event.id)
            ? live.map((shown) => (shown.id === event.id ? tracker : shown))
            : [...live, tracker],
        );
      } else if (event.kind === "trackerHidden") {
        setTrackers((live) => live.map((shown) => (shown.id === event.id ? { ...shown, leaving: true } : shown)));
      }
    });
    return () => {
      stop();
      clearProgress();
      clearMessage();
      setChallenges([]);
      setTrackers([]);
    };
  }, [onEvent, showProgress, clearProgress, showMessage, clearMessage]);

  if (!progress.shown && !message.shown && !challenges.length && !trackers.length) return null;
  const shownMessage = message.shown;
  const shownProgress = progress.shown;
  return (
    <div className="flex flex-col items-end gap-1">
      {shownMessage && (
        <Pill
          key={shownMessage.key}
          label={shownMessage.item}
          leaving={shownMessage.leaving}
          colours={colours}
          onGone={() => message.gone(shownMessage.key)}
        >
          <span className="min-w-0 truncate">{shownMessage.item}</span>
        </Pill>
      )}
      <div className="flex items-center gap-1">
        {shownProgress && (
          <Pill
            key={`progress-${shownProgress.key}`}
            label={`${shownProgress.item.title}: ${shownProgress.item.progress}`}
            badge={shownProgress.item.badge}
            leaving={shownProgress.leaving}
            colours={colours}
            onGone={() => progress.gone(shownProgress.key)}
          >
            <span>{shownProgress.item.progress}</span>
          </Pill>
        )}
        {trackers.map((tracker) => (
          <Pill
            key={`tracker-${tracker.id}`}
            label={`Leaderboard: ${tracker.value}`}
            leaving={tracker.leaving}
            colours={colours}
            onGone={() => setTrackers((live) => live.filter((shown) => shown.id !== tracker.id || !shown.leaving))}
          >
            <span>{tracker.value}</span>
          </Pill>
        ))}
        {challenges.map((challenge) => (
          <ChallengeBadge key={challenge.id} challenge={challenge} colours={colours} />
        ))}
      </div>
    </div>
  );
}

function Badge({ name }: { name: string }) {
  return (
    <span className="size-4 flex-none overflow-hidden rounded-full">
      <BadgeImage name={name} />
    </span>
  );
}

function Pill({
  label,
  badge,
  leaving,
  colours,
  onGone,
  children,
}: {
  label: string;
  badge?: string;
  leaving: boolean;
  colours: UnlockColours;
  onGone(): void;
  children: ReactNode;
}) {
  const pill = useRef<HTMLDivElement>(null);
  const currentOnGone = useRef(onGone);
  currentOnGone.current = onGone;

  useEffect(() => {
    if (!leaving) return;
    let current = true;
    void settled(pill.current).then(() => current && currentOnGone.current());
    return () => {
      current = false;
    };
  }, [leaving]);

  return (
    <div
      ref={pill}
      role="status"
      aria-label={label}
      data-state={leaving ? "out" : "in"}
      className={`motion-indicator flex h-[22px] max-w-60 items-center gap-[5px] rounded-full pr-[9px] text-[11px] font-semibold whitespace-nowrap tabular-nums shadow-[0_3px_10px_rgba(0,0,0,.35),inset_0_0_0_1px_rgba(0,0,0,.18)] ${badge ? "pl-[3px]" : "pl-[9px]"}`}
      style={{ background: colours.fill, color: colours.text }}
    >
      {badge && <Badge name={badge} />}
      {children}
    </div>
  );
}

function ChallengeBadge({ challenge, colours }: { challenge: Challenge; colours: UnlockColours }) {
  return (
    <div
      role="status"
      aria-label={`Challenge: ${challenge.title}`}
      className="grid size-6 place-items-center rounded-full"
      style={{ background: colours.fill, boxShadow: `inset 0 0 0 2px ${colours.ring}, 0 3px 10px rgba(0,0,0,.35)` }}
    >
      <Badge name={challenge.badge} />
    </div>
  );
}
