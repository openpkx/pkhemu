import type { ReactNode } from "react";
import { ArrowLeftRight, FastForward as FastForwardIcon, FlaskConical, FolderOpen, Gamepad2, LogOut, Palette, Pencil, Play, RotateCcw, Save, ScanSearch, Settings, Shuffle, Trophy, Undo2, WandSparkles } from "lucide-react";
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
  onSwapScreens,
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
  achievements,
  onAchievements,
  skin,
  onSkin,
  research,
  onResearch,
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
  /** Undefined hides the entry, for games with one screen. */
  onSwapScreens?(): void;
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
  /** The tally, as in "34/72 · 410 pts". Undefined hides the entry, for games without a set or while signed out. */
  achievements?: string;
  onAchievements(): void;
  /** The skin and look, as in "Classic grey · Moulded". Undefined hides the entry, as while the touch controls are off. */
  skin?: string;
  onSkin(): void;
  /** Research's status, as in "Compare two saves". Undefined hides the entry, as on games whose save no layout reads. */
  research?: string;
  onResearch?(): void;
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
      {achievements !== undefined && (
        <MenuEntry icon={<Trophy />} onClick={onAchievements}>
          Achievements
          <span aria-hidden className="ml-auto min-w-0 truncate text-sm text-muted-foreground tabular-nums">
            {achievements}
          </span>
        </MenuEntry>
      )}
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
      {onSwapScreens && (
        <MenuEntry icon={<ArrowLeftRight />} onClick={onSwapScreens}>
          Swap screens
        </MenuEntry>
      )}
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
      {skin !== undefined && (
        <MenuEntry icon={<Palette />} className="h-auto min-h-11 py-1.5" onClick={onSkin}>
          <span className="grid min-w-0 text-left">
            Skin
            <span className="truncate text-sm font-normal text-muted-foreground">{skin}</span>
          </span>
        </MenuEntry>
      )}
      {research !== undefined && (
        <MenuEntry icon={<FlaskConical />} className="h-auto min-h-11 py-1.5" onClick={onResearch}>
          <span className="grid min-w-0 text-left">
            Research
            <span className="truncate text-sm font-normal text-muted-foreground">{research}</span>
          </span>
        </MenuEntry>
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
