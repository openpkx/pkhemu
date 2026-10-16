import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { flushSync } from "react-dom";
import { Toast, useToast } from "./components/Toast";
import { useBack } from "./back/back";
import { useFindAllBoxArt } from "./box-art/boxArt";
import { CoffeeAsk } from "./coffee/coffee";
import { sideloadBuild } from "./coffee/sideloadBuild";
import { tauriCoffeeHost } from "./coffee/tauriHost";
import { PadSetupPrompt } from "./controllers/PadSetupPrompt";
import { GameArtFor } from "./game-art/gameArt";
import { CloudGamePage } from "./game-page/CloudGamePage";
import { GamePage, type GamePageHost, type Gone, type Start } from "./game-page/GamePage";
import { GameScreen } from "./GameScreen";
import { useGamesFolder } from "./games-folder/gamesFolder";
import { useImportHost, type PickedFolder } from "./import/importFiles";
import { ImportFolder } from "./import/ImportFolder";
import { useCalibrations } from "./input/calibrations";
import { connectedGamepads, createInput } from "./input/input";
import { LibraryProvider, useLibrary, type LibraryHost, type LibraryState, type OpenedFrom } from "./library/library";
import { LibraryScreen, tileName } from "./library/LibraryScreen";
import type { Game } from "./library/scan";
import { LicencesScreen } from "./licences/LicencesScreen";
import { useHackBoxArt } from "./patch-rom/hackBoxArt";
import { navigate, Screen as MotionScreen } from "./motion/motion";
import { Welcome } from "./onboarding/Welcome";
import { PadNavigation, reveal } from "./pad-navigation/PadNavigation";
import { SettingsScreen } from "./SettingsScreen";
import { hideSplash } from "./splash";
import { useSystemBars } from "./system-bars/systemBars";
import { syncingWrites, useSync } from "./sync/sync";
import { systems as allSystems, type System } from "./systems";

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
  onDelete,
  ...props
}: Omit<ComponentProps<typeof GamePage>, "onDelete"> & {
  onCreated(game: Game): void;
  onDownloaded(game: Game): void;
  onGone(game: Game, how: Gone): void;
  onDelete(game: Game, library: LibraryState): void;
}) {
  const library = useLibrary();
  const { refresh, open } = library;
  const deleteGame = (game: Game) => onDelete(game, library);
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
        folder={props.folder}
        game={props.game}
        sharedArt={props.sharedArt}
        onDownloaded={(game) => void refresh().then(() => onDownloaded(game))}
        onDelete={deleteGame}
        onBack={props.onBack}
      />
    );
  return (
    <GamePage
      {...props}
      games={games}
      onPatched={(game) => void openPatched(game)}
      onGone={(game, how) => void gone(game, how)}
      onDelete={deleteGame}
    />
  );
}

// Opening a game moves it from Recently played to the Continue card, so the game page shrinks back into the card.
const backTile = (game: Game, tile: string) => (tile === tileName("recent", game.path) ? tileName("continue", game.path) : tile);

const withAttribute = (attribute: string, value: string) =>
  [...document.querySelectorAll<HTMLElement>(`[${attribute}]`)].find((element) => element.getAttribute(attribute) === value);

function HideSplashOnceScanned() {
  const { library, error } = useLibrary();
  const scanned = Boolean(library || error);
  const systemBars = useSystemBars();
  useEffect(() => {
    if (scanned) hideSplash(systemBars.splashHidden);
  }, [scanned, systemBars]);
  return null;
}

function FindLibraryBoxArt() {
  const { library } = useLibrary();
  useFindAllBoxArt(useMemo(() => library?.sections.flatMap((section) => section.games), [library]));
  return null;
}

export function Home({
  libraryHost,
  gamePageHost,
  systems = allSystems,
}: {
  libraryHost: LibraryHost;
  gamePageHost: GamePageHost;
  systems?: readonly System[];
}) {
  const gamesFolder = useGamesFolder();
  const { synced, syncNow } = useSync();
  const syncedGamePageHost = useMemo(() => syncingWrites(gamePageHost, synced), [gamePageHost, synced]);
  const [screen, setScreen] = useState<Screen>({ name: "library" });
  const calibrations = useCalibrations();
  const [input] = useState(() => createInput(connectedGamepads, calibrations.current));
  const [dismissedPads] = useState(() => new Set<string>());
  const [unsupported, setUnsupported] = useState<ReadonlySet<System>>(() => new Set());
  const unsupportedBy = (system: System) => {
    if (!systems.includes(system)) return "platform";
    if (unsupported.has(system)) return "device";
  };
  const [toast, setToast] = useToast();
  const hackBoxArt = useHackBoxArt(setToast);
  const importHost = useImportHost();
  const systemBars = useSystemBars();
  const [folderImport, setFolderImport] = useState<{ from: "welcome" | "emulator" } | { from: "library"; source: PickedFolder }>();
  const returnTo = useRef<{ scroll: number; focus: [attribute: string, value: string] }>(undefined);
  const openGame = useCallback((game: Game, from?: OpenedFrom) => {
    returnTo.current = from && { scroll: window.scrollY, focus: ["data-tile", backTile(game, from.tile)] };
    navigate("container", () => setScreen({ name: "game", game, tile: from?.tile, cover: from?.screenshot }));
  }, []);
  const playFromLibrary = useCallback(
    (game: Game, start: Start, from: OpenedFrom) => {
      if (!systems.includes(game.system)) return openGame(game, from);
      returnTo.current = { scroll: window.scrollY, focus: ["data-tile", from.tile] };
      navigate("play", () => setScreen({ name: "game", game, start, tile: from.tile, cover: from.screenshot }));
    },
    [systems, openGame],
  );
  const play = (game: Game, start: Start, cover?: string) => {
    if (!systems.includes(game.system)) return openGame(game);
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
  const importFolder = async () => {
    try {
      const source = await importHost.pickFolder();
      if (source) navigate("forward", () => setFolderImport({ from: "library", source }));
    } catch (reason) {
      setToast(String(reason));
    }
  };
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
    if (gamesFolder.status === "none") hideSplash(systemBars.splashHidden);
  }, [gamesFolder.status, systemBars]);

  if (gamesFolder.status === "loading") return null;
  const playing = screen.name === "game" && screen.start;
  if (folderImport)
    return (
      <>
        <PadNavigation input={input} />
        <ImportFolder
          libraryHost={libraryHost}
          source={folderImport.from === "library" ? folderImport.source : undefined}
          emulator={folderImport.from === "emulator"}
          onClose={(message) =>
            navigate("back", () => {
              setFolderImport(undefined);
              if (message) setToast(message);
            })
          }
          onDone={(message) =>
            navigate("forward", () => {
              setFolderImport(undefined);
              setToast(message);
            })
          }
        />
      </>
    );
  if (gamesFolder.status === "none")
    return (
      <>
        <PadNavigation input={input} />
        <Welcome
          systems={systems}
          onReady={() => setToast("Your games folder is ready")}
          onImport={(from) => navigate("forward", () => setFolderImport({ from }))}
        />
      </>
    );
  const deleteGame = async (game: Game, { hide, unhide, refresh }: LibraryState) => {
    hide(game.path);
    backToLibrary();
    try {
      await syncedGamePageHost.deleteGame(gamesFolder.folder, game.path);
      await refresh();
      setToast(`Deleted ${game.name}`);
    } catch (reason) {
      setToast(`Couldn't delete ${game.name}. ${reason}`);
    }
    unhide(game.path);
  };
  const padNavigation = !playing && (
    <>
      <PadNavigation input={input} />
      <PadSetupPrompt input={input} dismissed={dismissedPads} />
    </>
  );

  return (
    <LibraryProvider host={libraryHost} folder={gamesFolder.folder} onOpen={openGame} onPlay={playFromLibrary}>
      <FindLibraryBoxArt />
      <HideSplashOnceScanned />
      {padNavigation}
      {screen.name === "library" && (
        <MotionScreen>
          <LibraryScreen
            host={syncedGamePageHost}
            folder={gamesFolder.folder}
            systems={systems}
            onSettings={leaveForSettings}
            onOpenFolder={gamesFolder.openFolder}
            onImportFolder={() => void importFolder()}
          />
        </MotionScreen>
      )}
      {screen.name === "settings" && (
        <MotionScreen>
          <SettingsScreen systems={systems} onBack={backToLibrary} onLicences={showLicences} />
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
                systems={systems}
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
                unsupported={unsupportedBy(screen.game.system)}
                onPlay={(start, game = screen.game, cover) => play(game, start, cover)}
                onCreated={(game) => setToast(hackBoxArt.withAddBoxArt(`Created ${game.name}`, game))}
                onDownloaded={(game) => setScreen({ ...screen, game })}
                onGone={(game) => {
                  setToast(`Removed ${game.name} from this device`);
                  closeGame();
                }}
                onDelete={(game, library) => void deleteGame(game, library)}
                onBack={closeGame}
              />
            </MotionScreen>
          )}
        </GameArtFor>
      )}
      {hackBoxArt.sheet}
      {sideloadBuild && <CoffeeAsk host={tauriCoffeeHost} playing={!!playing} canAsk={screen.name === "library"} />}
      <Toast>{toast}</Toast>
    </LibraryProvider>
  );
}
