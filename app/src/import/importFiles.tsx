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
import { PatchRomDialog, type OpenedPatch } from "@/patch-rom/patchRom";
import { useGamesFolder } from "@/games-folder/gamesFolder";
import { GamePicker } from "@/library/GamePicker";
import { useLibrary } from "@/library/library";
import { byName, gameName, type Game } from "@/library/scan";
import { useSync } from "@/sync/sync";
import type { System } from "@/systems";
import { count, type FolderScan } from "./folder";
import { newestPerGame, planImport, type ImportFile, type PatchImport, type SaveImport } from "./match";

export type ExistingSave = { modified: number; same: boolean };
export type PickedFolder = { folder: string; name: string };

export type ImportHost = {
  emulatorHint: string;
  pick(): Promise<ImportFile[]>;
  opened(): Promise<ImportFile[]>;
  onOpened(listener: () => void): () => void;
  sha1s(folder: string, paths: string[]): Promise<Record<string, string>>;
  titleIds(folder: string, paths: string[]): Promise<Record<string, string>>;
  /** Copies a ROM to `path`, or installs an update on the games it updates, which it returns. */
  copyRom(folder: string, file: string, path: string): Promise<string[]>;
  copyDemo(folder: string): Promise<string>;
  existingSave(folder: string, rom: string, file: ImportFile): Promise<ExistingSave | null>;
  copySave(folder: string, save: SaveImport): Promise<void>;
  pickFolder(): Promise<PickedFolder | null>;
  scan(folder: string, hash: boolean): Promise<FolderScan>;
};

const noHost: ImportHost = {
  emulatorHint: "",
  pick: () => Promise.reject(new Error("Importing needs an ImportProvider")),
  opened: async () => [],
  onOpened: () => () => {},
  sha1s: () => Promise.reject(new Error("Importing needs an ImportProvider")),
  titleIds: () => Promise.reject(new Error("Importing needs an ImportProvider")),
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

export function importSummary(
  games: number,
  saves: number,
  found: boolean,
  failed: string[],
  patched?: Game | null,
  morePatches = false,
  updated: string[] = [],
) {
  const added = [games && count(games, "game"), saves && count(saves, "save")].filter(Boolean);
  const quiet = failed.length > 0 || patched !== undefined || updated.length > 0;
  const done = added.length ? `Added ${added.join(" and ")}` : found ? "Already in pkhemu" : quiet ? "" : "Nothing added";
  const update = updated.length > 1 ? `Updated ${count(updated.length, "game")}` : updated[0] && `Updated ${gameTitle(gameName(updated[0]))}`;
  const problem = failed.length > 1 ? `Couldn't import ${failed.length} files` : failed[0];
  return [done, update, patched && `Created ${patched.name}`, problem, morePatches && "Open one patch at a time"].filter(Boolean).join(". ");
}

export const gameAt = (path: string): Game => ({ system: path.split("/")[0] as System, name: gameName(path), path });

export const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export type ImportQuestion =
  | { kind: "game"; file: ImportFile; games: Game[]; answer(game: string | null): void }
  | { kind: "replace"; game: Game; existing: number; picked: number; answer(replace: boolean): void }
  | { kind: "whichPatch"; archive: string; patches: PatchImport[]; answer(patch: PatchImport | null): void }
  | { kind: "patch"; folder: string; patch: OpenedPatch; addGame(): Promise<Game[]>; answer(created: Game | null): void };

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
        <GamePicker games={question.games} value={game} labelledBy={labelId} onPick={setGame} />
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

export function WhichPatchDialog({ question, open }: { question: Extract<ImportQuestion, { kind: "whichPatch" }>; open: boolean }) {
  const [patch, setPatch] = useState<PatchImport | null>(null);
  const labelId = useId();
  useBack(open ? () => question.answer(null) : undefined);
  return (
    <Dialog open={open} onOpenChange={(open) => !open && question.answer(null)}>
      <DialogContent showCloseButton={false} onEscapeKeyDown={(event) => event.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Which patch?</DialogTitle>
          <DialogDescription className="break-words">
            {question.archive} holds {question.patches.length} patches.
          </DialogDescription>
        </DialogHeader>
        <p id={labelId} className="text-muted-foreground">
          Patch
        </p>
        <Combobox
          items={question.patches}
          value={patch}
          onValueChange={(picked: PatchImport | null) => setPatch(picked)}
          itemToStringLabel={(patch: PatchImport) => patch.name}
          isItemEqualToValue={(patch: PatchImport, other: PatchImport) => patch.file === other.file}
        >
          <ComboboxTrigger
            aria-labelledby={labelId}
            render={<Button variant="outline" className="w-full min-w-0 shrink justify-between rounded-lg font-normal" />}
          >
            <span className="truncate">
              <ComboboxValue placeholder="Choose a patch" />
            </span>
          </ComboboxTrigger>
          <ComboboxContent>
            <ComboboxInput showTrigger={false} placeholder="Search" aria-label="Search" />
            <ComboboxEmpty>No matches</ComboboxEmpty>
            <ComboboxList>
              {(patch: PatchImport) => (
                <ComboboxItem key={patch.file} value={patch}>
                  {patch.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <DialogFooter>
          <Button variant="secondary" onClick={() => question.answer(null)}>
            Cancel
          </Button>
          <Button disabled={!patch} onClick={() => patch && question.answer(patch)}>
            Open
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Asked = { question: ImportQuestion; open: boolean };

export function ImportDialogs({ asked }: { asked?: Asked }) {
  if (asked?.question.kind === "game") return <WhichGameDialog key={asked.question.file.file} question={asked.question} open={asked.open} />;
  if (asked?.question.kind === "replace")
    return <ReplaceSaveDialog key={asked.question.game.path} question={asked.question} open={asked.open} />;
  if (asked?.question.kind === "whichPatch")
    return <WhichPatchDialog key={asked.question.patches[0].file} question={asked.question} open={asked.open} />;
  if (asked?.question.kind === "patch") {
    const { folder, patch, addGame, answer } = asked.question;
    return (
      <PatchRomDialog
        key={patch.file}
        open={asked.open}
        folder={folder}
        opened={patch}
        onAddGame={addGame}
        onClose={() => answer(null)}
        onCreated={answer}
      />
    );
  }
  return null;
}

export function useImportFiles(onDone: (message: string, created?: Game | null) => void, { takesOpened = true } = {}) {
  const host = useContext(ImportContext);
  const gamesFolder = useGamesFolder();
  const { library, error, refresh } = useLibrary();
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

  useEffect(() => (takesOpened ? host.onOpened(() => setOpenings((count) => count + 1)) : undefined), [host, takesOpened]);

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
    const failed: string[] = [];
    const tried = <T,>(work: () => Promise<T>) =>
      work().then(
        (value) => ({ value }),
        (reason) => void failed.push(String(reason)),
      );

    const copied: string[] = [];
    const updated: string[] = [];
    const copyRoms = async (picked: ImportFile[]) => {
      failed.push(...picked.filter((file) => file.error).map((file) => `Couldn't read ${file.name}`));
      const files = picked.filter((file) => !file.error);
      const sha1s = files.some((file) => file.sha1) ? await host.sha1s(folder, local.map((game) => game.path)) : {};
      const plan = planImport(files, { games: [...games, ...copied.map(gameAt)], sha1s });
      for (const rom of plan.roms) {
        const done = await tried(() => host.copyRom(folder, rom.file.file, rom.path));
        if (done?.value.length) updated.push(...done.value);
        else if (done) copied.push(rom.path);
      }
      return plan;
    };
    const plan = await copyRoms(files);
    const missing = new Set(plan.roms.map((rom) => rom.path).filter((path) => !copied.includes(path)));

    const gamesWithCopied = () => [...local, ...copied.map(gameAt)].sort((a, b) => byName.compare(a.name, b.name));
    const choices = gamesWithCopied();
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

    const [first, ...others] = plan.patches;
    const archive = first?.archive;
    const patch = archive && others.length
      ? await ask<PatchImport | null>((answer) => ({ kind: "whichPatch", archive, patches: plan.patches, answer }), null)
      : first;
    const opened = patch && { file: patch.file, name: patch.name, archive: patch.archive, format: patch.patch, games: choices };
    const addGame = async () => {
      if ((await copyRoms(await host.pick())).known) found = true;
      return gamesWithCopied();
    };
    const patched =
      first && (opened ? await ask<Game | null>((answer) => ({ kind: "patch", folder, patch: opened, addGame, answer }), null) : null);

    void synced(folder, [...copied, ...added, ...updated]);
    await refresh();
    onDone(importSummary(copied.length, added.length, found, failed, patched, plan.morePatches, updated), patched);
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
    const scanned = library !== undefined || error !== undefined;
    if (!takesOpened || imported.current === openings || running || gamesFolder.status !== "ready" || !scanned) return;
    imported.current = openings;
    void importOpened();
  }, [openings, running, gamesFolder.status, library, error]);

  return { importFiles, busy, dialogs: <ImportDialogs asked={asked} /> };
}
