import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Cloud, FilePlus, FolderOpen, FolderPlus, Play, Plus, RefreshCw, Settings } from "lucide-react";
import { cn } from "cn";
import { UpdateToast } from "@/app-update/UpdateToast";
import { AppIcon } from "@/components/AppIcon";
import { ScreenHeader } from "@/components/ScreenHeader";
import { sectionHeading } from "@/components/sectionHeading";
import { SyncBadge } from "@/components/SyncBadge";
import { SystemChip, SystemChips } from "@/components/SystemChip";
import { Toast, useToast } from "@/components/Toast";
import { useCachedBoxArt } from "@/box-art/boxArt";
import { BoxArtSheet } from "@/box-art/BoxArtSheet";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { ago, gameTitle } from "@/game-page/details";
import { useGamesFolder } from "@/games-folder/gamesFolder";
import { useOpenFolder } from "@/games-folder/useOpenFolder";
import { gameAt, useImportFiles, useImportHost } from "@/import/importFiles";
import { useExperiment } from "@/lab/lab";
import { useLongPress } from "@/lib/useLongPress";
import { Shared, useStaggerOnce } from "@/motion/motion";
import { useTileSync } from "@/sync/gameStatus";
import { useSync } from "@/sync/sync";
import { systemColors, systemNames, type System } from "@/systems";
import { useLibrary, type LastPlay, type OpenedFrom } from "./library";
import type { Game } from "./scan";
import { SyncRing } from "./SyncRing";

function useResumeScreenshot(game: Game) {
  const { resumeScreenshot, knownScreenshot } = useLibrary();
  const ref = useRef<HTMLButtonElement>(null);
  const [seen, setSeen] = useState(false);
  // The last one read, so a tile the game page shrinks back into has its art when the view transition snapshots it.
  const [screenshot, setScreenshot] = useState(() => knownScreenshot(game.path));

  useEffect(() => {
    const tile = ref.current;
    if (seen || !tile) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setSeen(true));
    observer.observe(tile);
    return () => observer.disconnect();
  }, [seen]);

  useEffect(() => {
    if (!seen) return;
    let current = true;
    void resumeScreenshot(game.path).then((url) => current && setScreenshot(url));
    return () => {
      current = false;
    };
  }, [seen, resumeScreenshot, game.path]);

  return { ref, screenshot };
}

export const tileName = (from: "continue" | "recent" | "grid", path: string) => `${from}:${path}`;

function CloudPill() {
  return (
    <span className="rounded-full bg-overlay/60 p-1 text-white">
      <Cloud role="img" aria-label="In the cloud" className="size-3.5" />
    </span>
  );
}

function FadedBoxArt({ src, className }: { src: string; className: string }) {
  return (
    <div className="absolute inset-0 mask-[linear-gradient(135deg,transparent,#000_20%)]">
      <img src={src} alt="" className="absolute inset-0 size-full scale-110 object-cover blur-xl brightness-[0.4]" />
      <img src={src} alt="" className={cn("absolute inset-0 size-full object-contain", className)} />
    </div>
  );
}

function useLastPlay(path: string) {
  const { library, lastPlay, knownLastPlay } = useLibrary();
  const [played, setPlayed] = useState<LastPlay | undefined>(() => knownLastPlay(path));

  useEffect(() => {
    let current = true;
    void lastPlay(path).then((played) => current && setPlayed(played));
    return () => {
      current = false;
    };
  }, [library, lastPlay, path]);

  return played;
}

function ContinueCard({ game, onChangeBoxArt }: { game: Game; onChangeBoxArt(game: Game): void }) {
  const { open, play, lastPlay } = useLibrary();
  const longPress = useLongPress(game.cloudOnly ? undefined : () => onChangeBoxArt(game));
  const boxArt = useCachedBoxArt(game);
  const { ref, screenshot } = useResumeScreenshot(game);
  const played = useLastPlay(game.path);
  const sharedArt = tileName("continue", game.path);
  const { dark, light } = systemColors[game.system];
  const resume = !game.cloudOnly && !!played?.resume;
  const openPage = () => open(game, { tile: sharedArt, screenshot });
  const start = async () => {
    if (game.cloudOnly) return openPage();
    // The label can be from the last visit, so a resume point written since isn't skipped.
    if ((await lastPlay(game.path)).resume) play(game, "resume", { tile: sharedArt, screenshot });
    else play(game, "new", { tile: sharedArt });
  };
  return (
    <section
      aria-label="Continue"
      data-section="continue"
      onClick={(event) => event.target === event.currentTarget && openPage()}
      {...longPress}
      className="flex cursor-pointer flex-col select-none [-webkit-touch-callout:none] gap-3 rounded-xl border border-input bg-card p-4 text-card-foreground sm:flex-row sm:items-center sm:gap-5"
    >
      <button
        ref={ref}
        type="button"
        data-game={game.path}
        data-tile={sharedArt}
        onClick={openPage}
        className="motion-press flex min-w-0 flex-1 scroll-mt-18 items-center gap-3.5 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:gap-5"
      >
        <Shared name={sharedArt}>
          <div className="relative isolate aspect-[3/2] w-27 shrink-0 overflow-hidden rounded-md bg-background ring-1 ring-foreground/10 sm:w-45 sm:rounded-lg">
            {screenshot ? (
              <img
                src={screenshot}
                alt=""
                className={cn("absolute inset-0 size-full object-cover [image-rendering:pixelated]", game.system === "nds" && "object-top")}
              />
            ) : (
              <>
                <div
                  style={{ "--pattern": light.pattern, "--pattern-dark": dark.pattern } as CSSProperties}
                  className="absolute inset-0 dot-grid mask-[linear-gradient(135deg,#000,transparent_62%)]"
                />
                {boxArt && (
                  <>
                    <FadedBoxArt src={boxArt} className="p-1.5" />
                    <SystemChip system={game.system} className="absolute top-1.5 left-1.5" />
                  </>
                )}
              </>
            )}
            {game.cloudOnly && (
              <span className="absolute top-1.5 right-1.5 flex">
                <CloudPill />
              </span>
            )}
          </div>
        </Shared>
        <span className="grid min-w-0 justify-items-start gap-1 sm:gap-1.5">
          <SystemChip system={game.system} />
          <span className="text-lg font-semibold break-words sm:text-[1.375rem] sm:tracking-[-0.01em]">{gameTitle(game.name)}</span>
          {played?.lastPlayed != null && (
            <span className="text-[0.8125rem] text-muted-foreground sm:text-sm">Played {ago((Date.now() - played.lastPlayed) / 1000)}</span>
          )}
        </span>
      </button>
      <Button size="lg" className="h-12 px-7 font-semibold [&_svg]:fill-current" onClick={() => void start()}>
        <Play className="size-3.5" />
        {resume ? "Resume" : "Play"}
      </Button>
    </section>
  );
}

function GameTile({
  game,
  from,
  onOpen,
  onChangeBoxArt,
  className,
}: {
  game: Game;
  from: "recent" | "grid";
  onOpen(game: Game, from: OpenedFrom): void;
  onChangeBoxArt(game: Game): void;
  className?: string;
}) {
  const longPress = useLongPress(game.cloudOnly ? undefined : () => onChangeBoxArt(game));
  const boxArt = useCachedBoxArt(game);
  const { ref, screenshot: lastScreen } = useResumeScreenshot(game);
  const screenshot = boxArt ? undefined : lastScreen;
  const sharedArt = tileName(from, game.path);
  const badge = useTileSync(game.path, !!game.cloudOnly);
  const { dark, light } = systemColors[game.system];
  return (
    <button
      ref={ref}
      type="button"
      data-game={game.path}
      data-tile={sharedArt}
      onClick={() => onOpen(game, { tile: sharedArt, screenshot })}
      {...longPress}
      className={cn(
        "motion-press relative isolate flex aspect-[4/3] select-none [-webkit-touch-callout:none] scroll-mt-18 flex-col items-start justify-between overflow-hidden rounded-tile bg-card p-3 text-left text-card-foreground ring-1 ring-foreground/10 outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      {!screenshot && (
        <div
          style={{ "--pattern": light.pattern, "--pattern-dark": dark.pattern } as CSSProperties}
          className="absolute inset-0 -z-10 dot-grid mask-[linear-gradient(135deg,#000,transparent_62%)]"
        />
      )}
      {/* Even without art, so a game page played for the first time has a tile to shrink into before the tile reads its new screen. */}
      <Shared name={sharedArt}>
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-tile">
          {boxArt && <FadedBoxArt src={boxArt} className="p-2" />}
          {screenshot && (
            <>
              <img
                src={screenshot}
                alt=""
                className={cn("absolute inset-0 size-full object-cover [image-rendering:pixelated]", game.system === "nds" && "object-top")}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-overlay/80 via-overlay/20 to-transparent" />
            </>
          )}
        </div>
      </Shared>
      <SystemChip system={game.system} />
      <span className={cn("line-clamp-3 text-sm font-medium break-words", boxArt && "sr-only", screenshot && "text-white")}>
        {game.name}
      </span>
      <span className="absolute top-2 right-2 flex gap-1">
        <SyncBadge badge={badge} />
        {game.cloudOnly && <CloudPill />}
      </span>
    </button>
  );
}

function Section({ id, title, caption, children }: { id: string; title: string; caption?: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} data-section={id} className="grid gap-3">
      <h2 id={headingId} className={cn("flex items-baseline gap-2", sectionHeading)}>
        {title}
        {caption && <span className="font-sans text-[13px] tracking-normal">{caption}</span>}
      </h2>
      {children}
    </section>
  );
}

function usePlayDemo() {
  const host = useImportHost();
  const gamesFolder = useGamesFolder();
  const { refresh, play } = useLibrary();
  const { synced } = useSync();
  const [copying, setCopying] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState<string>();

  const playDemo = async () => {
    if (gamesFolder.status !== "ready" || working.current) return;
    working.current = true;
    setCopying(true);
    setError(undefined);
    try {
      const path = await host.copyDemo(gamesFolder.folder);
      void synced(gamesFolder.folder, [path]);
      await refresh();
      play(gameAt(path), "new", { tile: tileName("grid", path) });
    } catch (reason) {
      setError(String(reason));
    } finally {
      working.current = false;
      setCopying(false);
    }
  };

  return { playDemo, copying, error };
}

function EmptyLibrary({
  systems,
  importing,
  onImportFiles,
  onImportFolder,
  onOpenFolder,
}: {
  systems: readonly System[];
  importing: boolean;
  onImportFiles(): void;
  onImportFolder?(): void;
  onOpenFolder?(): Promise<void>;
}) {
  const { open: openFolder, error: openError } = useOpenFolder(onOpenFolder);
  const demo = useExperiment("demoGame") === "on";
  const { playDemo, copying, error: demoError } = usePlayDemo();

  return (
    <div data-testid="empty-library" className="grid justify-items-center gap-4 py-16 text-center">
      <SystemChips systems={systems} />
      <p className="max-w-sm text-muted-foreground">
        {demo ? "Import your games, or try the free demo." : "This app doesn't include any games."}
      </p>
      {openError && <p className="max-w-sm text-sm text-destructive">{openError}</p>}
      {demoError && <p className="max-w-sm text-sm text-destructive">{demoError}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <Button disabled={importing || copying} onClick={onImportFiles}>
          {importing ? <Spinner /> : <FilePlus />}
          Import files
        </Button>
        {onImportFolder && (
          <Button variant="outline" disabled={importing || copying} onClick={onImportFolder}>
            <FolderPlus />
            Import folder
          </Button>
        )}
        {onOpenFolder && (
          <Button variant="outline" onClick={() => void openFolder()}>
            <FolderOpen />
            Open folder
          </Button>
        )}
      </div>
      {demo && (
        <Button variant="outline" disabled={importing || copying} onClick={() => void playDemo()}>
          {copying ? <Spinner /> : <Play />}
          Play a demo
        </Button>
      )}
    </div>
  );
}

export function LibraryScreen({
  systems,
  onSettings,
  onOpenFolder,
  onImportFolder,
}: {
  systems: readonly System[];
  onSettings(): void;
  onOpenFolder?(): Promise<void>;
  onImportFolder?(): void;
}) {
  const { library, recent, scanning, error, refresh, open } = useLibrary();
  const outside = library?.outsideSystemFolders ?? 0;
  const empty = library?.sections.length === 0;
  const { ref, stagger } = useStaggerOnce("library", !!library);
  const [last, ...others] = recent;
  const [changingBoxArt, setChangingBoxArt] = useState<{ game: Game; open: boolean; opens: number }>();
  const [toast, setToast] = useToast();
  const { importFiles, busy: importing, dialogs: importDialogs } = useImportFiles(setToast);
  const changeBoxArt = (game: Game) => setChangingBoxArt((was) => ({ game, open: true, opens: (was?.opens ?? 0) + 1 }));
  const stopChangingBoxArt = () => setChangingBoxArt((was) => was && { ...was, open: false });

  return (
    <div className="min-h-screen pb-safe">
      <ScreenHeader
        title={
          <span className="flex items-center gap-2.5">
            <AppIcon className="size-6.5 shrink-0 sm:size-7" />
            <span className="font-pixel text-xl font-semibold tracking-[0.02em]">pkhemu</span>
          </span>
        }
      >
        <SyncRing onOpen={onSettings} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Import" disabled={importing}>
              {importing ? <Spinner /> : <Plus />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => void importFiles()}>Import files</DropdownMenuItem>
            {onImportFolder && <DropdownMenuItem onSelect={onImportFolder}>Import folder</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" aria-label="Refresh" onClick={() => void refresh()}>
          <RefreshCw className={cn(scanning && "animate-spin")} />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Settings" onClick={onSettings}>
          <Settings />
        </Button>
      </ScreenHeader>
      <main ref={ref} className="grid gap-8 p-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {empty && (
          <EmptyLibrary
            systems={systems}
            importing={importing}
            onImportFiles={() => void importFiles()}
            onImportFolder={onImportFolder}
            onOpenFolder={onOpenFolder}
          />
        )}
        {last && <ContinueCard key={last.path} game={last} onChangeBoxArt={changeBoxArt} />}
        {others.length > 0 && (
          <Section id="recent" title="Recently played">
            <div className={cn("-mx-4 -mt-1 flex gap-3 overflow-x-auto px-4 py-1", stagger)}>
              {others.map((game) => (
                <GameTile
                  key={game.path}
                  game={game}
                  from="recent"
                  onOpen={open}
                  onChangeBoxArt={changeBoxArt}
                  className="w-36 shrink-0"
                />
              ))}
            </div>
          </Section>
        )}
        {library?.sections.map((section) => {
          const id = section.folder ? `${section.system}/${section.folder}` : section.system;
          return (
            <Section
              key={id}
              id={id}
              title={section.folder ?? systemNames[section.system]}
              caption={section.folder && systemNames[section.system]}
            >
              <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6", stagger)}>
                {section.games.map((game) => (
                  <GameTile key={game.path} game={game} from="grid" onOpen={open} onChangeBoxArt={changeBoxArt} />
                ))}
              </div>
            </Section>
          );
        })}
        {outside > 0 && (
          <p data-testid="outside-system-folders" className="text-sm text-muted-foreground">
            {outside} {outside === 1 ? "game" : "games"} outside a system folder
          </p>
        )}
      </main>
      {changingBoxArt && (
        <BoxArtSheet
          key={changingBoxArt.opens}
          open={changingBoxArt.open}
          game={changingBoxArt.game}
          onClose={stopChangingBoxArt}
          onChanged={() => {
            stopChangingBoxArt();
            setToast("Box art changed");
          }}
        />
      )}
      {importDialogs}
      <Toast>{toast}</Toast>
      <UpdateToast />
    </div>
  );
}
