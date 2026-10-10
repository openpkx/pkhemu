import { useEffect, useId, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { useBack } from "@/back/back";
import { when } from "@/backups/backups";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import type { Input } from "@/input/input";
import { pngDataUrl } from "@/lib/utils";
import { moveFocusWithArrows, PadNavigation, reveal } from "@/pad-navigation/PadNavigation";

export const SLOTS = 10;
export const REJECTED = "state-rejected";

export type SavedState = { slot: number; savedAt: number; playSinceSave: number | null; loadable: boolean };
export type StateSlots = { current: number | null; slots: SavedState[]; canUndoLoad: boolean };

export type SlotsHost = {
  listStates(folder: string, path: string): Promise<StateSlots>;
  stateScreenshot(folder: string, path: string, slot: number): Promise<number[] | null>;
  deleteState(folder: string, path: string, slot: number): Promise<void>;
};

export type StatesHost = SlotsHost & {
  saveState(slot: number): Promise<void>;
  loadState(folder: string, path: string, slot: number): Promise<void>;
  undoLoadState(folder: string, path: string): Promise<void>;
};

export type StateMessage = { message: string; undoable?: boolean };

export type Mode = "save" | "load";

export async function loadSlot(host: StatesHost, folder: string, path: string, slot: number): Promise<StateMessage> {
  try {
    await host.loadState(folder, path, slot);
    return { message: `Loaded slot ${slot}`, undoable: true };
  } catch (error) {
    return {
      message:
        String(error) === REJECTED ? `Slot ${slot} can't be loaded. It may come from an older version of the app.` : String(error),
    };
  }
}

export async function undoLoad(host: StatesHost, folder: string, path: string): Promise<StateMessage | undefined> {
  try {
    await host.undoLoadState(folder, path);
  } catch (error) {
    console.error(error);
    return { message: "Couldn't undo the load." };
  }
}

type Confirming = { slot: number; saved: SavedState; deleting?: boolean };

export function useStates(host: SlotsHost, folder: string, path: string, check: boolean) {
  const [states, setStates] = useState({ hasStates: false, canUndoLoad: false });

  useEffect(() => {
    if (!check) return;
    let current = true;
    host.listStates(folder, path).then(
      (states) => current && setStates({ hasStates: states.slots.length > 0, canUndoLoad: states.canUndoLoad }),
      (error) => console.error(error),
    );
    return () => {
      current = false;
    };
  }, [host, folder, path, check]);

  return states;
}

function useScreenshot(host: SlotsHost, folder: string, path: string, saved?: SavedState) {
  const [screenshot, setScreenshot] = useState<string>();

  useEffect(() => {
    if (!saved) return;
    let current = true;
    host.stateScreenshot(folder, path, saved.slot).then(
      (bytes) => current && setScreenshot(bytes ? pngDataUrl(bytes) : undefined),
      (error) => console.error(error),
    );
    return () => {
      current = false;
    };
  }, [host, folder, path, saved]);

  return screenshot;
}

function Tile({
  host,
  folder,
  path,
  slot,
  saved,
  now,
  pickable,
  busy,
  autoFocus,
  tileRef,
  onPick,
  onDelete,
}: {
  host: SlotsHost;
  folder: string;
  path: string;
  slot: number;
  saved?: SavedState;
  now: Date;
  pickable: boolean;
  busy: boolean;
  autoFocus: boolean;
  tileRef(tile: HTMLButtonElement | null): void;
  onPick(): void;
  onDelete(): void;
}) {
  const screenshot = useScreenshot(host, folder, path, saved);
  const [tileId, trashId] = [useId(), useId()];

  return (
    <div className="relative grid">
      <Button
        ref={tileRef}
        id={tileId}
        data-focus-right={saved ? trashId : undefined}
        variant="outline"
        disabled={busy || !pickable}
        autoFocus={autoFocus}
        className="motion-press h-auto flex-col items-stretch gap-0 overflow-hidden rounded-lg p-0 whitespace-normal"
        onClick={onPick}
      >
        <span className="relative isolate flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted">
          {screenshot && (
            <>
              <img
                src={screenshot}
                alt=""
                aria-hidden
                className="absolute inset-0 -z-10 size-full scale-110 object-cover blur-xl brightness-[0.4]"
              />
              <img src={screenshot} alt="" className="max-h-full max-w-full object-contain [image-rendering:pixelated]" />
            </>
          )}
        </span>
        <span className="flex flex-wrap items-baseline justify-between gap-x-2 px-3 py-2 text-left">
          <span className="font-medium">Slot {slot}</span>
          <span className="text-xs text-muted-foreground">{saved ? when(new Date(saved.savedAt), now) : "Empty"}</span>
        </span>
        {saved && !saved.loadable && (
          <span className="px-3 pb-2 text-left text-xs text-muted-foreground">
            Saved with a different version. Update pkhemu on both devices to load it.
          </span>
        )}
      </Button>
      {saved && (
        <Button
          id={trashId}
          data-focus-left={tileId}
          variant="secondary"
          size="icon-sm"
          aria-label={`Delete slot ${slot}`}
          disabled={busy}
          className="absolute top-1.5 right-1.5"
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      )}
    </div>
  );
}

export function SlotGrid({
  mode,
  host,
  folder,
  path,
  input,
  current: playingFrom,
  busy = false,
  onPick,
  onDeleted,
  onBack,
}: {
  mode: Mode;
  host: SlotsHost;
  folder: string;
  path: string;
  input?: Input;
  current?: number;
  busy?: boolean;
  onPick(slot: number): void;
  onDeleted?(left: SavedState[]): void;
  onBack(): void;
}) {
  const [states, setStates] = useState<StateSlots>();
  const [confirming, setConfirming] = useState<Confirming>();
  const [deleting, setDeleting] = useState(false);
  const working = busy || deleting;
  const shown = useRef<Confirming>(undefined);
  const tiles = useRef<Record<number, HTMLButtonElement | null>>({});
  const focusAfterDelete = useRef<number>(undefined);
  if (confirming) shown.current = confirming;
  const asking = shown.current;
  const now = new Date();
  const current = playingFrom ?? states?.current;

  const back = () => {
    if (working) return;
    if (confirming) setConfirming(undefined);
    else onBack();
  };
  useBack(back);

  useEffect(() => {
    let current = true;
    host.listStates(folder, path).then(
      (states) => current && setStates(states),
      (error) => console.error(error),
    );
    return () => {
      current = false;
    };
  }, [host, folder, path]);

  useEffect(() => {
    const slot = focusAfterDelete.current;
    if (slot === undefined || deleting) return;
    focusAfterDelete.current = undefined;
    const tile = [tiles.current[slot], ...Object.values(tiles.current)].find((tile) => tile && !tile.disabled);
    if (tile) reveal(tile);
  }, [states, deleting]);

  const remove = async (slot: number) => {
    if (!states) return;
    focusAfterDelete.current = slot;
    setDeleting(true);
    try {
      await host.deleteState(folder, path, slot);
      const left = states.slots.filter((saved) => saved.slot !== slot);
      setStates({ ...states, current: states.current === slot ? null : states.current, slots: left });
      onDeleted?.(left);
    } catch (error) {
      console.error(error);
    } finally {
      setDeleting(false);
    }
  };

  const confirm = () => {
    setConfirming(undefined);
    if (!confirming) return;
    if (confirming.deleting) void remove(confirming.slot);
    else onPick(confirming.slot);
  };

  const pick = (slot: number, saved?: SavedState) => {
    if (working) return;
    const ask = mode === "save" ? !!saved : slot !== current;
    if (ask && saved) setConfirming({ slot, saved });
    else onPick(slot);
  };

  const filled = new Map(states?.slots.map((saved) => [saved.slot, saved]));
  const enabled = (slot: number) => mode === "save" || !!filled.get(slot)?.loadable;
  const slots = Array.from({ length: SLOTS }, (_, i) => i + 1);
  const first = current && enabled(current) ? current : slots.find(enabled);

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-background">
      {input && <PadNavigation input={input} />}
      <ScreenHeader title={mode === "save" ? "Save state" : "Load state"} onBack={back} />
      <main className="mx-auto max-w-5xl p-4">
        {states && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" onKeyDown={moveFocusWithArrows}>
            {slots.map((slot) => (
              <Tile
                key={slot}
                host={host}
                folder={folder}
                path={path}
                slot={slot}
                saved={filled.get(slot)}
                now={now}
                pickable={enabled(slot)}
                busy={working}
                autoFocus={slot === first}
                tileRef={(tile) => {
                  tiles.current[slot] = tile;
                }}
                onPick={() => pick(slot, filled.get(slot))}
                onDelete={() => {
                  const saved = filled.get(slot);
                  if (!working && saved) setConfirming({ slot, saved, deleting: true });
                }}
              />
            ))}
          </div>
        )}
      </main>
      {asking?.deleting ? (
        <ConfirmDialog
          title={`Delete slot ${asking.slot}?`}
          action="Delete"
          destructive
          open={!!confirming}
          onConfirm={confirm}
          onCancel={() => setConfirming(undefined)}
          // The trash button focus would go back to is about to go away with the slot.
          onCloseAutoFocus={(event) => focusAfterDelete.current !== undefined && event.preventDefault()}
        >
          Its state from {when(new Date(asking.saved.savedAt), now)} goes away. Backups keep save files, not states.
        </ConfirmDialog>
      ) : mode === "save" ? (
        <ConfirmDialog
          title={`Overwrite slot ${asking?.slot}?`}
          action="Overwrite"
          open={!!confirming}
          onConfirm={confirm}
          onCancel={() => setConfirming(undefined)}
        >
          Slot {asking?.slot} holds a state from {asking && when(new Date(asking.saved.savedAt), now)}. Saving here replaces it.
        </ConfirmDialog>
      ) : (
        <ConfirmDialog
          title={`Load slot ${asking?.slot}?`}
          action="Load"
          open={!!confirming}
          onConfirm={confirm}
          onCancel={() => setConfirming(undefined)}
        >
          {'This replaces where you are now. To go back, pick "Undo load state" in the pause menu.'}
        </ConfirmDialog>
      )}
    </div>
  );
}

export function StatesScreen({
  mode,
  host,
  folder,
  path,
  input,
  onDone,
  onBack,
}: {
  mode: Mode;
  host: StatesHost;
  folder: string;
  path: string;
  input: Input;
  onDone(toast: StateMessage): void;
  onBack(): void;
}) {
  const [busy, setBusy] = useState(false);

  const run = async (slot: number) => {
    setBusy(true);
    if (mode === "load") return onDone(await loadSlot(host, folder, path, slot));
    try {
      await host.saveState(slot);
      onDone({ message: `Saved to slot ${slot}` });
    } catch (error) {
      onDone({ message: String(error) });
    }
  };

  return (
    <SlotGrid
      mode={mode}
      host={host}
      folder={folder}
      path={path}
      input={input}
      busy={busy}
      onPick={(slot) => void run(slot)}
      onBack={onBack}
    />
  );
}
