import { useEffect, useState } from "react";
import { useEngine } from "@pkhex-everywhere/react";
import { gameTitle } from "@/game-page/details";
import { summaryOf, type SaveSummaryHost } from "@/game-page/saveSummary";
import type { Game } from "@/library/scan";
import { storedFormatId } from "@/preferences/gameSettings";

export type Partner = { game: Game; name: string };

export type RomNameHost = { romGameName(folder: string, path: string): Promise<string | null> };

const noPartners: Partner[] = [];

// Summaries load other saves into the engine, so they pause while a transfer holds it.
export function useTransferPartners(
  host: SaveSummaryHost & RomNameHost,
  folder: string,
  game: Game,
  ready: boolean,
  games: Game[],
  reload: number,
  paused: boolean,
) {
  const engine = useEngine();
  const [partners, setPartners] = useState(noPartners);

  useEffect(() => {
    if (paused || !ready) return;
    let current = true;
    const readable = async (other: Game): Promise<Partner | undefined> => {
      const file = await host.readSave(folder, other.path);
      if (!file) return;
      const [romName, formatId] = await Promise.all([host.romGameName(folder, other.path), storedFormatId(host, other.path)]);
      const summary = await summaryOf(engine, host, file.sha256, async () => new Uint8Array(file.bytes), () => current, formatId);
      if (!summary) return;
      return { game: other, name: romName ?? summary.version ?? gameTitle(other.name) };
    };
    Promise.all(games.filter((other) => other.path !== game.path).map((other) => readable(other).catch(() => undefined))).then(
      (found) => current && setPartners(found.filter((partner) => partner !== undefined)),
    );
    return () => {
      current = false;
    };
  }, [engine, host, folder, game.path, ready, games, reload, paused]);

  return ready ? partners : noPartners;
}
