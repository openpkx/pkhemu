import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useEngine } from "@pkhex-everywhere/react";
import { ArrowLeftRight, Menu } from "lucide-react";
import { cn } from "cn";
import { useBackGesture, useGoBack } from "@/back/back";
import { CheatsScreen } from "@/cheats/CheatsScreen";
import { tauriCheatsHost } from "@/cheats/tauriHost";
import { PadSetupPrompt } from "@/controllers/PadSetupPrompt";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CoreMessageToast } from "@/core-message/CoreMessage";
import { tauriCoreMessages } from "@/core-message/tauriHost";
import { Toast, useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { EditorScreen } from "@/editor/EditorScreen";
import { useNextSave } from "@/editor/saveFirst";
import { saveHome } from "@/editor/saveHome";
import { tauriSaveHost } from "@/editor/tauriHost";
import { UndoToast, useUndo } from "@/editor/undo";
import { useFastForward } from "@/fast-forward/fastForward";
import type { Rates } from "@/fps-counter/fpsCounter";
import { useRenderer } from "@/game-surface/gameSurface";
import { tauriReadMemory } from "@/game-memory/tauriHost";
import { useCalibrations } from "@/input/calibrations";
import { connectedGamepads, createInput } from "@/input/input";
import { useExperiments } from "@/lab/lab";
import type { Game } from "@/library/scan";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useWideScreen } from "@/lib/useWideScreen";
import { LicencesScreen } from "@/licences/LicencesScreen";
import { useMemoryNotice } from "@/memory-notice/memoryNotice";
import { tauriMemoryNoticeHost } from "@/memory-notice/tauriHost";
import { navigate, Screen } from "@/motion/motion";
import { Cover } from "@/pause-menu/Cover";
import { useOverlay, type Overlay } from "@/pause-menu/overlay";
import { PauseMenu } from "@/pause-menu/PauseMenu";
import { tauriPauseRequests } from "@/pause-menu/tauriHost";
import { saveFormats, storedFormatId, useGameSettings } from "@/preferences/gameSettings";
import { tauriGameSettingsHost } from "@/preferences/gameSettingsTauriHost";
import { offsetSeconds, usePreferences } from "@/preferences/preferences";
import { OpponentPill } from "@/pokemon-info/OpponentPill";
import { PokemonInfoPanel } from "@/pokemon-info/PokemonInfoPanel";
import { useGameMemory } from "@/game-memory/useGameMemory";
import { loadSlot, StatesScreen, undoLoad, useStates, type StateMessage } from "@/save-states/StatesScreen";
import { AchievementIndicators } from "@/retro-achievements/AchievementIndicators";
import { AchievementSheet } from "@/retro-achievements/AchievementSheet";
import { AchievementsScreen } from "@/retro-achievements/AchievementsScreen";
import { useHardcoreLaunch, useHardcoreLock } from "@/retro-achievements/hardcore";
import { useRetroAchievements, type Unlock } from "@/retro-achievements/retroAchievements";
import { tallyText } from "@/retro-achievements/tally";
import { UnlockNotifications } from "@/retro-achievements/UnlockNotifications";
import { usePlayingAchievements } from "@/retro-achievements/useAchievements";
import { StateToast } from "@/save-states/StateToast";
import { tauriStatesHost } from "@/save-states/tauriHost";
import { savedTrainer } from "@/game-page/saveSummary";
import { tauriGamePageHost } from "@/game-page/tauriHost";
import { ConflictSheet } from "@/sync/ConflictSheet";
import { usePlus } from "@/plus/plus";
import { lookVariables } from "@/skin-look/skinLook";
import { pausedFrame } from "@/skin-picker/previewFrame";
import { SkinPicker } from "@/skin-picker/SkinPicker";
import { tauriPreviewFrameHost } from "@/skin-picker/tauriHost";
import { SkinPlastic } from "@/skin-plastic/SkinPlastic";
import { chosenSkin, skinLine, wallColour } from "@/skins";
import { useSync, type Conflict } from "@/sync/sync";
import { tauriTransferPakHost } from "@/transfer-pak/tauriHost";
import { TransferPakScreen } from "@/transfer-pak/TransferPak";
import { cartName, useTransferPak } from "@/transfer-pak/setting";
import { clearOfTouchControls, TouchControls, useTouchControlsShown } from "@/touch-controls/TouchControls";
import { Player } from "./Player";
import { usePortraitLayout } from "./portraitLayout";
import { SettingsScreen } from "./SettingsScreen";
import { useBarsTone, useHiddenSystemBars } from "./system-bars/systemBars";
import { closeToSquare, dualScreens, type Rect } from "./screens";
import type { Frame } from "./screen";
import { handheld, type System } from "./systems";

const TOAST_MS = 3000;
const UNSUPPORTED_DEVICE = "unsupported-device";
const NATIVE_FAILED = "Native renderer failed, so the game uses Compatible";
const noGames: Game[] = [];
const skinInk = { light: "text-[#1c1b22]", dark: "text-white" };

export function GameScreen({
  folder,
  game,
  games = noGames,
  systems,
  resume,
  slot,
  cover,
  dismissedPads,
  onQuit,
  onUnsupported,
}: {
  folder: string;
  game: Game;
  /** The library, for the Transfer Pak. */
  games?: Game[];
  /** The platform's systems, for Settings › Skins. */
  systems?: readonly System[];
  resume: boolean;
  slot?: number;
  cover?: string;
  dismissedPads: Set<string>;
  onQuit(): void;
  onUnsupported(): void;
}) {
  const calibrations = useCalibrations();
  const [input] = useState(() => {
    const input = createInput(connectedGamepads, calibrations.current, game.system);
    // The A that started the game from its page would otherwise reach the game.
    input.ignoreHeld();
    return input;
  });
  useHiddenSystemBars();
  const [error, setError] = useState<string>();
  const onBackGesture = useBackGesture();
  const goBack = useGoBack();
  const { overlay, show } = useOverlay(input, onBackGesture);
  const fastForward = useFastForward(!overlay);
  const [awaitingSave, setAwaitingSave] = useState(false);
  const screens = dualScreens[game.system];
  const dual = !!screens;
  const [swapped, setSwapped] = useState(false);
  const swapScreens = () => setSwapped((swapped) => !swapped);
  const [stacked, setStacked] = useState(false);
  const touchControls = useTouchControlsShown(input);
  useNextSave(tauriSaveHost, awaitingSave, () => show("editor"));
  const undo = useUndo(tauriSaveHost);
  const editorHost = useMemo(
    () => ({ ...undo.host, formatId: () => storedFormatId(saveFormats(tauriGameSettingsHost), game.path) }),
    [undo.host, game.path],
  );
  const states = useStates(tauriStatesHost, folder, game.path, overlay === "menu");
  const [toast, setToast] = useState<StateMessage>();
  const { showFps, gameClockOffset, gameCubeResolution, skins, touchControls: touchControlsOn } = usePreferences().preferences;
  const display = handheld[game.system];
  const portrait = usePortraitLayout(game.system);
  const square = useMediaQuery(closeToSquare);
  const skinChoice = skins[game.system];
  const plus = usePlus().status?.state;
  const skin = chosenSkin(game.system, skinChoice, plus);
  const skinned = !!display && portrait;
  const header = portrait || !touchControls || !!error;
  const [windows, setWindows] = useState<Rect[]>();
  const skinVariables = useMemo(
    () =>
      skinned
        ? ({ ...lookVariables(skin, skinChoice.look), "--skin-screen-radius": `${display.radiusDp}px` } as CSSProperties)
        : undefined,
    [skinned, skin, skinChoice.look, display],
  );
  useBarsTone(skinned ? skin.tone === "light" : undefined);
  const [rates, setRates] = useState<Rates>();
  const { lab } = useExperiments();
  const [settingUpPad, setSettingUpPad] = useState(false);
  const [running, setRunning] = useState(false);
  const memory = useGameMemory(game.system, running, tauriReadMemory);
  const gameSettings = useGameSettings(tauriGameSettingsHost, game.path);
  const readable = memory && memory !== "unsupported" ? memory : undefined;
  const settings = readable ? gameSettings.settings : undefined;
  const pokemonInfoOn = settings?.pokemonInfo;
  const infoMemory = pokemonInfoOn ? readable : undefined;
  const randomized = !!settings?.randomized;
  const wide = useWideScreen();
  const playing = running && !overlay;
  const { beforeOpen, conflictHost } = useSync();
  const [checking, setChecking] = useState(true);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [resolved, setResolved] = useState(false);
  const [syncNotice, setSyncNotice] = useToast();
  const renderer = useRenderer();
  const [rendererNotice, setRendererNotice] = useToast();
  const transferPak = useTransferPak(tauriTransferPakHost, folder, game.path);
  const [run, setRun] = useState({ key: 0, resume });
  const [pausedShot, setPausedShot] = useState<Frame>();
  const [screenWidth, setScreenWidth] = useState<number>();
  const achievements = usePlayingAchievements(running, overlay);
  const [tapped, setTapped] = useState<Unlock>();
  const tappedAchievement = tapped && achievements?.find((achievement) => achievement.id === tapped.id);
  const engine = useEngine();
  const { playingHardcore } = useRetroAchievements();
  const lock = useHardcoreLock(input);

  useEffect(() => {
    let current = true;
    void beforeOpen(folder, game.path).then(({ checked, conflicts }) => {
      if (!current) return;
      setConflicts(conflicts);
      setChecking(false);
      if (!checked) setSyncNotice("Couldn't check your other devices for changes");
    });
    return () => {
      current = false;
    };
  }, [beforeOpen, folder, game.path, setSyncNotice]);

  const conflicted = conflicts.length > 0 && !resolved;
  const memoryNotice = useMemoryNotice({
    host: tauriMemoryNoticeHost,
    system: game.system,
    ready: !checking && !conflicted,
    input,
    onQuit,
  });
  const { launch, dialog: launchDialog } = useHardcoreLaunch({
    folder,
    path: game.path,
    resume,
    slot,
    ready: !checking && !conflicted && memoryNotice.settled,
    readTrainer: () => savedTrainer(engine, tauriGamePageHost, folder, game.path),
    input,
    onQuit,
  });
  useEffect(() => {
    if (conflicted) return onBackGesture(onQuit);
  }, [conflicted, onBackGesture, onQuit]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(undefined), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => tauriPauseRequests(() => show((overlay) => overlay ?? "menu")), [show]);

  useEffect(() => {
    if (overlay === "editor") setAwaitingSave(false);
  }, [overlay]);

  useEffect(() => {
    if (!showFps || overlay) setRates(undefined);
  }, [showFps, overlay]);

  const onGameStarted = async () => {
    setRunning(true);
    if (launch?.slot !== undefined && run.key === 0) setToast(await loadSlot(tauriStatesHost, folder, game.path, launch.slot));
  };

  const undoLoadState = async () => {
    setToast(undefined);
    setToast(await undoLoad(tauriStatesHost, folder, game.path));
  };

  const forwardTo = (to: Overlay) => () => navigate("forward", () => show(to));
  const backTo = (to: Overlay) => () => navigate("back", () => show(to));

  const restart = async (cart: string | null) => {
    try {
      await transferPak.choose(cart);
    } catch (error) {
      console.error(error);
      return;
    }
    setRunning(false);
    setRun((run) => ({ key: run.key + 1, resume: false }));
    show(undefined);
  };

  const openSkinPicker = async () => {
    setPausedShot(await pausedFrame(tauriPreviewFrameHost).catch(() => undefined));
    navigate("forward", () => show((overlay) => (overlay === "menu" ? "skin" : overlay)));
  };

  const saveFirst = () => {
    setAwaitingSave(true);
    show(undefined);
  };

  return (
    <div
      className="relative isolate flex h-screen flex-col"
      data-skin={skinned || undefined}
      style={skinVariables}
    >
      {skinned && <SkinPlastic skin={skin} radius={display.radiusDp} windows={windows} />}
      <div className="contents" data-no-back-swipe>
        {header && (
          <ScreenHeader
            title={game.name}
            onBack={onQuit}
            className={cn(skinned && ["border-transparent bg-transparent backdrop-blur-none", skinInk[skin.tone]])}
          >
            {dual && (
              <Button variant="ghost" size="icon" aria-label="Swap screens" onClick={swapScreens}>
                <ArrowLeftRight className={cn(stacked && "rotate-90")} />
              </Button>
            )}
            <Button variant="ghost" size="icon" aria-label="Pause menu" onClick={() => show("menu")}>
              <Menu />
            </Button>
          </ScreenHeader>
        )}
        {error ? (
          <main className="p-4 text-sm text-destructive">{error}</main>
        ) : (
          <div className="flex min-h-0 flex-1" data-landscape={!portrait || undefined}>
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
              <Player
                key={run.key}
                folder={folder}
                path={game.path}
                resume={run.resume && (launch?.resume ?? true)}
                hardcore={playingHardcore}
                speed={fastForward.speed}
                input={input}
                paused={!!overlay || lock.asking}
                screens={screens}
                display={display}
                wall={skinned ? wallColour(skin, skinChoice.look) : undefined}
                swapped={swapped}
                clockOffset={offsetSeconds(gameClockOffset)}
                resolution={game.system === "gc" ? gameCubeResolution : undefined}
                renderer={renderer.renderer}
                onNativeFailed={() => renderer.reportNativeFailure() && setRendererNotice(NATIVE_FAILED)}
                onStacked={setStacked}
                onScreenWidth={setScreenWidth}
                onWindows={setWindows}
                onStarted={onGameStarted}
                onFps={showFps ? setRates : undefined}
                onError={(message) => (message === UNSUPPORTED_DEVICE ? onUnsupported() : setError(message))}
                cover={cover}
                holdMessage={conflicted ? "" : checking ? "Checking your other devices…" : launch ? undefined : ""}
                className={cn(
                  touchControls ? "landscape:pb-safe" : "pb-safe",
                  skinned && ["items-start px-6 pt-6", dual ? "pb-6" : "pb-14"],
                )}
                portrait={portrait}
                clearance={
                  touchControls && (dual || square)
                    ? clearOfTouchControls(stacked || square ? "both" : swapped ? "left" : "right")
                    : undefined
                }
                corner={<AchievementIndicators skin={skin} paused={!!overlay} />}
              >
                {skinned && !dual && (
                  <span
                    aria-hidden
                    className="absolute top-full left-0.5 mt-6 font-pixel text-[17px] font-semibold tracking-[0.04em] text-(--skin-wordmark)"
                  >
                    pkhemu
                  </span>
                )}
              </Player>
              <TouchControls input={input} system={game.system} fastForward={fastForward} />
              {rates && (
                <p className="pointer-events-none absolute top-3 left-3 rounded-full bg-overlay/70 px-2 py-0.5 text-xs text-white tabular-nums">
                  {rates.fps} FPS{lab === "all" && ` · ${rates.drawn} drawn`} · {rates.skipped} skipped · {rates.repeated} repeated
                </p>
              )}
              <div className="pointer-events-none absolute inset-x-0 top-3 flex flex-col items-center gap-2">
                <UnlockNotifications
                  skin={skin}
                  paused={!!overlay}
                  screenWidth={screenWidth}
                  onOpen={(shown) => {
                    if (shown.kind !== "unlock") return achievements && forwardTo("achievements")();
                    if (!achievements?.some((achievement) => achievement.id === shown.unlock.id)) return;
                    setTapped(shown.unlock);
                    show("achievement");
                  }}
                />
                <Toast inline>{awaitingSave && "Save in game to open the editor"}</Toast>
                <Toast inline>{syncNotice}</Toast>
                <Toast inline>{rendererNotice}</Toast>
                <UndoToast onUndo={lock.guard("undoEdit", () => void undo.undo())}>{undo.undoable && "Save edited"}</UndoToast>
                <StateToast toast={toast} onUndo={lock.guard("undoLoad", () => void undoLoadState())} />
                <CoreMessageToast messages={tauriCoreMessages} />
                {infoMemory && !wide && (
                  <OpponentPill
                    memory={infoMemory}
                    formatId={settings?.formatId}
                    active={playing}
                    randomized={randomized}
                    open={overlay === "pokemonInfo"}
                    input={input}
                    onOpen={() => show("pokemonInfo")}
                    onClose={() => show(undefined)}
                  />
                )}
              </div>
            </div>
            {infoMemory && wide && <PokemonInfoPanel memory={infoMemory} formatId={settings?.formatId} active={playing} randomized={randomized} />}
          </div>
        )}
      </div>
      {/* The pause menu's modal dialog would take clicks from the pad setup and close on them. */}
      <PauseMenu
        open={overlay === "menu" && !settingUpPad && !lock.asking}
        input={input}
        canEdit={!error}
        canUndo={undo.undoable && !error}
        canSaveState={!error}
        canLoadState={states.hasStates && !error}
        canUndoLoad={states.canUndoLoad && !error}
        fastForward={fastForward}
        onSwapScreens={
          dual
            ? () => {
                swapScreens();
                show(undefined);
              }
            : undefined
        }
        pokemonInfo={pokemonInfoOn}
        onTogglePokemonInfo={() => void gameSettings.change({ pokemonInfo: !pokemonInfoOn })}
        randomized={settings?.randomized}
        onToggleRandomized={() => void gameSettings.change({ randomized: !settings?.randomized })}
        transferPak={transferPak.pak ? cartName(transferPak.pak.game) : undefined}
        onTransferPak={forwardTo("transferPak")}
        onResume={() => show(undefined)}
        onEditSave={lock.guard("editSave", forwardTo("editor"))}
        onUndo={lock.guard("undoEdit", () => {
          void undo.undo();
          show(undefined);
        })}
        onSaveState={forwardTo("saveState")}
        onLoadState={lock.guard("loadState", forwardTo("loadState"))}
        onUndoLoad={lock.guard("undoLoad", () => {
          void undoLoadState();
          show(undefined);
        })}
        onCheats={lock.guard("cheats", forwardTo("cheats"))}
        achievements={achievements ? tallyText(achievements) : undefined}
        onAchievements={forwardTo("achievements")}
        skin={touchControlsOn ? skinLine(skin, skinChoice.look) : undefined}
        onSkin={() => void openSkinPicker()}
        onSettings={forwardTo("settings")}
        onQuit={onQuit}
      />
      {(overlay === "saveState" || overlay === "loadState") && (
        <Screen key={overlay}>
          <StatesScreen
            mode={overlay === "saveState" ? "save" : "load"}
            host={tauriStatesHost}
            folder={folder}
            path={game.path}
            input={input}
            onDone={(toast) => {
              setToast(toast);
              show(undefined);
            }}
            onBack={backTo("menu")}
          />
        </Screen>
      )}
      {overlay === "cheats" && (
        <Screen>
          <CheatsScreen host={tauriCheatsHost} folder={folder} path={game.path} system={game.system} input={input} onBack={backTo("menu")} />
        </Screen>
      )}
      {overlay === "achievements" && achievements && (
        <Screen>
          <AchievementsScreen achievements={achievements} input={input} onBack={backTo("menu")} onResume={() => show(undefined)} />
        </Screen>
      )}
      {tappedAchievement && (
        <AchievementSheet
          achievement={tappedAchievement}
          open={overlay === "achievement"}
          input={input}
          onAll={forwardTo("achievements")}
          onResume={() => show(undefined)}
          onClose={() => show(undefined)}
        />
      )}
      {overlay === "transferPak" && transferPak.pak && (
        <Screen>
          <TransferPakScreen
            games={games}
            chosen={transferPak.pak.game}
            input={input}
            onRestart={(cart) => void restart(cart)}
            onBack={backTo("menu")}
          />
        </Screen>
      )}
      {overlay === "editor" && (
        <Screen>
          <EditorScreen
            host={editorHost}
            home={saveHome}
            onBackGesture={onBackGesture}
            onClose={() => show(undefined)}
            onSaveFirst={saveFirst}
          />
        </Screen>
      )}
      {overlay === "skin" && (
        <Screen>
          <Cover input={input} onBack={backTo("menu")}>
            <SkinPicker system={game.system} frame={pausedShot} game={game.name} onClose={backTo("menu")} />
          </Cover>
        </Screen>
      )}
      {overlay === "settings" && (
        <Screen>
          <Cover input={input} onBack={goBack}>
            <SettingsScreen system={game.system} systems={systems} onBack={backTo("menu")} onLicences={forwardTo("licences")} />
          </Cover>
        </Screen>
      )}
      {overlay === "licences" && (
        <Screen>
          <Cover input={input} onBack={backTo("settings")}>
            <LicencesScreen onBack={backTo("settings")} />
          </Cover>
        </Screen>
      )}
      {conflicts.length > 0 && (
        <ConflictSheet
          open={!resolved}
          host={tauriGamePageHost}
          cloud={conflictHost}
          folder={folder}
          path={game.path}
          conflicts={conflicts}
          input={input}
          onResolved={() => setResolved(true)}
          onClose={onQuit}
        />
      )}
      {lock.dialog}
      {memoryNotice.dialog}
      {launchDialog}
      <PadSetupPrompt
        input={input}
        dismissed={dismissedPads}
        listening={!overlay || overlay === "menu"}
        onPrompt={() => show("menu")}
        onSettingUp={setSettingUpPad}
      />
    </div>
  );
}
