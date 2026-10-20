import { useState, type ReactNode } from "react";
import { ChevronRight, FolderOpen, RefreshCw, Scale } from "lucide-react";
import { useAppUpdate } from "@/app-update/appUpdate";
import { useAudioSession } from "@/audio-session/audioSession";
import { ScreenHeader } from "@/components/ScreenHeader";
import { NumberInput } from "@/components/NumberInput";
import { SettingRow, SwitchRow } from "@/components/SettingsRow";
import { TitledCard } from "@/components/TitledCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CoffeeCard } from "./coffee/coffee";
import { sideloadBuild } from "./coffee/sideloadBuild";
import { tauriCoffeeHost } from "./coffee/tauriHost";
import { ControlsSettings } from "./controllers/ControlsSettings";
import { useGameArt, useGameArtProgress } from "./game-art/gameArt";
import { useRenderer, type Renderer } from "./game-surface/gameSurface";
import { GameClockSetting, useMinute } from "./game-clock/GameClockSetting";
import { useGamesFolder } from "./games-folder/gamesFolder";
import { useCanTilt } from "./gravity/gravity";
import { useOpenFolder } from "./games-folder/useOpenFolder";
import { JitSettings } from "./jit/JitSettings";
import { LabSettings } from "./lab/LabSettings";
import { navigate, Screen } from "./motion/motion";
import {
  fastForwardSpeeds,
  gameCubeResolutions,
  isFastForwardSpeed,
  isGameCubeResolution,
  isRendererChoice,
  isTheme,
  maxRestoreBackupsKept,
  minRestoreBackupsKept,
  rendererChoices,
  themes,
  usePreferences,
} from "./preferences/preferences";
import { usePlus, type PlusStatus } from "./plus/plus";
import { useRetroAchievements } from "./retro-achievements/retroAchievements";
import { RetroAchievementsScreen, RetroAchievementsSettings } from "./retro-achievements/RetroAchievementsSettings";
import { useAsyncShadersOffered } from "./shaders/shaders";
import { SkinsScreen } from "./skin-picker/SkinsScreen";
import { tauriPreviewFrameHost } from "./skin-picker/tauriHost";
import { syncStatus } from "./sync/gameStatus";
import { useSync, type Cloud } from "./sync/sync";
import { useOpenSyncDetails } from "./sync/SyncDetailsSheet";
import { systems as allSystems, type System } from "./systems";

const CLOUD_NAMES: Record<Cloud, string> = { google: "Google Drive", dropbox: "Dropbox" };

function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <TitledCard title={title} className="max-w-sm">
      {children}
    </TitledCard>
  );
}

function GamesFolderSettings() {
  const gamesFolder = useGamesFolder();

  return (
    <SettingsCard title="Games folder">
      {gamesFolder.status === "ready" && <p className="break-all text-muted-foreground">{gamesFolder.label}</p>}
      {gamesFolder.error && <p className="text-destructive">{gamesFolder.error}</p>}
      {gamesFolder.choose && (
        <Button variant="outline" className="justify-self-start" onClick={gamesFolder.choose}>
          {gamesFolder.status === "ready" ? "Change folder" : "Choose folder"}
        </Button>
      )}
    </SettingsCard>
  );
}

function GetPlus({ status }: { status: Extract<PlusStatus, { state: "notOwned" | "unavailable" }> }) {
  const plus = usePlus();
  const [busy, setBusy] = useState<"buying" | "restoring">();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const run = async (action: () => Promise<void>, doing: "buying" | "restoring") => {
    setBusy(doing);
    setError(undefined);
    try {
      await action();
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(undefined);
    }
  };
  const buy = async () => {
    setPending(false);
    setPending((await plus.buy()) === "pending");
  };

  return (
    <>
      {status.state === "unavailable" && <p>Plus can't be bought on this device</p>}
      {pending && <p className="text-muted-foreground">Waiting for the payment to finish</p>}
      {error && <p className="text-destructive">{error}</p>}
      {(status.state === "notOwned" || plus.offersRestore) && (
        <div className="flex flex-wrap gap-2">
          {status.state === "notOwned" && (
            <Button disabled={busy !== undefined} onClick={() => void run(buy, "buying")}>
              {busy === "buying" && <Spinner />}
              Get Plus · {status.price}
            </Button>
          )}
          {plus.offersRestore && (
            <Button variant="outline" disabled={busy !== undefined} onClick={() => void run(plus.restore, "restoring")}>
              {busy === "restoring" && <Spinner />}
              Restore purchases
            </Button>
          )}
        </div>
      )}
    </>
  );
}

function SyncSettings() {
  const sync = useSync();
  const plusStatus = usePlus().status;
  const now = useMinute();
  const openDetails = useOpenSyncDetails();
  const [busy, setBusy] = useState<Cloud | "signing out">();
  const [error, setError] = useState<string>();
  if (!sync.available) return null;

  const run = async (action: () => Promise<void>, doing: Cloud | "signing out") => {
    setBusy(doing);
    setError(undefined);
    try {
      await action();
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(undefined);
    }
  };

  const clouds = sync.clouds.map((cloud) => CLOUD_NAMES[cloud]).join(" or ");
  if (!sync.account)
    return (
      <SettingsCard title="Sync">
        <p className="text-muted-foreground">Syncs your saves, states and backups through your own {clouds}.</p>
        {plusStatus?.state === "notOwned" || plusStatus?.state === "unavailable" ? (
          <GetPlus status={plusStatus} />
        ) : (
          plusStatus && (
            <>
              {error && <p className="text-destructive">{error}</p>}
              <div className="flex flex-wrap gap-2">
                {sync.clouds.map((cloud) => (
                  <Button
                    key={cloud}
                    variant="outline"
                    disabled={busy !== undefined}
                    onClick={() => void run(() => sync.connect(cloud), cloud)}
                  >
                    {busy === cloud && <Spinner />}
                    Connect {CLOUD_NAMES[cloud]}
                  </Button>
                ))}
              </div>
            </>
          )
        )}
      </SettingsCard>
    );

  const status = syncStatus(sync.syncing, sync.run, sync.lastSynced, now).line;
  return (
    <SettingsCard title="Sync">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 break-all">{sync.account}</span>
        <Button variant="outline" disabled={busy !== undefined} onClick={() => void run(sync.signOut, "signing out")}>
          {busy === "signing out" && <Spinner />}
          Sign out
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          className="-ml-3 h-11 min-w-0 flex-1 justify-between rounded-lg px-3 font-normal text-muted-foreground pointer-coarse:text-base"
          onClick={openDetails}
        >
          <span className="truncate">{status}</span>
          <ChevronRight />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-2 pointer-coarse:size-11"
          aria-label="Sync now"
          disabled={busy !== undefined || sync.syncing}
          onClick={sync.syncNow}
        >
          <RefreshCw />
        </Button>
      </div>
      {(error ?? sync.error) && <p className="text-destructive">{error ?? sync.error}</p>}
      {sync.mobileData !== undefined && (
        <div className="grid gap-1">
          <SwitchRow
            label="Sync on mobile data"
            checked={sync.mobileData}
            onCheckedChange={(on) => void sync.setMobileData(on).catch((reason) => setError(String(reason)))}
          />
          <p className="text-muted-foreground">
            {sync.mobileData ? "Saves and states sync on mobile data too. ROMs wait for Wi-Fi." : "Nothing syncs until you're on Wi-Fi."}
          </p>
        </div>
      )}
    </SettingsCard>
  );
}

const rendererNames: Record<Renderer, string> = { native: "Native (OpenGL ES)", compatible: "Compatible (WebGL)" };

const gameCubeResolutionLabels = { 1: "Native", 2: "2×", 3: "3×" };

function PlayingSettings({ system, systems }: { system?: System; systems: readonly System[] }) {
  const { preferences, error, change } = usePreferences();
  const { silentSwitch } = useAudioSession();
  const { renderers, automatic } = useRenderer();
  const shaders = useAsyncShadersOffered();
  const rendererLabels = { automatic: `Automatic: ${rendererNames[automatic]}`, ...rendererNames };

  return (
    <SettingsCard title="Playing">
      {silentSwitch && (
        <SwitchRow
          label="Play sound in silent mode"
          checked={preferences.playInSilentMode}
          onCheckedChange={(playInSilentMode) => void change({ playInSilentMode })}
        />
      )}
      <SettingRow label="Fast-forward speed">
        {(labelId) => (
          <ToggleGroup
            type="single"
            variant="outline"
            aria-labelledby={labelId}
            value={String(preferences.fastForwardSpeed)}
            onValueChange={(value) => {
              const fastForwardSpeed = Number(value);
              if (isFastForwardSpeed(fastForwardSpeed)) void change({ fastForwardSpeed });
            }}
          >
            {fastForwardSpeeds.map((speed) => (
              <ToggleGroupItem key={speed} value={String(speed)}>
                {speed}×
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </SettingRow>
      <SwitchRow label="Show FPS" checked={preferences.showFps} onCheckedChange={(showFps) => void change({ showFps })} />
      {renderers.length > 1 && (
        <SettingRow label="Renderer">
          {(labelId) => (
            <Select
              value={preferences.renderer}
              onValueChange={(renderer) => {
                if (isRendererChoice(renderer)) void change({ renderer });
              }}
            >
              <SelectTrigger aria-labelledby={labelId} className="min-w-0 max-w-full">
                <SelectValue>
                  <span className="min-w-0 truncate">{rendererLabels[preferences.renderer]}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {rendererChoices.map((choice) => (
                  <SelectItem key={choice} value={choice}>
                    {rendererLabels[choice]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </SettingRow>
      )}
      {shaders.offered && (
        <div className="grid gap-1">
          <SwitchRow
            label="Fewer freezes in 3D games"
            checked={preferences.asyncShaders}
            onCheckedChange={(asyncShaders) => void change({ asyncShaders })}
          />
          <p className="text-muted-foreground">
            {preferences.asyncShaders
              ? shaders.onLine
              : "Some 3D games can freeze for a moment the first time they show something new."}
          </p>
          <p className="text-xs text-muted-foreground">Applies the next time a game starts.</p>
        </div>
      )}
      {systems.includes("gc") && (
        <div className="grid gap-1">
          <SettingRow label="GameCube resolution">
            {(labelId) => (
              <ToggleGroup
                type="single"
                variant="outline"
                aria-labelledby={labelId}
                value={String(preferences.gameCubeResolution)}
                onValueChange={(value) => {
                  const gameCubeResolution = Number(value);
                  if (isGameCubeResolution(gameCubeResolution)) void change({ gameCubeResolution });
                }}
              >
                {gameCubeResolutions.map((resolution) => (
                  <ToggleGroupItem key={resolution} value={String(resolution)}>
                    {gameCubeResolutionLabels[resolution]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          </SettingRow>
          <p className="text-xs text-muted-foreground">Applies the next time a game starts.</p>
        </div>
      )}
      {system !== "n64" && <GameClockSetting />}
      {error && <p className="text-destructive">{error}</p>}
    </SettingsCard>
  );
}

const themeLabels = { system: "System", light: "Light", dark: "Dark" };

function AppearanceSettings({ onSkins }: { onSkins(): void }) {
  const { preferences, error, change } = usePreferences();
  const canTilt = useCanTilt();

  return (
    <SettingsCard title="Appearance">
      <SettingRow label="Theme">
        {(labelId) => (
          <ToggleGroup
            type="single"
            variant="outline"
            aria-labelledby={labelId}
            value={preferences.theme}
            onValueChange={(theme) => {
              if (isTheme(theme)) void change({ theme });
            }}
          >
            {themes.map((theme) => (
              <ToggleGroupItem key={theme} value={theme}>
                {themeLabels[theme]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </SettingRow>
      {preferences.touchControls && (
        <Button
          variant="ghost"
          className="-mx-3 h-11 justify-between rounded-lg px-3 font-normal pointer-coarse:text-base"
          onClick={onSkins}
        >
          Skins
          <ChevronRight className="text-muted-foreground" />
        </Button>
      )}
      {canTilt && (
        <div className="grid gap-1">
          <SwitchRow label="Screen depth" checked={preferences.screenDepth} onCheckedChange={(screenDepth) => void change({ screenDepth })} />
          <p className="text-muted-foreground">
            In portrait, the game screen sits below the shell. Tilt the phone and the edge of the opening passes over it.
          </p>
        </div>
      )}
      <div className="grid gap-1">
        <SwitchRow label="Screen glass" checked={preferences.screenGlass} onCheckedChange={(screenGlass) => void change({ screenGlass })} />
        <p className="text-muted-foreground">
          In portrait, glass covers the game screen, with a lit top edge and a sheen that moves as you tilt the phone.
        </p>
      </div>
      {error && <p className="text-destructive">{error}</p>}
    </SettingsCard>
  );
}

function BackupsSettings() {
  const gamesFolder = useGamesFolder();
  const openFolder = gamesFolder.status === "ready" ? gamesFolder.openFolder : undefined;
  const { open, error } = useOpenFolder(openFolder);
  const { preferences, error: preferencesError, change } = usePreferences();
  if (gamesFolder.status !== "ready") return null;

  return (
    <SettingsCard title="Backups">
      <p className="text-muted-foreground">Each game keeps its backups in a folder beside its ROM:</p>
      <p className="font-mono text-xs break-all">{gamesFolder.label}/…/&lt;game&gt;/backups</p>
      <SettingRow label="Backups before a restore">
        {() => (
          <NumberInput
            label="Backups before a restore"
            unit="kept"
            value={preferences.restoreBackupsKept}
            min={minRestoreBackupsKept}
            max={maxRestoreBackupsKept}
            onChange={(restoreBackupsKept) => void change({ restoreBackupsKept })}
          />
        )}
      </SettingRow>
      {error && <p className="text-destructive">{error}</p>}
      {preferencesError && <p className="text-destructive">{preferencesError}</p>}
      {openFolder && (
        <Button variant="outline" className="justify-self-start" onClick={() => void open()}>
          <FolderOpen />
          Open games folder
        </Button>
      )}
    </SettingsCard>
  );
}

function GameArtSettings() {
  const gameArt = useGameArt();
  const [progress, refresh] = useGameArtProgress();
  const [error, setError] = useState<string>();

  const reextract = async () => {
    setError(undefined);
    try {
      await gameArt.reextractAll();
      await refresh();
    } catch (reason) {
      setError(String(reason));
    }
  };

  return (
    <SettingsCard title="Game art">
      <p className="text-muted-foreground">Sprites and icons come from each game's ROM.</p>
      {progress && (
        <div className="grid gap-1.5">
          <p className="text-muted-foreground">
            Extracting · {progress.done} of {progress.total} games
          </p>
          <Progress aria-label="Extracting game art" value={(progress.done / progress.total) * 100} />
        </div>
      )}
      {error && <p className="text-destructive">{error}</p>}
      <Button variant="outline" className="justify-self-start" onClick={() => void reextract()}>
        <RefreshCw />
        Re-extract game art
      </Button>
    </SettingsCard>
  );
}

function AboutSettings({ onLicences }: { onLicences(): void }) {
  const plusStatus = usePlus().status;
  const sync = useSync();
  const mentionsPlus = sync.available && plusStatus !== undefined && plusStatus.state !== "unlocked";
  const update = useAppUpdate();

  return (
    <SettingsCard title="About">
      <p className="text-muted-foreground">
        The emulator, the editor and every Pokémon feature are free.{mentionsPlus && " Plus adds sync, the Lab and more skins."}
      </p>
      <Button variant="outline" className="justify-self-start" onClick={onLicences}>
        <Scale />
        View licences
      </Button>
      {update.state !== "none" && (
        <div className="flex items-center justify-between gap-3">
          <span>{update.state === "available" ? "New version available" : "Update downloaded"}</span>
          <Button variant="outline" onClick={update.state === "available" ? update.start : update.complete}>
            {update.state === "available" ? "Update" : "Restart"}
          </Button>
        </div>
      )}
    </SettingsCard>
  );
}

export function SettingsScreen({
  system,
  systems = allSystems,
  onBack,
  onLicences,
}: {
  system?: System;
  /** The platform's systems, for Skins and the GameCube resolution. */
  systems?: readonly System[];
  onBack(): void;
  onLicences(): void;
}) {
  const [skins, setSkins] = useState(false);
  const [retroAchievements, setRetroAchievements] = useState(false);
  const { account } = useRetroAchievements();
  const retroAchievementsCards = (
    <>
      <RetroAchievementsSettings onOpen={() => navigate("forward", () => setRetroAchievements(true))} />
      {sideloadBuild && <CoffeeCard host={tauriCoffeeHost} />}
    </>
  );

  return (
    <div className="min-h-screen pb-safe">
      <ScreenHeader title="Settings" onBack={onBack} />
      <main className="grid justify-items-center gap-4 p-4">
        {account && retroAchievementsCards}
        <GamesFolderSettings />
        <SyncSettings />
        {!account && retroAchievementsCards}
        <PlayingSettings system={system} systems={systems} />
        {sideloadBuild && <JitSettings />}
        <ControlsSettings />
        <AppearanceSettings onSkins={() => navigate("forward", () => setSkins(true))} />
        <BackupsSettings />
        <GameArtSettings />
        <LabSettings />
        <AboutSettings onLicences={onLicences} />
      </main>
      {skins && (
        <Screen>
          <SkinsScreen systems={systems} host={tauriPreviewFrameHost} onBack={() => navigate("back", () => setSkins(false))} />
        </Screen>
      )}
      {retroAchievements && (
        <Screen>
          <RetroAchievementsScreen onBack={() => navigate("back", () => setRetroAchievements(false))} />
        </Screen>
      )}
    </div>
  );
}
