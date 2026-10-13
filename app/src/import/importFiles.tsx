import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useBack } from "@/back/back";
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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { gameTitle } from "@/game-page/details";
import { useGamesFolder } from "@/games-folder/gamesFolder";
import { useLibrary } from "@/library/library";
import { byName, gameName, type Game } from "@/library/scan";
import { useSync } from "@/sync/sync";
import type { System } from "@/systems";
import { count, type FolderScan } from "./folder";
import { newestPerGame, planImport, type ImportFile, type SaveImport } from "./match";

export type ExistingSave = { modified: number; same: boolean };
export type PickedFolder = { folder: string; name: string };

export type ImportHost = {
  pick(): Promise<ImportFile[]>;
  opened(): Promise<ImportFile[]>;
  onOpened(listener: () => void): () => void;
  sha1s(folder: string, paths: string[]): Promise<Record<string, string>>;
  copyRom(folder: string, file: string, path: string): Promise<void>;
  copyDemo(folder: string): Promise<string>;
  existingSave(folder: string, rom: string, file: ImportFile): Promise<ExistingSave | null>;
  copySave(folder: string, save: SaveImport): Promise<void>;
  pickFolder(): Promise<PickedFolder | null>;
  scan(folder: string, hash: boolean): Promise<FolderScan>;
};

const noHost: ImportHost = {
  pick: () => Promise.reject(new Error("Importing needs an ImportProvider")),
  opened: async () => [],
  onOpened: () => () => {},
  sha1s: () => Promise.reject(new Error("Importing needs an ImportProvider")),
  copyRom: () => Promise.reject(new Error("Importing needs an ImportProvider")),
  copyDemo: () => Promise.reject(new Error("Importing needs an ImportProvider")),
  existingSave: () => Promise.reject(new Error("Importing needs an ImportProvider")),
  copySave: () => Promise.reject(new Error("Importing needs an ImportProvider")),
  pickFolder: () => Promise.reject(new Error("Importing needs an ImportProvider")),
  scan: () => Promise.reject(new Error("Importing needs an ImportProvider")),
};

const ImportContext = createContext<ImportHost>(noHost);

export function ImportProvider({ host, children }: { host: ImportHost; children: ReactNode }) {
  return <ImportContext.Provider value={host}>{children}</ImportContext.Provider>;
}

export const useImportHost = () => useContext(ImportContext);

export function importSummary(games: number, saves: number, found: boolean, failed: string[]) {
  const added = [games && count(games, "game"), saves && count(saves, "save")].filter(Boolean);
  const done = added.length ? `Added ${added.join(" and ")}` : found ? "Already in pkhemu" : failed.length ? "" : "Nothing added";
  const problem = failed.length > 1 ? `Couldn't import ${failed.length} files` : failed[0];
  return [done, problem].filter(Boolean).join(". ");
}

export const gameAt = (path: string): Game => ({ system: path.split("/")[0] as System, name: gameName(path), path });

export const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export type ImportQuestion =
  | { kind: "game"; file: ImportFile; games: Game[]; answer(game: string | null): void }
  | { kind: "replace"; game: Game; existing: number; picked: number; answer(replace: boolean): void };

export function WhichGameDialog({ question, open }: { question: Extract<ImportQuestion, { kind: "game" }>; open: boolean }) {
  const [game, setGame] = useState<Game | null>(null);
  const labelId = useId();
  useBack(open ? () => question.answer(null) : undefined);
  return (
    <Dialog open={open} onOpenChange={(open) => !open && question.answer(null)}>
      <DialogContent showCloseButton={false} onEscapeKeyDown={(event) => event.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Which game is this save for?</DialogTitle>
          <DialogDescription id={labelId} className="break-words">
            {question.file.name} doesn't match a game by name.
          </DialogDescription>
        </DialogHeader>
        <Combobox
          items={question.games}
          value={game}
          onValueChange={(picked: Game | null) => setGame(picked)}
          itemToStringLabel={(game: Game) => game.name}
          isItemEqualToValue={(game: Game, other: Game) => game.path === other.path}
        >
          <ComboboxTrigger
            aria-labelledby={labelId}
            render={<Button variant="outline" className="w-full min-w-0 shrink justify-between rounded-lg font-normal" />}
          >
            <span className="truncate">
              <ComboboxValue placeholder="Choose a game" />
            </span>
          </ComboboxTrigger>
          <ComboboxContent>
            <ComboboxInput showTrigger={false} placeholder="Search" aria-label="Search" />
            <ComboboxEmpty>No matches</ComboboxEmpty>
            <ComboboxList>
              {(game: Game) => (
                <ComboboxItem key={game.path} value={game}>
                  {game.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <DialogFooter>
          <Button variant="secondary" onClick={() => question.answer(null)}>
            Skip this save
          </Button>
          <Button disabled={!game} onClick={() => game && question.answer(game.path)}>
            {game ? `Use for ${gameTitle(game.name)}` : "Use for this game"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReplaceSaveDialog({ question, open }: { question: Extract<ImportQuestion, { kind: "replace" }>; open: boolean }) {
  const title = gameTitle(question.game.name);
  useBack(open ? () => question.answer(false) : undefined);
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && question.answer(false)}>
      <AlertDialogContent onEscapeKeyDown={(event) => event.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Replace {title}'s save?</AlertDialogTitle>
          <AlertDialogDescription>
            pkhemu has a save from {dateTime.format(question.existing)}. The one you picked is from {dateTime.format(question.picked)}.
          </AlertDialogDescription>
          <p className="text-sm text-muted-foreground">pkhemu's save goes to Backups first.</p>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="secondary">Keep pkhemu's</AlertDialogCancel>
          <AlertDialogAction onClick={() => question.answer(true)}>Replace</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type Asked = { question: ImportQuestion; open: boolean };

export function ImportDialogs({ asked }: { asked?: Asked }) {
  if (asked?.question.kind === "game") return <WhichGameDialog key={asked.question.file.file} question={asked.question} open={asked.open} />;
  if (asked?.question.kind === "replace")
    return <ReplaceSaveDialog key={asked.question.game.path} question={asked.question} open={asked.open} />;
  return null;
}

export function useImportFiles(onDone: (message: string) => void) {
  const host = useContext(ImportContext);
  const gamesFolder = useGamesFolder();
  const { library, refresh } = useLibrary();
  const latest = useRef(library);
  latest.current = library;
  const { synced } = useSync();
  const [asked, setAsked] = useState<Asked>();
  const [busy, setBusy] = useState(false);
  const [openings, setOpenings] = useState(1);
  const [running, setRunning] = useState(false);
  const working = useRef(false);
  const imported = useRef(0);
  const mounted = useRef(false);
  const cancel = useRef<() => void>(undefined);

  useEffect(() => host.onOpened(() => setOpenings((count) => count + 1)), [host]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancel.current?.();
    };
  }, []);

  const ask = <T,>(question: (answer: (value: T) => void) => ImportQuestion, cancelled: T) =>
    new Promise<T>((resolve) => {
      if (!mounted.current) return resolve(cancelled);
      cancel.current = () => resolve(cancelled);
      const answer = (value: T) => {
        cancel.current = undefined;
        setAsked((asked) => asked && { ...asked, open: false });
        resolve(value);
      };
      setAsked({ question: question(answer), open: true });
    });

  const importPicked = async (folder: string, files: ImportFile[]) => {
    const games = latest.current?.sections.flatMap((section) => section.games) ?? [];
    const local = games.filter((game) => !game.cloudOnly);
    const sha1s = files.some((file) => file.sha1) ? await host.sha1s(folder, local.map((game) => game.path)) : {};
    const plan = planImport(files, { games, sha1s });
    const failed: string[] = [];
    const tried = <T,>(work: () => Promise<T>) =>
      work().then(
        (value) => ({ value }),
        (reason) => void failed.push(String(reason)),
      );

    const copied: string[] = [];
    for (const rom of plan.roms) if (await tried(() => host.copyRom(folder, rom.file.file, rom.path))) copied.push(rom.path);
    const missing = new Set(plan.roms.map((rom) => rom.path).filter((path) => !copied.includes(path)));

    const choices = [...local, ...copied.map(gameAt)].sort((a, b) => byName.compare(a.name, b.name));
    const saves = plan.saves.filter((save) => !missing.has(save.game));
    for (const file of plan.unmatched) {
      const game = await ask<string | null>((answer) => ({ kind: "game", file, games: choices, answer }), null);
      if (game) saves.push({ file, game });
    }

    const added: string[] = [];
    let found = plan.known > 0;
    for (const save of newestPerGame(saves)) {
      const checked = await tried(() => host.existingSave(folder, save.game, save.file));
      if (!checked) continue;
      const current = checked.value;
      if (current?.same) {
        found = true;
        continue;
      }
      if (current) {
        const game = choices.find((game) => game.path === save.game) ?? gameAt(save.game);
        const replace = await ask<boolean>(
          (answer) => ({ kind: "replace", game, existing: current.modified, picked: save.file.modified, answer }),
          false,
        );
        if (!replace) continue;
      }
      if (await tried(() => host.copySave(folder, save))) added.push(save.game);
    }

    void synced(folder, [...copied, ...added]);
    await refresh();
    onDone(importSummary(copied.length, added.length, found, failed));
  };

  const run = async (work: (folder: string) => Promise<void>) => {
    if (gamesFolder.status !== "ready" || working.current) return;
    working.current = true;
    setRunning(true);
    try {
      await work(gamesFolder.folder);
    } catch (reason) {
      onDone(String(reason));
    } finally {
      working.current = false;
      setRunning(false);
      setBusy(false);
    }
  };

  const importFiles = () =>
    run(async (folder) => {
      setBusy(true);
      const files = await host.pick();
      if (files.length) await importPicked(folder, files);
    });

  const importOpened = () =>
    run(async (folder) => {
      for (let files = await host.opened(); files.length; files = await host.opened()) {
        setBusy(true);
        await importPicked(folder, files);
      }
    });

  useEffect(() => {
    if (imported.current === openings || running || gamesFolder.status !== "ready") return;
    imported.current = openings;
    void importOpened();
  }, [openings, running, gamesFolder.status]);

  return { importFiles, busy, dialogs: <ImportDialogs asked={asked} /> };
}
