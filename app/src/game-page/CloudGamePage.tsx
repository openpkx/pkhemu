import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useBack } from "@/back/back";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Game } from "@/library/scan";
import { Screen } from "@/motion/motion";
import { useSync } from "@/sync/sync";
import { GameMenu } from "./GameMenu";
import { Hero, type GamePageHost, type Gone } from "./GamePage";

const MB = 1024 * 1024;

const megabytes = (bytes: number, total = bytes) => (total < 10 * MB ? (bytes / MB).toFixed(1) : Math.round(bytes / MB));

function downloaded(done: number, total: number) {
  return `Downloading · ${megabytes(done, total)} of ${megabytes(total)} MB`;
}

type Asking = { size: number; answer(download: boolean): void; answered?: boolean };

export function CloudGamePage({
  host,
  folder,
  game,
  sharedArt,
  onDownloaded,
  onGone,
  onBack,
}: {
  host: Pick<GamePageHost, "deleteGame">;
  folder: string;
  game: Game;
  sharedArt?: string;
  onDownloaded(game: Game): void;
  onGone(game: Game, how: Gone): void;
  onBack(): void;
}) {
  const sync = useSync();
  const { download, beforeOpen, mobileDownloadSize } = sync;
  const [attempt, setAttempt] = useState(0);
  const [stage, setStage] = useState<"downloading" | "syncing">("downloading");
  const [error, setError] = useState<string>();
  const [asking, setAsking] = useState<Asking>();
  const progress = sync.downloads[game.path];
  const downloadedGame = useRef(() => {});
  downloadedGame.current = () => onDownloaded({ ...game, cloudOnly: false });
  const cancelled = useRef(onBack);
  cancelled.current = onBack;
  useBack(onBack);

  useEffect(() => {
    let current = true;
    setError(undefined);
    setStage("downloading");
    void (async () => {
      try {
        const size = await mobileDownloadSize(folder, game.path);
        if (!current) return;
        if (size !== null && !(await new Promise<boolean>((answer) => setAsking({ size, answer })))) {
          cancelled.current();
          return;
        }
        if (!current) return;
        await download(folder, game.path);
      } catch (reason) {
        if (current) setError(String(reason));
        return;
      }
      if (!current) return;
      setStage("syncing");
      await beforeOpen(folder, game.path);
      if (current) downloadedGame.current();
    })();
    return () => {
      current = false;
    };
  }, [download, beforeOpen, mobileDownloadSize, folder, game.path, attempt]);

  const open = !!asking && !asking.answered;
  // The dialog keeps its title while it fades out.
  const answer = (download: boolean) => {
    if (!asking) return;
    asking.answer(download);
    setAsking({ ...asking, answered: true });
  };

  const status =
    stage === "syncing"
      ? "Checking your other devices…"
      : progress
        ? downloaded(progress.done, progress.total)
        : "Downloading…";

  return (
    <Screen>
      <div className="min-h-screen pb-safe md:grid md:grid-cols-2 md:gap-4 md:p-4 md:pb-[max(1rem,env(safe-area-inset-bottom))]">
        <main className="grid content-start">
          <Hero
            game={game}
            sharedArt={sharedArt}
            updating={false}
            menu={
              <GameMenu
                folder={folder}
                game={game}
                deletesEverywhere={!!sync.account}
                onDelete={async () => {
                  await host.deleteGame(folder, game.path);
                  onGone(game, "deleted");
                }}
              />
            }
            onBack={onBack}
          />
          <div className="grid gap-2 p-4 md:px-0">
            {error ? (
              <>
                <p className="text-sm text-destructive">Couldn't download {game.name}. {error}</p>
                <Button size="lg" className="h-16 text-lg" onClick={() => setAttempt((attempt) => attempt + 1)}>
                  <RefreshCw />
                  Try again
                </Button>
              </>
            ) : open ? null : (
              <div className="grid gap-1.5">
                <p className="text-sm text-muted-foreground">{status}</p>
                <Progress
                  aria-label="Downloading"
                  value={stage === "syncing" ? 100 : progress ? (progress.done / Math.max(1, progress.total)) * 100 : 0}
                />
              </div>
            )}
          </div>
        </main>
      </div>
      <ConfirmDialog
        title={`Download ${game.name} (${megabytes(asking?.size ?? 0)} MB) on mobile data?`}
        action="Download"
        open={open}
        onConfirm={() => answer(true)}
        onCancel={() => answer(false)}
      >
        Your carrier may charge for the data.
      </ConfirmDialog>
    </Screen>
  );
}
