import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useBack } from "@/back/back";
import { WithSkeleton } from "@/components/WithSkeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { gameTitle } from "@/game-page/details";
import { GamePicker } from "@/library/GamePicker";
import type { Game } from "@/library/scan";
import type { PatchOriginHost } from "@/preferences/gameSettings";
import { systemNames, type System } from "@/systems";

export type PatchFormat = "ips" | "ups" | "bps" | "xdelta";

export type PickedPatch = { file: string; name: string; format: PatchFormat | null; baseChecked: boolean };

export type OpenedPatch = { file: string; name: string; archive?: string | null; format: PatchFormat; games: Game[] };

export type PatchNeeds = { crc32: number; build: string | null };

export type PatchBases = { checked: boolean; games: string[]; needs?: PatchNeeds | null };

export type PatchFailure =
  | { kind: "wrongBase"; expectedCrc32: number | null }
  | { kind: "unknownFormat" }
  | { kind: "malformed" }
  | { kind: "tooBig" }
  | { kind: "nameTaken" }
  | { kind: "badName" }
  | { kind: "failed"; message: string };

export type PatchDrops = { hover(over: boolean): void; drop(files: string[]): void };

export type PatchRomHost = PatchOriginHost & {
  baseBuild(folder: string, path: string): Promise<string | null>;
  pick(): Promise<PickedPatch | null>;
  bases(folder: string, patch: string, games: string[]): Promise<PatchBases>;
  dropped(file: string): Promise<PickedPatch>;
  watchDrops?(listener: PatchDrops): () => void;
  checkName(folder: string, system: System, name: string): Promise<void>;
  create(folder: string, path: string, system: System, name: string, patch: string): Promise<{ path: string; sha256: string; baseChecked: boolean }>;
};

const noHost: PatchRomHost = {
  baseBuild: () => Promise.reject(new Error("Patching needs a PatchRomProvider")),
  pick: () => Promise.reject(new Error("Patching needs a PatchRomProvider")),
  bases: () => Promise.reject(new Error("Patching needs a PatchRomProvider")),
  dropped: () => Promise.reject(new Error("Patching needs a PatchRomProvider")),
  checkName: () => Promise.reject(new Error("Patching needs a PatchRomProvider")),
  create: () => Promise.reject(new Error("Patching needs a PatchRomProvider")),
  patchedFrom: () => Promise.reject(new Error("Patching needs a PatchRomProvider")),
  keepPatchedFrom: () => Promise.reject(new Error("Patching needs a PatchRomProvider")),
};

const PatchRomContext = createContext<PatchRomHost>(noHost);

export function PatchRomProvider({ host, children }: { host: PatchRomHost; children: ReactNode }) {
  return <PatchRomContext.Provider value={host}>{children}</PatchRomContext.Provider>;
}

export function usePatchRom(): PatchRomHost {
  return useContext(PatchRomContext);
}

const unknownFormat = "This isn't an IPS, UPS, BPS or xdelta patch.";

const isFailure = (reason: unknown): reason is PatchFailure => typeof reason === "object" && reason !== null && "kind" in reason;

const crc32Hex = (crc32: number) => crc32.toString(16).toUpperCase().padStart(8, "0");

function failureMessage(reason: unknown, system?: System) {
  if (!isFailure(reason)) return String(reason);
  switch (reason.kind) {
    case "wrongBase":
      return reason.expectedCrc32 === null
        ? "This patch is for a different ROM."
        : `This patch is for a different ROM, one with CRC32 ${crc32Hex(reason.expectedCrc32)}.`;
    case "unknownFormat":
      return unknownFormat;
    case "malformed":
      return "The patch file is damaged.";
    case "tooBig":
      return system ? `The patched ROM would be bigger than a ${systemNames[system]} cartridge.` : "The patched ROM would be too big.";
    case "nameTaken":
      return `A game with this name is already in the ${system} folder.`;
    case "badName":
      return "A file can't have this name.";
    case "failed":
      return reason.message;
  }
}

const withoutExtension = (name: string) => (name.lastIndexOf(".") > 0 ? name.slice(0, name.lastIndexOf(".")) : name);

const genericNames = ["patch", "rom", "hack"];

function hackName({ name, archive }: OpenedPatch) {
  const named = withoutExtension(name);
  return archive && genericNames.includes(named.toLowerCase()) ? withoutExtension(archive) : named;
}

type NameCheck = { name: string; base: string; problem?: string };

type Bases = { checked: boolean; games: Game[]; needs?: PatchNeeds | null };

function noneFit(needs?: PatchNeeds | null) {
  if (!needs) return "None of your games fit this patch.";
  return `None of your games fit this patch. It needs ${needs.build ?? `the ROM with CRC32 ${crc32Hex(needs.crc32)}`}.`;
}

function BasePicker({
  bases,
  base,
  labelId,
  adding,
  onPick,
  onAddGame,
}: {
  bases: Bases;
  base: Game | null;
  labelId: string;
  adding: boolean;
  onPick(game: Game | null): void;
  onAddGame?(): void;
}) {
  return (
    <>
      {!bases.checked && (
        <p className="text-muted-foreground">This patch can't be checked against your games. Make sure you choose the one it asks for.</p>
      )}
      {bases.games.length === 0 ? (
        <>
          <p className="text-muted-foreground">{noneFit(bases.needs)}</p>
          {onAddGame && (
            <Button variant="outline" disabled={adding} aria-busy={adding || undefined} onClick={onAddGame}>
              {adding && <Spinner />}
              Add game
            </Button>
          )}
        </>
      ) : (
        <GamePicker games={bases.games} value={base} labelledBy={labelId} onPick={onPick} />
      )}
    </>
  );
}

export function PatchRomDialog({
  open,
  folder,
  game,
  opened,
  onAddGame,
  onClose,
  onCreated,
}: {
  open: boolean;
  folder: string;
  onClose(): void;
  onCreated(game: Game): void;
} & ({ game: Game; opened?: never; onAddGame?: never } | { game?: never; opened: OpenedPatch; onAddGame?(): Promise<Game[]> })) {
  const host = usePatchRom();
  const nameId = useId();
  const baseId = useId();
  const [base, setBase] = useState<Game | null>(game ?? null);
  const [bases, setBases] = useState<Bases | null>();
  const [games, setGames] = useState(opened?.games);
  const [adding, setAdding] = useState(false);
  const [build, setBuild] = useState<string | null>();
  const [patch, setPatch] = useState<PickedPatch>();
  const [name, setName] = useState("");
  const [checked, setChecked] = useState<NameCheck>();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
  const [dropping, setDropping] = useState(false);
  const latestName = useRef(name);
  const latestBase = useRef(base);
  latestBase.current = base;
  const baseLabel = build ?? (base ? gameTitle(base.name) : "");

  useEffect(() => {
    setBuild(undefined);
    if (!base) return;
    let current = true;
    host.baseBuild(folder, base.path).then(
      (build) => current && setBuild(build),
      () => current && setBuild(null),
    );
    return () => {
      current = false;
    };
  }, [host, folder, base?.path]);

  const checkName = async (typed: string, on = latestBase.current) => {
    const name = typed.trim();
    latestName.current = name;
    setName(typed);
    setError(undefined);
    if (!on) return;
    let problem: string | undefined;
    await host.checkName(folder, on.system, name).catch((reason) => (problem = failureMessage(reason, on.system)));
    if (latestName.current === name && latestBase.current?.path === on.path) setChecked({ name, base: on.path, problem });
  };

  const pickBase = (picked: Game | null) => {
    setBase(picked);
    latestBase.current = picked;
    void checkName(latestName.current, picked);
  };

  const takeBases = useRef((_found: PatchBases) => {});
  takeBases.current = (found) => {
    if (!opened || !games) return;
    const fitting = games.filter((game) => found.games.includes(game.path));
    setBases({ checked: found.checked, games: fitting, needs: found.needs });
    setPatch({ file: opened.file, name: opened.name, format: opened.format, baseChecked: found.checked });
    const only = found.checked && fitting.length === 1 ? fitting[0] : null;
    setBase(only);
    latestBase.current = only;
    const firstLoad = !patch;
    void checkName(firstLoad ? hackName(opened) : latestName.current, only);
  };

  useEffect(() => {
    if (!opened || !games) return;
    let current = true;
    host.bases(folder, opened.file, games.map((game) => game.path)).then(
      (found) => current && takeBases.current(found),
      (reason) => {
        if (!current) return;
        setBases(null);
        setError(failureMessage(reason));
      },
    );
    return () => {
      current = false;
    };
  }, [host, folder, opened, games]);

  const addGame = async () => {
    if (!onAddGame) return;
    setAdding(true);
    setError(undefined);
    try {
      setGames(await onAddGame());
    } catch (reason) {
      setError(String(reason));
    } finally {
      setAdding(false);
    }
  };

  const choose = async (source: () => Promise<PickedPatch | null>) => {
    setError(undefined);
    try {
      const picked = await source();
      if (!picked) return;
      setPatch(picked);
      if (!picked.format) return;
      await checkName(withoutExtension(picked.name));
    } catch (reason) {
      setError(String(reason));
    }
  };

  const create = async () => {
    if (!patch || !base) return;
    setCreating(true);
    setError(undefined);
    try {
      const created = await host.create(folder, base.path, base.system, trimmed, patch.file);
      await host
        .keepPatchedFrom(created.path, { build: baseLabel, patch: patch.name, sha256: created.sha256 })
        .catch((reason) => console.error(reason));
      onCreated({ system: base.system, name: trimmed, path: created.path });
    } catch (reason) {
      if (isFailure(reason) && reason.kind === "nameTaken")
        setChecked({ name: trimmed, base: base.path, problem: failureMessage(reason, base.system) });
      else setError(failureMessage(reason, base.system));
    } finally {
      setCreating(false);
    }
  };

  const working = creating || adding;
  const close = () => !working && onClose();
  useBack(open ? close : undefined);

  const takeDrop = useRef(choose);
  takeDrop.current = choose;
  useEffect(() => {
    if (!open || creating || opened || !host.watchDrops) return;
    let listening = true;
    const stop = host.watchDrops({
      hover: (over) => listening && setDropping(over),
      drop: (files) => {
        if (!listening) return;
        setDropping(false);
        if (files[0]) void takeDrop.current(() => host.dropped(files[0]));
      },
    });
    return () => {
      listening = false;
      stop();
      setDropping(false);
    };
  }, [open, creating, opened, host]);

  const usable = !!patch?.format;
  const trimmed = name.trim();
  const nameChecked = checked?.name === trimmed && checked.base === base?.path;
  const nameProblem = nameChecked ? checked.problem : undefined;
  const canCreate = usable && !!base && !working && nameChecked && !checked.problem;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && close()}>
      <DialogContent
        showCloseButton={!working}
        data-dropping={dropping || undefined}
        className="data-dropping:ring-2 data-dropping:ring-primary"
      >
        <DialogHeader>
          <DialogTitle>Patch ROM</DialogTitle>
          <DialogDescription>{opened ? "Creates a new game. The base stays as it is." : "Creates a new game. This one stays as it is."}</DialogDescription>
        </DialogHeader>
        {opened ? (
          <div className="grid gap-2">
            <p id={baseId} className="text-muted-foreground">
              Base ROM
            </p>
            <WithSkeleton loading={bases === undefined} skeleton={<Skeleton className="h-9 w-full" />}>
              {bases && (
                <BasePicker
                  bases={bases}
                  base={base}
                  labelId={baseId}
                  adding={adding}
                  onPick={pickBase}
                  onAddGame={onAddGame && (() => void addGame())}
                />
              )}
            </WithSkeleton>
          </div>
        ) : (
          <div className="grid gap-1">
            <p className="text-muted-foreground">Base ROM</p>
            <WithSkeleton loading={build === undefined} skeleton={<Skeleton className="h-5 w-32" />}>
              <p className="font-medium">{baseLabel}</p>
            </WithSkeleton>
          </div>
        )}
        <div className="grid gap-2">
          {opened ? (
            <p className="text-muted-foreground">Patch</p>
          ) : (
            <Button variant="outline" disabled={creating} onClick={() => void choose(() => host.pick())}>
              Choose patch file
            </Button>
          )}
          {patch && <p className="break-all text-muted-foreground">{patch.name}</p>}
          {!opened && patch?.format && !patch.baseChecked && (
            <p className="text-muted-foreground">This patch can't be checked against this ROM. Make sure it's the one the patch asks for.</p>
          )}
          {patch && !patch.format && (
            <p role="alert" className="text-destructive">
              {unknownFormat}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={nameId}>Name</Label>
          <Input
            id={nameId}
            value={name}
            disabled={!usable || working}
            aria-invalid={nameProblem ? true : undefined}
            onChange={(event) => void checkName(event.target.value)}
          />
          {nameProblem && <p className="text-destructive">{nameProblem}</p>}
        </div>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="secondary" disabled={working} onClick={close}>
            Cancel
          </Button>
          <Button disabled={!canCreate} aria-busy={creating || undefined} onClick={() => void create()}>
            {creating && <Spinner />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
