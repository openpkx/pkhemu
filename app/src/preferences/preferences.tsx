import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { inRange } from "@/lib/utils";
import { isSkinChoice, type SkinChoice } from "@/skins";
import { systems, type System } from "@/systems";

export const fastForwardSpeeds = [2, 4] as const;

export type FastForwardSpeed = (typeof fastForwardSpeeds)[number];

export function isFastForwardSpeed(value: unknown): value is FastForwardSpeed {
  return fastForwardSpeeds.includes(value as FastForwardSpeed);
}

export const stickSensitivities = [0.75, 1, 1.5] as const;

export type StickSensitivity = (typeof stickSensitivities)[number];

export function isStickSensitivity(value: unknown): value is StickSensitivity {
  return stickSensitivities.includes(value as StickSensitivity);
}

export const themes = ["system", "light", "dark"] as const;

export type Theme = (typeof themes)[number];

export function isTheme(value: unknown): value is Theme {
  return themes.includes(value as Theme);
}

export const rendererChoices = ["automatic", "native", "compatible"] as const;

export type RendererChoice = (typeof rendererChoices)[number];

export function isRendererChoice(value: unknown): value is RendererChoice {
  return rendererChoices.includes(value as RendererChoice);
}

export type GameClockOffset = { days: number; hours: number };

export const maxClockDays = 365;
export const maxClockHours = 23;

export function isGameClockOffset(value: unknown): value is GameClockOffset {
  if (typeof value !== "object" || value === null) return false;
  const { days, hours } = value as Record<string, unknown>;
  return inRange(days, 0, maxClockDays) && inRange(hours, 0, maxClockHours);
}

export const minRestoreBackupsKept = 1;
export const maxRestoreBackupsKept = 50;

export function isRestoreBackupsKept(value: unknown): value is number {
  return inRange(value, minRestoreBackupsKept, maxRestoreBackupsKept);
}

export function isVersionCode(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

export function offsetSeconds({ days, hours }: GameClockOffset) {
  return (days * 24 + hours) * 60 * 60;
}

export type Preferences = {
  touchControls: boolean;
  fastForwardSpeed: FastForwardSpeed;
  stickSensitivity: StickSensitivity;
  showFps: boolean;
  theme: Theme;
  eventsNoticeDismissed: boolean;
  updateDismissedVersion: number;
  gameClockOffset: GameClockOffset;
  restoreBackupsKept: number;
  playInSilentMode: boolean;
  renderer: RendererChoice;
  skins: Record<System, SkinChoice>;
  skinHintSeen: boolean;
  screenDepth: boolean;
  screenGlass: boolean;
  asyncShaders: boolean;
};

export type PreferencesHost = {
  load(): Promise<Partial<Preferences>>;
  save(preferences: Preferences): Promise<void>;
  // A host that syncs skins saves each system's choice on its own, so saving never writes over a choice synced from
  // another device or one this build doesn't know.
  chooseSkin?(system: System, choice: SkinChoice): Promise<void>;
  onSkinsChanged?(listener: (won: Partial<Record<System, unknown>>) => void): () => void;
};

export type PreferencesState = {
  preferences: Preferences;
  error?: string;
  change(update: Partial<Preferences>): Promise<void>;
  chooseSkin(system: System, choice: SkinChoice): Promise<void>;
};

function skinsWithDefaults(stored: unknown, defaults: Record<System, SkinChoice>) {
  return Object.fromEntries(
    systems.map((system) => {
      const choice = (stored as Partial<Record<System, unknown>> | undefined)?.[system];
      return [system, isSkinChoice(system, choice) ? { skin: choice.skin, look: choice.look } : defaults[system]];
    }),
  ) as Record<System, SkinChoice>;
}

const sameChoice = (a: SkinChoice, b: SkinChoice) => a.skin === b.skin && a.look === b.look;

function withDefaults(stored: Partial<Preferences>, defaults: Preferences): Preferences {
  return {
    touchControls: typeof stored.touchControls === "boolean" ? stored.touchControls : defaults.touchControls,
    fastForwardSpeed: isFastForwardSpeed(stored.fastForwardSpeed) ? stored.fastForwardSpeed : defaults.fastForwardSpeed,
    stickSensitivity: isStickSensitivity(stored.stickSensitivity) ? stored.stickSensitivity : defaults.stickSensitivity,
    showFps: typeof stored.showFps === "boolean" ? stored.showFps : defaults.showFps,
    theme: isTheme(stored.theme) ? stored.theme : defaults.theme,
    eventsNoticeDismissed:
      typeof stored.eventsNoticeDismissed === "boolean" ? stored.eventsNoticeDismissed : defaults.eventsNoticeDismissed,
    updateDismissedVersion: isVersionCode(stored.updateDismissedVersion)
      ? stored.updateDismissedVersion
      : defaults.updateDismissedVersion,
    gameClockOffset: isGameClockOffset(stored.gameClockOffset) ? stored.gameClockOffset : defaults.gameClockOffset,
    restoreBackupsKept: isRestoreBackupsKept(stored.restoreBackupsKept) ? stored.restoreBackupsKept : defaults.restoreBackupsKept,
    playInSilentMode: typeof stored.playInSilentMode === "boolean" ? stored.playInSilentMode : defaults.playInSilentMode,
    renderer: isRendererChoice(stored.renderer) ? stored.renderer : defaults.renderer,
    skins: skinsWithDefaults(stored.skins, defaults.skins),
    skinHintSeen: typeof stored.skinHintSeen === "boolean" ? stored.skinHintSeen : defaults.skinHintSeen,
    screenDepth: typeof stored.screenDepth === "boolean" ? stored.screenDepth : defaults.screenDepth,
    screenGlass: typeof stored.screenGlass === "boolean" ? stored.screenGlass : defaults.screenGlass,
    asyncShaders: typeof stored.asyncShaders === "boolean" ? stored.asyncShaders : defaults.asyncShaders,
  };
}

const PreferencesContext = createContext<PreferencesState | null>(null);

export function PreferencesProvider({
  host,
  defaults,
  children,
}: {
  host: PreferencesHost;
  defaults: Preferences;
  children: ReactNode;
}) {
  const [preferences, setPreferences] = useState<Preferences>();
  const [error, setError] = useState<string>();
  const latest = useRef<Preferences>(undefined);
  const wonWhileLoading = useRef<Partial<Record<System, unknown>>>({});

  useEffect(() => {
    let current = true;
    const loaded = (preferences: Preferences) => {
      const skins = skinsWithDefaults({ ...preferences.skins, ...wonWhileLoading.current }, defaults.skins);
      if (current) setPreferences((latest.current = { ...preferences, skins }));
    };
    host.load().then(
      (stored) => loaded(withDefaults(stored, defaults)),
      () => loaded(defaults),
    );
    return () => {
      current = false;
    };
  }, [host, defaults]);

  useEffect(
    () =>
      host.onSkinsChanged?.((won) => {
        if (!latest.current) {
          Object.assign(wonWhileLoading.current, won);
          return;
        }
        latest.current = { ...latest.current, skins: skinsWithDefaults({ ...latest.current.skins, ...won }, defaults.skins) };
        setPreferences(latest.current);
      }),
    [host, defaults],
  );

  const change = useCallback(
    async (update: Partial<Preferences>) => {
      const previous = latest.current!;
      const next = { ...previous, ...update };
      latest.current = next;
      setPreferences(next);
      try {
        await host.save(next);
        for (const system of systems) {
          if (!sameChoice(next.skins[system], previous.skins[system])) await host.chooseSkin?.(system, next.skins[system]);
        }
        setError(undefined);
      } catch (reason) {
        setError(String(reason));
      }
    },
    [host],
  );

  const chooseSkin = useCallback(
    async (system: System, choice: SkinChoice) => {
      const next = { ...latest.current!, skins: { ...latest.current!.skins, [system]: choice } };
      latest.current = next;
      setPreferences(next);
      try {
        await (host.chooseSkin ? host.chooseSkin(system, choice) : host.save(next));
        setError(undefined);
      } catch (reason) {
        setError(String(reason));
      }
    },
    [host],
  );

  if (!preferences) return null;

  return (
    <PreferencesContext.Provider value={{ preferences, error, change, chooseSkin }}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences needs a PreferencesProvider");
  return value;
}
