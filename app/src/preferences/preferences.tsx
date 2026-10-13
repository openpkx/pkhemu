import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { inRange } from "@/lib/utils";

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
};

export type PreferencesHost = {
  load(): Promise<Partial<Preferences>>;
  save(preferences: Preferences): Promise<void>;
};

export type PreferencesState = {
  preferences: Preferences;
  error?: string;
  change(update: Partial<Preferences>): Promise<void>;
};

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

  useEffect(() => {
    let current = true;
    host.load().then(
      (stored) => current && setPreferences((latest.current = withDefaults(stored, defaults))),
      () => current && setPreferences((latest.current = defaults)),
    );
    return () => {
      current = false;
    };
  }, [host, defaults]);

  const change = useCallback(
    async (update: Partial<Preferences>) => {
      const next = { ...latest.current!, ...update };
      latest.current = next;
      setPreferences(next);
      try {
        await host.save(next);
        setError(undefined);
      } catch (reason) {
        setError(String(reason));
      }
    },
    [host],
  );

  if (!preferences) return null;

  return (
    <PreferencesContext.Provider value={{ preferences, error, change }}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences needs a PreferencesProvider");
  return value;
}
