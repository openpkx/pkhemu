import { createContext, useContext, useEffect, type ReactNode } from "react";
import { usePreferences } from "@/preferences/preferences";

export type AudioSessionHost = { silentSwitch: boolean; playInSilentMode(on: boolean): Promise<void> };

export const noAudioSessionHost: AudioSessionHost = { silentSwitch: false, playInSilentMode: async () => {} };

const AudioSessionContext = createContext<AudioSessionHost>(noAudioSessionHost);

export function AudioSessionProvider({ host, children }: { host: AudioSessionHost; children: ReactNode }) {
  const { playInSilentMode } = usePreferences().preferences;

  useEffect(() => {
    host.playInSilentMode(playInSilentMode).catch((reason) => console.error("setting the audio session:", reason));
  }, [host, playInSilentMode]);

  return <AudioSessionContext.Provider value={host}>{children}</AudioSessionContext.Provider>;
}

export function useAudioSession(): AudioSessionHost {
  return useContext(AudioSessionContext);
}
