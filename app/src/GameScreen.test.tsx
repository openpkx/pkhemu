import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect } from "react";
import { EngineProvider } from "@pkhex-everywhere/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider } from "./back/back";
import { desktopBackHost } from "./back/desktopHost";
import { fakeEngine } from "./editor/fakeEngine";
import type { Range } from "./game-memory/builds";
import emeraldOverworld from "./game-memory/snapshots/emerald-overworld.json";
import emeraldWild from "./game-memory/snapshots/emerald-wild.json";
import { snapshotMemory } from "./game-memory/snapshots/snapshotMemory";
import { fakePads } from "./input/fakePads";
import type { Input } from "./input/input";
import { tauriCheatsHost } from "./cheats/tauriHost";
import type { Game } from "./library/scan";
import { tauriTransferPakHost } from "./transfer-pak/tauriHost";
import type { Rates } from "./fps-counter/fpsCounter";
import { GameScreen } from "./GameScreen";
import type { GameSettings } from "./preferences/gameSettings";
import { PreferencesProvider } from "./preferences/preferences";
import { FakeGameArt } from "./game-art/fakeGameArt";
import { GamesFolderProvider, type GamesFolderHost } from "./games-folder/gamesFolder";
import { ExperimentsProvider } from "./lab/lab";
import { fakePlus } from "./plus/fakePlus";
import { PlusProvider, type PlusStatus } from "./plus/plus";
import { fakeSync } from "./sync/fakeSync";
import { OPEN_WAIT_MS, SyncProvider } from "./sync/sync";

const game = vi.hoisted(() => ({
  readMemory: async (_: Range[]): Promise<Uint8Array> => Uint8Array.from([0, 0, 0, 0, 0]),
  settings: {} as Record<string, Partial<GameSettings>>,
  onFps: undefined as ((rates: Rates) => void) | undefined,
  onError: undefined as ((message: string) => void) | undefined,
  starts: [] as boolean[],
  transferPak: null as { game: string | null } | null,
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (command: string, args?: { ranges: Range[] }) =>
    command === "list_states"
      ? { current: null, slots: [], canUndoLoad: false }
      : command === "can_undo_edit"
        ? false
        : command === "read_memory"
          ? (await game.readMemory(args!.ranges)).buffer
          : undefined,
  ),
}));

vi.mock("./cheats/tauriHost", async () => ({
  tauriCheatsHost: (await import("./cheats/fakeCheats")).fakeCheats([{ name: "Infinite money", code: "82025838 FFFF", on: false }]),
}));

vi.mock("./core-message/tauriHost", () => ({ tauriCoreMessages: () => () => {} }));

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

vi.mock("./Player", () => ({
  Player: function Player({
    input,
    resume,
    paused,
    holdMessage,
    onStarted,
    onFps,
    onError,
  }: {
    input: Input;
    resume: boolean;
    paused: boolean;
    holdMessage?: string;
    onStarted?(): Promise<void>;
    onFps?(rates: Rates): void;
    onError(message: string): void;
  }) {
    game.onFps = onFps;
    game.onError = onError;
    useEffect(() => void game.starts.push(resume), []);
    useEffect(() => void (holdMessage === undefined && onStarted?.()), [holdMessage]);
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
    return <p data-testid="player" data-paused={paused || undefined} data-holding={holdMessage} />;
  },
}));

const STEPS = 17;

let pads: ReturnType<typeof fakePads>;

let wide = false;

beforeEach(() => {
  game.readMemory = async () => Uint8Array.from([0, 0, 0, 0, 0]);
  game.settings = {};
  game.starts = [];
  game.transferPak = null;
  vi.mocked(tauriTransferPakHost.chooseTransferPak).mockClear();
  wide = false;
  window.matchMedia = (() => ({ matches: wide, addEventListener() {}, removeEventListener() {} })) as never;
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
  ensureFolder: async () => {},
  folderExists: async () => true,
  loadSaved: async () => "/games",
  save: async () => {},
  label: (folder) => folder,
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
  } = {},
) {
  render(
    <EngineProvider engine={using}>
      <PreferencesProvider
        host={{ load: async () => ({}), save: async () => {} }}
        defaults={{ touchControls: false, fastForwardSpeed: 2, showFps, theme: "system", eventsNoticeDismissed: false, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1 }}
      >
        <GamesFolderProvider host={gamesFolder}>
          <SyncProvider host={sync.host}>
            <FakeGameArt>
              <BackProvider host={desktopBackHost}>
                <PlusProvider host={fakePlus({ status: plus }).host}>
                  <ExperimentsProvider host={{ load: async () => ({}), save: async () => {} }} registry={[]}>
                    <GameScreen folder="/games" game={played} games={games} resume={resume} dismissedPads={new Set()} onQuit={onQuit} onUnsupported={onUnsupported} />
                  </ExperimentsProvider>
                </PlusProvider>
              </BackProvider>
            </FakeGameArt>
          </SyncProvider>
        </GamesFolderProvider>
      </PreferencesProvider>
    </EngineProvider>,
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

const holding = () => screen.getByTestId("player").getAttribute("data-holding");

it("shows the frames drawn beside the FPS in builds that aren't store builds", async () => {
  await play(undefined, undefined, undefined, { showFps: true, plus: { state: "unlocked" } });

  act(() => game.onFps!({ fps: 240, drawn: 120 }));

  expect(screen.getByText(/240/).textContent).toContain("120");
});

it("shows only the FPS in store builds, even with Plus", async () => {
  await play(undefined, undefined, undefined, { showFps: true, plus: { state: "owned" } });

  act(() => game.onFps!({ fps: 240, drawn: 120 }));

  expect(screen.getByText(/240/).textContent).not.toContain("120");
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

  for (let button = 0; button < STEPS; button++) pad.press(button);
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

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

async function openPauseMenu() {
  fireEvent.click(screen.getByRole("button", { name: "Pause menu" }));
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
