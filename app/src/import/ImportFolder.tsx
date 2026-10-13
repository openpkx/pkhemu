import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { FolderSearch, TriangleAlert } from "lucide-react";
import { useBack } from "@/back/back";
import { SystemChip } from "@/components/SystemChip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { gameTitle } from "@/game-page/details";
import { useGamesFolder } from "@/games-folder/gamesFolder";
import type { LibraryHost } from "@/library/library";
import { gameName, scanLibrary, withCloudGames, type Game } from "@/library/scan";
import { navigate, Screen } from "@/motion/motion";
import { NewFolder } from "@/onboarding/Welcome";
import { useSync } from "@/sync/sync";
import { addSaves, count, folderImportToast, megabytes, summarize, type FolderScan, type FolderSummary } from "./folder";
import { dateTime, gameAt, useImportHost, type PickedFolder } from "./importFiles";
import { planImport, romSystem, type ImportLibrary, type RomImport, type SaveImport } from "./match";

function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</main>;
}

function Heading({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="grid gap-3">
      {icon && <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary [&_svg]:size-6">{icon}</span>}
      <h1 className="font-heading text-2xl font-medium">{title}</h1>
      {children}
    </div>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="flex gap-3 [&>*]:flex-1">{children}</div>;
}

export function WhereAreYourGames({
  delta = false,
  error,
  onBack,
  onChoose,
}: {
  delta?: boolean;
  error?: string;
  onBack(): void;
  onChoose(): void;
}) {
  return (
    <Page>
      <Heading icon={<FolderSearch />} title="Where are your games?">
        <p className="text-sm text-muted-foreground">
          {delta
            ? "Pick On My iPhone › Delta. pkhemu copies your games and saves. Delta's files stay where they are."
            : "Pick the folder with your ROMs. pkhemu looks in every folder inside it, saves included."}
        </p>
      </Heading>
      {!delta && <p className="rounded-lg border bg-card px-3 py-2.5 text-sm text-muted-foreground">Another emulator's folder works too, like RetroArch's.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Actions>
        <Button variant="outline" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button size="lg" onClick={onChoose}>
          Choose folder
        </Button>
      </Actions>
    </Page>
  );
}

export function Scanning({ folder, saves }: { folder: string; saves: boolean }) {
  return (
    <Page>
      <div role="status" className="grid justify-items-center gap-4 text-center">
        <Spinner className="size-8 text-primary" />
        <p className="text-muted-foreground">{`Looking for ${saves ? "saves" : "games"} in ${folder}…`}</p>
      </div>
    </Page>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="grid gap-0.5 rounded-xl border bg-card p-3">
      <span className="text-xl font-medium">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export function FolderSummaryScreen({
  folder,
  summary,
  saves,
  onboarding,
  busy = false,
  error,
  onBack,
  onAddSaves,
  onChooseAnother,
  onContinue,
}: {
  folder: string;
  summary: FolderSummary | null;
  saves: number;
  onboarding: boolean;
  busy?: boolean;
  error?: string;
  onBack(): void;
  onAddSaves(): void;
  onChooseAnother(): void;
  onContinue(): void;
}) {
  if (!summary)
    return (
      <Page>
        <Heading icon={<FolderSearch />} title={`No games in ${folder}`}>
          <p className="text-sm text-muted-foreground">
            pkhemu didn't find any GB, GBC, GBA or DS ROMs in this folder or the folders inside it.
          </p>
        </Heading>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Actions>
          <Button variant="outline" size="lg" onClick={onBack}>
            Back
          </Button>
          <Button size="lg" onClick={onChooseAnother}>
            Choose another folder
          </Button>
        </Actions>
      </Page>
    );
  const { games, withSave, size, leftOut, known } = summary;
  const noSave = games.length - withSave;
  const nothing = games.length === 0 && saves === 0;
  const copy = games.length > 0 || saves === 0 ? `Copy ${count(games.length, "game")}` : `Copy ${count(saves, "save")}`;
  const notes = [
    leftOut > 0 && `${leftOut} other ${leftOut === 1 ? "file" : "files"} left out.`,
    known > 0 && `${count(known, "game")} already in pkhemu.`,
  ].filter(Boolean);
  return (
    <Page>
      <Heading title={`Found ${count(games.length, "game")}`}>
        <p className="text-sm break-words text-muted-foreground">In {folder}</p>
      </Heading>
      <div className="grid grid-cols-3 gap-3">
        <Stat value={String(games.length)} label="Games" />
        <Stat value={String(withSave)} label="With a save" />
        <Stat value={megabytes(size)} label="To copy" />
      </div>
      {noSave > 0 && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>{noSave === 1 ? "1 game has no save" : `${noSave} games have no save`}</AlertTitle>
          <AlertDescription className="grid gap-3">
            If your emulator keeps saves in another folder, add it.
            <Button variant="outline" className="justify-self-start" onClick={onAddSaves}>
              Add a folder with saves
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {games.length > 0 && (
        <ul aria-label="Games found" className="grid grid-cols-1 divide-y rounded-xl border bg-card">
          {games.map((game) => (
            <li key={game.path} className="flex items-center gap-3 px-3 py-2.5">
              <SystemChip system={game.system} />
              <span className="min-w-0 flex-1 truncate">{game.name}</span>
              <span className={game.save ? "shrink-0 text-sm" : "shrink-0 text-sm text-muted-foreground"}>{game.save ? "Save" : "No save"}</span>
            </li>
          ))}
        </ul>
      )}
      {notes.length > 0 && <p className="text-sm text-muted-foreground">{notes.join(" ")}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Actions>
        <Button variant="outline" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button size="lg" disabled={nothing || busy} onClick={onContinue}>
          {busy && <Spinner />}
          {onboarding ? "Continue" : copy}
        </Button>
      </Actions>
    </Page>
  );
}

export type Conflict = { save: SaveImport; game: Game; existing: number };

function ConflictRow({ conflict, ticked, onTick }: { conflict: Conflict; ticked: boolean; onTick(ticked: boolean): void }) {
  const id = useId();
  return (
    <li className="flex items-start gap-3 px-3 py-3">
      <Checkbox id={id} className="mt-0.5" checked={ticked} onCheckedChange={(checked) => onTick(checked === true)} />
      <Label htmlFor={id} className="grid min-w-0 gap-1 font-normal">
        <span className="text-base font-medium break-words">{gameTitle(conflict.game.name)}</span>
        <span className="text-sm text-muted-foreground">In pkhemu: {dateTime.format(conflict.existing)}</span>
        <span className="text-sm text-muted-foreground">In the folder: {dateTime.format(conflict.save.file.modified)}</span>
      </Label>
    </li>
  );
}

export function SaveConflicts({
  conflicts,
  onBack,
  onContinue,
}: {
  conflicts: Conflict[];
  onBack(): void;
  onContinue(ticked: Set<string>): void;
}) {
  const [ticked, setTicked] = useState(() => new Set<string>());
  const tick = (game: string, on: boolean) =>
    setTicked((ticked) => {
      const next = new Set(ticked);
      if (on) next.add(game);
      else next.delete(game);
      return next;
    });
  return (
    <Page>
      <Heading title={conflicts.length === 1 ? "1 save is already in pkhemu" : `${conflicts.length} saves are already in pkhemu`}>
        <p className="text-sm text-muted-foreground">Ticked saves replace pkhemu's. pkhemu's saves go to Backups first.</p>
      </Heading>
      <ul className="grid grid-cols-1 divide-y rounded-xl border bg-card">
        {conflicts.map((conflict) => (
          <ConflictRow
            key={conflict.save.game}
            conflict={conflict}
            ticked={ticked.has(conflict.save.game)}
            onTick={(on) => tick(conflict.save.game, on)}
          />
        ))}
      </ul>
      <Actions>
        <Button variant="outline" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button size="lg" onClick={() => onContinue(ticked)}>
          Continue
        </Button>
      </Actions>
    </Page>
  );
}

export function Copying({ done, total, game, cancelling, onCancel }: { done: number; total: number; game: string; cancelling: boolean; onCancel(): void }) {
  return (
    <Page>
      <Heading title="Copying games" />
      <div className="grid gap-2">
        <Progress value={(done / Math.max(total, 1)) * 100} aria-label="Copying games" />
        <p className="truncate text-sm text-muted-foreground">{`${Math.min(done + 1, total)} of ${total} · ${game}`}</p>
      </div>
      <Button variant="secondary" size="lg" disabled={cancelling} onClick={onCancel}>
        Cancel
      </Button>
    </Page>
  );
}

type Found = { folder: PickedFolder; scan: FolderScan; saves: FolderScan[]; library: ImportLibrary };

const withSaves = (scan: FolderScan, saves: FolderScan[]) => saves.reduce(addSaves, scan);

type Step =
  | { name: "where" }
  | { name: "scanning"; folder: PickedFolder; saves: boolean }
  | { name: "summary" }
  | { name: "folder" }
  | { name: "conflicts"; conflicts: Conflict[]; answer(ticked: Set<string> | null): void }
  | { name: "copying"; done: number; total: number; game: string };

type CopyStep = { name: string; rom?: RomImport; save?: SaveImport };

export function ImportFolder({
  libraryHost,
  source,
  delta = false,
  onClose,
  onDone,
}: {
  libraryHost: LibraryHost;
  source?: PickedFolder;
  delta?: boolean;
  onClose(message?: string): void;
  onDone(message: string): void;
}) {
  const host = useImportHost();
  const gamesFolder = useGamesFolder();
  const { synced, cloudGames } = useSync();
  const onboarding = !source;
  const [step, setStep] = useState<Step>(source ? { name: "scanning", folder: source, saves: false } : { name: "where" });
  const [found, setFound] = useState<Found>();
  const [error, setError] = useState<string>();
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);
  const starting = useRef(false);
  const latestScan = useRef(0);
  const cancelled = useRef(false);
  const destination = gamesFolder.status === "ready" ? gamesFolder.folder : null;
  const go = (kind: Parameters<typeof navigate>[0], next: Step) => navigate(kind, () => setStep(next));

  const loadLibrary = async (folder: string | null): Promise<ImportLibrary> => {
    if (!folder) return { games: [], sha1s: {} };
    const scanned = withCloudGames(await scanLibrary((path) => libraryHost.listDir(folder, path)), cloudGames);
    const games = scanned.sections.flatMap((section) => section.games);
    const local = games.filter((game) => !game.cloudOnly).map((game) => game.path);
    return { games, sha1s: local.length ? await host.sha1s(folder, local) : {} };
  };

  const scan = async (folder: PickedFolder, saves: boolean) => {
    const scanning = ++latestScan.current;
    try {
      const library = saves && found ? found.library : await loadLibrary(destination);
      const scanned = await host.scan(folder.folder, !saves && Object.keys(library.sha1s).length > 0);
      if (scanning !== latestScan.current) return;
      setFound(saves && found ? { ...found, saves: [...found.saves, scanned] } : { folder, scan: scanned, saves: [], library });
      setError(undefined);
      go("peer", { name: "summary" });
    } catch (reason) {
      if (scanning !== latestScan.current) return;
      if (!found && !onboarding) return onClose(String(reason));
      setError(String(reason));
      go("back", found ? { name: "summary" } : { name: "where" });
    }
  };

  const choose = async (saves: boolean) => {
    try {
      const folder = await host.pickFolder();
      if (!folder) return;
      go("forward", { name: "scanning", folder, saves });
      await scan(folder, saves);
    } catch (reason) {
      setError(String(reason));
    }
  };

  useEffect(() => {
    if (source) void scan(source, false);
    return () => {
      latestScan.current++;
    };
  }, []);

  const copy = async (folder: string) => {
    if (!found || starting.current) return;
    starting.current = true;
    setBusy(true);
    try {
      await copyInto(folder, found);
    } finally {
      starting.current = false;
      setBusy(false);
    }
  };

  const copyInto = async (folder: string, { folder: source, scan: scanned, saves: savesFolders, library: known }: Found) => {
    const library = onboarding ? await loadLibrary(folder) : known;
    // The scan ran before this folder existed, so it skipped hashing. Hash now to skip games the folder already has.
    const rescan = onboarding && Object.keys(library.sha1s).length > 0;
    const scan = rescan ? await host.scan(source.folder, true) : scanned;
    const plan = planImport(withSaves(scan, savesFolders).files, library);
    const roms = new Set(plan.roms.map((rom) => rom.path));
    const failed: string[] = [];
    let found = plan.known > 0;
    const saves: SaveImport[] = [];
    const conflicts: Conflict[] = [];
    for (const save of plan.saves) {
      if (roms.has(save.game)) {
        saves.push(save);
        continue;
      }
      try {
        const existing = await host.existingSave(folder, save.game, save.file);
        if (existing?.same) {
          found = true;
          continue;
        }
        if (!existing) saves.push(save);
        else conflicts.push({ save, game: library.games.find((game) => game.path === save.game) ?? gameAt(save.game), existing: existing.modified });
      } catch (reason) {
        failed.push(String(reason));
      }
    }
    if (conflicts.length) {
      const ticked = await new Promise<Set<string> | null>((answer) => go("forward", { name: "conflicts", conflicts, answer }));
      if (!ticked) return go("back", { name: "summary" });
      saves.push(...conflicts.filter((conflict) => ticked.has(conflict.save.game)).map((conflict) => conflict.save));
    }

    const saveFor = new Map(saves.map((save) => [save.game, save]));
    const steps: CopyStep[] = [
      ...plan.roms.map((rom) => ({ name: gameName(rom.path), rom, save: saveFor.get(rom.path) })),
      ...saves.filter((save) => !roms.has(save.game)).map((save) => ({ name: gameName(save.game), save })),
    ];
    cancelled.current = false;
    setCancelling(false);
    go("forward", { name: "copying", done: 0, total: steps.length, game: steps[0]?.name ?? "" });
    const copied = { roms: [] as string[], saves: [] as string[] };
    for (const [done, { name, rom, save }] of steps.entries()) {
      if (cancelled.current) break;
      setStep({ name: "copying", done, total: steps.length, game: name });
      try {
        if (rom) {
          await host.copyRom(folder, rom.file.file, rom.path);
          copied.roms.push(rom.path);
        }
        if (save) {
          await host.copySave(folder, save);
          copied.saves.push(save.game);
        }
      } catch (reason) {
        failed.push(String(reason));
      }
    }
    void synced(folder, [...copied.roms, ...copied.saves]);
    onDone(folderImportToast({ games: plan.roms.length, roms: copied.roms.length, saves: copied.saves.length, found, failed }));
  };

  const fail = (work: () => Promise<void>) => () =>
    void work().catch((reason) => {
      setError(String(reason));
      go("back", { name: "summary" });
    });

  const back = (() => {
    switch (step.name) {
      case "where":
        return () => onClose();
      case "scanning":
        return () => {
          latestScan.current++;
          if (step.saves) go("back", { name: "summary" });
          else if (onboarding) go("back", { name: "where" });
          else onClose();
        };
      case "summary":
        if (busy) return () => {};
        return onboarding ? () => go("back", { name: "where" }) : () => onClose();
      case "folder":
        return busy ? () => {} : () => go("back", { name: "summary" });
      case "conflicts":
        return () => step.answer(null);
      case "copying":
        return () => {};
    }
  })();
  useBack(back);

  const files = found && withSaves(found.scan, found.saves);
  const plan = found && files && planImport(files.files, found.library);
  const summary = plan && files.files.some((file) => romSystem(file)) ? summarize(plan, files) : null;

  return (
    <>
      {step.name === "where" && (
        <Screen key="where">
          <WhereAreYourGames delta={delta} error={error} onBack={back} onChoose={() => void choose(false)} />
        </Screen>
      )}
      {step.name === "scanning" && (
        <Screen key="scanning">
          <Scanning folder={step.folder.name} saves={step.saves} />
        </Screen>
      )}
      {step.name === "summary" && found && (
        <Screen key="summary">
          <FolderSummaryScreen
            folder={found.folder.name}
            summary={summary}
            saves={plan?.saves.length ?? 0}
            onboarding={onboarding}
            busy={busy}
            error={error}
            onBack={back}
            onAddSaves={() => void choose(true)}
            onChooseAnother={() => void choose(false)}
            onContinue={destination ? fail(() => copy(destination)) : () => go("forward", { name: "folder" })}
          />
        </Screen>
      )}
      {step.name === "folder" && (
        <Screen key="folder">
          <NewFolder
            title="Now a folder for pkhemu"
            line="Your games get copied here, sorted by system. The originals stay where they are."
            onBack={back}
            onReady={(folder) => fail(() => copy(folder))()}
          />
        </Screen>
      )}
      {step.name === "conflicts" && (
        <Screen key="conflicts">
          <SaveConflicts conflicts={step.conflicts} onBack={back} onContinue={step.answer} />
        </Screen>
      )}
      {step.name === "copying" && (
        <Screen key="copying">
          <Copying
            done={step.done}
            total={step.total}
            game={step.game}
            cancelling={cancelling}
            onCancel={() => {
              cancelled.current = true;
              setCancelling(true);
            }}
          />
        </Screen>
      )}
    </>
  );
}
