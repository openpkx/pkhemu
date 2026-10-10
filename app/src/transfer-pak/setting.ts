import { useCallback, useEffect, useState } from "react";
import { gameName, type Game } from "@/library/scan";

export type TransferPak = { game: string | null };

export type TransferPakHost = {
  /** Null for a game that doesn't use the Transfer Pak. */
  transferPak(folder: string, path: string): Promise<TransferPak | null>;
  chooseTransferPak(folder: string, path: string, game: string | null): Promise<void>;
};

export type Cart = { path: string | null; name: string };

export const noCart: Cart = { path: null, name: "None" };

export function carts(games: Game[], chosen: string | null | undefined): Cart[] {
  const inLibrary = games.filter((game) => (game.system === "gb" || game.system === "gbc") && !game.cloudOnly);
  const found = inLibrary.map((game) => ({ path: game.path, name: game.name }));
  const missing = chosen && !found.some((cart) => cart.path === chosen) ? [{ path: chosen, name: gameName(chosen) }] : [];
  return [noCart, ...found, ...missing];
}

export const cartName = (path: string | null) => (path ? gameName(path) : noCart.name);

export function useTransferPak(host: TransferPakHost, folder: string, path: string) {
  const [setting, setSetting] = useState<{ path: string; pak: TransferPak | null }>();

  useEffect(() => {
    let current = true;
    host.transferPak(folder, path).then(
      (pak) => current && setSetting({ path, pak }),
      () => current && setSetting({ path, pak: null }),
    );
    return () => {
      current = false;
    };
  }, [host, folder, path]);

  const choose = useCallback(
    async (game: string | null) => {
      await host.chooseTransferPak(folder, path, game);
      setSetting({ path, pak: { game } });
    },
    [host, folder, path],
  );

  // Undefined while loading.
  return { pak: setting?.path === path ? setting.pak : undefined, choose };
}
