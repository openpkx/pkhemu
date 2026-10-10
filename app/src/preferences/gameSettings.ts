import { useCallback, useEffect, useRef, useState } from "react";

export type PatchedFrom = { build: string; patch: string; sha256: string };

export type GameSettings = {
  pokemonInfo: boolean;
  randomized: boolean;
  formatId?: string;
  formatChosen?: boolean;
  patchedFrom?: PatchedFrom;
};

export type GameSettingsHost = {
  load(path: string): Promise<Partial<GameSettings>>;
  save(path: string, settings: GameSettings): Promise<void>;
};

export type SaveFormat = { id: string; chosen: boolean };

export type SaveFormatHost = {
  saveFormat(path: string): Promise<SaveFormat | null>;
  keepSaveFormat(path: string, format: SaveFormat | null): Promise<void>;
};

export const storedFormatId = async (host: Pick<SaveFormatHost, "saveFormat">, path: string) =>
  (await host.saveFormat(path).catch(() => null))?.id;

export type PatchOriginHost = {
  patchedFrom(path: string): Promise<PatchedFrom | null>;
  keepPatchedFrom(path: string, from: PatchedFrom): Promise<void>;
};

const defaults: GameSettings = { pokemonInfo: false, randomized: false };

function withDefaults(stored: Partial<GameSettings>): GameSettings {
  const settings = { ...defaults };
  for (const key of ["pokemonInfo", "randomized"] as const) if (typeof stored[key] === "boolean") settings[key] = stored[key];
  if (typeof stored.formatId === "string") {
    settings.formatId = stored.formatId;
    settings.formatChosen = stored.formatChosen === true;
  }
  const from = stored.patchedFrom;
  if (from && [from.build, from.patch, from.sha256].every((value) => typeof value === "string")) settings.patchedFrom = from;
  return settings;
}

export function saveFormats(host: GameSettingsHost): SaveFormatHost {
  return {
    saveFormat: async (path) => {
      const { formatId, formatChosen } = withDefaults(await host.load(path));
      return formatId === undefined ? null : { id: formatId, chosen: !!formatChosen };
    },
    keepSaveFormat: async (path, format) => {
      const { formatId: _, formatChosen: __, ...settings } = withDefaults(await host.load(path));
      await host.save(path, format ? { ...settings, formatId: format.id, formatChosen: format.chosen } : settings);
    },
  };
}

export function patchOrigins(host: GameSettingsHost): PatchOriginHost {
  return {
    patchedFrom: async (path) => withDefaults(await host.load(path)).patchedFrom ?? null,
    keepPatchedFrom: async (path, patchedFrom) => host.save(path, { ...withDefaults(await host.load(path)), patchedFrom }),
  };
}

export function useGameSettings(host: GameSettingsHost, path: string) {
  const [settings, setSettings] = useState<GameSettings>();
  const latest = useRef<GameSettings>(undefined);

  useEffect(() => {
    let current = true;
    host.load(path).then(
      (stored) => current && setSettings((latest.current = withDefaults(stored))),
      () => current && setSettings((latest.current = defaults)),
    );
    return () => {
      current = false;
    };
  }, [host, path]);

  const change = useCallback(
    async (update: Partial<GameSettings>) => {
      const next = { ...(latest.current ?? defaults), ...update };
      latest.current = next;
      setSettings(next);
      await host.save(path, next).catch((error) => console.error(error));
    },
    [host, path],
  );

  return { settings, change };
}
