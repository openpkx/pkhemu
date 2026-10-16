import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { RetroAchievementsProvider, type AchievementEvent, type RetroAchievementsHost } from "./retroAchievements";

export function fakeRetroAchievements({
  account = "Player" as string | null,
  badges = {} as Record<string, Uint8Array>,
} = {}) {
  const listeners = new Set<(event: AchievementEvent) => void>();
  const host = {
    turn: async () => {},
    account: async () => account,
    signIn: async (user: string) => user,
    signOut: async () => {},
    createAccount: async () => {},
    openProfile: async () => {},
    onEvent: (listener: (event: AchievementEvent) => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    badge: async (name: string) => badges[name],
    playing: async () => null,
    game: async () => null,
    summary: async () => null,
    hardcore: async () => false,
    setHardcore: async () => {},
    leaveHardcore: async () => {},
    edited: async () => false,
    settleEdited: async () => false,
  } satisfies RetroAchievementsHost;
  const send = (...events: AchievementEvent[]) =>
    act(async () => events.forEach((event) => listeners.forEach((listener) => listener(event))));
  return { host, send };
}

function Providers({ host, children }: { host: RetroAchievementsHost; children: ReactNode }) {
  return <RetroAchievementsProvider host={host}>{children}</RetroAchievementsProvider>;
}

/** Renders what shows over a game, signed in, and lets a test send rcheevos' events and pause the game. */
export async function overGame(
  overlay: (paused: boolean) => ReactNode,
  { paused = false, badges = {} as Record<string, Uint8Array> } = {},
) {
  const { host, send } = fakeRetroAchievements({ badges });
  const view = render(<Providers host={host}>{overlay(paused)}</Providers>);
  await act(async () => {});
  const pause = (paused: boolean) => act(async () => view.rerender(<Providers host={host}>{overlay(paused)}</Providers>));
  return { send, pause };
}
