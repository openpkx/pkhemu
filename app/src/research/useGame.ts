import { useEffect, useState } from "react";
import type { ResearchContext, ResearchHost } from "./host";
import { pickLayout, type PickedLayout } from "./layout";

export type Game = { context: ResearchContext; picked?: PickedLayout };

export function useGame(host: ResearchHost) {
  const [game, setGame] = useState<Game | null>();

  useEffect(() => {
    let live = true;
    host
      .context()
      .then(async (context) => ({ context, picked: await host.saveFile().then(({ bytes }) => pickLayout(bytes, context), () => undefined) }))
      .then(
        (game) => live && setGame(game),
        () => live && setGame(null),
      );
    return () => {
      live = false;
    };
  }, [host]);

  return game;
}
