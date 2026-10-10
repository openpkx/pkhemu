import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { flushSync } from "react-dom";
import { AddGames } from "./AddGames";
import { Toast, useToast } from "./components/Toast";
import { useBack } from "./back/back";
import { useFindAllBoxArt } from "./box-art/boxArt";
import { PadSetupPrompt } from "./controllers/PadSetupPrompt";
import { GameArtFor } from "./game-art/gameArt";
import { CloudGamePage } from "./game-page/CloudGamePage";
import { GamePage, type GamePageHost, type Gone, type Start } from "./game-page/GamePage";
import { GameScreen } from "./GameScreen";
import { useGamesFolder } from "./games-folder/gamesFolder";
import { useCalibrations } from "./input/calibrations";
import { connectedGamepads, createInput } from "./input/input";
import { LibraryProvider, useLibrary, type LibraryHost, type OpenedFrom } from "./library/library";
import { LibraryScreen, tileName } from "./library/LibraryScreen";
import type { Game } from "./library/scan";
import { LicencesScreen } from "./licences/LicencesScreen";
import { navigate, Screen as MotionScreen } from "./motion/motion";
import { PadNavigation, reveal } from "./pad-navigation/PadNavigation";
import { SettingsScreen } from "./SettingsScreen";
import { hideSplash } from "./splash";
import { syncingWrites, useSync } from "./sync/sync";
import type { System } from "./systems";

type Screen =
  | { name: "library" }
  | { name: "settings" }
  | { name: "licences" }
  | { name: "game"; game: Game; start?: Start; cover?: string; tile?: string };

function useLibraryGames() {
  const { library } = useLibrary();
  return useMemo(() => library?.sections.flatMap((section) => section.games.filter((game) => !game.cloudOnly)), [library]);
}

function LibraryGameScreen(props: ComponentProps<typeof GameScreen>) {
  return <GameScreen {...props} games={useLibraryGames()} />;
}

function LibraryGamePage({
  onCreated,
  onDownloaded,
  onGone,
  ...props
}: ComponentProps<typeof GamePage> & { onCreated(game: Game): void; onDownloaded(game: Game): void; onGone(game: Game, how: Gone): void }) {
  const { refresh, open } = useLibrary();
  const games = useLibraryGames();
  const openPatched = async (game: Game) => {
    onCreated(game);
    await refresh();
    open(game);
  };
  const gone = async (game: Game, how: Gone) => {
    await refresh();
    onGone(game, how);
  };
  if (props.game.cloudOnly)
    return (
      <CloudGamePage
        host={props.host}
        folder={props.folder}
        game={props.game}
        sharedArt={props.sharedArt}
        onDownloaded={(game) => void refresh().then(() => onDownloaded(game))}
        onGone={(game, how) => void gone(game, how)}
        onBack={props.onBack}
      />
    );
  return <GamePage {...props} games={games} onPatched={(game) => void openPatched(game)} onGone={(game, how) => void gone(game, how)} />;
}

// Opening a game moves it from Recently played to the Continue card, so the game page shrinks back into the card.
const backTile = (game: Game, tile: string) => (tile === tileName("recent", game.path) ? tileName("continue", game.path) : tile);

const withAttribute = (attribute: string, value: string) =>
  [...document.querySelectorAll<HTMLElement>(`[${attribute}]`)].find((element) => element.getAttribute(attribute) === value);

function FindLibraryBoxArt() {
  const { library } = useLibrary();
  useFindAllBoxArt(useMemo(() => library?.sections.flatMap((section) => section.games), [library]));
  return null;
}

export function Home({ libraryHost, gamePageHost }: { libraryHost: LibraryHost; gamePageHost: GamePageHost }) {
  const gamesFolder = useGamesFolder();
  const { synced, syncNow } = useSync();
  const syncedGamePageHost = useMemo(() => syncingWrites(gamePageHost, synced), [gamePageHost, synced]);
  const [screen, setScreen] = useState<Screen>({ name: "library" });
  const calibrations = useCalibrations();
  const [input] = useState(() => createInput(connectedGamepads, calibrations.current));
  const [dismissedPads] = useState(() => new Set<string>());
  const [unsupported, setUnsupported] = useState<ReadonlySet<System>>(() => new Set());
  const [toast, setToast] = useToast();
  const returnTo = useRef<{ scroll: number; focus: [attribute: string, value: string] }>(undefined);
  const openGame = useCallback((game: Game, from?: OpenedFrom) => {
    returnTo.current = from && { scroll: window.scrollY, focus: ["data-tile", backTile(game, from.tile)] };
    navigate("container", () => setScreen({ name: "game", game, tile: from?.tile, cover: from?.screenshot }));
  }, []);
  const playFromLibrary = useCallback((game: Game, start: Start, from: OpenedFrom) => {
    returnTo.current = { scroll: window.scrollY, focus: ["data-tile", from.tile] };
    navigate("play", () => setScreen({ name: "game", game, start, tile: from.tile, cover: from.screenshot }));
  }, []);
  const play = (game: Game, start: Start, cover?: string) => {
    const tile = tileName("continue", game.path);
    const opened = screen.name === "game" && screen.game.path === game.path;
    if (returnTo.current && opened) returnTo.current.focus = ["data-tile", tile];
    navigate("play", () => setScreen({ name: "game", game, start, cover, tile }));
  };
  const showLibrary = () => setScreen({ name: "library" });
  const showSettings = () => setScreen({ name: "settings" });
  const backToLibrary = () => navigate("back", showLibrary);
  const closeGame = () => {
    const tile = screen.name === "game" && screen.tile && backTile(screen.game, screen.tile);
    if (screen.name === "game" && tile && tile !== screen.tile) flushSync(() => setScreen({ ...screen, tile }));
    navigate("container", showLibrary);
  };
  const backToSettings = () => navigate("back", showSettings);
  const leaveForSettings = () => {
    returnTo.current = { scroll: window.scrollY, focus: ["aria-label", "Settings"] };
    navigate("forward", showSettings);
  };
  const showLicences = () => navigate("forward", () => setScreen({ name: "licences" }));
  useBack(screen.name === "settings" ? backToLibrary : screen.name === "licences" ? backToSettings : undefined);

  // Before the view transition snapshots the new screen, so the art it shares is on screen.
  // The document scrolls, so a screen would otherwise open at the last one's scroll position.
  useLayoutEffect(() => {
    if (screen.name !== "library") {
      window.scrollTo(0, 0);
      return;
    }
    if (!returnTo.current) return;
    const { scroll, focus } = returnTo.current;
    returnTo.current = undefined;
    window.scrollTo(0, scroll);
    const element = withAttribute(...focus);
    if (element) reveal(element);
  }, [screen.name]);

  useEffect(() => {
    if (gamesFolder.status !== "loading") hideSplash();
  }, [gamesFolder.status]);

  if (gamesFolder.status === "loading") return null;
  const playing = screen.name === "game" && screen.start;
  const padNavigation = !playing && (
    <>
      <PadNavigation input={input} />
      <PadSetupPrompt input={input} dismissed={dismissedPads} />
    </>
  );
  if (gamesFolder.status === "none")
    return (
      <>
        {padNavigation}
        <AddGames />
      </>
    );

  return (
    <LibraryProvider host={libraryHost} folder={gamesFolder.folder} onOpen={openGame} onPlay={playFromLibrary}>
      <FindLibraryBoxArt />
      {padNavigation}
      {screen.name === "library" && (
        <MotionScreen>
          <LibraryScreen onSettings={leaveForSettings} onOpenFolder={gamesFolder.openFolder} />
        </MotionScreen>
      )}
      {screen.name === "settings" && (
        <MotionScreen>
          <SettingsScreen onBack={backToLibrary} onLicences={showLicences} />
        </MotionScreen>
      )}
      {screen.name === "licences" && (
        <MotionScreen>
          <LicencesScreen onBack={backToSettings} />
        </MotionScreen>
      )}
      {screen.name === "game" && (
        <GameArtFor path={screen.game.path}>
          {screen.start ? (
            <MotionScreen key="playing">
              <LibraryGameScreen
                folder={gamesFolder.folder}
                game={screen.game}
                resume={screen.start === "resume" || (typeof screen.start === "object" && screen.start.resume)}
                slot={typeof screen.start === "object" ? screen.start.slot : undefined}
                cover={screen.cover}
                dismissedPads={dismissedPads}
                onQuit={() => {
                  // The game's sync stops the game first. A full sync that started earlier would see it running and hold its ROM.
                  void synced(gamesFolder.folder, [screen.game.path]).then(syncNow);
                  navigate("play", () => setScreen({ name: "game", game: screen.game, tile: screen.tile }));
                }}
                onUnsupported={() =>
                  navigate("play", () => {
                    setUnsupported((systems) => new Set(systems).add(screen.game.system));
                    setScreen({ name: "game", game: screen.game, tile: screen.tile });
                  })
                }
              />
            </MotionScreen>
          ) : (
            <MotionScreen key={`page:${screen.game.path}`}>
              <LibraryGamePage
                host={syncedGamePageHost}
                folder={gamesFolder.folder}
                game={screen.game}
                sharedArt={screen.tile}
                cover={screen.cover}
                unsupported={unsupported.has(screen.game.system)}
                onPlay={(start, game = screen.game, cover) => play(game, start, cover)}
                onCreated={(game) => setToast(`Created ${game.name}`)}
                onDownloaded={(game) => setScreen({ ...screen, game })}
                onGone={(game, how) => {
                  setToast(how === "removed" ? `Removed ${game.name} from this device` : `Deleted ${game.name}`);
                  if (how === "removed") closeGame();
                  else backToLibrary();
                }}
                onBack={closeGame}
              />
            </MotionScreen>
          )}
        </GameArtFor>
      )}
      <Toast>{toast}</Toast>
    </LibraryProvider>
  );
}
