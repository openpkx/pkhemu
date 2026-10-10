import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { STALE_AFTER_SECONDS } from "@/editor/saveFirst";

export type ResumeInfo = { playSinceSave: number | null; slot?: number };

export type ResumeCheckHost = {
  hasResumeState(folder: string, path: string): Promise<boolean>;
  resumeInfo(folder: string, path: string): Promise<ResumeInfo | null>;
};

export type UnsavedPlay = { seconds: number | null };

export async function findUnsavedPlay(host: ResumeCheckHost, folder: string, path: string): Promise<UnsavedPlay | undefined> {
  if (!(await host.hasResumeState(folder, path).catch(() => false))) return undefined;
  const info = await host.resumeInfo(folder, path).catch(() => null);
  const seconds = info?.playSinceSave ?? null;
  return seconds === null || seconds > STALE_AFTER_SECONDS ? { seconds } : undefined;
}

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"}`;

function duration(seconds: number) {
  return seconds >= 3600 ? plural(Math.floor(seconds / 3600), "hour") : plural(Math.floor(seconds / 60), "minute");
}

export function UnsavedResumeDialog({
  unsaved,
  consequence,
  onResume,
  onContinue,
  onCancel,
}: {
  unsaved?: UnsavedPlay;
  consequence: string;
  onResume(): void;
  onContinue(): void;
  onCancel(): void;
}) {
  const play = unsaved?.seconds ? `${duration(unsaved.seconds)} of play` : "play";
  return (
    <AlertDialog open={!!unsaved} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save in game first?</AlertDialogTitle>
          <AlertDialogDescription>
            Your resume point has {play} that isn't in the save. {consequence}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction variant="outline" onClick={onContinue}>
            Continue anyway
          </AlertDialogAction>
          <AlertDialogAction onClick={onResume}>Resume and save first</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
