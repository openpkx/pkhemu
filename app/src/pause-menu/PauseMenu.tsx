import type { ReactNode } from "react";
import { FastForward as FastForwardIcon, FolderOpen, Gamepad2, LogOut, Pencil, Play, RotateCcw, Save, ScanSearch, Settings, Shuffle, Undo2, WandSparkles } from "lucide-react";
import { MenuDialog, MenuEntry } from "@/components/MenuDialog";
import type { FastForward } from "@/fast-forward/fastForward";
import type { Input } from "@/input/input";

export function PauseMenu({
  open,
  input,
  canEdit,
  canUndo,
  canSaveState,
  canLoadState,
  canUndoLoad,
  fastForward,
  pokemonInfo,
  onTogglePokemonInfo,
  randomized,
  onToggleRandomized,
  transferPak,
  onTransferPak,
  onResume,
  onEditSave,
  onUndo,
  onSaveState,
  onLoadState,
  onUndoLoad,
  onCheats,
  onSettings,
  onQuit,
}: {
  open?: boolean;
  input: Input;
  canEdit: boolean;
  canUndo: boolean;
  canSaveState: boolean;
  canLoadState: boolean;
  canUndoLoad: boolean;
  fastForward: FastForward;
  /** Undefined hides the switch, for games whose memory the app can't read. */
  pokemonInfo?: boolean;
  onTogglePokemonInfo(): void;
  /** Undefined hides the switch, like `pokemonInfo`. */
  randomized?: boolean;
  onToggleRandomized(): void;
  /** The game in the Transfer Pak. Undefined hides the entry, for games that don't use one. */
  transferPak?: string;
  onTransferPak?(): void;
  onResume(): void;
  onEditSave(): void;
  onUndo(): void;
  onSaveState(): void;
  onLoadState(): void;
  onUndoLoad(): void;
  onCheats(): void;
  onSettings(): void;
  onQuit(): void;
}) {
  return (
    <MenuDialog open={open} title="Paused" input={input} onClose={onResume}>
      <MenuEntry icon={<Play />} onClick={onResume}>
        Resume
      </MenuEntry>
      <MenuEntry icon={<Pencil />} disabled={!canEdit} onClick={onEditSave}>
        Edit save
      </MenuEntry>
      <MenuEntry icon={<Undo2 />} disabled={!canUndo} onClick={onUndo}>
        Undo last edit
      </MenuEntry>
      <MenuEntry icon={<Save />} disabled={!canSaveState} onClick={onSaveState}>
        Save state
      </MenuEntry>
      <MenuEntry icon={<FolderOpen />} disabled={!canLoadState} onClick={onLoadState}>
        Load state
      </MenuEntry>
      {canUndoLoad && (
        <MenuEntry icon={<RotateCcw />} onClick={onUndoLoad}>
          Undo load state
        </MenuEntry>
      )}
      <MenuEntry icon={<WandSparkles />} onClick={onCheats}>
        Cheats
      </MenuEntry>
      {transferPak !== undefined && (
        <MenuEntry icon={<Gamepad2 />} onClick={onTransferPak}>
          Transfer Pak
          <span aria-hidden className="ml-auto min-w-0 truncate text-sm text-muted-foreground">
            {transferPak}
          </span>
        </MenuEntry>
      )}
      <MenuEntry icon={<FastForwardIcon />} aria-pressed={fastForward.on} onClick={fastForward.toggle}>
        Fast-forward
        <span aria-hidden className="ml-auto text-sm text-muted-foreground">
          {fastForward.on ? `${fastForward.speed}×` : "Off"}
        </span>
      </MenuEntry>
      {pokemonInfo !== undefined && (
        <SwitchEntry icon={<ScanSearch />} on={pokemonInfo} onClick={onTogglePokemonInfo}>
          Pokémon info
        </SwitchEntry>
      )}
      {randomized !== undefined && (
        <SwitchEntry icon={<Shuffle />} on={randomized} onClick={onToggleRandomized}>
          Randomized
        </SwitchEntry>
      )}
      <MenuEntry icon={<Settings />} onClick={onSettings}>
        Settings
      </MenuEntry>
      <MenuEntry icon={<LogOut />} onClick={onQuit}>
        Quit
      </MenuEntry>
    </MenuDialog>
  );
}

function SwitchEntry({ icon, on, onClick, children }: { icon: ReactNode; on: boolean; onClick(): void; children: ReactNode }) {
  return (
    <MenuEntry icon={icon} role="switch" aria-checked={on} onClick={onClick}>
      {children}
      <span aria-hidden className="ml-auto text-sm text-muted-foreground">
        {on ? "On" : "Off"}
      </span>
    </MenuEntry>
  );
}
