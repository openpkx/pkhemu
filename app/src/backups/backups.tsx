import { useCallback, useEffect, useState } from "react";
import { useEngine } from "@pkhex-everywhere/react";
import { useBack } from "@/back/back";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ExportMenu, type ExportedFile } from "@/editor/exportFile";
import { lastKnown, remember } from "@/game-page/lastKnown";
import { ProgressStats } from "@/game-page/ProgressStats";
import { genderSymbols, summaryOf, type SaveSummary, type SummaryCacheHost } from "@/game-page/saveSummary";
import { TrainerAndParty } from "@/game-page/TrainerAndParty";
import type { Game } from "@/library/scan";
import { storedFormatId, type SaveFormatHost } from "@/preferences/gameSettings";
import { PokemonArt, summaryArt } from "@/game-art/gameArt";

export type Backup = {
  name: string;
  at: string;
  reason: "edit" | "start" | "cheats" | "transferPak" | "transfer" | "load" | "restore" | "sync";
  sha256: string;
  note?: string;
};

export type BackupsHost = SummaryCacheHost &
  Pick<SaveFormatHost, "saveFormat"> & {
    listBackups(folder: string, path: string): Promise<Backup[]>;
    readBackup(folder: string, path: string, name: string): Promise<Uint8Array>;
    restoreBackup(folder: string, path: string, name: string, keep: number): Promise<void>;
    deleteBackup(folder: string, path: string, name: string): Promise<void>;
  };

const reasons: Record<Backup["reason"], string> = {
  edit: "Before edit",
  start: "Game start",
  cheats: "Before cheats",
  transferPak: "Before the Transfer Pak",
  transfer: "Before transfer",
  load: "Before loading a state",
  restore: "Before restore",
  sync: "Sync conflict",
};

const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const date = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const dateWithYear = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

const startOfDay = (at: Date) => new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();

export function when(at: Date, now: Date) {
  const days = Math.round((startOfDay(now) - startOfDay(at)) / (24 * 3600_000));
  const day =
    days === 0
      ? "Today"
      : days === 1
        ? "Yesterday"
        : (at.getFullYear() === now.getFullYear() ? date : dateWithYear).format(at);
  return `${day} ${time.format(at)}`;
}

export function backupLabel(backup: Pick<Backup, "at" | "reason">, now: Date) {
  return `${when(new Date(backup.at), now)} · ${reasons[backup.reason]}`;
}

function BackupNote({ note }: { note?: string }) {
  return note ? (
    <span data-testid="backup-note" className="text-sm break-words text-muted-foreground">
      {note}
    </span>
  ) : null;
}

export function useBackups(host: BackupsHost, folder: string, path: string, reload: number) {
  const [backups, setBackups] = useState(() => lastKnown(host, path).backups ?? []);
  const forget = useCallback((name: string) => setBackups((backups) => backups.filter((backup) => backup.name !== name)), []);

  useEffect(() => {
    let current = true;
    host.listBackups(folder, path).then(
      (backups) => {
        remember(host, path, { backups });
        if (!current) return;
        setBackups(backups);
      },
      (error) => console.error(error),
    );
    return () => {
      current = false;
    };
  }, [host, folder, path, reload]);

  return [backups, forget] as const;
}

export async function backupFile(
  host: Pick<BackupsHost, "readBackup">,
  folder: string,
  game: Game,
  backup: Backup,
): Promise<ExportedFile> {
  const stem = backup.name.replace(/\.[^.]*$/, "");
  const extension = backup.name.endsWith(".srm") ? "srm" : "sav";
  return { bytes: await host.readBackup(folder, game.path, backup.name), fileName: `${game.name} ${stem}.${extension}` };
}

export type Summary = SaveSummary | "unreadable";

export function useSummaries(host: BackupsHost, folder: string, path: string, backups: Backup[]) {
  const engine = useEngine();
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});

  useEffect(() => {
    if (!backups.length) return;
    let current = true;
    storedFormatId(host, path).then((formatId) => {
      for (const backup of backups)
        summaryOf(engine, host, backup.sha256, () => host.readBackup(folder, path, backup.name), () => current, formatId)
          .catch((): Summary => "unreadable")
          .then((summary) => current && summary && setSummaries((summaries) => ({ ...summaries, [backup.sha256]: summary })));
    });
    return () => {
      current = false;
    };
  }, [engine, host, folder, path, backups]);

  return summaries;
}

function SummaryPlaceholder({ summary }: { summary?: "unreadable" }) {
  return <span className="text-sm text-muted-foreground">{summary ? "Can't read this backup" : "Loading…"}</span>;
}

function BackupSummary({ summary }: { summary?: Summary }) {
  if (!summary || summary === "unreadable") return <SummaryPlaceholder summary={summary} />;
  const { trainer, party, progress } = summary;
  return (
    <>
      <span className="flex items-baseline justify-between gap-2 text-sm">
        <span className="break-words">
          {trainer.name} {trainer.gender && genderSymbols[trainer.gender]}
        </span>
        {trainer.money !== null && <span className="tabular-nums">₽{trainer.money.toLocaleString("en")}</span>}
      </span>
      <ProgressStats progress={progress} withPokedex={false} />
      {party.length > 0 && (
        <span className="flex gap-1">
          {party.map((pokemon, slot) => (
            <PokemonArt key={slot} pokemon={summaryArt(pokemon)} size={8} />
          ))}
        </span>
      )}
    </>
  );
}

export function BackupsScreen({
  backups,
  summaries,
  onPick,
  onBack,
}: {
  backups: Backup[];
  summaries: Record<string, Summary>;
  onPick(backup: Backup): void;
  onBack(): void;
}) {
  useBack(onBack);
  const now = new Date();

  return (
    <div className="min-h-screen">
      <ScreenHeader title="Backups" onBack={onBack} />
      <main className="mx-auto grid max-w-2xl gap-2 p-4">
        <ul className="grid gap-2">
          {backups.map((backup, i) => (
            <li key={backup.name}>
              <Button
                variant="outline"
                autoFocus={i === 0}
                className="h-auto w-full flex-col items-stretch gap-2 rounded-lg p-3 text-left whitespace-normal"
                onClick={() => onPick(backup)}
              >
                <span className="grid">
                  <span className="font-medium">{backupLabel(backup, now)}</span>
                  <BackupNote note={backup.note} />
                </span>
                <BackupSummary summary={summaries[backup.sha256]} />
              </Button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

export function BackupPage({
  backup,
  file,
  summary,
  busy,
  error,
  onRestore,
  onDelete,
  onBack,
}: {
  backup: Backup;
  file(): Promise<ExportedFile>;
  summary?: Summary;
  busy: boolean;
  error?: string;
  onRestore(): void;
  onDelete(): void;
  onBack(): void;
}) {
  const unlessBusy = (action: () => void) => () => !busy && action();
  useBack(unlessBusy(onBack));

  return (
    <div className="min-h-screen">
      <ScreenHeader title={backupLabel(backup, new Date())} onBack={unlessBusy(onBack)} />
      <main className="mx-auto grid max-w-2xl gap-3 p-4">
        <BackupNote note={backup.note} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <section aria-label="Backup" className="relative grid content-start gap-3 rounded-xl border p-4">
          <div className="absolute top-2 right-2">
            <ExportMenu file={file} />
          </div>
          {!summary || summary === "unreadable" ? <SummaryPlaceholder summary={summary} /> : <TrainerAndParty summary={summary} />}
        </section>
        <Button autoFocus onClick={unlessBusy(onRestore)}>
          Restore
        </Button>
        <Button variant="destructive" onClick={unlessBusy(onDelete)}>
          Delete
        </Button>
      </main>
    </div>
  );
}

export function DeleteBackupDialog({
  backup,
  onDelete,
  onCancel,
}: {
  backup?: Backup;
  onDelete(backup: Backup): void;
  onCancel(): void;
}) {
  return (
    <AlertDialog open={!!backup} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this backup?</AlertDialogTitle>
          <AlertDialogDescription>It can't be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => backup && onDelete(backup)}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RestoreDialog({
  backup,
  onRestore,
  onCancel,
}: {
  backup?: Backup;
  onRestore(backup: Backup): void;
  onCancel(): void;
}) {
  return (
    <AlertDialog open={!!backup} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
          <AlertDialogDescription>It replaces the save. The current save is backed up first.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => backup && onRestore(backup)}>Restore</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
