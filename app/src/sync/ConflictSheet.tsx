import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useEngine } from "@pkhex-everywhere/react";
import type { GameProgress } from "@pkhex-everywhere/engine";
import { when } from "@/backups/backups";
import { BottomSheet } from "@/components/BottomSheet";
import { WithSkeleton } from "@/components/WithSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressStats } from "@/game-page/ProgressStats";
import { summaryOf, type SaveSummaryHost, type SummaryCacheHost } from "@/game-page/saveSummary";
import { buttons, type Input } from "@/input/input";
import { pngDataUrl } from "@/lib/utils";
import type { SlotsHost } from "@/save-states/StatesScreen";
import type { Choice, Conflict, ConflictsHost, ConflictVersion } from "./sync";

export type ConflictSaveHost = SummaryCacheHost & Pick<SaveSummaryHost, "readSave" | "saveFormat"> & Pick<SlotsHost, "stateScreenshot">;

type Place = { host: ConflictSaveHost; cloud: ConflictsHost; folder: string; path: string };

const labels: Record<Choice, string> = { device: "This device", cloud: "Cloud" };
const choices: Choice[] = ["device", "cloud"];

const slotOf = (file: string) => Number(file.slice("slot-".length));

function useProgress({ host, cloud, folder, path }: Place, choice: Choice) {
  const engine = useEngine();
  const [progress, setProgress] = useState<GameProgress | null>();

  useEffect(() => {
    let current = true;
    void (async () => {
      const file = await (choice === "device" ? host.readSave(folder, path) : cloud.cloudSave(folder, path));
      if (!file) return null;
      const format = await host.saveFormat(path).catch(() => null);
      const summary = await summaryOf(engine, host, file.sha256, async () => new Uint8Array(file.bytes), () => current, format?.id);
      return summary?.progress ?? null;
    })()
      .catch(() => null)
      .then((progress) => current && setProgress(progress));
    return () => {
      current = false;
    };
  }, [engine, host, cloud, folder, path, choice]);

  return progress;
}

function useScreenshot({ host, cloud, folder, path }: Place, file: string, choice: Choice) {
  const [screenshot, setScreenshot] = useState<string>();

  useEffect(() => {
    let current = true;
    (choice === "device" ? host.stateScreenshot(folder, path, slotOf(file)) : cloud.cloudScreenshot(folder, path, file)).then(
      (bytes) => current && setScreenshot(bytes ? pngDataUrl(bytes) : undefined),
      (error) => console.error(error),
    );
    return () => {
      current = false;
    };
  }, [host, cloud, folder, path, file, choice]);

  return screenshot;
}

type VersionProps = { choice: Choice; version: ConflictVersion; busy: boolean; onPick(): void };

function Version({ choice, version, busy, onPick, media, children }: VersionProps & { media?: ReactNode; children?: ReactNode }) {
  return (
    <Button
      variant="outline"
      disabled={busy}
      className="motion-press h-auto flex-col items-stretch justify-start gap-0 overflow-hidden rounded-lg p-0 text-left font-normal whitespace-normal"
      onClick={onPick}
    >
      {media}
      <span className="flex flex-col gap-1 px-3 py-2">
        <span className="font-medium">{labels[choice]}</span>
        <span className="text-sm text-muted-foreground">{version.savedOn}</span>
        {version.modified !== null && <span className="text-xs text-muted-foreground">{when(new Date(version.modified), new Date())}</span>}
        {version.cheats && (
          <Badge variant="outline" className="self-start">
            Cheats on
          </Badge>
        )}
        {children}
      </span>
    </Button>
  );
}

function SaveCard({ place, ...props }: VersionProps & { place: Place }) {
  const progress = useProgress(place, props.choice);
  return (
    <Version {...props}>
      <WithSkeleton loading={progress === undefined} skeleton={<Skeleton className="h-5 w-full" />}>
        {progress && <ProgressStats progress={progress} />}
      </WithSkeleton>
    </Version>
  );
}

function SlotCard({ place, file, ...props }: VersionProps & { place: Place; file: string }) {
  const screenshot = useScreenshot(place, file, props.choice);
  return (
    <Version
      {...props}
      media={
        <span className="relative isolate flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted">
          {screenshot && (
            <>
              <img src={screenshot} alt="" aria-hidden className="absolute inset-0 -z-10 size-full scale-110 object-cover blur-xl brightness-[0.4]" />
              <img src={screenshot} alt="" className="max-h-full max-w-full object-contain [image-rendering:pixelated]" />
            </>
          )}
        </span>
      }
    />
  );
}

export function ConflictSheet({
  open = true,
  host,
  cloud,
  folder,
  path,
  conflicts,
  input,
  onResolved,
  onClose,
}: {
  open?: boolean;
  host: ConflictSaveHost;
  cloud: ConflictsHost;
  folder: string;
  path: string;
  conflicts: Conflict[];
  input: Input;
  onResolved(): void;
  onClose(): void;
}) {
  const place = { host, cloud, folder, path };
  const [left, setLeft] = useState(conflicts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const list = useRef<HTMLDivElement>(null);

  const pick = async (file: string, choice: Choice) => {
    setBusy(true);
    setError(undefined);
    try {
      await cloud.resolve(folder, path, file, choice);
    } catch (error) {
      console.error(error);
      setError("Couldn't keep that version. Try again.");
      setBusy(false);
      return;
    }
    const remaining = left.filter((conflict) => conflict.file !== file);
    // The last pick leaves the sheet as it was, so it doesn't empty while it closes.
    if (remaining.length === 0) return onResolved();
    setLeft(remaining);
    setBusy(false);
  };

  const move = (step: number) => {
    const picks = [...list.current!.querySelectorAll<HTMLButtonElement>("button:enabled")];
    const at = picks.indexOf(document.activeElement as HTMLButtonElement);
    picks[at < 0 ? 0 : (at + step + picks.length) % picks.length]?.focus();
  };

  const onPadPress = (button: number) => {
    if (button === buttons.up || button === buttons.left) move(-1);
    if (button === buttons.down || button === buttons.right) move(1);
    if (button === buttons.a && list.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).click();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[event.key];
    if (!step) return;
    event.preventDefault();
    move(step);
  };

  const save = left.find(({ file }) => file === "save");
  const slots = left.filter(({ file }) => file !== "save");

  return (
    <BottomSheet
      open={open}
      title="This game changed on another device"
      input={input}
      onClose={onClose}
      onPadPress={onPadPress}
      centeredFromSm
      className="sm:max-w-md"
    >
      <div ref={list} className="grid gap-4 px-3" onKeyDown={onKeyDown}>
        <p className="text-sm text-muted-foreground">Pick the version to keep. The other one becomes a backup.</p>
        {save && (
          <div role="group" aria-label="Save" className="grid grid-cols-2 gap-3">
            {choices.map((choice) => (
              <SaveCard key={choice} place={place} choice={choice} version={save[choice]} busy={busy} onPick={() => void pick(save.file, choice)} />
            ))}
          </div>
        )}
        {slots.map((slot) => (
          <div key={slot.file} role="group" aria-label={`Slot ${slotOf(slot.file)}`} className="grid gap-2">
            <h3 className="text-sm font-medium">Slot {slotOf(slot.file)}</h3>
            <div className="grid grid-cols-2 gap-3">
              {choices.map((choice) => (
                <SlotCard
                  key={choice}
                  place={place}
                  file={slot.file}
                  choice={choice}
                  version={slot[choice]}
                  busy={busy}
                  onPick={() => void pick(slot.file, choice)}
                />
              ))}
            </div>
          </div>
        ))}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </BottomSheet>
  );
}
