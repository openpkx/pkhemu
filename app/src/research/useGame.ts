import { useEffect, useState } from "react";
import type { ResearchContext, ResearchHost } from "./host";
import { knownLayouts, pickLayout, type PickedLayout } from "./layout";

export type Game = { context: ResearchContext; picked?: PickedLayout };

export function useGame(host: ResearchHost) {
  const [game, setGame] = useState<Game | null>();

  useEffect(() => {
    let live = true;
    Promise.all([host.context(), knownLayouts()]).then(
      ([context, layouts]) => {
        const picked = context.format.id ? pickLayout(layouts, { format: context.format.id, romSha1: context.romSha1 ?? "" }) : undefined;
        if (live) setGame({ context, picked });
      },
      () => live && setGame(null),
    );
    return () => {
      live = false;
    };
  }, [host]);

  return game;
}
