import { useId, useState, type ReactNode } from "react";
import { FolderOpen, RefreshCw, Scale } from "lucide-react";
import { useAppUpdate } from "@/app-update/appUpdate";
import { useAudioSession } from "@/audio-session/audioSession";
import { ExternalLink } from "@/components/ExternalLink";
import { ScreenHeader } from "@/components/ScreenHeader";
import { NumberInput } from "@/components/NumberInput";
import { TitledCard } from "@/components/TitledCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ControllersSettings } from "./controllers/ControllersSettings";
import { useGameArt, useGameArtProgress } from "./game-art/gameArt";
import { useRenderer, type Renderer } from "./game-surface/gameSurface";
import { GameClockSetting, useMinute } from "./game-clock/GameClockSetting";
import { ago } from "./game-page/details";
import { useGamesFolder } from "./games-folder/gamesFolder";
import { useOpenFolder } from "./games-folder/useOpenFolder";
import { LabSettings } from "./lab/LabSettings";
import {
  fastForwardSpeeds,
  isFastForwardSpeed,
  isRendererChoice,
  isStickSensitivity,
  isTheme,
  maxRestoreBackupsKept,
  minRestoreBackupsKept,
  rendererChoices,
  stickSensitivities,
  themes,
  usePreferences,
} from "./preferences/preferences";
import { usePlus, type PlusStatus } from "./plus/plus";
import { Status } from "./Status";
import { runGames, runProgress } from "./sync/gameStatus";
import { useSync, type Cloud, type MobileData } from "./sync/sync";
import type { System } from "./systems";

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

function SyncRunProgress() {
  const { run, gameSync } = useSync();
  const { line, percent } = runProgress(run);
  const games = runGames(gameSync, run);
  return (
    <>
      <div className="grid gap-1.5">
        <p className="text-muted-foreground">{line}</p>
        {percent !== undefined && <Progress aria-label="Sync progress" value={percent} />}
      </div>
      {games.length > 0 && (
        <ul aria-label="Games syncing" className="grid min-w-0 gap-1">
          {games.map(({ path, name, stage }) => (
            <li key={path} className="flex min-w-0 items-center justify-between gap-3">
              <span className="min-w-0 flex-1 truncate">{name}</span>
              <span className="min-w-0 max-w-[60%] text-right text-muted-foreground [overflow-wrap:anywhere]">{stage}</span>
            </li>
          ))}
        </ul>
      )}
    </>
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
      {status.state === "notOwned" && (
        <Button className="justify-self-start" disabled={busy !== undefined} onClick={() => void run(buy, "buying")}>
          {busy === "buying" && <Spinner />}
          Get Plus · {status.price}
        </Button>
      )}
      <Button
        variant="outline"
        className="justify-self-start"
        disabled={busy !== undefined}
        onClick={() => void run(plus.restore, "restoring")}
      >
        {busy === "restoring" && <Spinner />}
        Restore purchases
      </Button>
    </>
  );
}

function SyncSettings() {
  const sync = useSync();
  const plusStatus = usePlus().status;
  const now = useMinute();
  const gamesId = useId();
  const mobileDataId = useId();
  const romsId = useId();
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

  const { mobileData } = sync.syncGames;
  const setMobileData = (next: MobileData) =>
    void sync.setMobileData(next).catch((reason) => setError(String(reason)));
  const lastSynced =
    sync.lastSynced === undefined ? "Not synced yet" : `Last synced ${ago(Math.max(0, now - sync.lastSynced) / 1000)}`;
  return (
    <SettingsCard title="Sync">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 break-all">{sync.account}</span>
        <Button variant="outline" disabled={busy !== undefined} onClick={() => void run(sync.signOut, "signing out")}>
          {busy === "signing out" && <Spinner />}
          Sign out
        </Button>
      </div>
      {sync.syncing ? <SyncRunProgress /> : <p className="text-muted-foreground">{lastSynced}</p>}
      {(error ?? sync.error) && <p className="text-destructive">{error ?? sync.error}</p>}
      <Button variant="outline" className="justify-self-start" disabled={busy !== undefined || sync.syncing} onClick={sync.syncNow}>
        <RefreshCw />
        Sync now
      </Button>
      <div className="grid gap-1">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={gamesId}>Sync games</label>
          <Switch id={gamesId} checked={sync.syncGames.on} onCheckedChange={(on) => void sync.setSyncGames(on).catch((reason) => setError(String(reason)))} />
        </div>
        <p className="text-muted-foreground">
          {sync.syncGames.on
            ? "Your ROMs upload too, so your other devices can download them."
            : "Your ROMs stay on this device. Games already in your cloud still show and download when you open them."}
        </p>
      </div>
      {mobileData && (
        <div className="grid gap-1">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={mobileDataId}>Sync on mobile data</label>
            <Switch id={mobileDataId} checked={mobileData.on} onCheckedChange={(on) => setMobileData({ ...mobileData, on })} />
          </div>
          <p className="text-muted-foreground">{mobileData.on ? "Saves and states sync on mobile data too." : "Nothing syncs until you're on Wi-Fi."}</p>
        </div>
      )}
      {mobileData && sync.syncGames.on && (
        <div className="grid gap-1">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={romsId}>Include ROMs</label>
            <Switch
              id={romsId}
              checked={mobileData.roms}
              disabled={!mobileData.on}
              onCheckedChange={(roms) => setMobileData({ ...mobileData, roms })}
            />
          </div>
          <p className="text-muted-foreground">{mobileData.on && mobileData.roms ? "ROMs upload on mobile data too." : "ROMs wait for Wi-Fi."}</p>
        </div>
      )}
    </SettingsCard>
  );
}

const stickSensitivityLabels = { 0.75: "Low", 1: "Medium", 1.5: "High" };
const stickSensitivityLines = {
  0.75: "The N64 touch stick tilts all the way after a long slide.",
  1: "The N64 touch stick tilts all the way after a medium slide.",
  1.5: "The N64 touch stick tilts all the way after a short slide.",
};

const rendererNames: Record<Renderer, string> = { native: "Native (OpenGL ES)", compatible: "Compatible (WebGL)" };

function PlayingSettings({ system }: { system?: System }) {
  const { preferences, error, change } = usePreferences();
  const { silentSwitch } = useAudioSession();
  const { renderers, automatic } = useRenderer();
  const rendererLabels = { automatic: `Automatic: ${rendererNames[automatic]}`, ...rendererNames };
  const touchId = useId();
  const silentId = useId();
  const speedId = useId();
  const stickId = useId();
  const fpsId = useId();
  const rendererId = useId();

  return (
    <SettingsCard title="Playing">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={touchId}>Touch controls</label>
        <Switch
          id={touchId}
          checked={preferences.touchControls}
          onCheckedChange={(touchControls) => void change({ touchControls })}
        />
      </div>
      {silentSwitch && (
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={silentId}>Play sound in silent mode</label>
          <Switch
            id={silentId}
            checked={preferences.playInSilentMode}
            onCheckedChange={(playInSilentMode) => void change({ playInSilentMode })}
          />
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span id={speedId}>Fast-forward speed</span>
        <ToggleGroup
          type="single"
          variant="outline"
          aria-labelledby={speedId}
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
      </div>
      <div className="grid gap-1">
        <div className="flex items-center justify-between gap-3">
          <span id={stickId}>Stick sensitivity</span>
          <ToggleGroup
            type="single"
            variant="outline"
            aria-labelledby={stickId}
            value={String(preferences.stickSensitivity)}
            onValueChange={(value) => {
              const stickSensitivity = Number(value);
              if (isStickSensitivity(stickSensitivity)) void change({ stickSensitivity });
            }}
          >
            {stickSensitivities.map((sensitivity) => (
              <ToggleGroupItem key={sensitivity} value={String(sensitivity)}>
                {stickSensitivityLabels[sensitivity]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <p className="text-muted-foreground">{stickSensitivityLines[preferences.stickSensitivity]}</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={fpsId}>Show FPS</label>
        <Switch id={fpsId} checked={preferences.showFps} onCheckedChange={(showFps) => void change({ showFps })} />
      </div>
      {renderers.length > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span id={rendererId}>Renderer</span>
          <Select
            value={preferences.renderer}
            onValueChange={(renderer) => {
              if (isRendererChoice(renderer)) void change({ renderer });
            }}
          >
            <SelectTrigger aria-labelledby={rendererId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rendererChoices.map((choice) => (
                <SelectItem key={choice} value={choice}>
                  {rendererLabels[choice]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {system !== "n64" && <GameClockSetting />}
      {error && <p className="text-destructive">{error}</p>}
    </SettingsCard>
  );
}

const themeLabels = { system: "System", light: "Light", dark: "Dark" };

function AppearanceSettings() {
  const { preferences, error, change } = usePreferences();
  const themeId = useId();

  return (
    <SettingsCard title="Appearance">
      <div className="flex items-center justify-between gap-3">
        <span id={themeId}>Theme</span>
        <ToggleGroup
          type="single"
          variant="outline"
          aria-labelledby={themeId}
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
      <div className="flex items-center justify-between gap-3">
        <span>Backups before a restore</span>
        <NumberInput
          label="Backups before a restore"
          unit="kept"
          value={preferences.restoreBackupsKept}
          min={minRestoreBackupsKept}
          max={maxRestoreBackupsKept}
          onChange={(restoreBackupsKept) => void change({ restoreBackupsKept })}
        />
      </div>
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
        The emulator, the editor and every Pokémon feature are free.{mentionsPlus && " Plus adds sync and the Lab."}
      </p>
      <p>
        Built on <ExternalLink href="https://github.com/sponsors/kwsch">PKHeX</ExternalLink>,{" "}
        <ExternalLink href="https://melonds.kuribo64.net/donate.php">melonDS</ExternalLink> and{" "}
        <ExternalLink href="https://mgba.io/donate.html">mGBA</ExternalLink>.
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

export function SettingsScreen({ system, onBack, onLicences }: { system?: System; onBack(): void; onLicences(): void }) {
  return (
    <div className="min-h-screen pb-safe">
      <ScreenHeader title="Settings" onBack={onBack} />
      <main className="grid justify-items-center gap-4 p-4">
        <GamesFolderSettings />
        <SyncSettings />
        <PlayingSettings system={system} />
        <ControllersSettings />
        <AppearanceSettings />
        <BackupsSettings />
        <GameArtSettings />
        <LabSettings />
        <AboutSettings onLicences={onLicences} />
        <Status />
      </main>
    </div>
  );
}
