import { useState, type ReactNode } from "react";
import { vi } from "vitest";
import { GameArtFor, GameArtProvider, type GameArtHost, type GameArtProgress, type GameArtStatus, type Lender } from "./gameArt";

export function fakeGameArt({
  games = {},
  art = {},
  statuses = {},
  lenders = [],
}: {
  games?: Record<string, string>;
  art?: Record<string, Record<string, Uint8Array>>;
  statuses?: Record<string, GameArtStatus>;
  lenders?: Lender[];
} = {}) {
  const listeners = new Set<(sha1: string) => void>();
  const progressListeners = new Set<(progress: GameArtProgress | null) => void>();
  let progress: GameArtProgress | null = null;
  const host = {
    sha1: async (path: string) => games[path] ?? null,
    keys: async (sha1: string) => Object.keys(art[sha1] ?? {}),
    image: async (sha1: string, key: string) => {
      const bytes = art[sha1]?.[key];
      if (!bytes) throw new Error(`${key}: no such file`);
      return bytes;
    },
    onChanged: (listener: (sha1: string) => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    lenders: async () => lenders,
    status: vi.fn(async (path: string) => statuses[path] ?? null),
    reextract: vi.fn(async (_folder: string, path: string) => void delete statuses[path]),
    reextractAll: vi.fn(async () => {}),
    progress: vi.fn(async () => progress),
    onProgress: (listener: (progress: GameArtProgress | null) => void) => {
      progressListeners.add(listener);
      return () => void progressListeners.delete(listener);
    },
  } satisfies GameArtHost;
  const change = (sha1: string) => listeners.forEach((listener) => listener(sha1));
  const report = (next: GameArtProgress | null) => {
    progress = next;
    progressListeners.forEach((listener) => listener(next));
  };
  return { host, games, art, change, report };
}

export function FakeGameArt({
  art,
  path = "game",
  children,
}: {
  art?: ReturnType<typeof fakeGameArt>;
  path?: string;
  children: ReactNode;
}) {
  const [host] = useState(() => (art ?? fakeGameArt()).host);
  return (
    <GameArtProvider host={host}>
      <GameArtFor path={path}>{children}</GameArtFor>
    </GameArtProvider>
  );
}

export const gameWithArt = (keys: Record<string, Uint8Array>) =>
  fakeGameArt({ games: { game: "f".repeat(40) }, art: { ["f".repeat(40)]: keys } });
