import type { Backup } from "@/backups/backups";
import type { Details } from "./GamePage";
import type { SaveCardState } from "./saveSummary";

export type LastKnown = { details?: Details; card?: SaveCardState; backups?: Backup[] };

const known = new WeakMap<object, Map<string, LastKnown>>();

export function lastKnown(host: object, path: string): LastKnown {
  return known.get(host)?.get(path) ?? {};
}

export function remember(host: object, path: string, data: LastKnown) {
  let games = known.get(host);
  if (!games) known.set(host, (games = new Map()));
  games.set(path, { ...games.get(path), ...data });
}
