import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { ArchiveRestore, ArrowLeftRight, ChevronLeft, FolderOpen, History, Pencil, Play } from "lucide-react";
import type { FormatEntry } from "@pkhex-everywhere/engine";
import { cn } from "cn";
import { useBack, useBackGesture } from "@/back/back";
import {
  backupFile,
  BackupPage,
  BackupsScreen,
  DeleteBackupDialog,
  RestoreDialog,
  useBackups,
  useSummaries,
  type Backup,
  type BackupsHost,
} from "@/backups/backups";
import { useBoxArt } from "@/box-art/boxArt";
import { sectionHeading } from "@/components/sectionHeading";
import { SystemChip } from "@/components/SystemChip";
import { TopScreen } from "@/components/TopScreen";
import { Button } from "@/components/ui/button";
import { EditorScreen } from "@/editor/EditorScreen";
import { useMinute } from "@/game-clock/GameClockSetting";
import { noSaveYet, type SaveHost } from "@/editor/editSession";
import { ExportMenu, type ExportedFile } from "@/editor/exportFile";
import { saveHome } from "@/editor/saveHome";
import type { Game } from "@/library/scan";
import { storedFormatId } from "@/preferences/gameSettings";
import { pngDataUrl } from "@/lib/utils";
import { Crossfade, navigate, Screen, Shared } from "@/motion/motion";
import { usePreferences } from "@/preferences/preferences";
import { dualScreens } from "@/screens";
import { SlotGrid, type SavedState, type SlotsHost } from "@/save-states/StatesScreen";
import { gameSyncLine } from "@/sync/gameStatus";
import { useSync } from "@/sync/sync";
import { systemColors, systemNames } from "@/systems";
import { useTransferPartners, type Partner, type RomNameHost } from "@/transfer/partners";
import { TransferScreen, type TransferHost } from "@/transfer/TransferScreen";
import { TransferPakCard } from "@/transfer-pak/TransferPak";
import { useTransferPak, type TransferPakHost } from "@/transfer-pak/setting";
import { GameMenu } from "./GameMenu";
import { gameTitle, playedSummary, resumedFrom, savedSummary, type PlayHistory } from "./details";
import { lastKnown, remember } from "./lastKnown";
import { formatChoices, originalGame, useSaveCard, type SaveCardState, type SaveSummaryHost } from "./saveSummary";
import { TrainerAndParty } from "./TrainerAndParty";
import { findUnsavedPlay, UnsavedResumeDialog, type ResumeCheckHost, type UnsavedPlay } from "./unsavedResume";

export type Start = "resume" | "new" | { slot: number; resume: boolean };

export type GamePageHost = SaveSummaryHost &
  ResumeCheckHost &
  BackupsHost &
  SlotsHost &
  RomNameHost &
  TransferPakHost &
  Pick<TransferHost, "writeTransfer" | "keptCopies" | "keepCopies"> & {
    resumePreview(folder: string, path: string): Promise<{ screenshot: number[] } | null>;
    playHistory(path: string): Promise<PlayHistory>;
    applyEdit(folder: string, path: string, edited: Uint8Array): Promise<void>;
    deleteGame(folder: string, path: string): Promise<void>;
    readSaveFiles(folder: string, path: string): Promise<{ extension: string; bytes: number[] }[]>;
    threeDsUpdate(folder: string, path: string): Promise<number | null>;
  };

export type Gone = "removed";

const noBackups: Backup[] = [];
const noGames: Game[] = [];

function useRomName(host: RomNameHost, folder: string, path: string) {
  const [named, setNamed] = useState<{ path: string; name: string | null }>();

  useEffect(() => {
    let current = true;
    host.romGameName(folder, path).then(
      (name) => current && setNamed({ path, name }),
      () => {},
    );
    return () => {
      current = false;
    };
  }, [host, folder, path]);

  return named?.path === path ? named.name : null;
}

function useUpdateVersion(host: GamePageHost, folder: string, game: Game, reload: number) {
  const [update, setUpdate] = useState<{ path: string; version: number | null }>();

  useEffect(() => {
    if (game.system !== "3ds" || game.cloudOnly) return;
    let current = true;
    host.threeDsUpdate(folder, game.path).then(
      (version) => current && setUpdate({ path: game.path, version }),
      () => {},
    );
    return () => {
      current = false;
    };
  }, [host, folder, game.path, game.system, game.cloudOnly, reload]);

  return update?.path === game.path && update.version !== null ? `Update v${update.version}` : undefined;
}

export type Details = { resume: boolean; screenshot?: string; played?: string; slot?: number; states: SavedState[] };

function useDetails(host: GamePageHost, folder: string, path: string, reload: number) {
  const [details, setDetails] = useState(() => lastKnown(host, path).details);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    setLoading(true);
    (async () => {
      // Waits for the resume state a game just quit is still writing, which also closes its play session.
      const resume = await host.hasResumeState(folder, path).catch(() => false);
      const [preview, info, history, states] = await Promise.all([
        resume ? host.resumePreview(folder, path).catch(() => null) : null,
        resume ? host.resumeInfo(folder, path).catch(() => null) : null,
        host.playHistory(path).catch(() => undefined),
        host.listStates(folder, path).catch(() => undefined),
      ]);
      const details = {
        resume,
        screenshot: preview ? pngDataUrl(preview.screenshot) : undefined,
        played: history && playedSummary(history, Date.now()),
        slot: info?.slot,
        states: states?.slots ?? [],
      };
      remember(host, path, { details });
      if (!current) return;
      setDetails(details);
      setLoading(false);
    })();
    return () => {
      current = false;
    };
  }, [host, folder, path, reload]);

  return [details, loading] as const;
}

export function Hero({
  game,
  sharedArt,
  screenshot,
  played,
  syncLine,
  version,
  update,
  updating,
  menu,
  onBack,
}: {
  game: Game;
  sharedArt?: string;
  screenshot?: string;
  played?: string;
  syncLine?: string;
  version?: string | null;
  update?: string;
  updating: boolean;
  menu: ReactNode;
  onBack(): void;
}) {
  const { hero, dark } = systemColors[game.system];
  const titleId = useId();
  const boxArt = useBoxArt(game);
  const backdrop = boxArt.url ?? screenshot;
  const screens = dualScreens[game.system];
  const heroArt = boxArt.url ? (
    <img src={boxArt.url} alt="Box art" className="mx-auto max-h-72 max-w-full rounded-md object-contain shadow-2xl" />
  ) : screens ? (
    screenshot && (
      <Crossfade value={screenshot}>
        <TopScreen src={screenshot} screens={screens} alt="Where you left off" className="mx-auto w-full max-w-md rounded-md shadow-2xl" />
      </Crossfade>
    )
  ) : (
    screenshot && (
      <Crossfade value={screenshot}>
        <img
          src={screenshot}
          alt="Where you left off"
          className="mx-auto w-full max-w-md rounded-md shadow-2xl [image-rendering:pixelated]"
        />
      </Crossfade>
    )
  );
  return (
    <section
      aria-labelledby={titleId}
      className="relative isolate overflow-hidden text-white md:rounded-xl"
      style={backdrop ? undefined : { backgroundColor: hero }}
    >
      {backdrop ? (
        <img
          src={backdrop}
          alt=""
          aria-hidden
          className="absolute inset-0 -z-10 size-full scale-110 object-cover blur-2xl brightness-[0.4]"
        />
      ) : (
        <div
          style={{ "--pattern": dark.pattern, "--pattern-dark": dark.pattern } as CSSProperties}
          className="absolute inset-0 -z-10 dot-grid mask-[linear-gradient(160deg,#000,transparent_55%)]"
        />
      )}
      <div className="grid gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex justify-between">
          <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack} className="hover:bg-white/15 hover:text-white">
            <ChevronLeft />
          </Button>
          {menu}
        </div>
        {sharedArt ? <Shared name={sharedArt}>{heroArt}</Shared> : heroArt}
        <div className="grid gap-1">
          <SystemChip system={game.system} className="bg-(--chip-dark) text-(--chip-text-dark)" />
          <h1 id={titleId} className="font-heading text-2xl font-bold tracking-tight break-words">{gameTitle(game.name)}</h1>
          {version && (
            <Crossfade value={version}>
              <p className="text-sm font-medium text-(--hero-version)">{version}</p>
            </Crossfade>
          )}
          {update && <p className="text-sm text-(--hero-text)">{update}</p>}
          {played && (
            <Crossfade value={played}>
              <p className="text-sm text-(--hero-text)">{played}</p>
            </Crossfade>
          )}
          {syncLine && <p className="text-sm text-(--hero-text)">{syncLine}</p>}
          {updating && <p className="text-sm text-(--hero-text)">Updating…</p>}
        </div>
      </div>
    </section>
  );
}

function FormatQuestion({
  candidates,
  romPath,
  disabled,
  onPick,
}: {
  candidates: FormatEntry[];
  romPath: string;
  disabled: boolean;
  onPick(formatId: string): void;
}) {
  return (
    <>
      <p className="text-sm text-muted-foreground">Which game is this save from?</p>
      {formatChoices(candidates, romPath).map(({ id, name }) => (
        <Button key={id} variant="outline" disabled={disabled} onClick={() => onPick(id)}>
          {name}
        </Button>
      ))}
      <Button variant="outline" disabled={disabled} onClick={() => onPick(originalGame)}>
        The original game
      </Button>
    </>
  );
}

function SaveCard({
  card,
  romPath,
  hasBackups,
  canTransfer,
  updating,
  backupsButton,
  transferButton,
  file,
  onChooseFormat,
  onEdit,
  onTransfer,
  onBackups,
}: {
  card?: SaveCardState;
  romPath: string;
  hasBackups: boolean;
  canTransfer: boolean;
  updating: boolean;
  backupsButton: RefObject<HTMLButtonElement | null>;
  transferButton: RefObject<HTMLButtonElement | null>;
  file(): Promise<ExportedFile[]>;
  onChooseFormat(formatId: string): void;
  onEdit(): void;
  onTransfer(): void;
  onBackups(): void;
}) {
  const headingId = useId();
  if (!card) return null;
  return (
    <section aria-labelledby={headingId} className="relative grid content-start gap-3 rounded-xl border p-4">
      <h2 id={headingId} className={sectionHeading}>
        Save
      </h2>
      {card.state !== "none" && (
        <div className="absolute top-2 right-2">
          <ExportMenu file={file} />
        </div>
      )}
      {card.state === "none" && <p className="text-sm text-muted-foreground">No save yet</p>}
      {card.state === "unreadable" && <p className="text-sm text-muted-foreground">Can't read this save</p>}
      {card.state === "choose" && (
        <FormatQuestion candidates={card.candidates} romPath={romPath} disabled={updating} onPick={onChooseFormat} />
      )}
      {card.state === "read" && (
        <>
          <TrainerAndParty summary={card.summary}>
            <Crossfade value={card.modified}>
              <p className="text-sm text-muted-foreground">{savedSummary(card.modified, Date.now())}</p>
            </Crossfade>
          </TrainerAndParty>
          <Button variant="outline" disabled={updating} onClick={onEdit}>
            <Pencil />
            Edit save
          </Button>
          {canTransfer && (
            <Button ref={transferButton} variant="outline" disabled={updating} onClick={onTransfer}>
              <ArrowLeftRight />
              Transfer Pokémon
            </Button>
          )}
        </>
      )}
      {hasBackups && (
        <Button ref={backupsButton} variant="outline" disabled={updating} onClick={onBackups}>
          <ArchiveRestore />
          Backups
        </Button>
      )}
    </section>
  );
}

export function GamePage({
  host,
  folder,
  game,
  games = noGames,
  sharedArt,
  cover,
  unsupported,
  onPlay,
  onPatched,
  onGone,
  onDelete,
  onBack,
}: {
  host: GamePageHost;
  folder: string;
  game: Game;
  games?: Game[];
  sharedArt?: string;
  cover?: string;
  unsupported?: "device" | "platform";
  onPlay(start: Start, game?: Game, cover?: string): void;
  onPatched?(game: Game): void;
  onGone?(game: Game, how: Gone): void;
  onDelete(game: Game): void;
  onBack(): void;
}) {
  const sync = useSync();
  const now = useMinute();
  const syncLine = sync.account ? gameSyncLine(sync.gameSync[game.path], sync.gameLastSynced[game.path], now) : undefined;
  const [reload, setReload] = useState(0);
  const [details, loadingDetails] = useDetails(host, folder, game.path, reload);
  const [card, loadingCard] = useSaveCard(host, folder, game.path, reload);
  const updating = (loadingDetails && !!details) || (loadingCard && !!card);
  const [startingScreenshot, setStartingScreenshot] = useState(cover);
  if (startingScreenshot && !loadingDetails) setStartingScreenshot(undefined);
  const [backups, forgetBackup] = useBackups(host, folder, game.path, reload);
  const first = useRef<HTMLButtonElement>(null);
  const backupsButton = useRef<HTMLButtonElement>(null);
  const focusBackupsButton = useRef(false);
  const picking = useRef<Backup>(undefined);
  const [warning, setWarning] = useState<UnsavedPlay & { consequence: string; go(): void }>();
  const [editing, setEditing] = useState(false);
  const [transferring, setTransferring] = useState<Partner[]>();
  const transferButton = useRef<HTMLButtonElement>(null);
  const focusTransferButton = useRef(false);
  const partners = useTransferPartners(host, folder, game, card?.state === "read", games, reload, !!transferring);
  const romName = useRomName(host, folder, game.path);
  const update = useUpdateVersion(host, folder, game, reload);
  const transferPak = useTransferPak(host, folder, game.path);
  const [showingStates, setShowingStates] = useState(false);
  const loadStateButton = useRef<HTMLButtonElement>(null);
  const [showingBackups, setShowingBackups] = useState(false);
  const [inspecting, setInspecting] = useState<Backup>();
  const [confirmingRestore, setConfirmingRestore] = useState<Backup>();
  const [confirmingDelete, setConfirmingDelete] = useState<Backup>();
  const [busy, setBusy] = useState(false);
  const { preferences } = usePreferences();
  const [backupError, setBackupError] = useState<string>();
  const summaries = useSummaries(host, folder, game.path, showingBackups ? backups : noBackups);
  const onBackGesture = useBackGesture();
  useBack(onBack);

  const saveHost = useMemo<SaveHost>(
    () => ({
      read: async () => {
        const file = await host.readSave(folder, game.path);
        if (!file) throw noSaveYet;
        return new Uint8Array(file.bytes);
      },
      formatId: () => storedFormatId(host, game.path),
      apply: (edited) => host.applyEdit(folder, game.path, edited),
      playTimeSinceSave: async () => null,
    }),
    [host, folder, game.path],
  );

  const currentSaveFiles = async (): Promise<ExportedFile[]> => {
    const files = await host.readSaveFiles(folder, game.path);
    if (!files.length) throw new Error("No save yet");
    return files.map((file) => ({ bytes: new Uint8Array(file.bytes), fileName: `${game.name}.${file.extension}` }));
  };

  const chooseFormat = async (formatId: string | null) => {
    await host.keepSaveFormat(game.path, formatId ? { id: formatId, chosen: true } : null).catch((error) => console.error(error));
    setReload((reload) => reload + 1);
  };

  const play: typeof onPlay = (...args) => {
    const [, other] = args;
    if (!unsupported || other) return onPlay(...args);
    setWarning(undefined);
    if (editing) navigate("back", () => setEditing(false));
    setReload((reload) => reload + 1);
  };

  const openEditor = () => navigate("forward", () => setEditing(true));
  const editSave = async () => {
    const found = await findUnsavedPlay(host, folder, game.path);
    if (found) setWarning({ ...found, consequence: "Editing starts from the save.", go: openEditor });
    else openEditor();
  };

  const openTransfer = () => navigate("forward", () => setTransferring(partners));
  const transfer = async () => {
    const found = await findUnsavedPlay(host, folder, game.path);
    if (found) setWarning({ ...found, consequence: "Transferring starts from the save.", go: openTransfer });
    else openTransfer();
  };

  const closeTransfer = () =>
    navigate("back", () => {
      setTransferring(undefined);
      setReload((reload) => reload + 1);
      focusTransferButton.current = true;
    });

  const closeBackups = () =>
    navigate("back", () => {
      setShowingBackups(false);
      setInspecting(undefined);
      setBackupError(undefined);
      focusBackupsButton.current = true;
    });

  const restore = async (backup: Backup) => {
    setBusy(true);
    setBackupError(undefined);
    try {
      await host.restoreBackup(folder, game.path, backup.name, preferences.restoreBackupsKept);
      navigate("back", () => {
        setShowingBackups(false);
        setInspecting(undefined);
      });
    } catch (reason) {
      setBackupError(String(reason));
    } finally {
      setBusy(false);
      setReload((reload) => reload + 1);
    }
  };

  const deleteBackup = async (backup: Backup) => {
    setConfirmingDelete(undefined);
    setBusy(true);
    setBackupError(undefined);
    try {
      await host.deleteBackup(folder, game.path, backup.name);
      forgetBackup(backup.name);
      if (backups.every(({ name }) => name === backup.name)) closeBackups();
      else navigate("back", () => setInspecting(undefined));
    } catch (reason) {
      setBackupError(String(reason));
    } finally {
      setBusy(false);
      setReload((reload) => reload + 1);
    }
  };

  const pickBackup = async (backup: Backup) => {
    if (busy) return;
    picking.current = backup;
    const found = await findUnsavedPlay(host, folder, game.path);
    if (picking.current !== backup) return;
    picking.current = undefined;
    if (found) setWarning({ ...found, consequence: "Restoring a backup drops the resume point.", go: () => void restore(backup) });
    else setConfirmingRestore(backup);
  };

  const changeCart = async (cart: string | null) => {
    await transferPak.choose(cart);
    setReload((reload) => reload + 1);
  };

  const chooseCart = async (cart: string | null) => {
    const found = await findUnsavedPlay(host, folder, game.path);
    if (found) setWarning({ ...found, consequence: "Changing the Transfer Pak drops the resume point.", go: () => void changeCart(cart) });
    else await changeCart(cart);
  };

  const backFromBackup = () => {
    picking.current = undefined;
    if (confirmingRestore || confirmingDelete || warning) {
      setConfirmingRestore(undefined);
      setConfirmingDelete(undefined);
      setWarning(undefined);
      return;
    }
    navigate("back", () => {
      setInspecting(undefined);
      setBackupError(undefined);
    });
  };

  const playButtons = cn("flex-1", !details?.resume && "h-16 text-lg");
  const resumedFromSlot = details && resumedFrom(details.slot, details.states, new Date());

  useEffect(() => {
    if (details && document.activeElement === document.body) first.current?.focus({ preventScroll: true });
  }, [details]);

  useEffect(() => {
    if (!showingStates) loadStateButton.current?.focus({ preventScroll: true });
  }, [showingStates]);

  useEffect(() => {
    if (transferring || !focusTransferButton.current) return;
    focusTransferButton.current = false;
    (transferButton.current ?? first.current)?.focus({ preventScroll: true });
  }, [transferring]);

  useEffect(() => {
    if (showingBackups || !focusBackupsButton.current) return;
    focusBackupsButton.current = false;
    (backupsButton.current ?? first.current)?.focus({ preventScroll: true });
  }, [showingBackups]);

  return (
    <>
      {showingBackups &&
        (inspecting ? (
          <Screen key="backup">
            <BackupPage
              backup={inspecting}
              file={() => backupFile(host, folder, game, inspecting)}
              summary={summaries[inspecting.sha256]}
              busy={busy}
              error={backupError}
              onRestore={() => void pickBackup(inspecting)}
              onDelete={() => {
                picking.current = undefined;
                setConfirmingDelete(inspecting);
              }}
              onBack={backFromBackup}
            />
          </Screen>
        ) : (
          <Screen key="backups">
            <BackupsScreen
              backups={backups}
              summaries={summaries}
              onPick={(backup) => navigate("forward", () => setInspecting(backup))}
              onBack={closeBackups}
            />
          </Screen>
        ))}
      {showingStates && details && (
        <Screen>
          <SlotGrid
            mode="load"
            host={host}
            folder={folder}
            path={game.path}
            current={details.slot}
            onPick={(slot) => onPlay({ slot, resume: details.resume })}
            onDeleted={(left) => {
              if (left.length === 0) navigate("back", () => setShowingStates(false));
              setReload((reload) => reload + 1);
            }}
            onBack={() => navigate("back", () => setShowingStates(false))}
          />
        </Screen>
      )}
      <Screen hidden={showingBackups || showingStates || !!transferring}>
        <div className="min-h-screen pb-safe md:grid md:grid-cols-2 md:gap-4 md:p-4 md:pb-[max(1rem,env(safe-area-inset-bottom))]">
          <main className="grid content-start">
            <Hero
              game={game}
              sharedArt={sharedArt}
              screenshot={startingScreenshot ?? details?.screenshot}
              played={details?.played}
              syncLine={syncLine}
              version={card?.state === "read" ? (romName ?? card.summary.version) : undefined}
              update={update}
              updating={updating}
              menu={
                <GameMenu
                  folder={folder}
                  game={game}
                  deletesEverywhere={!!sync.account}
                  onChangeFormat={card?.state === "read" && card.format?.chosen ? () => void chooseFormat(null) : undefined}
                  onPatched={onPatched}
                  onUpdated={() => setReload((reload) => reload + 1)}
                  onRemove={
                    sync.account && sync.syncGames.on
                      ? async () => {
                          await sync.removeFromDevice(folder, game.path);
                          onGone?.(game, "removed");
                        }
                      : undefined
                  }
                  onDelete={async () => onDelete(game)}
                />
              }
              onBack={onBack}
            />
            {unsupported ? (
              <p className="p-4 text-sm text-muted-foreground md:px-0">
                {unsupported === "platform" ? "Not supported on this device yet." : `${systemNames[game.system]} games don't run on this device.`}
              </p>
            ) : details && (
              <div className="grid gap-2 p-4 md:px-0">
                {details.resume && (
                  <Button
                    ref={first}
                    size="lg"
                    className="h-16 justify-start gap-3 px-3 text-lg"
                    onClick={() => onPlay("resume", undefined, details.screenshot)}
                  >
                    {details.screenshot ? (
                      <Crossfade value={details.screenshot}>
                        <img src={details.screenshot} alt="" className="h-12 rounded-sm [image-rendering:pixelated]" />
                      </Crossfade>
                    ) : (
                      <History />
                    )}
                    <span className="grid min-w-0 text-left">
                      Resume
                      {resumedFromSlot && (
                        <Crossfade value={resumedFromSlot}>
                          <span className="truncate text-sm font-normal opacity-80">{resumedFromSlot}</span>
                        </Crossfade>
                      )}
                    </span>
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button
                    ref={details.resume ? undefined : first}
                    size="lg"
                    variant={details.resume ? "outline" : "default"}
                    className={playButtons}
                    onClick={() => onPlay("new")}
                  >
                    <Play />
                    Start
                  </Button>
                  {details.states.length > 0 && (
                    <Button
                      ref={loadStateButton}
                      size="lg"
                      variant="outline"
                      className={playButtons}
                      disabled={updating}
                      onClick={() => navigate("forward", () => setShowingStates(true))}
                    >
                      <FolderOpen />
                      Load a state
                    </Button>
                  )}
                </div>
              </div>
            )}
          </main>
          <aside className="grid content-start gap-4 p-4 pt-0 md:p-0">
            <SaveCard
              card={card}
              romPath={game.path}
              hasBackups={backups.length > 0}
              canTransfer={partners.length > 0}
              updating={updating}
              backupsButton={backupsButton}
              transferButton={transferButton}
              file={currentSaveFiles}
              onChooseFormat={(formatId) => void chooseFormat(formatId)}
              onEdit={() => void editSave()}
              onTransfer={() => void transfer()}
              onBackups={() => navigate("forward", () => setShowingBackups(true))}
            />
            {transferPak.pak && (
              <TransferPakCard games={games} chosen={transferPak.pak.game} onChoose={(cart) => void chooseCart(cart)} />
            )}
          </aside>
        </div>
      </Screen>
      <UnsavedResumeDialog
        unsaved={warning}
        consequence={warning?.consequence ?? ""}
        onResume={() => play("resume", undefined, details?.screenshot)}
        onContinue={() => {
          setWarning(undefined);
          warning?.go();
        }}
        onCancel={() => setWarning(undefined)}
      />
      <RestoreDialog
        backup={confirmingRestore}
        onRestore={(backup) => void restore(backup)}
        onCancel={() => setConfirmingRestore(undefined)}
      />
      <DeleteBackupDialog
        backup={confirmingDelete}
        onDelete={(backup) => void deleteBackup(backup)}
        onCancel={() => setConfirmingDelete(undefined)}
      />
      {transferring && card?.state === "read" && (
        <Screen>
          <TransferScreen
            host={host}
            folder={folder}
            game={game}
            name={romName ?? card.summary.version ?? gameTitle(game.name)}
            partners={transferring}
            onPlay={(other) => onPlay("resume", other)}
            onBack={closeTransfer}
          />
        </Screen>
      )}
      {editing && (
        <Screen>
          <EditorScreen
            host={saveHost}
            home={saveHome}
            onBackGesture={onBackGesture}
            onClose={() => navigate("back", () => setEditing(false))}
            onSaveFirst={() => play(details?.resume ? "resume" : "new")}
            afterApply="play"
            onApplied={() => play("new")}
            confirmApply={!!details?.resume}
          />
        </Screen>
      )}
    </>
  );
}
