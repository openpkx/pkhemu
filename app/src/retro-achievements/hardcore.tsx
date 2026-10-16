import { useEffect, useState } from "react";
import { useBackGesture } from "@/back/back";
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
import type { Input } from "@/input/input";
import type { SavedTrainer } from "@/game-page/saveSummary";
import { PadNavigation } from "@/pad-navigation/PadNavigation";
import { useRetroAchievements } from "./retroAchievements";

/** What hardcore locks while a game runs. Fast-forward and making save states stay. */
export const locked = {
  editSave: "Editing the save ends hardcore until you restart the game",
  undoEdit: "Undoing the edit ends hardcore until you restart the game",
  cheats: "Cheats end hardcore until you restart the game",
  loadState: "Loading a state ends hardcore until you restart the game",
  undoLoad: "Undoing the load ends hardcore until you restart the game",
};

export type Locked = keyof typeof locked;

export function useHardcoreLock(input: Input) {
  const { playingHardcore, leaveHardcore } = useRetroAchievements();
  const [asking, setAsking] = useState<{ feature: Locked; go(): void }>();
  const onBackGesture = useBackGesture();
  const cancel = () => setAsking(undefined);

  useEffect(() => {
    if (asking) return onBackGesture(() => setAsking(undefined));
  }, [asking, onBackGesture]);

  const guard = (feature: Locked, go: () => void) => () => (playingHardcore ? setAsking({ feature, go }) : go());

  const soften = () => {
    if (!asking) return;
    setAsking(undefined);
    void leaveHardcore().catch((reason) => console.error("RetroAchievements:", reason));
    asking.go();
  };

  const dialog = (
    <AlertDialog open={!!asking} onOpenChange={(open) => !open && cancel()}>
      <AlertDialogContent onEscapeKeyDown={(event) => event.stopPropagation()}>
        {asking && <PadNavigation input={input} />}
        <AlertDialogHeader>
          <AlertDialogTitle>{asking && locked[asking.feature]}</AlertDialogTitle>
          <AlertDialogDescription>Achievements you unlock after this count as softcore.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={soften}>Switch to softcore</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { guard, asking: !!asking, dialog };
}

export type Launch = { resume: boolean; slot?: number; hardcore: boolean };

type Asking = { kind: "resume" } | { kind: "edited" };

/**
 * Settles how a game starts with the Hardcore switch on. A game without a set plays as asked. A start from a state
 * asks whether to resume in softcore or restart in hardcore, and a save pkhemu changed asks whether to play hardcore.
 */
export function useHardcoreLaunch({
  folder,
  path,
  resume,
  slot,
  ready,
  readTrainer,
  input,
  onQuit,
}: {
  folder: string;
  path: string;
  resume: boolean;
  slot?: number;
  /** Whether the game's files are settled, as once sync has checked the other devices. */
  ready: boolean;
  /** The trainer in the save, or null for a save the engine can't read. */
  readTrainer(): Promise<SavedTrainer | null>;
  input: Input;
  onQuit(): void;
}) {
  const { hardcore, game, edited, settleEdited, setPlayingHardcore } = useRetroAchievements();
  const [launch, setLaunch] = useState<Launch>();
  const [asking, setAsking] = useState<Asking>();
  const [checking, setChecking] = useState(false);
  const onBackGesture = useBackGesture();

  const decide = (decided: Launch) => {
    setAsking(undefined);
    setLaunch(decided);
    setPlayingHardcore(decided.hardcore);
  };

  const stillEdited = async () => {
    if (!(await edited(folder, path))) return false;
    const trainer = await readTrainer().catch(() => null);
    return trainer ? settleEdited(folder, path, trainer) : true;
  };

  const restart = async () => {
    setAsking(undefined);
    if (await stillEdited().catch(() => true)) setAsking({ kind: "edited" });
    else decide({ resume: false, hardcore: true });
  };

  useEffect(() => {
    if (!ready || launch || asking || checking) return;
    if (!hardcore) return decide({ resume, slot, hardcore: false });
    setChecking(true);
    void (async () => {
      const set = await game(folder, path).catch(() => null);
      if (!set) decide({ resume, slot, hardcore: false });
      else if (resume || slot !== undefined) setAsking({ kind: "resume" });
      else await restart();
      setChecking(false);
    })();
  });

  useEffect(() => () => setPlayingHardcore(false), [setPlayingHardcore]);

  useEffect(() => {
    if (asking) return onBackGesture(onQuit);
  }, [asking, onBackGesture, onQuit]);

  const dialog = (
    // Every button closes the dialog too, so only Escape quits.
    <AlertDialog open={!!asking}>
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          event.stopPropagation();
          onQuit();
        }}
      >
        {asking && <PadNavigation input={input} />}
        {asking?.kind === "resume" ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Resume in softcore?</AlertDialogTitle>
              <AlertDialogDescription>
                Hardcore can't start from a state. Restart to play hardcore from your last save in game.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction variant="outline" onClick={() => void restart()}>
                Restart (hardcore)
              </AlertDialogAction>
              <AlertDialogAction onClick={() => decide({ resume, slot, hardcore: false })}>Resume (softcore)</AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Edited save</AlertDialogTitle>
              <AlertDialogDescription>
                This save was changed in pkhemu. RetroAchievements treats hardcore unlocks on an edited save as cheating and
                can reset your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction variant="outline" onClick={() => decide({ resume: false, hardcore: true })}>
                Play hardcore anyway
              </AlertDialogAction>
              <AlertDialogAction onClick={() => decide({ resume: false, hardcore: false })}>Play in softcore</AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );

  return { launch, dialog };
}
