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
import type { Game } from "@/library/scan";
import type { PatchOriginHost } from "@/preferences/gameSettings";
import { systemNames, type System } from "@/systems";

export type PatchFormat = "ips" | "ups" | "bps" | "xdelta";

export type PickedPatch = { file: string; name: string; format: PatchFormat | null };

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
  dropped(file: string): Promise<PickedPatch>;
  watchDrops?(listener: PatchDrops): () => void;
  checkName(folder: string, system: System, name: string): Promise<void>;
  create(folder: string, path: string, system: System, name: string, patch: string): Promise<{ path: string; sha256: string }>;
};

const noHost: PatchRomHost = {
  baseBuild: () => Promise.reject(new Error("Patching needs a PatchRomProvider")),
  pick: () => Promise.reject(new Error("Patching needs a PatchRomProvider")),
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

function failureMessage(reason: unknown, system: System) {
  if (!isFailure(reason)) return String(reason);
  switch (reason.kind) {
    case "wrongBase":
      return reason.expectedCrc32 === null
        ? "This patch is for a different ROM."
        : `This patch is for a different ROM, one with CRC32 ${reason.expectedCrc32.toString(16).toUpperCase().padStart(8, "0")}.`;
    case "unknownFormat":
      return unknownFormat;
    case "malformed":
      return "The patch file is damaged.";
    case "tooBig":
      return `The patched ROM would be bigger than a ${systemNames[system]} cartridge.`;
    case "nameTaken":
      return `A game with this name is already in the ${system} folder.`;
    case "badName":
      return "A file can't have this name.";
    case "failed":
      return reason.message;
  }
}

const withoutExtension = (name: string) => (name.lastIndexOf(".") > 0 ? name.slice(0, name.lastIndexOf(".")) : name);

type NameCheck = { name: string; problem?: string };

export function PatchRomDialog({
  open,
  folder,
  game,
  onClose,
  onCreated,
}: {
  open: boolean;
  folder: string;
  game: Game;
  onClose(): void;
  onCreated(game: Game): void;
}) {
  const host = usePatchRom();
  const nameId = useId();
  const [build, setBuild] = useState<string | null>();
  const [patch, setPatch] = useState<PickedPatch>();
  const [name, setName] = useState("");
  const [checked, setChecked] = useState<NameCheck>();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
  const [dropping, setDropping] = useState(false);
  const latestName = useRef(name);
  const base = build ?? gameTitle(game.name);

  useEffect(() => {
    let current = true;
    host.baseBuild(folder, game.path).then(
      (build) => current && setBuild(build),
      () => current && setBuild(null),
    );
    return () => {
      current = false;
    };
  }, [host, folder, game.path]);

  const checkName = async (typed: string) => {
    const name = typed.trim();
    latestName.current = name;
    setName(typed);
    setError(undefined);
    let problem: string | undefined;
    await host.checkName(folder, game.system, name).catch((reason) => (problem = failureMessage(reason, game.system)));
    if (latestName.current === name) setChecked({ name, problem });
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
    if (!patch) return;
    setCreating(true);
    setError(undefined);
    try {
      const created = await host.create(folder, game.path, game.system, trimmed, patch.file);
      await host
        .keepPatchedFrom(created.path, { build: base, patch: patch.name, sha256: created.sha256 })
        .catch((reason) => console.error(reason));
      onCreated({ system: game.system, name: trimmed, path: created.path });
    } catch (reason) {
      if (isFailure(reason) && reason.kind === "nameTaken") setChecked({ name: trimmed, problem: failureMessage(reason, game.system) });
      else setError(failureMessage(reason, game.system));
    } finally {
      setCreating(false);
    }
  };

  const close = () => !creating && onClose();
  useBack(open ? close : undefined);

  const takeDrop = useRef(choose);
  takeDrop.current = choose;
  useEffect(() => {
    if (!open || creating || !host.watchDrops) return;
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
  }, [open, creating, host]);

  const usable = !!patch?.format;
  const trimmed = name.trim();
  const nameProblem = checked?.name === trimmed ? checked.problem : undefined;
  const canCreate = usable && !creating && checked?.name === trimmed && !checked.problem;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && close()}>
      <DialogContent
        showCloseButton={!creating}
        data-dropping={dropping || undefined}
        className="data-dropping:ring-2 data-dropping:ring-primary"
      >
        <DialogHeader>
          <DialogTitle>Patch ROM</DialogTitle>
          <DialogDescription>Creates a new game. This one stays as it is.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1">
          <p className="text-muted-foreground">Base ROM</p>
          <WithSkeleton loading={build === undefined} skeleton={<Skeleton className="h-5 w-32" />}>
            <p className="font-medium">{base}</p>
          </WithSkeleton>
        </div>
        <div className="grid gap-2">
          <Button variant="outline" disabled={creating} onClick={() => void choose(() => host.pick())}>
            Choose patch file
          </Button>
          {patch && <p className="break-all text-muted-foreground">{patch.name}</p>}
          {patch?.format === "ips" && (
            <p className="text-muted-foreground">IPS patches can't be checked against this ROM. Make sure it's the one the patch asks for.</p>
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
            disabled={!usable || creating}
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
          <Button variant="secondary" disabled={creating} onClick={close}>
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
