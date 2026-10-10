import { useEffect, useState } from "react";
import { Ellipsis } from "lucide-react";
import { BoxArtSheet } from "@/box-art/BoxArtSheet";
import { Toast, useToast } from "@/components/Toast";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isUnavailable, useGameArt, type GameArtStatus } from "@/game-art/gameArt";
import type { Game } from "@/library/scan";
import { PatchRomDialog, usePatchRom } from "@/patch-rom/patchRom";
import type { PatchedFrom } from "@/preferences/gameSettings";

export function GameMenu({
  folder,
  game,
  deletesEverywhere,
  onChangeFormat,
  onPatched,
  onRemove,
  onDelete,
}: {
  folder: string;
  game: Game;
  deletesEverywhere: boolean;
  onChangeFormat?(): void;
  onPatched?(game: Game): void;
  onRemove?(): Promise<void>;
  onDelete(): Promise<void>;
}) {
  const { path } = game;
  const gameArt = useGameArt();
  const patchRom = usePatchRom();
  const [status, setStatus] = useState<GameArtStatus | null>();
  const [patchedFrom, setPatchedFrom] = useState<PatchedFrom | null>();
  const [menuOpens, setMenuOpens] = useState(0);
  const [patching, setPatching] = useState(false);
  const [patchOpens, setPatchOpens] = useState(0);
  const [changingBoxArt, setChangingBoxArt] = useState(false);
  const [boxArtOpens, setBoxArtOpens] = useState(0);
  const [toast, setToast] = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const cloudOnly = !!game.cloudOnly;

  useEffect(() => {
    if (cloudOnly) return;
    let current = true;
    gameArt.status(path).then(
      (status) => current && setStatus(status),
      () => {},
    );
    patchRom.patchedFrom(path).then(
      (from) => current && setPatchedFrom(from),
      () => {},
    );
    return () => {
      current = false;
    };
  }, [gameArt, patchRom, path, menuOpens, cloudOnly]);

  const reextract = async () => {
    try {
      await gameArt.reextract(folder, path);
      setStatus(null);
      setToast("Extracting game art again");
    } catch (reason) {
      setToast(String(reason));
    }
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (reason) {
      setToast(String(reason));
    } finally {
      setBusy(false);
    }
  };

  const openPatching = () => {
    setPatchOpens((opens) => opens + 1);
    setPatching(true);
  };

  const openBoxArt = () => {
    setBoxArtOpens((opens) => opens + 1);
    setChangingBoxArt(true);
  };

  return (
    <>
      <DropdownMenu onOpenChange={(open) => open && setMenuOpens((opens) => opens + 1)}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More" className="hover:bg-white/15 hover:text-white">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {patchedFrom && (
            <DropdownMenuLabel className="max-w-56 font-normal break-words">
              Patched from {patchedFrom.build} with {patchedFrom.patch}
            </DropdownMenuLabel>
          )}
          {isUnavailable(status) && (
            <DropdownMenuLabel className="max-w-56 font-normal">
              Game art isn't available for this ROM
            </DropdownMenuLabel>
          )}
          {!cloudOnly && (
            <>
              <DropdownMenuItem onSelect={openBoxArt}>Change box art</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void reextract()}>Re-extract game art</DropdownMenuItem>
              {onChangeFormat && <DropdownMenuItem onSelect={onChangeFormat}>Change save format</DropdownMenuItem>}
              <DropdownMenuItem onSelect={openPatching}>Patch ROM…</DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {onRemove && !cloudOnly && (
            <DropdownMenuItem disabled={busy} onSelect={() => void run(onRemove)}>
              Remove from this device
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" disabled={busy} onSelect={() => setConfirmingDelete(true)}>
            Delete…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {game.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletesEverywhere
                ? "This deletes the ROM, its save, states and backups from all your devices. It can't be undone."
                : "This deletes the ROM, its save, states and backups from this device. It can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void run(onDelete)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {patchOpens > 0 && (
        <PatchRomDialog
          key={patchOpens}
          open={patching}
          folder={folder}
          game={game}
          onClose={() => setPatching(false)}
          onCreated={(created) => {
            setPatching(false);
            onPatched?.(created);
          }}
        />
      )}
      {boxArtOpens > 0 && (
        <BoxArtSheet
          key={boxArtOpens}
          open={changingBoxArt}
          game={game}
          onClose={() => setChangingBoxArt(false)}
          onChanged={() => {
            setChangingBoxArt(false);
            setToast("Box art changed");
          }}
        />
      )}
      <Toast>{toast}</Toast>
    </>
  );
}
