import { useEffect, useId, useState, type FormEvent } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import { useBack } from "@/back/back";
import { ScreenHeader } from "@/components/ScreenHeader";
import { sectionHeading } from "@/components/sectionHeading";
import { TitledCard } from "@/components/TitledCard";
import { WithSkeleton } from "@/components/WithSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { AchievementRow } from "./AchievementRow";
import { AchievementSheet, useAchievementSheet } from "./AchievementSheet";
import { Badge } from "./Badge";
import { useRetroAchievements, type Achievement, type Summary } from "./retroAchievements";
import { countText, earnedLine, profilePoints } from "./tally";

function useSummary() {
  const { account, summary } = useRetroAchievements();
  const [fetched, setFetched] = useState<Summary | null>(null);

  useEffect(() => {
    let current = true;
    summary().then(
      (summary) => current && setFetched(summary),
      (reason) => console.error("RetroAchievements:", reason),
    );
    return () => {
      current = false;
    };
  }, [summary, account]);

  return account && fetched?.user === account ? fetched : null;
}

export function RetroAchievementsSettings({ onOpen }: { onOpen(): void }) {
  const { account } = useRetroAchievements();
  const profile = useSummary()?.profile;

  return (
    <TitledCard title="RetroAchievements" className="max-w-sm">
      <Button
        variant="ghost"
        className="-mx-3 h-auto min-h-11 justify-between gap-3 rounded-lg px-3 py-1.5 text-left font-normal pointer-coarse:text-base"
        onClick={onOpen}
      >
        <span className="flex min-w-0 items-center gap-3">
          {account && <Badge name={profile?.avatar} className="size-8" />}
          <span className="grid min-w-0">
            <span className="truncate">{account ?? "Sign in to earn achievements"}</span>
            {account && profile && (
              <span className="truncate text-sm text-muted-foreground tabular-nums">{profilePoints(profile)}</span>
            )}
          </span>
        </span>
        <ChevronRight className="text-muted-foreground" />
      </Button>
    </TitledCard>
  );
}

function SignIn() {
  const { signIn, createAccount } = useRetroAchievements();
  const userId = useId();
  const passwordId = useId();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await signIn(user.trim(), password);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
      <div className="grid gap-2">
        <Label htmlFor={userId}>Username</Label>
        <Input
          id={userId}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          value={user}
          disabled={busy}
          onChange={(event) => setUser(event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={passwordId}>Password</Label>
        <Input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          value={password}
          disabled={busy}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {error && <p className="text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || !user.trim() || !password}>
          {busy && <Spinner />}
          Sign in
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void createAccount()}>
          Create an account
        </Button>
      </div>
      <p className="text-muted-foreground">pkhemu doesn't store your password.</p>
    </form>
  );
}

/** `points` is undefined while loading, and null when it has never been fetched. */
function Points({ label, points }: { label: string; points: number | null | undefined }) {
  return (
    <div className="grid gap-0.5 rounded-lg border px-3 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">
        <WithSkeleton loading={points === undefined} skeleton={<Skeleton className="my-1 h-5 w-16" />}>
          {points === null ? "–" : points !== undefined && countText(points)}
        </WithSkeleton>
      </dd>
    </div>
  );
}

function RecentUnlocks({ summary, onOpen }: { summary: Summary | null; onOpen(achievement: Achievement): void }) {
  const headingId = useId();
  const now = new Date();
  return (
    <section aria-labelledby={headingId} className="grid gap-1">
      <h2 id={headingId} className={sectionHeading}>
        Recent unlocks
      </h2>
      {!summary ? (
        <Skeleton className="h-16 w-full rounded-lg" />
      ) : summary.recent.length === 0 ? (
        <p className="text-sm text-muted-foreground">No unlocks in pkhemu yet.</p>
      ) : (
        <ul className="-mx-3 grid gap-1">
          {summary.recent.map(({ game, achievement }) => (
            <li key={achievement.id}>
              <AchievementRow
                achievement={achievement}
                line={achievement.earned ? `${game} · ${earnedLine(achievement.earned, now)}` : game}
                onOpen={() => onOpen(achievement)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HardcoreSwitch() {
  const { hardcore, setHardcore, playingHardcore } = useRetroAchievements();
  const id = useId();
  const [error, setError] = useState<string>();

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id}>Hardcore</label>
        <Switch
          id={id}
          checked={hardcore}
          onCheckedChange={(on) => {
            setError(undefined);
            setHardcore(on).catch((reason) => setError(String(reason)));
          }}
        />
      </div>
      <p className="text-muted-foreground">
        {hardcore
          ? "Locks in-game editing, cheats and loading states, so unlocks count for mastery."
          : "Softcore. Editing, cheats and states all work while you play."}
      </p>
      {hardcore && !playingHardcore && <p className="text-sm text-muted-foreground">Applies from the next launch.</p>}
      {error && <p className="text-destructive">{error}</p>}
    </div>
  );
}

function SignedIn({ account, onOpen }: { account: string; onOpen(achievement: Achievement): void }) {
  const { signOut, openProfile } = useRetroAchievements();
  const summary = useSummary();
  const profile = summary?.profile;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const leave = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await signOut();
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3.5">
        <Badge name={profile?.avatar} className="size-16" />
        <p className="min-w-0 text-lg font-semibold break-all">{account}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <Points label="Hardcore points" points={summary ? (profile?.hardcore ?? null) : undefined} />
        <Points label="Softcore points" points={summary ? (profile?.softcore ?? null) : undefined} />
      </dl>
      {summary?.offline && <p className="text-sm text-muted-foreground">Offline. This is the last summary pkhemu fetched.</p>}
      <RecentUnlocks summary={summary} onOpen={onOpen} />
      <Button variant="outline" className="justify-self-start" onClick={() => void openProfile()}>
        <ExternalLink />
        View profile on RetroAchievements
      </Button>
      <HardcoreSwitch />
      <Separator />
      {error && <p className="text-destructive">{error}</p>}
      <Button variant="outline" className="justify-self-start" disabled={busy} onClick={() => void leave()}>
        {busy && <Spinner />}
        Sign out
      </Button>
    </div>
  );
}

export function RetroAchievementsScreen({ onBack }: { onBack(): void }) {
  const { account } = useRetroAchievements();
  const { open, shown, pick, close } = useAchievementSheet();
  const back = () => (open ? close() : onBack());
  useBack(back);

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-background px-safe pb-safe">
      <ScreenHeader title="RetroAchievements" onBack={back} />
      <main className="grid justify-items-center p-4">
        <div className="w-full max-w-sm">{account ? <SignedIn account={account} onOpen={pick} /> : <SignIn />}</div>
      </main>
      {shown && <AchievementSheet achievement={shown} open={!!open} onClose={close} />}
    </div>
  );
}
