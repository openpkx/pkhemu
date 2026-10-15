import { useState, type ReactNode } from "react";
import { BoxArtSheet } from "@/box-art/BoxArtSheet";
import { WithAction } from "@/components/Toast";
import type { Game } from "@/library/scan";
import { usePatchRom } from "./patchRom";

export const buildName = (build: string) => build.replace(/(?: (?:EN|JP|FR|DE|IT|ES|KO))?(?: (?:1\.\d+|rev \d+))?$/, "");

export function useHackBoxArt(setToast: (toast: ReactNode) => void) {
  const host = usePatchRom();
  const [adding, setAdding] = useState<{ game: Game; base?: string; open: boolean; opens: number }>();
  const add = async (game: Game) => {
    const from = await host.patchedFrom(game.path).catch(() => null);
    setAdding((was) => ({ game, base: (from && buildName(from.build)) || undefined, open: true, opens: (was?.opens ?? 0) + 1 }));
  };
  const close = () => setAdding((was) => was && { ...was, open: false });

  const withAddBoxArt = (message: ReactNode, game: Game) => (
    <WithAction
      action="Add box art"
      onAction={() => {
        setToast(undefined);
        void add(game);
      }}
    >
      {message}
    </WithAction>
  );

  const sheet = adding && (
    <BoxArtSheet
      key={adding.opens}
      open={adding.open}
      game={adding.game}
      base={adding.base}
      onClose={close}
      onChanged={() => {
        close();
        setToast("Box art changed");
      }}
    />
  );

  return { withAddBoxArt, sheet };
}
