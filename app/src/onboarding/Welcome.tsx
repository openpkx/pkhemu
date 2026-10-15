import { useState, type ReactNode } from "react";
import { ArrowRightLeft, ChevronRight, FolderHeart, FolderInput, Folder, History, Sparkles, TriangleAlert } from "lucide-react";
import { AppIcon } from "@/components/AppIcon";
import { SystemChips } from "@/components/SystemChip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useBack } from "@/back/back";
import { useGamesFolder, type GamesFolderHost, type UnfamiliarFolder } from "@/games-folder/gamesFolder";
import { useExperiment } from "@/lab/lab";
import { navigate, Screen } from "@/motion/motion";
import type { System } from "@/systems";

const isIos = (device: GamesFolderHost["device"]) => device === "iPhone" || device === "iPad";

function Choice({ icon, title, line, onClick }: { icon: ReactNode; title: string; line: string; onClick(): void }) {
  return (
    <Button
      variant="outline"
      className="motion-press h-auto w-full justify-start gap-3 rounded-lg px-4 py-3.5 text-left whitespace-normal"
      onClick={onClick}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary [&_svg]:size-5">
        {icon}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-base font-medium">{title}</span>
        <span className="text-sm font-normal text-muted-foreground">{line}</span>
      </span>
      <ChevronRight className="text-muted-foreground" />
    </Button>
  );
}

function Choices({
  systems,
  onNew,
  onImport,
  onEmulator,
  onPrevious,
}: {
  systems: readonly System[];
  onNew(): void;
  onImport(): void;
  onEmulator(): void;
  onPrevious(): void;
}) {
  const gamesFolder = useGamesFolder();
  const demo = useExperiment("demoGame") === "on";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="grid justify-items-center gap-3 text-center">
        <span className="flex items-center gap-3">
          <AppIcon className="size-14" />
          <span className="font-pixel text-3xl font-semibold tracking-[0.02em]">pkhemu</span>
        </span>
        <SystemChips systems={systems} />
        <h1 className="mt-4 font-heading text-2xl font-medium">Let's get your games in</h1>
        <p className="text-sm text-muted-foreground">
          {demo ? "Bring your own games, or start with the free demo." : "This app doesn't include any games."}
        </p>
      </div>
      <div className="grid gap-3">
        <Choice icon={<Sparkles />} title="I'm new to emulators" line="We'll make a folder for your games." onClick={onNew} />
        <Choice
          icon={<FolderInput />}
          title={isIos(gamesFolder.device) ? `I have games on this ${gamesFolder.device}` : `I have ROMs on this ${gamesFolder.device}`}
          line="We'll copy them in. Your files stay where they are."
          onClick={onImport}
        />
        <Choice
          icon={<ArrowRightLeft />}
          title="I'm coming from another emulator"
          line="We'll copy your games and saves. Your files stay where they are."
          onClick={onEmulator}
        />
        {gamesFolder.pickPrevious && (
          <Choice
            icon={<History />}
            title="I've used pkhemu before"
            line="Pick the folder you used before."
            onClick={onPrevious}
          />
        )}
        {gamesFolder.error && <p className="text-sm text-destructive">{gamesFolder.error}</p>}
      </div>
    </main>
  );
}

export function NewFolder({
  title = "A folder for your games",
  line,
  onBack,
  onReady,
}: {
  title?: string;
  line?: string;
  onBack(): void;
  onReady(folder: string): void;
}) {
  const gamesFolder = useGamesFolder();
  const [making, setMaking] = useState(false);
  useBack(onBack);
  const make = async () => {
    setMaking(true);
    const made = await gamesFolder.make();
    setMaking(false);
    if (made) onReady(made);
  };
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="grid gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <FolderHeart className="size-6" />
        </span>
        <h1 className="font-heading text-2xl font-medium">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {line ??
            (isIos(gamesFolder.device)
              ? "pkhemu keeps your games and saves here. You'll find it in the Files app."
              : `pkhemu keeps your games and saves here. They stay on the ${gamesFolder.device} even if you uninstall the app.`)}
        </p>
      </div>
      <p className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 font-mono text-sm">
        <Folder className="size-4 shrink-0 text-muted-foreground" />
        Documents/pkhemu
      </p>
      {gamesFolder.device === "phone" && (
        <p className="text-sm text-muted-foreground">Android asks you to allow it next. Tap Use this folder, then Allow.</p>
      )}
      {gamesFolder.error && <p className="text-sm text-destructive">{gamesFolder.error}</p>}
      <div className="flex gap-3">
        <Button variant="outline" size="lg" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button size="lg" className="flex-1" disabled={making} onClick={() => void make()}>
          Make folder
        </Button>
      </div>
    </main>
  );
}

export function PreviousFolder({ onBack }: { onBack(): void }) {
  const gamesFolder = useGamesFolder();
  const [unfamiliar, setUnfamiliar] = useState<UnfamiliarFolder>();
  const [busy, setBusy] = useState(false);
  useBack(onBack);
  const pick = async () => {
    setBusy(true);
    const found = await gamesFolder.pickPrevious?.();
    setBusy(false);
    if (found) setUnfamiliar(found);
  };
  const keepAnyway = async (folder: string) => {
    setBusy(true);
    await gamesFolder.keep(folder);
    setBusy(false);
  };
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="grid gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <History className="size-6" />
        </span>
        <h1 className="font-heading text-2xl font-medium">Pick your pkhemu folder</h1>
        <p className="text-sm text-muted-foreground">
          It's usually Documents/pkhemu. Your games, saves and states come back as they were.
        </p>
      </div>
      {unfamiliar && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>No pkhemu games in {unfamiliar.label}</AlertTitle>
          <AlertDescription>
            This folder has no gb, gbc, gba or nds folders. If your saves are somewhere else, pick that folder.
          </AlertDescription>
        </Alert>
      )}
      {gamesFolder.error && <p className="text-sm text-destructive">{gamesFolder.error}</p>}
      {unfamiliar ? (
        <div className="grid gap-3">
          <Button size="lg" disabled={busy} onClick={() => void pick()}>
            Choose another folder
          </Button>
          <Button variant="outline" size="lg" disabled={busy} onClick={() => void keepAnyway(unfamiliar.folder)}>
            Use it anyway
          </Button>
        </div>
      ) : (
        <div className="flex gap-3">
          <Button variant="outline" size="lg" className="flex-1" onClick={onBack}>
            Back
          </Button>
          <Button size="lg" className="flex-1" disabled={busy} onClick={() => void pick()}>
            Choose folder
          </Button>
        </div>
      )}
    </main>
  );
}

export function Welcome({
  systems,
  onReady,
  onImport,
}: {
  systems: readonly System[];
  onReady(): void;
  onImport(from: "welcome" | "emulator"): void;
}) {
  const [step, setStep] = useState<"choices" | "new" | "previous">("choices");
  const back = () => navigate("back", () => setStep("choices"));
  return step === "choices" ? (
    <Screen key="choices">
      <Choices
        systems={systems}
        onNew={() => navigate("forward", () => setStep("new"))}
        onImport={() => onImport("welcome")}
        onEmulator={() => onImport("emulator")}
        onPrevious={() => navigate("forward", () => setStep("previous"))}
      />
    </Screen>
  ) : step === "new" ? (
    <Screen key="new">
      <NewFolder onBack={back} onReady={() => onReady()} />
    </Screen>
  ) : (
    <Screen key="previous">
      <PreviousFolder onBack={back} />
    </Screen>
  );
}
