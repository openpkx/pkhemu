import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { useEffect, type ReactNode } from "react";
import { EngineProvider } from "@pkhex-everywhere/react";
import { invoke } from "@tauri-apps/api/core";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider } from "./back/back";
import { desktopBackHost } from "./back/desktopHost";
import { iosBackHost } from "./back/iosHost";
import { fakeEngine } from "./editor/fakeEngine";
import type { Range } from "./game-memory/builds";
import emeraldOverworld from "./game-memory/snapshots/emerald-overworld.json";
import emeraldWild from "./game-memory/snapshots/emerald-wild.json";
import { snapshotMemory } from "./game-memory/snapshots/snapshotMemory";
import { answerEverySetupStep, fakePads } from "./input/fakePads";
import { buttons, type Input } from "./input/input";
import { tauriCheatsHost } from "./cheats/tauriHost";
import type { Game } from "./library/scan";
import { tauriTransferPakHost } from "./transfer-pak/tauriHost";
import { emeraldSave } from "./testing/gen3Save";
import type { Rates } from "./fps-counter/fpsCounter";
import { GameScreen } from "./GameScreen";
import { dualScreens } from "./screens";
import type { GameSettings } from "./preferences/gameSettings";
import { GameSurfaceProvider, noGameSurfaceHost, type GameSurfaceHost } from "./game-surface/gameSurface";
import { PreferencesProvider, type PreferencesHost, type RendererChoice } from "./preferences/preferences";
import { FakeGameArt } from "./game-art/fakeGameArt";
import { GamesFolderProvider, type GamesFolderHost } from "./games-folder/gamesFolder";
import { experiments as labExperiments } from "./lab/experiments";
import { ExperimentsProvider } from "./lab/lab";
import { RetroAchievementsProvider, type Achievement, type AchievementEvent, type RetroAchievementsHost } from "./retro-achievements/retroAchievements";
import { fakePlus } from "./plus/fakePlus";
import { PlusProvider, type PlusStatus } from "./plus/plus";
import { fakeSync } from "./sync/fakeSync";
import { OPEN_WAIT_MS, SyncProvider } from "./sync/sync";
import { lookVariables } from "./skin-look/skinLook";
import { defaultSkins, skins } from "./skins";
import type { System } from "./systems";
import { SystemBarsProvider, type SystemBarsHost } from "./system-bars/systemBars";

const game = vi.hoisted(() => ({
  readMemory: async (_: Range[]): Promise<Uint8Array> => Uint8Array.from([0, 0, 0, 0, 0]),
  settings: {} as Record<string, Partial<GameSettings>>,
  onFps: undefined as ((rates: Rates) => void) | undefined,
  onError: undefined as ((message: string) => void) | undefined,
  starts: [] as boolean[],
  launches: [] as { resume: boolean; hardcore: boolean }[],
  states: { current: null, slots: [], canUndoLoad: false } as unknown,
  transferPak: null as { game: string | null } | null,
  pauseRequested: undefined as (() => void) | undefined,
  renderer: undefined as string | undefined,
  onNativeFailed: undefined as (() => void) | undefined,
  screens: undefined as unknown,
  resolution: undefined as number | undefined,
  swapped: undefined as boolean | undefined,
  clearance: undefined as string | undefined,
  onStacked: undefined as ((stacked: boolean) => void) | undefined,
  missingEntitlements: [] as string[],
  sinceSave: null as number | null,
  save: new Uint8Array(),
  research: new Map<string, unknown>(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (command: string, args?: { ranges: Range[] }) =>
    command === "list_states"
      ? game.states
      : command === "can_undo_edit"
        ? false
        : command === "read_memory"
          ? (await game.readMemory(args!.ranges)).buffer
          : command === "play_time_since_save"
            ? game.sinceSave
            : command === "read_save"
              ? game.save.slice().buffer
              : command === "import_sha1s"
                ? {}
                : undefined,
  ),
}));

vi.mock("./cheats/tauriHost", async () => ({
  tauriCheatsHost: (await import("./cheats/fakeCheats")).fakeCheats([{ name: "Infinite money", code: "82025838 FFFF", on: false }]),
}));

vi.mock("./memory-notice/tauriHost", () => ({
  tauriMemoryNoticeHost: { missingEntitlements: async () => game.missingEntitlements },
}));

vi.mock("./screen", () => ({ createScreen: () => () => {} }));

vi.mock("./core-message/tauriHost", () => ({ tauriCoreMessages: () => () => {} }));

vi.mock("./pause-menu/tauriHost", () => ({
  tauriPauseRequests: (listener: () => void) => {
    game.pauseRequested = listener;
    return () => void (game.pauseRequested = undefined);
  },
}));

vi.mock("./transfer-pak/tauriHost", () => ({
  tauriTransferPakHost: {
    transferPak: vi.fn(async () => game.transferPak),
    chooseTransferPak: vi.fn(async (_folder: string, _path: string, cart: string | null) => void (game.transferPak = { game: cart })),
  },
}));

vi.mock("./preferences/gameSettingsTauriHost", () => ({
  tauriGameSettingsHost: {
    load: async (path: string) => game.settings[path] ?? {},
    save: async (path: string, settings: GameSettings) => void (game.settings[path] = settings),
  },
  tauriSaveFormatHost: { saveFormat: async () => null, keepSaveFormat: async () => {} },
}));

vi.mock("./research-host/storage", () => ({
  researchStorage: {
    load: async (path: string, key: string) => structuredClone(game.research.get(`${path}:${key}`)),
    store: async (path: string, key: string, value: unknown) => void game.research.set(`${path}:${key}`, structuredClone(value)),
  },
}));

vi.mock("./Player", () => ({
  Player: function Player({
    input,
    resume,
    hardcore = false,
    paused,
    holdMessage,
    onStarted,
    onFps,
    onError,
    renderer,
    onNativeFailed,
    screens,
    resolution,
    swapped,
    clearance,
    onStacked,
    children,
  }: {
    input: Input;
    resume: boolean;
    hardcore?: boolean;
    paused: boolean;
    holdMessage?: string;
    onStarted?(): Promise<void>;
    onFps?(rates: Rates): void;
    onError(message: string): void;
    renderer: string;
    onNativeFailed?(): void;
    screens?: unknown;
    resolution?: number;
    swapped?: boolean;
    clearance?: string;
    onStacked?(stacked: boolean): void;
    children?: ReactNode;
  }) {
    game.screens = screens;
    game.resolution = resolution;
    game.swapped = swapped;
    game.clearance = clearance;
    game.onStacked = onStacked;
    game.onFps = onFps;
    game.onError = onError;
    game.renderer = renderer;
    game.onNativeFailed = onNativeFailed;
    useEffect(() => void game.starts.push(resume), []);
    useEffect(() => {
      if (holdMessage !== undefined) return;
      game.launches.push({ resume, hardcore });
      void onStarted?.();
    }, [holdMessage]);
    useEffect(() => {
      if (paused) return;
      let raf = 0;
      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        input.poll(now);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [input, paused]);
    return (
      <div data-testid="player" data-paused={paused || undefined} data-holding={holdMessage}>
        {children}
      </div>
    );
  },
}));

let pads: ReturnType<typeof fakePads>;

let wide = false;
let square = false;
const windowSize = (innerWidth: number, innerHeight: number) => Object.assign(window, { innerWidth, innerHeight });

beforeEach(() => {
  game.readMemory = async () => Uint8Array.from([0, 0, 0, 0, 0]);
  game.settings = {};
  game.starts = [];
  game.launches = [];
  game.states = { current: null, slots: [], canUndoLoad: false };
  game.transferPak = null;
  game.missingEntitlements = [];
  game.sinceSave = null;
  game.save = new Uint8Array();
  game.research.clear();
  vi.mocked(tauriTransferPakHost.chooseTransferPak).mockClear();
  wide = false;
  windowSize(1024, 768);
  square = false;
  window.matchMedia = ((query: string) => ({
    matches: query.includes("aspect-ratio") ? square : wide,
    addEventListener() {},
    removeEventListener() {},
  })) as never;
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  pads = fakePads();
  Object.defineProperty(navigator, "getGamepads", { configurable: true, value: pads.gamepads });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const { engine } = fakeEngine({
  species: [
    { id: 255, name: "Torchic" },
    { id: 261, name: "Poochyena" },
  ],
  inMemory: {
    TORCHIC: { species: 255, level: 9 },
    POOCHYENA: { species: 261, level: 3, isShiny: true, nature: 3, ability: 22, ivs: { health: 31, attack: 31, defense: 28, specialAttack: 1, specialDefense: 2, speed: 3 } },
  },
});

const gamesFolder: GamesFolderHost = {
  pickFolder: async () => "/games",
  makeFolder: async () => "/games",
  findFolder: async () => "/games",
  listFolders: async () => [],
  ensureFolder: async () => {},
  folderExists: async () => true,
  loadSaved: async () => "/games",
  save: async () => {},
  label: (folder) => folder,
  device: "phone",
};

const emerald: Game = { name: "Emerald", path: "gba/Emerald.gba", system: "gba" };

async function play(
  using = engine,
  sync = fakeSync({ available: false }),
  onQuit = () => {},
  {
    showFps = false,
    plus = { state: "notOwned", price: "$3.99" } as PlusStatus,
    onUnsupported = () => {},
    played = emerald,
    games = [] as Game[],
    resume = false,
    slot = undefined as number | undefined,
    back = desktopBackHost,
    renderer = "automatic" as RendererChoice,
    gameSurface = noGameSurfaceHost,
    skinChoices = defaultSkins,
    touchControls = false,
    bars = { setHidden() {}, setLight() {}, splashHidden() {} } as SystemBarsHost,
    preferences = { load: async () => ({}), save: async () => {} } as PreferencesHost,
    plusHost = fakePlus({ status: plus }).host,
    retroAchievements = undefined as RetroAchievementsHost | undefined,
    experiments = undefined as Record<string, string> | undefined,
  } = {},
) {
  const screenOfGame = (
    <GameScreen folder="/games" game={played} games={games} resume={resume} slot={slot} dismissedPads={new Set()} onQuit={onQuit} onUnsupported={onUnsupported} />
  );
  render(
    <SystemBarsProvider host={bars}>
      <EngineProvider engine={using}>
        <GameSurfaceProvider host={gameSurface}>
          <PreferencesProvider
            host={preferences}
            defaults={{ touchControls, fastForwardSpeed: 2, showFps, theme: "system", eventsNoticeDismissed: false, updateDismissedVersion: 0, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1, playInSilentMode: false, renderer, skins: skinChoices, skinHintSeen: false, screenDepth: true, screenGlass: true, asyncShaders: false, gameCubeResolution: 1 }}
          >
            <GamesFolderProvider host={gamesFolder}>
              <SyncProvider host={sync.host}>
                <FakeGameArt>
                  <BackProvider host={back}>
                    <PlusProvider host={plusHost}>
                      <ExperimentsProvider host={{ load: async () => experiments ?? {}, save: async () => {} }} registry={experiments ? labExperiments : []}>
                        {retroAchievements ? (
                          <RetroAchievementsProvider host={retroAchievements}>{screenOfGame}</RetroAchievementsProvider>
                        ) : (
                          screenOfGame
                        )}
                      </ExperimentsProvider>
                    </PlusProvider>
                  </BackProvider>
                </FakeGameArt>
              </SyncProvider>
            </GamesFolderProvider>
          </PreferencesProvider>
        </GameSurfaceProvider>
      </EngineProvider>
    </SystemBarsProvider>,
  );
  await act(async () => {});
}

const paused = () => screen.getByTestId("player").hasAttribute("data-paused");
const pauseMenu = () => screen.queryByRole("dialog", { hidden: true });
const notice = () => screen.queryByRole("alertdialog");
const setupOpen = () => screen.queryAllByRole("listitem").length > 0;

async function pressOddPad() {
  const pad = pads.connect({ id: "Odd Pad", mapping: "" });
  await play();
  pad.press(3);
  return pad;
}

const plastic = () => document.querySelector<HTMLElement>("[style*='background-image']");

it("draws the chosen skin's plastic behind the game in portrait, with the bars' icons to suit it", async () => {
  windowSize(390, 844);
  const light: boolean[] = [];
  const polarWhite = skins.nds.find(({ id }) => id === "polar-white")!;

  await play(undefined, undefined, undefined, {
    played: { name: "Platinum", path: "nds/Platinum.nds", system: "nds" },
    skinChoices: { ...defaultSkins, nds: { skin: "polar-white", look: "moulded" } },
    bars: { setHidden() {}, setLight: (on) => void light.push(on), splashHidden() {} },
  });

  expect(plastic()?.style.backgroundImage).toContain(polarWhite.image);
  expect(light.at(-1)).toBe(true);
});

it("replaces the shown skin when sync brings another one down during the game", async () => {
  windowSize(390, 844);
  let syncDown = (_: Partial<Record<System, unknown>>) => {};
  const glacier = skins.gba.find(({ id }) => id === "glacier")!;
  await play(undefined, undefined, undefined, {
    plus: { state: "owned" },
    preferences: {
      load: async () => ({}),
      save: async () => {},
      onSkinsChanged: (listener) => {
        syncDown = listener;
        return () => {};
      },
    },
  });
  expect(plastic()?.style.backgroundImage).toContain(skins.gba[0].image);

  act(() => syncDown({ gba: { skin: "glacier", look: "frosted", changedAt: 2 } }));

  expect(plastic()?.style.backgroundImage).toContain(glacier.image);
});

it("shows pkhemu for a saved Plus skin until Plus comes back, keeping the choice", async () => {
  windowSize(390, 844);
  const glacier = skins.gba.find(({ id }) => id === "glacier")!;
  const { host, report } = fakePlus({ status: { state: "notOwned", price: "$3.99" } });
  const save = vi.fn(async () => {});
  await play(undefined, undefined, undefined, {
    plusHost: host,
    skinChoices: { ...defaultSkins, gba: { skin: "glacier", look: "moulded" } },
    preferences: { load: async () => ({}), save },
  });
  expect(plastic()?.style.backgroundImage).toContain(skins.gba[0].image);

  act(() => report({ state: "owned" }));

  expect(plastic()?.style.backgroundImage).toContain(glacier.image);
  expect(save).not.toHaveBeenCalled();
});

const skinned = () => document.querySelector<HTMLElement>("[data-skin]");
const wordmark = () => screen.getByTestId("player").textContent;

it("styles the touch controls in the chosen look and prints the wordmark under the screen", async () => {
  windowSize(390, 844);
  const classicGrey = skins.gb.find(({ id }) => id === "classic-grey")!;

  await play(undefined, undefined, undefined, {
    played: { name: "Red", path: "gb/Red.gb", system: "gb" },
    skinChoices: { ...defaultSkins, gb: { skin: "classic-grey", look: "frosted" } },
  });

  expect(skinned()?.style.getPropertyValue("--skin-blur")).toBe(lookVariables(classicGrey, "frosted")["--skin-blur"]);
  expect(wordmark()).toBe("pkhemu");
});

it("leaves the wordmark off DS", async () => {
  windowSize(390, 844);

  await play(undefined, undefined, undefined, { played: { name: "Platinum", path: "nds/Platinum.nds", system: "nds" } });

  expect(skinned()).not.toBeNull();
  expect(wordmark()).toBe("");
});

it("keeps the game area black in landscape", async () => {
  await play();

  expect(plastic()).toBeNull();
  expect(skinned()).toBeNull();
});

it.each([
  ["gc", 3],
  ["gba", undefined],
] as const)("starts a %s game at the GameCube resolution only if it's a GameCube game", async (system, resolution) => {
  const preferences: PreferencesHost = { load: async () => ({ gameCubeResolution: 3 }), save: async () => {} };

  await play(undefined, undefined, undefined, { preferences, played: { name: "Game", path: `${system}/Game`, system } });

  expect(game.resolution).toBe(resolution);
});

const holding = () => screen.getByTestId("player").getAttribute("data-holding");

it.each(["nds", "3ds"] as const)("shows both screens of a %s game, with a button to swap them", async (system) => {
  windowSize(390, 844);
  await play(undefined, undefined, undefined, { played: { name: "Game", path: `${system}/Game`, system } });

  expect(game.screens).toBe(dualScreens[system]);
  screen.getByRole("button", { name: "Swap screens" });
});

it("drops the header in landscape while the touch controls show", async () => {
  await play(undefined, undefined, undefined, { touchControls: true });

  expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
});

it("keeps the header in portrait with the touch controls", async () => {
  windowSize(390, 844);
  await play(undefined, undefined, undefined, { touchControls: true });

  screen.getByRole("button", { name: "Back" });
});

it("lays a short portrait window out as landscape, without the header or the skin, and the game under the controls", async () => {
  windowSize(375, 486);
  await play(undefined, undefined, undefined, { touchControls: true });

  expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  expect(plastic()).toBeNull();
  expect(game.clearance).toBeUndefined();
});

it("keeps the header in landscape without the touch controls", async () => {
  await play();

  screen.getByRole("button", { name: "Back" });
});

it("swaps a DS game's screens from the pause menu and closes it", async () => {
  await play(undefined, undefined, undefined, { touchControls: true, played: { name: "Game", path: "nds/Game", system: "nds" } });
  await openPauseMenu();

  fireEvent.click(screen.getByRole("button", { name: "Swap screens" }));
  await act(async () => {});

  expect(game.swapped).toBe(true);
  expect(pauseMenu()).toBeNull();
});

it.each(["nds", "3ds"] as const)("keeps a %s game's touch screen clear of touch controls on its side only", async (system) => {
  await play(undefined, undefined, undefined, { touchControls: true, played: { name: "Game", path: `${system}/Game`, system } });

  expect(game.clearance).toBe("landscape:pr-[11rem]");
  await openPauseMenu();
  fireEvent.click(screen.getByRole("button", { name: "Swap screens" }));
  await act(async () => {});
  expect(game.clearance).toBe("landscape:pl-[11rem]");
});

it("keeps stacked screens clear of touch controls on both sides", async () => {
  await play(undefined, undefined, undefined, { touchControls: true, played: { name: "Game", path: "nds/Game", system: "nds" } });

  act(() => game.onStacked?.(true));

  expect(game.clearance).toBe("landscape:px-[11rem]");
});

it("leaves one screen under the touch controls in a phone's landscape window", async () => {
  await play(undefined, undefined, undefined, { touchControls: true });

  expect(game.clearance).toBeUndefined();
});

it.each(["gba", "nds"] as const)("keeps a %s game clear of touch controls on both sides in a window close to square", async (system) => {
  square = true;
  await play(undefined, undefined, undefined, { touchControls: true, played: { name: "Game", path: `${system}/Game`, system } });

  expect(game.clearance).toBe("landscape:px-[11rem]");
});

it("shows one screen and no swap button for a game with one screen", async () => {
  await play();

  expect(game.screens).toBeUndefined();
  expect(screen.queryByRole("button", { name: "Swap screens" })).toBeNull();
});

it("shows the frames drawn beside the FPS in builds that aren't store builds", async () => {
  await play(undefined, undefined, undefined, { showFps: true, plus: { state: "unlocked" } });

  act(() => game.onFps!({ fps: 240, drawn: 120, skipped: 0, repeated: 0 }));

  expect(screen.getByText(/240/).textContent).toContain("120");
});

it("shows only the FPS in store builds, even with Plus", async () => {
  await play(undefined, undefined, undefined, { showFps: true, plus: { state: "owned" } });

  act(() => game.onFps!({ fps: 240, drawn: 120, skipped: 0, repeated: 0 }));

  expect(screen.getByText(/240/).textContent).not.toContain("120");
});

it("shows the frames skipped and repeated beside the FPS, even in store builds", async () => {
  await play(undefined, undefined, undefined, { showFps: true, plus: { state: "owned" } });

  act(() => game.onFps!({ fps: 240, drawn: 120, skipped: 13, repeated: 47 }));

  expect(screen.getByText(/240/).textContent).toMatch(/13.*47/);
});

it("hands a load the device can't run back to the game page", async () => {
  const onUnsupported = vi.fn();
  await play(undefined, undefined, undefined, { onUnsupported });

  act(() => game.onError!("unsupported-device"));

  expect(onUnsupported).toHaveBeenCalledOnce();
  expect(screen.getByTestId("player")).toBeTruthy();
});

it("shows any other load failure in place of the game", async () => {
  const onUnsupported = vi.fn();
  await play(undefined, undefined, undefined, { onUnsupported });

  act(() => game.onError!("the core refused the ROM"));

  expect(onUnsupported).not.toHaveBeenCalled();
  expect(screen.getByText("the core refused the ROM")).toBeTruthy();
});

it("brings the header back when the game fails in landscape with the touch controls", async () => {
  await play(undefined, undefined, undefined, { touchControls: true });

  act(() => game.onError!("the core refused the ROM"));

  screen.getByRole("button", { name: "Back" });
});

it("fetches the game's changes before it starts", async () => {
  const sync = fakeSync({ account: "player@example.com" });
  await play(engine, sync);

  expect(sync.host.syncGame).toHaveBeenCalledWith("/games", "gba/Emerald.gba");
  expect(holding()).toBeNull();
  expect(screen.queryByText("Couldn't check your other devices for changes")).toBeNull();
});

it("starts the game anyway when its changes don't come in time, and says so", async () => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "setTimeout", "clearTimeout"] });
  const sync = fakeSync({ account: "player@example.com", gameSync: "never" });
  await play(engine, sync);
  expect(holding()).toBe("Checking your other devices…");

  await act(async () => vi.advanceTimersByTime(OPEN_WAIT_MS));

  expect(holding()).toBeNull();
  expect(screen.getByText("Couldn't check your other devices for changes")).toBeTruthy();
});

it("starts the game anyway when fetching its changes fails, and says so", async () => {
  await play(engine, fakeSync({ account: "player@example.com", gameSync: "fails" }));

  expect(holding()).toBeNull();
  expect(screen.getByText("Couldn't check your other devices for changes")).toBeTruthy();
});

const saveConflict = {
  file: "save",
  device: { savedOn: "Pixel 8", modified: Date.now() - 3600_000, cheats: false },
  cloud: { savedOn: "MacBook Air", modified: Date.now() - 7200_000, cheats: false },
};

it("asks which version to keep before a game that changed on two devices starts", async () => {
  const sync = fakeSync({ account: "player@example.com", conflicts: [saveConflict] });
  await play(engine, sync);
  const sheet = screen.getByRole("dialog", { name: "This game changed on another device" });
  expect(holding()).not.toBeNull();

  await act(async () => fireEvent.click(within(sheet).getByRole("button", { name: /^Cloud/ })));

  expect(sync.host.resolve).toHaveBeenCalledExactlyOnceWith("/games", "gba/Emerald.gba", "save", "cloud");
  expect(holding()).toBeNull();
});

it("leaves the game closed when the conflict sheet closes without a pick", async () => {
  const sync = fakeSync({ account: "player@example.com", conflicts: [saveConflict] });
  const onQuit = vi.fn();
  await play(engine, sync, onQuit);

  await act(async () => fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" }));

  expect(onQuit).toHaveBeenCalledOnce();
  expect(sync.host.resolve).not.toHaveBeenCalled();
  expect(holding()).not.toBeNull();
});

it("starts the game straight away when sync is off", async () => {
  const sync = fakeSync();
  await play(engine, sync);

  expect(holding()).toBeNull();
  expect(sync.host.syncGame).not.toHaveBeenCalled();
});

function swipeFromLeftEdge(target: Element) {
  const at = (clientX: number) => [{ identifier: 0, clientX, clientY: 300 }];
  fireEvent.touchStart(target, { touches: at(4), changedTouches: at(4) });
  fireEvent.touchEnd(target, { touches: [], changedTouches: at(120) });
}

it("leaves a swipe from the left edge to the game on iOS", async () => {
  const quits: string[] = [];
  await play(engine, undefined, () => quits.push("quit"), { back: iosBackHost });

  swipeFromLeftEdge(screen.getByTestId("player"));
  swipeFromLeftEdge(screen.getByRole("banner"));

  expect(pauseMenu()).toBeNull();
  expect(quits).toEqual([]);
});

it("goes back from a screen over the game with a swipe from the left edge on iOS", async () => {
  await play(engine, undefined, undefined, { back: iosBackHost });
  await openPauseMenu();
  fireEvent.click(screen.getByRole("button", { name: "Cheats" }));
  await act(async () => {});

  swipeFromLeftEdge(screen.getByRole("switch", { name: "Infinite money" }));
  await act(async () => {});

  expect(screen.queryByRole("switch", { name: "Infinite money" })).toBeNull();
  expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
});

it("pauses the game to show the notice over the pause menu", async () => {
  await pressOddPad();

  expect(paused()).toBe(true);
  expect(notice()).toBeTruthy();
  expect(pauseMenu()).toBeTruthy();
});

it("returns to the pause menu after setting up the pad", async () => {
  const pad = await pressOddPad();
  fireEvent.click(screen.getByRole("button", { name: "Set up" }));
  act(() => void vi.advanceTimersToNextFrame());
  expect(setupOpen()).toBe(true);

  answerEverySetupStep(pad);
  await act(async () => {});

  expect(setupOpen()).toBe(false);
  expect(pauseMenu()).toBeTruthy();
  expect(paused()).toBe(true);
});

it("returns to the pause menu when setup is cancelled", async () => {
  await pressOddPad();
  fireEvent.click(screen.getByRole("button", { name: "Set up" }));
  act(() => void vi.advanceTimersToNextFrame());

  fireEvent.keyDown(window, { key: "Escape" });

  expect(setupOpen()).toBe(false);
  expect(pauseMenu()).toBeTruthy();
  expect(paused()).toBe(true);
});

it("stays paused when another pad opens the pause menu over the notice", async () => {
  const other = pads.connect();
  await pressOddPad();

  other.press(16);

  expect(notice()).toBeTruthy();
  expect(paused()).toBe(true);
});

it("pauses when the phone takes the sound away for a call or alarm", async () => {
  await play();

  act(() => game.pauseRequested!());

  expect(paused()).toBe(true);
  expect(pauseMenu()).toBeTruthy();
});

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

async function openPauseMenu() {
  const [button] = screen.getAllByRole("button", { name: "Pause menu" });
  fireEvent.pointerDown(button, { button: 0 });
  fireEvent.click(button);
  await act(async () => {});
}

it("opens the game's cheats from the pause menu, and goes back to it", async () => {
  await play();
  await openPauseMenu();

  fireEvent.click(screen.getByRole("button", { name: "Cheats" }));
  await act(async () => {});
  fireEvent.click(screen.getByRole("switch", { name: "Infinite money" }));
  await act(async () => {});
  expect(tauriCheatsHost.toggleCheat).toHaveBeenCalledWith("/games", "gba/Emerald.gba", "id-1", true);

  fireEvent.keyDown(window, { key: "Escape" });
  await act(async () => {});
  expect(screen.queryByRole("switch", { name: "Infinite money" })).toBeNull();
  expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
  expect(paused()).toBe(true);
});

it("leaves Skin out of the pause menu while the touch controls are off", async () => {
  await play();
  await openPauseMenu();

  expect(screen.queryByRole("button", { name: /^Skin/ })).toBeNull();
});

it("opens the game's skin picker from the pause menu with the paused frame, and goes back to it", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  await play(undefined, undefined, undefined, {
    touchControls: true,
    skinChoices: { ...defaultSkins, gba: { skin: "indigo", look: "frosted" } },
  });
  await openPauseMenu();
  const entry = screen.getByRole("button", { name: /^Skin/ });
  expect(entry.textContent).toContain("Indigo · Frosted");

  fireEvent.click(entry);
  await act(async () => {});

  expect(screen.getByRole("heading", { name: "Game Boy Advance skin" })).toBeTruthy();
  expect(invoke).toHaveBeenCalledWith("paused_screenshot");
  expect(paused()).toBe(true);
  fireEvent.keyDown(window, { key: "Escape" });
  await act(async () => {});
  expect(screen.queryByRole("heading", { name: "Game Boy Advance skin" })).toBeNull();
  expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
  vi.unstubAllGlobals();
});

const researching = { plus: { state: "owned" } as PlusStatus, experiments: { research: "on" } };
const research = () => screen.queryByRole("region", { name: "Research" });

it("opens Research from a Gen 3 game's pause menu, and goes back to the menu", async () => {
  game.save = emeraldSave();
  await play(engine, undefined, undefined, researching);
  await openPauseMenu();

  fireEvent.click(await screen.findByRole("button", { name: /^Research/ }));
  await act(async () => {});
  expect(research()).toBeTruthy();
  expect(paused()).toBe(true);

  fireEvent.keyDown(window, { key: "Escape" });
  await act(async () => {});
  expect(research()).toBeNull();
  expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
});

it("goes back from Research to the pause menu with B", async () => {
  game.save = emeraldSave();
  const pad = pads.connect();
  await play(engine, undefined, undefined, researching);
  await openPauseMenu();
  fireEvent.click(await screen.findByRole("button", { name: /^Research/ }));
  await act(async () => {});
  act(() => void vi.advanceTimersToNextFrame());

  act(() => pad.press(buttons.b));
  await act(async () => {});

  expect(research()).toBeNull();
  expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
});

const researchLine = () => screen.getByRole("button", { name: /^Research/ }).textContent;

it("finishes a Research compare started before the game quit", async () => {
  game.save = emeraldSave();
  await play(engine, undefined, undefined, researching);
  await openPauseMenu();
  fireEvent.click(await screen.findByRole("button", { name: /^Research/ }));
  await act(async () => {});
  fireEvent.click(await screen.findByRole("button", { name: /Latest save/ }));
  await act(async () => {});
  cleanup();

  game.sinceSave = 600;
  await play(engine, undefined, undefined, researching);
  await openPauseMenu();
  await waitFor(() => expect(researchLine()).toContain("Waiting for your next save"));
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));
  await act(async () => {});

  game.save = emeraldSave([{ section: 1, offset: 0x490, bytes: [1] }]);
  game.sinceSave = 2;
  await waitFor(() => expect(screen.getByText("Compare ready in Research")).toBeTruthy());
  await openPauseMenu();
  expect(researchLine()).toContain("Compare ready");
});

it("ends a Research compare when the game starts from a save state", async () => {
  game.save = emeraldSave();
  game.research.set("gba/Emerald.gba:compare", { stage: "baseline" });

  await play(engine, undefined, undefined, { ...researching, slot: 2 });
  await openPauseMenu();

  await waitFor(() => expect(researchLine()).toContain("Compare two saves"));
});

const vector = (name: string) => new Uint8Array(readFileSync(join(import.meta.dirname, "research/layouts/transforms/vectors", name)));

it("offers Research on a Game Boy game whose save a layout reads", async () => {
  game.save = vector("red.sav");
  await play(engine, undefined, undefined, { ...researching, played: { name: "Red", path: "gb/Red.gb", system: "gb" } });
  await openPauseMenu();

  expect(await screen.findByRole("button", { name: /^Research/ })).toBeTruthy();
});

it("offers Research on a GameCube game whose memory card holds its save", async () => {
  game.save = vector("colosseum.raw");
  await play(engine, undefined, undefined, { ...researching, played: { name: "Colosseum", path: "gc/Colosseum.rvz", system: "gc" } });
  await openPauseMenu();

  expect(await screen.findByRole("button", { name: /^Research/ })).toBeTruthy();
});

it("leaves Research out of a game whose save no layout reads", async () => {
  game.save = vector("gold-jpn.sav");
  await play(engine, undefined, undefined, { ...researching, played: { name: "Gold", path: "gbc/Gold.gbc", system: "gbc" } });
  await openPauseMenu();
  await act(async () => {});

  expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^Research/ })).toBeNull();
});

it("leaves Research out of the pause menu while the experiment is off", async () => {
  await play(engine, undefined, undefined, { ...researching, experiments: {} });
  await openPauseMenu();
  await act(async () => {});

  expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^Research/ })).toBeNull();
});

it("steps back one screen at a time with B from a skin picker opened from Settings", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  const pad = pads.connect();
  await play(undefined, undefined, undefined, { touchControls: true });
  await openPauseMenu();
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Skins" }));
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: /^Nintendo 64/ }));
  await act(async () => {});
  expect(screen.getByRole("heading", { name: "Nintendo 64 skin" })).toBeTruthy();
  act(() => void vi.advanceTimersToNextFrame());

  act(() => pad.press(buttons.b));
  await act(async () => {});
  expect(screen.queryByRole("heading", { name: "Nintendo 64 skin" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Skins" })).toBeTruthy();

  act(() => pad.press(buttons.b));
  await act(async () => {});
  expect(screen.queryByRole("heading", { name: "Skins" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Settings" })).toBeTruthy();

  act(() => pad.press(buttons.b));
  await act(async () => {});
  expect(screen.queryByRole("heading", { name: "Settings" })).toBeNull();
  expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
  vi.unstubAllGlobals();
});

const stadium: Game = { name: "Stadium", path: "n64/Stadium.z64", system: "n64" };
const library: Game[] = [
  { name: "Red", path: "gb/Red.gb", system: "gb" },
  { name: "Crystal", path: "gbc/Crystal.gbc", system: "gbc" },
  stadium,
];

it("restarts the game with the cart picked from the pause menu, after asking", async () => {
  game.transferPak = { game: "gb/Red.gb" };
  await play(undefined, undefined, undefined, { played: stadium, games: library, resume: true });
  await openPauseMenu();

  fireEvent.click(screen.getByRole("button", { name: /Transfer Pak/ }));
  await act(async () => {});
  expect(screen.getByRole("radio", { name: "Red" }).getAttribute("aria-checked")).toBe("true");
  fireEvent.click(screen.getByRole("radio", { name: "Crystal" }));
  await act(async () => {});
  expect(screen.getByRole("alertdialog")).toBeTruthy();
  expect(tauriTransferPakHost.chooseTransferPak).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Restart" }));
  await act(async () => {});

  expect(tauriTransferPakHost.chooseTransferPak).toHaveBeenCalledWith("/games", "n64/Stadium.z64", "gbc/Crystal.gbc");
  expect(game.starts).toEqual([true, false]);
  expect(paused()).toBe(false);
});

it("keeps the game running when the restart is cancelled", async () => {
  game.transferPak = { game: "gb/Red.gb" };
  await play(undefined, undefined, undefined, { played: stadium, games: library });
  await openPauseMenu();
  fireEvent.click(screen.getByRole("button", { name: /Transfer Pak/ }));
  await act(async () => {});
  fireEvent.click(screen.getByRole("radio", { name: "None" }));
  await act(async () => {});

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await act(async () => {});

  expect(tauriTransferPakHost.chooseTransferPak).not.toHaveBeenCalled();
  expect(game.starts).toEqual([false]);
  expect(screen.getByRole("radio", { name: "Red" }).getAttribute("aria-checked")).toBe("true");
});

it("leaves the Transfer Pak out of the pause menu for a game that doesn't use one", async () => {
  await play();
  await openPauseMenu();

  expect(screen.queryByRole("button", { name: /Transfer Pak/ })).toBeNull();
});

it("hides the switches for a game it can't read", async () => {
  await play();

  await openPauseMenu();

  expect(screen.queryByRole("switch")).toBeNull();
});

it("turns Pokémon info on for this game from the pause menu", async () => {
  game.readMemory = snapshotMemory(emeraldOverworld);
  wide = true;
  await play();
  await openPauseMenu();

  fireEvent.click(await screen.findByRole("switch", { name: /Pokémon info/ }));
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));

  expect(await screen.findByRole("complementary", { name: "Pokémon info" })).toBeTruthy();
  expect(game.settings["gba/Emerald.gba"]).toEqual({ pokemonInfo: true, randomized: false });
});

it("marks this game as randomized from the pause menu", async () => {
  game.readMemory = snapshotMemory(emeraldOverworld);
  await play();
  await openPauseMenu();

  fireEvent.click(await screen.findByRole("switch", { name: /Randomized/ }));

  await act(async () => {});
  expect(game.settings["gba/Emerald.gba"]).toEqual({ pokemonInfo: false, randomized: true });
});

it("shows the party beside the running game on a wide screen", async () => {
  game.readMemory = snapshotMemory(emeraldOverworld);
  game.settings["gba/Emerald.gba"] = { pokemonInfo: true };
  wide = true;
  await play();

  const panel = await screen.findByRole("complementary", { name: "Pokémon info" });

  expect(await within(panel).findByText("Torchic")).toBeTruthy();
  expect(paused()).toBe(false);
});

it("reads a ROM hack's party with the game's stored save format", async () => {
  game.readMemory = snapshotMemory(emeraldOverworld);
  game.settings["gba/Emerald.gba"] = { pokemonInfo: true, formatId: "unbound" };
  wide = true;
  const hack = fakeEngine({
    inMemory: { TORCHIC: { species: 62146 } },
    memoryFormat: { id: "unbound", species: [{ id: 62146, name: "Shadow Warrior" }] },
  });
  await play(hack.engine);

  const panel = await screen.findByRole("complementary", { name: "Pokémon info" });

  expect(await within(panel).findByRole("button", { name: /Shadow Warrior/ })).toBeTruthy();
});

it("reads a ROM hack's opponent in the pill with the game's stored save format", async () => {
  game.readMemory = snapshotMemory(emeraldWild);
  game.settings["gba/Emerald.gba"] = { pokemonInfo: true, formatId: "unbound" };
  const hack = fakeEngine({
    inMemory: { POOCHYENA: { species: 62146 } },
    memoryFormat: { id: "unbound", species: [{ id: 62146, name: "Shadow Warrior" }] },
  });
  await play(hack.engine);

  expect(await screen.findByRole("button", { name: /Shadow Warrior/ })).toBeTruthy();
});

it("shows nothing until Pokémon info is on", async () => {
  game.readMemory = snapshotMemory(emeraldWild);
  wide = true;
  await play();
  await settle();

  expect(screen.queryByRole("complementary", { name: "Pokémon info" })).toBeNull();
});

it("shows the opponent in a pill over the game on a phone, and pauses to show the card", async () => {
  game.readMemory = snapshotMemory(emeraldWild);
  game.settings["gba/Emerald.gba"] = { pokemonInfo: true };
  await play();

  const pill = await screen.findByRole("button", { name: /Poochyena/ });
  expect(paused()).toBe(false);
  fireEvent.click(pill);

  const sheet = screen.getByRole("dialog");
  expect(within(sheet).getByRole("article", { name: /Poochyena/ })).toBeTruthy();
  expect(paused()).toBe(true);

  fireEvent.keyDown(sheet, { key: "Escape" });
  await act(async () => {});
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(paused()).toBe(false);
});

it("shows the opponent's nature in the pill, and its nature and ability on the card", async () => {
  game.readMemory = snapshotMemory(emeraldWild);
  game.settings["gba/Emerald.gba"] = { pokemonInfo: true };
  await play();

  fireEvent.click(await screen.findByRole("button", { name: /Poochyena.*Adamant/ }));

  const card = within(screen.getByRole("dialog")).getByRole("article", { name: /Poochyena/ });
  expect(within(card).getByText(/Adamant/)).toBeTruthy();
  expect(within(card).getByText(/Intimidate/)).toBeTruthy();
});

it("leaves the ability off the card of a randomized game", async () => {
  game.readMemory = snapshotMemory(emeraldWild);
  game.settings["gba/Emerald.gba"] = { pokemonInfo: true, randomized: true };
  wide = true;
  await play();

  const card = await within(await screen.findByRole("complementary", { name: "Pokémon info" })).findByRole("article", { name: /Poochyena/ });

  expect(within(card).getByText(/Adamant/)).toBeTruthy();
  expect(within(card).queryByText(/Intimidate/)).toBeNull();
});

it("shows no pill outside battle", async () => {
  game.readMemory = snapshotMemory(emeraldOverworld);
  game.settings["gba/Emerald.gba"] = { pokemonInfo: true };
  await play();
  await settle();

  expect(screen.queryByRole("button", { name: /Torchic/ })).toBeNull();
  expect(screen.queryByRole("complementary", { name: "Pokémon info" })).toBeNull();
});

const nativeSurface: GameSurfaceHost = { renderers: ["native", "compatible"], setPlaying() {} };

it.each([
  ["automatic", nativeSurface, "native"],
  ["compatible", nativeSurface, "compatible"],
  ["native", noGameSurfaceHost, "compatible"],
] as const)("starts the game with the %s renderer's pick", async (renderer, gameSurface, picked) => {
  await play(engine, undefined, undefined, { renderer, gameSurface });

  expect(game.renderer).toBe(picked);
});

it("tells a player who picked Native that it failed", async () => {
  await play(engine, undefined, undefined, { renderer: "native", gameSurface: nativeSurface });

  act(() => game.onNativeFailed!());

  expect(screen.getByRole("status")).toBeTruthy();
});

it("falls back quietly when Automatic's Native fails", async () => {
  await play(engine, undefined, undefined, { renderer: "automatic", gameSurface: nativeSurface });

  act(() => game.onNativeFailed!());

  expect(screen.queryByRole("status")).toBeNull();
});

const boulder: Achievement = {
  id: 1,
  title: "Boulder Badge",
  description: "Defeat Brock in Pewter City",
  points: 10,
  badge: "00001",
  earned: { at: null, hardcore: false },
  progress: null,
  rarity: 62,
};
const cascade: Achievement = { ...boulder, id: 2, title: "Cascade Badge", description: "Defeat Misty", earned: null, progress: "1/2" };

function fakeRetroAchievements({ hardcore = false, set = false, edited = false } = {}) {
  const listeners = new Set<(event: AchievementEvent) => void>();
  const host = {
    turn: async () => {},
    account: async () => "Player",
    signIn: async (user) => user,
    signOut: async () => {},
    createAccount: async () => {},
    openProfile: async () => {},
    onEvent: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    badge: async () => undefined,
    playing: async () => [cascade, boulder],
    game: async () => (set ? [cascade, boulder] : null),
    summary: async () => null,
    hardcore: async () => hardcore,
    setHardcore: async () => {},
    leaveHardcore: vi.fn(async () => {}),
    edited: async () => edited,
    settleEdited: async () => edited,
  } satisfies RetroAchievementsHost;
  const unlock = (...achievements: Achievement[]) =>
    act(async () =>
      achievements.forEach(({ id, title, description, points, badge }) =>
        listeners.forEach((listener) => listener({ kind: "unlocked", id, title, description, points, badge })),
      ),
    );
  return { host, unlock };
}

const pill = () => screen.queryByRole("status", { name: /^Achievement unlocked/ });

async function tapPill() {
  const shown = pill()!;
  shown.setPointerCapture = () => {};
  fireEvent.pointerDown(shown, { pointerId: 1, clientX: 100, clientY: 20 });
  fireEvent.pointerUp(shown, { pointerId: 1, clientX: 100, clientY: 20 });
  await act(async () => {});
}

it("opens a tapped unlock's details over the paused game, and holds the next until Resume", async () => {
  const { host, unlock } = fakeRetroAchievements();
  await play(undefined, undefined, undefined, { retroAchievements: host, plus: { state: "unlocked" } });
  await unlock(boulder, cascade);

  await tapPill();

  expect(pill()).toBeNull();
  expect(paused()).toBe(true);
  const sheet = screen.getByRole("dialog", { name: /Boulder Badge/ });
  expect(within(sheet).getByText("Defeat Brock in Pewter City")).toBeTruthy();
  expect(within(sheet).getByText("62%")).toBeTruthy();
  expect(screen.queryByRole("status", { name: /Cascade Badge/ })).toBeNull();

  fireEvent.click(within(sheet).getByRole("button", { name: "Resume" }));
  await act(async () => {});

  expect(paused()).toBe(false);
  expect(screen.getByRole("status", { name: /Cascade Badge/ })).toBeTruthy();
});

it("goes from a tapped unlock's details to the game's list", async () => {
  const { host, unlock } = fakeRetroAchievements();
  await play(undefined, undefined, undefined, { retroAchievements: host, plus: { state: "unlocked" } });
  await unlock(boulder);
  await tapPill();

  fireEvent.click(screen.getByRole("button", { name: "All achievements" }));
  await act(async () => {});

  expect(screen.getByRole("heading", { name: "Achievements" })).toBeTruthy();
  expect(screen.getByText("1/2 · 10 pts")).toBeTruthy();
  expect(paused()).toBe(true);
});

it("opens the game's list from the pause menu, and a row's details from it", async () => {
  const { host } = fakeRetroAchievements();
  await play(undefined, undefined, undefined, { retroAchievements: host, plus: { state: "unlocked" } });
  await openPauseMenu();

  fireEvent.click(screen.getByRole("button", { name: /^Achievements/ }));
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: /Cascade Badge/ }));
  await act(async () => {});

  const sheet = screen.getByRole("dialog", { name: /Cascade Badge/ });
  expect(within(sheet).getByText("1/2")).toBeTruthy();
  fireEvent.click(within(sheet).getByRole("button", { name: "Resume" }));
  await act(async () => {});
  expect(paused()).toBe(false);
});

const quits = vi.fn();

const inHardcore = async (options: Parameters<typeof fakeRetroAchievements>[0] = {}, start: { resume?: boolean; slot?: number } = {}) => {
  quits.mockClear();
  const ra = fakeRetroAchievements({ hardcore: true, set: true, ...options });
  await play(undefined, undefined, quits, { retroAchievements: ra.host, plus: { state: "unlocked" }, ...start });
  return ra;
};

const lockQuestion = () => screen.queryByRole("alertdialog");

it("starts a game with a set in hardcore once the switch is on", async () => {
  await inHardcore();

  expect(game.launches).toEqual([{ resume: false, hardcore: true }]);
});

it("plays a game without a set as asked, in softcore", async () => {
  await inHardcore({ set: false }, { resume: true });

  expect(lockQuestion()).toBeNull();
  expect(game.launches).toEqual([{ resume: true, hardcore: false }]);
});

it("asks before each feature hardcore locks, and keeps fast-forward and save states", async () => {
  game.states = { current: 1, slots: [{ slot: 1, savedAt: 0, playSinceSave: null, loadable: true }], canUndoLoad: true };
  await inHardcore();
  const asked: Record<string, string> = {};

  for (const entry of ["Edit save", "Load state", "Undo load state", "Cheats"]) {
    await openPauseMenu();
    fireEvent.click(screen.getByRole("button", { name: entry }));
    await act(async () => {});
    asked[entry] = within(lockQuestion()!).getByRole("heading").textContent!;
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await act(async () => {});
    expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    await act(async () => {});
  }

  expect(asked).toEqual({
    "Edit save": "Editing the save ends hardcore until you restart the game",
    "Load state": "Loading a state ends hardcore until you restart the game",
    "Undo load state": "Undoing the load ends hardcore until you restart the game",
    Cheats: "Cheats end hardcore until you restart the game",
  });
  await openPauseMenu();
  fireEvent.click(screen.getByRole("button", { name: /^Fast-forward/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save state" }));
  await act(async () => {});
  expect(lockQuestion()).toBeNull();
  expect(screen.getByRole("heading", { name: "Save state" })).toBeTruthy();
});

it("drops the session to softcore when the player switches, and opens what they picked", async () => {
  const { host } = await inHardcore();
  await openPauseMenu();
  fireEvent.click(screen.getByRole("button", { name: "Cheats" }));
  await act(async () => {});

  fireEvent.click(screen.getByRole("button", { name: "Switch to softcore" }));
  await act(async () => {});

  expect(host.leaveHardcore).toHaveBeenCalledOnce();
  expect(screen.getByRole("switch", { name: "Infinite money" })).toBeTruthy();
  fireEvent.keyDown(window, { key: "Escape" });
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Edit save" }));
  await act(async () => {});
  expect(lockQuestion()).toBeNull();
});

it("asks before a hardcore launch resumes from a state, and resumes in softcore", async () => {
  await inHardcore({}, { resume: true });

  expect(game.launches).toEqual([]);
  fireEvent.click(within(lockQuestion()!).getByRole("button", { name: "Resume (softcore)" }));
  await act(async () => {});

  expect(game.launches).toEqual([{ resume: true, hardcore: false }]);
  expect(quits).not.toHaveBeenCalled();
});

it("quits from the launch question with Escape", async () => {
  await inHardcore({}, { resume: true });

  fireEvent.keyDown(lockQuestion()!, { key: "Escape" });
  await act(async () => {});

  expect(quits).toHaveBeenCalledOnce();
  expect(game.launches).toEqual([]);
});

it("restarts from the save in hardcore instead of loading the picked slot", async () => {
  await inHardcore({}, { resume: true, slot: 3 });

  fireEvent.click(within(lockQuestion()!).getByRole("button", { name: "Restart (hardcore)" }));
  await act(async () => {});

  expect(game.launches).toEqual([{ resume: false, hardcore: true }]);
  expect(quits).not.toHaveBeenCalled();
  expect(vi.mocked(invoke)).not.toHaveBeenCalledWith("load_state", expect.anything());
});

it("warns before playing an edited save in hardcore, and plays it in softcore", async () => {
  await inHardcore({ edited: true });

  const warning = lockQuestion()!;
  expect(within(warning).getByText(/This save was changed in pkhemu/)).toBeTruthy();
  fireEvent.click(within(warning).getByRole("button", { name: "Play in softcore" }));
  await act(async () => {});

  expect(game.launches).toEqual([{ resume: false, hardcore: false }]);
  expect(quits).not.toHaveBeenCalled();
});

it("plays an edited save in hardcore when the player insists", async () => {
  await inHardcore({ edited: true }, { resume: true });
  fireEvent.click(within(lockQuestion()!).getByRole("button", { name: "Restart (hardcore)" }));
  await act(async () => {});

  fireEvent.click(within(lockQuestion()!).getByRole("button", { name: "Play hardcore anyway" }));
  await act(async () => {});

  expect(game.launches).toEqual([{ resume: false, hardcore: true }]);
});

it("leaves Achievements out of the pause menu without RetroAchievements", async () => {
  await play();
  await openPauseMenu();

  expect(screen.queryByRole("button", { name: /^Achievements/ })).toBeNull();
});

const threeDs: Game = { name: "Pokémon Y", path: "3ds/Y.3ds", system: "3ds" };

it("warns before a 3DS game boots when the app lacks memory entitlements, naming each, and plays on", async () => {
  game.missingEntitlements = ["extended-virtual-addressing", "increased-memory-limit"];
  await play(undefined, undefined, undefined, { played: threeDs });

  const warning = notice()!;
  expect(within(warning).getByText(/extended virtual addressing/)).toBeTruthy();
  expect(within(warning).getByText(/increased memory limit/)).toBeTruthy();
  expect(within(warning).getByText(/AltStore/)).toBeTruthy();
  expect(game.launches).toEqual([]);

  fireEvent.click(within(warning).getByRole("button", { name: "Play anyway" }));
  await act(async () => {});

  expect(notice()).toBeNull();
  expect(game.launches).toEqual([{ resume: false, hardcore: false }]);
});

it("quits from the memory warning without booting the game", async () => {
  const quit = vi.fn();
  game.missingEntitlements = ["increased-memory-limit"];
  await play(undefined, undefined, quit, { played: threeDs });

  fireEvent.click(within(notice()!).getByRole("button", { name: "Back" }));
  await act(async () => {});

  expect(quit).toHaveBeenCalledOnce();
  expect(game.launches).toEqual([]);
});

it("boots a 3DS game without a warning when the app has its memory entitlements", async () => {
  await play(undefined, undefined, undefined, { played: threeDs });

  expect(notice()).toBeNull();
  expect(game.launches).toEqual([{ resume: false, hardcore: false }]);
});

it("warns before a GameCube game boots when the app lacks memory entitlements", async () => {
  game.missingEntitlements = ["increased-memory-limit"];
  await play(undefined, undefined, undefined, { played: { name: "Colosseum", path: "gc/Colosseum.rvz", system: "gc" } });

  expect(within(notice()!).getByText(/increased memory limit/)).toBeTruthy();
  expect(game.launches).toEqual([]);
});

it("boots other systems without the memory warning", async () => {
  game.missingEntitlements = ["extended-virtual-addressing", "increased-memory-limit"];
  await play();

  expect(notice()).toBeNull();
  expect(game.launches).toEqual([{ resume: false, hardcore: false }]);
});
