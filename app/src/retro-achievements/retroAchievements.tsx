import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SavedTrainer } from "@/game-page/saveSummary";

export type Unlock = { id: number; title: string; description: string; points: number; badge: string };

export type Completion = { game: string; points: number; badge: string; hardcore: boolean };

export type AchievementEvent =
  | ({ kind: "unlocked" } & Unlock)
  | ({ kind: "completed" } & Completion)
  | { kind: "progress"; id: number; title: string; badge: string; progress: string }
  | { kind: "challengeShown"; id: number; title: string; badge: string }
  | { kind: "challengeHidden"; id: number }
  | { kind: "leaderboardStarted"; id: number; title: string }
  | { kind: "leaderboardFailed"; id: number; title: string }
  | { kind: "leaderboardSubmitted"; id: number; title: string; score: string }
  | { kind: "tracker"; id: number; value: string }
  | { kind: "trackerHidden"; id: number };

type OnEvent = (listener: (event: AchievementEvent) => void) => () => void;

export type Earned = { at: number | null; hardcore: boolean };

export type Achievement = Unlock & { earned: Earned | null; progress: string | null; rarity: number };

/** `avatar` is a badge name. */
export type Profile = { avatar: string; hardcore: number; softcore: number };

export type Recent = { game: string; achievement: Achievement };

export type Summary = { user: string; profile: Profile | null; recent: Recent[]; offline: boolean };

export type RetroAchievementsHost = {
  turn(on: boolean): Promise<void>;
  account(): Promise<string | null>;
  signIn(user: string, password: string): Promise<string>;
  signOut(): Promise<void>;
  createAccount(): Promise<void>;
  openProfile(): Promise<void>;
  onEvent: OnEvent;
  badge(name: string): Promise<Uint8Array | undefined>;
  playing(): Promise<Achievement[] | null>;
  game(folder: string, path: string): Promise<Achievement[] | null>;
  summary(): Promise<Summary | null>;
  hardcore(): Promise<boolean>;
  setHardcore(on: boolean): Promise<void>;
  leaveHardcore(): Promise<void>;
  edited(folder: string, path: string): Promise<boolean>;
  settleEdited(folder: string, path: string, read: SavedTrainer): Promise<boolean>;
};

export type RetroAchievements = {
  account: string | null;
  signIn(user: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  createAccount(): Promise<void>;
  openProfile(): Promise<void>;
  onEvent: OnEvent;
  badge(name: string): Promise<Uint8Array | undefined>;
  /** The running game's achievements, or null while signed out or when it has no set. */
  playing(): Promise<Achievement[] | null>;
  /** A game's achievements, or null while signed out or when it has no set. */
  game(folder: string, path: string): Promise<Achievement[] | null>;
  /** The signed-in player's points and latest unlocks, or null while signed out. */
  summary(): Promise<Summary | null>;
  /** The Hardcore switch, which a game takes up when it launches. */
  hardcore: boolean;
  setHardcore(on: boolean): Promise<void>;
  /** Whether the running game is in hardcore. */
  playingHardcore: boolean;
  setPlayingHardcore(on: boolean): void;
  /** Drops the running game to softcore until it restarts. */
  leaveHardcore(): Promise<void>;
  /** Whether pkhemu changed the game's save, by an edit, a transfer or a cheat, since a new game started on it. */
  edited(folder: string, path: string): Promise<boolean>;
  /** Hands over the trainer the engine read from the save, and answers whether the save is still marked. */
  settleEdited(folder: string, path: string, read: SavedTrainer): Promise<boolean>;
};

const nothing = async () => {};
const noEvents: OnEvent = () => () => {};
const noList = async () => null;
const noSummary = async () => null;
const notEdited = async () => false;

const RetroAchievementsContext = createContext<RetroAchievements>({
  account: null,
  signIn: nothing,
  signOut: nothing,
  createAccount: nothing,
  openProfile: nothing,
  onEvent: noEvents,
  badge: async () => undefined,
  playing: noList,
  game: noList,
  summary: noSummary,
  hardcore: false,
  setHardcore: nothing,
  playingHardcore: false,
  setPlayingHardcore: () => {},
  leaveHardcore: nothing,
  edited: notEdited,
  settleEdited: notEdited,
});

export function RetroAchievementsProvider({ host, children }: { host: RetroAchievementsHost; children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [hardcore, setHardcoreState] = useState(false);
  const [playingHardcore, setPlayingHardcore] = useState(false);

  useEffect(() => {
    let current = true;
    host.hardcore().then(
      (hardcore) => current && setHardcoreState(hardcore),
      (reason) => console.error("RetroAchievements:", reason),
    );
    return () => {
      current = false;
    };
  }, [host]);

  useEffect(() => {
    let current = true;
    void host
      .turn(true)
      .then(() => host.account())
      .then((account) => current && setAccount(account))
      .catch((reason) => console.error("RetroAchievements:", reason));
    return () => {
      current = false;
    };
  }, [host]);

  const signIn = useCallback(
    async (user: string, password: string) => setAccount(await host.signIn(user, password)),
    [host],
  );
  const signOut = useCallback(async () => {
    await host.signOut();
    setAccount(null);
  }, [host]);

  const leaveHardcore = useCallback(async () => {
    setPlayingHardcore(false);
    await host.leaveHardcore();
  }, [host]);
  const setHardcore = useCallback(
    async (hardcore: boolean) => {
      setHardcoreState(hardcore);
      if (!hardcore && playingHardcore) await leaveHardcore();
      await host.setHardcore(hardcore);
    },
    [host, playingHardcore, leaveHardcore],
  );

  const signedIn = !!account;
  const state = useMemo(
    () => ({
      account,
      signIn,
      signOut,
      createAccount: host.createAccount,
      openProfile: host.openProfile,
      onEvent: host.onEvent,
      badge: host.badge,
      playing: signedIn ? host.playing : noList,
      game: signedIn ? host.game : noList,
      summary: signedIn ? host.summary : noSummary,
      hardcore: signedIn && hardcore,
      setHardcore,
      playingHardcore,
      setPlayingHardcore,
      leaveHardcore,
      edited: host.edited,
      settleEdited: host.settleEdited,
    }),
    [account, signedIn, signIn, signOut, host, hardcore, setHardcore, playingHardcore, leaveHardcore],
  );
  return <RetroAchievementsContext.Provider value={state}>{children}</RetroAchievementsContext.Provider>;
}

export function useRetroAchievements() {
  return useContext(RetroAchievementsContext);
}
