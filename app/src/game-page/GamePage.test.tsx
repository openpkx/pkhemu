import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { PokemonId, PokemonSummary } from "@pkhex-everywhere/engine";
import { EngineProvider } from "@pkhex-everywhere/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider, type BackHost } from "@/back/back";
import { fakeBackHost } from "@/back/fakeBackHost";
import { BoxArtProvider } from "@/box-art/boxArt";
import { fakeBoxArt } from "@/box-art/fakeBoxArt";
import { ExportProvider } from "@/editor/exportFile";
import { fakeEngine, type FakeTransfer } from "@/editor/fakeEngine";
import { fakePads, padButtons } from "@/input/fakePads";
import { createInput } from "@/input/input";
import { pngDataUrl } from "@/lib/utils";
import type { Game } from "@/library/scan";
import { PadNavigation } from "@/pad-navigation/PadNavigation";
import { FakeGameArt, fakeGameArt } from "@/game-art/fakeGameArt";
import { PreferencesProvider, type Preferences } from "@/preferences/preferences";
import type { Backup } from "@/backups/backups";
import type { PatchedFrom, SaveFormat } from "@/preferences/gameSettings";
import type { SavedState } from "@/save-states/StatesScreen";
import { PatchRomProvider, type PatchRomHost } from "@/patch-rom/patchRom";
import { GamesFolderProvider, type GamesFolderHost } from "@/games-folder/gamesFolder";
import { fakeImport } from "@/import/fakeImport";
import { ImportProvider, type ImportHost } from "@/import/importFiles";
import { fakeFolder } from "@/library/fakeFolder";
import { LibraryProvider, type LibraryHost } from "@/library/library";
import { fakeSync } from "@/sync/fakeSync";
import { SyncProvider } from "@/sync/sync";
import { fakePlus } from "@/plus/fakePlus";
import { PlusProvider } from "@/plus/plus";
import { RetroAchievementsProvider, type Achievement, type RetroAchievementsHost } from "@/retro-achievements/retroAchievements";
import type { TransferPak } from "@/transfer-pak/setting";
import { GamePage, type GamePageHost } from "./GamePage";
import { summaryRevision, type SaveSummary } from "./saveSummary";
import type { ResumeInfo } from "./unsavedResume";
import { defaultSkins } from "@/skins";

const defaultPreferences: Preferences = {
  touchControls: false,
  fastForwardSpeed: 2,
  showFps: false,
  theme: "system",
  eventsNoticeDismissed: false,
  updateDismissedVersion: 0,
  gameClockOffset: { days: 0, hours: 0 },
  restoreBackupsKept: 10,
  stickSensitivity: 1,
  playInSilentMode: false,
  renderer: "automatic",
  skins: defaultSkins,
  skinHintSeen: false,
  screenDepth: true,
  screenGlass: true,
  asyncShaders: false,
};

const emerald: Game = { system: "gba", name: "Pokemon - Emerald Version (USA, Europe)", path: "gba/Emerald.gba" };
const png = [137, 80, 78, 71];
const cover = pngDataUrl(png);

let pads: ReturnType<typeof fakePads>;

beforeEach(() => {
  pads = fakePads();
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function pokemon(species: string, slot: number, level: number): PokemonSummary {
  return {
    id: `${species}:${slot}` as PokemonId,
    at: { source: "party", slot },
    speciesId: slot + 1,
    speciesIndex: slot + 1,
    species,
    isUnknown: false,
    editable: true,
    form: { id: 0, name: "" },
    nickname: species.toUpperCase(),
    level,
    isShiny: false,
    gender: "male",
    isEgg: false,
    types: [],
  };
}

const may = { id: "12345/54321", name: "MAY", maxNameLength: 7, gender: "female" as const, money: 3000, battlePoints: null, rival: null };
const mayParty = [pokemon("Combusken", 0, 18), pokemon("Wingull", 1, 12)];

type FakeBackup = Backup & { bytes: number[] };

function fakeHost({
  resume = true,
  screenshot = true,
  played = true,
  save = false,
  info = { playSinceSave: 30 } as ResumeInfo | null,
  backups = [] as FakeBackup[],
  summaries = new Map<string, SaveSummary>(),
  states = [] as SavedState[],
  others = {} as Record<string, "readable" | "unreadable">,
  formats = {} as Record<string, SaveFormat>,
  romNames = {} as Record<string, string>,
  updates = {} as Record<string, number>,
  saveFiles = undefined as { extension: string; bytes: number[] }[] | undefined,
  transferPak = null as TransferPak | null,
} = {}) {
  let file = save ? { bytes: [1, 2, 3], modified: Date.now() - 2 * 3600_000, sha256: "abc" } : null;
  return {
    readSave: vi.fn(async (_folder: string, path: string) => {
      if (path === emerald.path) return file;
      if (others[path] === "unreadable") throw new Error("unreadable");
      return others[path] ? { bytes: [4, 5, 6], modified: 0, sha256: path } : null;
    }),
    readSaveFiles: vi.fn(async (_folder: string, _path: string) => saveFiles ?? (file ? [{ extension: "sav", bytes: file.bytes }] : [])),
    romGameName: vi.fn(async (_folder: string, path: string) => romNames[path] ?? null),
    threeDsUpdate: vi.fn(async (_folder: string, path: string) => updates[path] ?? null),
    saveSummary: vi.fn(async (sha256: string) => summaries.get(sha256) ?? null),
    keepSaveSummary: vi.fn(async (sha256: string, summary: SaveSummary) => void summaries.set(sha256, summary)),
    saveFormat: vi.fn(async (path: string) => formats[path] ?? null),
    keepSaveFormat: vi.fn(async (path: string, format: SaveFormat | null) => {
      if (format) formats[path] = format;
      else delete formats[path];
    }),
    hasResumeState: vi.fn(async (_folder: string, _path: string) => resume),
    resumePreview: vi.fn(async () => (resume && screenshot ? { screenshot: png, playSinceSave: null } : null)),
    resumeInfo: vi.fn(async () => (resume ? info : null)),
    playHistory: vi.fn(async () =>
      played ? { lastPlayed: Date.now() - 60_000, playTime: 3600 } : { lastPlayed: null, playTime: 0 },
    ),
    applyEdit: vi.fn(async () => {}),
    writeTransfer: vi.fn(async () => {}),
    keptCopies: vi.fn(async () => []),
    keepCopies: vi.fn(async () => {}),
    deleteGame: vi.fn(async (_folder: string, _path: string) => {}),
    listBackups: vi.fn(async () => backups.map(({ bytes: _, ...backup }) => backup)),
    readBackup: vi.fn(async (_folder: string, _path: string, name: string) => {
      const backup = backups.find((backup) => backup.name === name);
      if (!backup) throw new Error(`${name} isn't a backup`);
      return new Uint8Array(backup.bytes);
    }),
    restoreBackup: vi.fn(async (_folder: string, _path: string, name: string) => {
      const backup = backups.find((backup) => backup.name === name)!;
      file = { bytes: backup.bytes, modified: Date.now(), sha256: backup.sha256 };
      resume = false;
    }),
    deleteBackup: vi.fn(async (_folder: string, _path: string, name: string) => {
      backups = backups.filter((backup) => backup.name !== name);
    }),
    listStates: vi.fn(async () => ({ current: null, slots: states, canUndoLoad: false })),
    stateScreenshot: vi.fn(async () => null),
    deleteState: vi.fn(async (_folder: string, _path: string, slot: number) => {
      states = states.filter((saved) => saved.slot !== slot);
      if (info?.slot === slot) info = { ...info, slot: undefined };
    }),
    transferPak: vi.fn(async () => transferPak),
    chooseTransferPak: vi.fn(async (_folder: string, _path: string, game: string | null) => {
      transferPak = { game };
      resume = false;
    }),
  } satisfies GamePageHost;
}

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

function WithRetroAchievements({ host, children }: { host?: RetroAchievementsHost; children: ReactNode }) {
  if (!host) return children;
  return (
    <PlusProvider host={fakePlus({ status: { state: "unlocked" } }).host}>
      <RetroAchievementsProvider host={host}>{children}</RetroAchievementsProvider>
    </PlusProvider>
  );
}

async function launch(
  host: GamePageHost = fakeHost(),
  { engine } = fakeEngine({ trainer: may, party: mayParty }),
  {
    game = emerald,
    boxArt = fakeBoxArt(),
    games = [] as Game[],
    gameArt = fakeGameArt(),
    cover = undefined as string | undefined,
    preferences = {} as Partial<Preferences>,
    patchedFrom = null as PatchedFrom | null,
    sync = fakeSync({ available: false }),
    unsupported = undefined as "device" | "platform" | undefined,
    importHost = fakeImport() as ImportHost,
    retroAchievements = undefined as RetroAchievementsHost | undefined,
    back = undefined as BackHost | undefined,
  } = {},
) {
  const props = { onPlay: vi.fn(), onDelete: vi.fn(), onBack: vi.fn() };
  const exportHost = {
    saveFile: vi.fn(async ({ fileName }: { fileName: string }) => fileName),
    saveFiles: vi.fn(async (files: { fileName: string }[]) => files.map((file) => file.fileName).join(", ")),
  };
  const preferencesHost = { load: async () => preferences, save: async () => {} };
  const patchRomHost: PatchRomHost = {
    baseBuild: async () => "Emerald EN 1.0",
    pick: async () => null,
    bases: async () => ({ checked: true, games: [] }),
    dropped: () => Promise.reject(new Error("No drops here")),
    checkName: async () => {},
    create: async () => ({ path: "", sha256: "", baseChecked: false }),
    patchedFrom: async () => patchedFrom,
    keepPatchedFrom: async () => {},
  };
  const list = fakeFolder([game.path]);
  const library: LibraryHost = {
    listDir: (_folder, path) => list(path),
    recentlyPlayed: async () => [],
    scanGameArt: async () => {},
    resumeScreenshot: async () => null,
    hasResumeState: async () => false,
    playHistory: async () => ({ lastPlayed: null, playTime: 0 }),
  };
  render(
    <GamesFolderProvider host={gamesFolder}>
      <SyncProvider host={sync.host}>
        <PreferencesProvider host={preferencesHost} defaults={defaultPreferences}>
          <EngineProvider engine={engine}>
            <FakeGameArt art={gameArt} path={game.path}>
              <BoxArtProvider host={boxArt.host}>
                <BackProvider host={back}>
                  <ExportProvider host={exportHost}>
                    <PatchRomProvider host={patchRomHost}>
                      <LibraryProvider host={library} folder="/games" onOpen={() => {}} onPlay={() => {}}>
                        <ImportProvider host={importHost}>
                          <PadNavigation input={createInput(pads.gamepads)} />
                          <WithRetroAchievements host={retroAchievements}>
                            <GamePage host={host} folder="/games" game={game} games={games} cover={cover} unsupported={unsupported} {...props} />
                          </WithRetroAchievements>
                        </ImportProvider>
                      </LibraryProvider>
                    </PatchRomProvider>
                  </ExportProvider>
                </BackProvider>
              </BoxArtProvider>
            </FakeGameArt>
          </EngineProvider>
        </PreferencesProvider>
      </SyncProvider>
    </GamesFolderProvider>,
  );
  await act(async () => {});
  pads.hold();
  await act(async () => {});
  return { ...props, host, exportHost };
}

const button = (name: string | RegExp) => screen.queryByRole("button", { name });

const stadium: Game = { name: "Stadium", path: "n64/Stadium.z64", system: "n64" };
const gameBoyLibrary: Game[] = [
  { name: "Red", path: "gb/Red.gb", system: "gb" },
  { name: "Crystal", path: "gbc/Crystal.gbc", system: "gbc" },
  { name: "Emerald", path: "gba/Emerald.gba", system: "gba" },
  stadium,
];

it("puts a Game Boy game from the library in the Transfer Pak", async () => {
  const { host } = await launch(fakeHost({ transferPak: { game: "gb/Red.gb" } }), undefined, { game: stadium, games: gameBoyLibrary });
  const card = screen.getByRole("region", { name: "Transfer Pak" });
  expect(within(card).getByRole("combobox").textContent).toContain("Red");

  fireEvent.click(within(card).getByRole("combobox"));
  const list = await screen.findByRole("listbox");
  expect(within(list).getAllByRole("option").map((option) => option.textContent)).toEqual(["None", "Red", "Crystal"]);
  fireEvent.click(within(list).getByRole("option", { name: "Crystal" }));
  await act(async () => {});

  expect(host.chooseTransferPak).toHaveBeenCalledWith("/games", "n64/Stadium.z64", "gbc/Crystal.gbc");
  expect(within(card).getByRole("combobox").textContent).toContain("Crystal");
});

async function pickCart(name: string) {
  fireEvent.click(within(screen.getByRole("region", { name: "Transfer Pak" })).getByRole("combobox"));
  fireEvent.click(within(await screen.findByRole("listbox")).getByRole("option", { name }));
  await act(async () => {});
}

it("warns before changing the Transfer Pak when the resume point has unsaved play", async () => {
  const host = fakeHost({ transferPak: { game: "gb/Red.gb" }, info: { playSinceSave: 720 } });
  await launch(host, undefined, { game: stadium, games: gameBoyLibrary });

  await pickCart("Crystal");

  const dialog = screen.getByRole("alertdialog");
  expect(dialog.textContent).toMatch(/12 minutes of play that isn't in the save/);
  expect(dialog.textContent).toMatch(/Changing the Transfer Pak drops the resume point/);
  expect(host.chooseTransferPak).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Continue anyway" }));
  await act(async () => {});
  expect(host.chooseTransferPak).toHaveBeenCalledWith("/games", "n64/Stadium.z64", "gbc/Crystal.gbc");
  expect(button("Resume")).toBeNull();
});

it("resumes instead of changing the Transfer Pak to save first", async () => {
  const host = fakeHost({ transferPak: { game: "gb/Red.gb" }, info: { playSinceSave: 720 } });
  const { onPlay } = await launch(host, undefined, { game: stadium, games: gameBoyLibrary });

  await pickCart("Crystal");
  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Resume and save first" }));
  await act(async () => {});

  expect(onPlay).toHaveBeenCalledWith("resume", undefined, expect.anything());
  expect(host.chooseTransferPak).not.toHaveBeenCalled();
});

it("drops a resume point with no unsaved play when the Transfer Pak changes", async () => {
  const host = fakeHost({ transferPak: { game: "gb/Red.gb" }, info: { playSinceSave: 30 } });
  await launch(host, undefined, { game: stadium, games: gameBoyLibrary });
  expect(button("Resume")).toBeTruthy();

  await pickCart("Crystal");

  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(host.chooseTransferPak).toHaveBeenCalledWith("/games", "n64/Stadium.z64", "gbc/Crystal.gbc");
  expect(button("Resume")).toBeNull();
});

it("has no Transfer Pak for a game that doesn't use one", async () => {
  await launch(fakeHost(), undefined, { games: gameBoyLibrary });

  expect(screen.queryByRole("region", { name: "Transfer Pak" })).toBeNull();
});

it("titles the page without the No-Intro tags and names the system", async () => {
  await launch();

  expect(screen.getByRole("heading", { name: "Pokemon - Emerald Version" })).toBeTruthy();
  expect(screen.getByText("GBA")).toBeTruthy();
});

it.each([
  ["Resume", ["resume", undefined, cover]],
  ["Start", ["new"]],
] as const)("plays from %s", async (name, call) => {
  const { onPlay, host } = await launch();

  fireEvent.click(button(name)!);

  expect(host.hasResumeState).toHaveBeenCalledWith("/games", "gba/Emerald.gba");
  expect(onPlay.mock.calls).toEqual([call]);
});

it("shows where the game was left off", async () => {
  await launch();

  const shot = screen.getByRole<HTMLImageElement>("img", { name: "Where you left off" });
  expect(shot.src).toBe(`data:image/png;base64,${btoa(String.fromCharCode(...png))}`);
});

it.each<{ game: Game; cropped: boolean }>([
  { game: { system: "nds", name: "Platinum", path: "nds/Platinum.nds" }, cropped: true },
  { game: { system: "3ds", name: "PKSM", path: "3ds/PKSM.3dsx" }, cropped: true },
  { game: emerald, cropped: false },
])("crops the last screen of $game.system to the top screen: $cropped", async ({ game, cropped }) => {
  await launch(fakeHost(), undefined, { game });

  const shot = screen.getByRole("img", { name: "Where you left off" });
  expect(shot.style.height === "200%").toBe(cropped);
});

it.each<{ game: Game; cropped: boolean }>([
  { game: { system: "nds", name: "Platinum", path: "nds/Platinum.nds" }, cropped: true },
  { game: { system: "3ds", name: "PKSM", path: "3ds/PKSM.3dsx" }, cropped: true },
  { game: emerald, cropped: false },
])("crops the Resume thumbnail of $game.system to the top screen: $cropped", async ({ game, cropped }) => {
  await launch(fakeHost(), undefined, { game });

  const thumbnail = button("Resume")!.querySelector("img")!;
  expect(thumbnail.style.height === "200%").toBe(cropped);
});

const boxArtPng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1]);
const emeraldBoxArt = { "Nintendo - Game Boy Advance/Named_Boxarts/Pokemon - Emerald Version (USA, Europe).png": boxArtPng };

it("shows box art in place of the screenshot when the game has some, and keeps the screenshot on Resume", async () => {
  await launch(fakeHost(), undefined, { boxArt: fakeBoxArt(emeraldBoxArt) });

  const art = await screen.findByRole<HTMLImageElement>("img", { name: "Box art" });
  expect(art.src).toBe(`data:image/png;base64,${btoa(String.fromCharCode(...boxArtPng))}`);
  expect(screen.queryByRole("img", { name: "Where you left off" })).toBeNull();
  expect(button("Resume")!.querySelector("img")).toBeTruthy();
});

it("shows the screenshot for a renamed file or hack, and doesn't look for its box art again", async () => {
  const boxArt = fakeBoxArt(emeraldBoxArt);
  const download = vi.spyOn(boxArt.host, "download");
  const radicalRed: Game = { system: "gba", name: "Radical Red", path: "gba/hacks/Radical Red.gba" };
  await launch(fakeHost(), undefined, { game: radicalRed, boxArt });

  await waitFor(() => expect(download).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("img", { name: "Where you left off" })).toBeTruthy();
  expect(screen.queryByRole("img", { name: "Box art" })).toBeNull();
  cleanup();

  await launch(fakeHost(), undefined, { game: radicalRed, boxArt });

  expect(screen.getByRole("img", { name: "Where you left off" })).toBeTruthy();
  expect(download).toHaveBeenCalledTimes(1);
});

it("shows box art it found before while offline", async () => {
  const boxArt = fakeBoxArt(emeraldBoxArt);
  await launch(fakeHost(), undefined, { boxArt });
  await screen.findByRole("img", { name: "Box art" });
  cleanup();

  boxArt.network.online = false;
  await launch(fakeHost(), undefined, { boxArt });

  expect(await screen.findByRole("img", { name: "Box art" })).toBeTruthy();
});

it("shows the tile's screenshot until the game answers", async () => {
  const { host, hold } = holdable(fakeHost());
  hold();

  await launch(host, undefined, { cover: "data:image/png;base64,dGlsZQ==" });

  expect(screen.getByRole<HTMLImageElement>("img", { name: "Where you left off" }).src).toBe("data:image/png;base64,dGlsZQ==");
});

it("drops the tile's screenshot once the game answers without a resume state", async () => {
  await launch(fakeHost({ resume: false }), undefined, { cover: "data:image/png;base64,dGlsZQ==" });

  expect(screen.queryByRole("img", { name: "Where you left off" })).toBeNull();
});

it("offers Resume without a screenshot when the resume state has none", async () => {
  await launch(fakeHost({ screenshot: false }));

  expect(button("Resume")).toBeTruthy();
  expect(screen.queryByRole("img", { name: "Where you left off" })).toBeNull();
});

it("only offers Start without a resume state", async () => {
  await launch(fakeHost({ resume: false }));

  expect(button("Resume")).toBeNull();
  expect(document.activeElement).toBe(button("Start"));
});

it("only offers Start when it can't tell whether there's a resume state", async () => {
  const host = fakeHost();
  vi.mocked(host.hasResumeState).mockRejectedValue(new Error("folder is gone"));

  await launch(host);

  expect(button("Resume")).toBeNull();
  expect(button("Start")).toBeTruthy();
});

it("starts on Resume", async () => {
  await launch();

  expect(document.activeElement).toBe(button("Resume"));
});

it("says when the game was last played", async () => {
  const { host } = await launch();

  expect(host.playHistory).toHaveBeenCalledWith("gba/Emerald.gba");
  expect(screen.getByText(/^Last played/)).toBeTruthy();
});

it("hides play history for a game never played", async () => {
  await launch(fakeHost({ played: false }));

  expect(screen.queryByText(/^Last played/)).toBeNull();
});

it("sums up the save with the trainer, money and party", async () => {
  const host = fakeHost({ save: true });
  await launch(host);

  expect(host.readSave).toHaveBeenCalledWith("/games", "gba/Emerald.gba");
  const card = screen.getByRole("region", { name: "Save" });
  expect(card.textContent).toMatch(/MAY ♀/);
  expect(card.textContent).toMatch(/3,000/);
  expect(card.textContent).toMatch(/Saved 2 hours ago/);
  expect(screen.getAllByRole("listitem").map((slot) => slot.textContent)).toEqual([
    expect.stringMatching(/Combusken.*Lv\. 18/),
    expect.stringMatching(/Wingull.*Lv\. 12/),
  ]);
  expect(screen.getByText("Emerald")).toBeTruthy();
});

const progress = { playTime: { hours: 41, minutes: 2, seconds: 30 }, badges: { earned: 5, total: 8 }, pokedex: { seen: 120, caught: 64 } };

it("shows the save's play time, badges and Pokédex", async () => {
  await launch(fakeHost({ save: true }), fakeEngine({ trainer: may, party: mayParty, progress }));

  const card = screen.getByRole("region", { name: "Save" }).textContent;
  expect(card).toMatch(/41:02/);
  expect(card).toMatch(/5 \/ 8/);
  expect(card).toMatch(/Seen 120 · Caught 64/);
});

it("leaves out play time, badges and Pokédex the engine can't read", async () => {
  await launch(fakeHost({ save: true }), fakeEngine({ trainer: may, party: mayParty }));

  const card = screen.getByRole("region", { name: "Save" });
  expect(card.textContent).toMatch(/MAY ♀/);
  expect(card.textContent).not.toMatch(/Play time|Badges|Pokédex/);
});

it("leaves money out when the save has none", async () => {
  await launch(fakeHost({ save: true }), fakeEngine({ trainer: { ...may, money: null }, party: mayParty }));

  expect(screen.getByRole("region", { name: "Save" }).textContent).not.toMatch(/₽/);
});

it("leaves the trainer out for a Stadium save, which has teams instead", async () => {
  const teams = [{ name: null, cup: "Poké Cup", members: [] }];
  await launch(fakeHost({ save: true }), fakeEngine({ trainer: { ...may, name: "PKHeXWeb", money: 0 }, teams, progress }));

  const card = screen.getByRole("region", { name: "Save" }).textContent;
  expect(card).not.toMatch(/PKHeXWeb|₽/);
  expect(card).toMatch(/41:02/);
  expect(screen.getByText("Emerald")).toBeTruthy();
});

it("closes the save in the engine once it's summed up", async () => {
  const engine = fakeEngine({ trainer: may, party: mayParty });

  await launch(fakeHost({ save: true }), engine);

  expect(screen.getByText(/MAY/)).toBeTruthy();
  expect(engine.loaded()).toBeUndefined();
});

it("hides the save card when there's no save yet", async () => {
  await launch();

  expect(screen.queryByRole("region", { name: "Save" })).toBeNull();
});

it("hides the save card for a save the engine can't read, and still plays", async () => {
  const engine = fakeEngine({ trainer: may, party: mayParty });
  vi.spyOn(engine.engine.game, "load").mockRejectedValue(new Error("invalid-save"));
  const { onPlay } = await launch(fakeHost({ save: true }), engine);

  expect(screen.queryByRole("region", { name: "Save" })).toBeNull();
  fireEvent.click(button("Resume")!);
  fireEvent.click(button("Start")!);
  expect(onPlay.mock.calls).toEqual([["resume", undefined, cover], ["new"]]);
});

it("doesn't load an unchanged save into the engine again", async () => {
  const host = fakeHost({ save: true });
  const engine = fakeEngine({ trainer: may, party: mayParty });
  const load = vi.spyOn(engine.engine.game, "load");
  await launch(host, engine);
  cleanup();

  await launch(host, engine);

  expect(load).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("region", { name: "Save" }).textContent).toMatch(/MAY ♀/);
  expect(screen.getByText("Emerald")).toBeTruthy();
});

const hackFormats = [
  { id: "radicalred", name: "Pokémon Radical Red" },
  { id: "emeraldlegacy", name: "Pokémon Emerald Legacy" },
];
const hackSave = () => fakeEngine({ trainer: may, party: mayParty, candidates: hackFormats });
const formatButtons = () =>
  within(saveCard())
    .getAllByRole("button")
    .filter((button) => button.textContent)
    .map((button) => button.textContent);

it("asks which game a save is from when the engine can't tell", async () => {
  await launch(fakeHost({ save: true }), hackSave());

  expect(formatButtons()).toEqual(["Pokémon Radical Red", "Pokémon Emerald Legacy", "The original game"]);
});

it("reads the save as the game picked and remembers it", async () => {
  const engine = hackSave();
  const { host } = await launch(fakeHost({ save: true }), engine);

  fireEvent.click(button("Pokémon Radical Red")!);

  await waitFor(() => expect(saveCard().textContent).toMatch(/MAY ♀/));
  expect(host.keepSaveFormat).toHaveBeenCalledWith(emerald.path, { id: "radicalred", chosen: true });
  expect(engine.loads()).toEqual(["radicalred"]);
});

it("reads the save with PKHeX's own detection for the original game", async () => {
  const engine = hackSave();
  const { host } = await launch(fakeHost({ save: true }), engine);

  fireEvent.click(button("The original game")!);

  await waitFor(() => expect(saveCard().textContent).toMatch(/MAY ♀/));
  expect(host.keepSaveFormat).toHaveBeenCalledWith(emerald.path, { id: "pkhex", chosen: true });
});

it("puts the game named in the ROM's file name first", async () => {
  const legacy: Game = { system: "gba", name: "Pokemon Emerald Legacy", path: "gba/Pokemon Emerald Legacy.gba" };
  const host = fakeHost({ save: true });
  host.readSave.mockResolvedValue({ bytes: [1, 2, 3], modified: Date.now(), sha256: "abc" });
  await launch(host, hackSave(), { game: legacy });

  expect(formatButtons()).toEqual(["Pokémon Emerald Legacy", "Pokémon Radical Red", "The original game"]);
});

it("reads a save with its stored format without asking, in the editor too", async () => {
  const engine = hackSave();
  const host = fakeHost({ save: true, resume: false, formats: { [emerald.path]: { id: "radicalred", chosen: true } } });
  await launch(host, engine);

  expect(saveCard().textContent).toMatch(/MAY ♀/);
  await editSave();
  expect(editor()).toBeTruthy();
  expect(engine.loads()).toEqual(["radicalred", "radicalred"]);
});

it("remembers the format of a save the engine recognises, without offering to change it", async () => {
  const { host } = await launch(fakeHost({ save: true }), fakeEngine({ trainer: may, party: mayParty, detected: "unbound" }));

  expect(saveCard().textContent).toMatch(/MAY ♀/);
  expect(host.keepSaveFormat).toHaveBeenCalledWith(emerald.path, { id: "unbound", chosen: false });
  expect(within(await openGameMenu()).queryByRole("menuitem", { name: "Change save format" })).toBeNull();
});

it("asks again after Change save format, and reads the save again", async () => {
  const engine = hackSave();
  const host = fakeHost({ save: true, formats: { [emerald.path]: { id: "radicalred", chosen: true } } });
  await launch(host, engine);

  fireEvent.click(within(await openGameMenu()).getByRole("menuitem", { name: "Change save format" }));
  await waitFor(() => expect(button("Pokémon Radical Red")).toBeTruthy());
  expect(await host.saveFormat(emerald.path)).toBeNull();
  fireEvent.click(button("The original game")!);

  await waitFor(() => expect(saveCard().textContent).toMatch(/MAY ♀/));
  expect(engine.loads()).toEqual(["radicalred", "pkhex"]);
});

it("reads the other games and backups with their stored formats", async () => {
  const formats = { [emerald.path]: { id: "radicalred", chosen: true }, [fireRed.path]: { id: "radicalred", chosen: true } };
  await launch(backupsHost({ formats, others: { [fireRed.path]: "readable" } }), hackSave(), { games: library });

  expect(await screen.findByRole("button", { name: "Transfer Pokémon" })).toBeTruthy();
  await openBackups();
  expect(rows()[1].textContent).toMatch(/MAY ♀/);
});

it("asks again when the save rejects its stored format", async () => {
  const host = fakeHost({ save: true, formats: { [emerald.path]: { id: "gone", chosen: true } } });
  await launch(host, hackSave());

  expect(button("Pokémon Radical Red")).toBeTruthy();
  expect(await host.saveFormat(emerald.path)).toBeNull();
});

it("reaches every button with the D-pad and plays with A", async () => {
  const at: Record<string, number> = { Back: 0, Resume: 300, Start: 360 };
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const name = this.getAttribute("aria-label") ?? this.textContent ?? "";
    const y = at[name];
    return y === undefined ? new DOMRect() : new DOMRect(0, y, 100, 40);
  });
  const { onPlay } = await launch();

  pads.press(padButtons.down);
  expect(document.activeElement).toBe(button("Start"));
  pads.press(padButtons.up);
  pads.press(padButtons.up);
  expect(document.activeElement).toBe(button("Back"));
  pads.press(padButtons.down);
  pads.press(padButtons.a);

  expect(onPlay).toHaveBeenCalledWith("resume", undefined, cover);
});

it("goes back with B", async () => {
  const { onBack, onPlay } = await launch();

  pads.press(padButtons.b);

  expect(onBack).toHaveBeenCalled();
  expect(onPlay).not.toHaveBeenCalled();
});

const editor = () => screen.queryByRole("heading", { name: "Edit save" });

async function editSave() {
  fireEvent.click(button("Edit save")!);
  await act(async () => {});
}

async function exportFrom(region: HTMLElement) {
  fireEvent.keyDown(within(region).getByRole("button", { name: "More" }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("menuitem", { name: "Export file" }));
}

it("exports the save as a file", async () => {
  const { exportHost } = await launch(fakeHost({ save: true }));

  await exportFrom(screen.getByRole("region", { name: "Save" }));

  await waitFor(() =>
    expect(exportHost.saveFile).toHaveBeenCalledWith({ bytes: new Uint8Array([1, 2, 3]), fileName: `${emerald.name}.sav` }),
  );
  expect((await screen.findByRole("status")).textContent).toContain(`${emerald.name}.sav`);
});

it("exports each file of a save kept as several", async () => {
  const files = [
    { extension: "eep", bytes: [1] },
    { extension: "fla", bytes: [2, 3] },
  ];
  const { exportHost } = await launch(fakeHost({ save: true, saveFiles: files }));

  await exportFrom(screen.getByRole("region", { name: "Save" }));

  await waitFor(() =>
    expect(exportHost.saveFiles).toHaveBeenCalledWith([
      { bytes: new Uint8Array([1]), fileName: `${emerald.name}.eep` },
      { bytes: new Uint8Array([2, 3]), fileName: `${emerald.name}.fla` },
    ]),
  );
  expect(exportHost.saveFile).not.toHaveBeenCalled();
});

it("exports a save the engine can't read", async () => {
  const engine = fakeEngine({ trainer: may, party: mayParty });
  vi.spyOn(engine.engine.game, "load").mockRejectedValue(new Error("invalid-save"));
  const { exportHost } = await launch(fakeHost({ save: true }), engine);

  fireEvent.click(within(await openGameMenu()).getByRole("menuitem", { name: "Export save" }));

  await waitFor(() =>
    expect(exportHost.saveFile).toHaveBeenCalledWith({ bytes: new Uint8Array([1, 2, 3]), fileName: `${emerald.name}.sav` }),
  );
  expect((await screen.findByRole("status")).textContent).toContain(`${emerald.name}.sav`);
});

it("offers no export when there's no save", async () => {
  await launch(fakeHost({ backups: [{ name: "start.sav", at: "2026-10-05T14:00", reason: "start", sha256: "may", bytes: [7] }] }));

  expect(within(await openGameMenu()).queryByRole("menuitem", { name: "Export save" })).toBeNull();
});

it("leaves export and backups out of the game menu for a save it can read", async () => {
  await launch(backupsHost());

  const menu = await openGameMenu();
  expect(within(menu).queryByRole("menuitem", { name: "Export save" })).toBeNull();
  expect(within(menu).queryByRole("menuitem", { name: "Backups" })).toBeNull();
});

async function openGameMenu(name = /Emerald/) {
  fireEvent.keyDown(within(screen.getByRole("region", { name })).getByRole("button", { name: "More" }), { key: "Enter" });
  return screen.findByRole("menu");
}

it("shows a 3DS game's update and picks another from the game menu", async () => {
  const importHost = fakeImport();
  await launch(fakeHost({ updates: { [x.path]: 5232 } }), undefined, { game: x, importHost });

  expect(await screen.findByText("Update v5232")).toBeTruthy();
  fireEvent.click(within(await openGameMenu(/Pokemon X/)).getByRole("menuitem", { name: "Install update…" }));

  await waitFor(() => expect(importHost.pick).toHaveBeenCalled());
});

it("offers updates only for 3DS games", async () => {
  await launch(fakeHost({ updates: { [emerald.path]: 1 } }));

  expect(within(await openGameMenu()).queryByRole("menuitem", { name: "Install update…" })).toBeNull();
  expect(screen.queryByText(/^Update v/)).toBeNull();
});

it("re-extracts this game's art from the game menu", async () => {
  const gameArt = fakeGameArt();
  await launch(fakeHost(), undefined, { gameArt });

  fireEvent.click(within(await openGameMenu()).getByRole("menuitem", { name: /extract/i }));

  await waitFor(() => expect(gameArt.host.reextract).toHaveBeenCalledWith("/games", emerald.path));
  expect(gameArt.host.reextract).toHaveBeenCalledTimes(1);
  expect(gameArt.host.reextractAll).not.toHaveBeenCalled();
});

it("changes this game's box art from the game menu", async () => {
  await launch(fakeHost());

  fireEvent.click(within(await openGameMenu()).getByRole("menuitem", { name: "Change box art" }));

  expect(await screen.findByRole("dialog", { name: "Box art" })).toBeTruthy();
});

it("says in the game menu when game art isn't available for the ROM", async () => {
  await launch(fakeHost(), undefined, { gameArt: fakeGameArt({ statuses: { [emerald.path]: "unsupported" } }) });

  expect(within(await openGameMenu()).getByText(/available/i)).toBeTruthy();
});

it("adds no game art note to the menu once the art is extracted", async () => {
  await launch(fakeHost(), undefined, { gameArt: fakeGameArt({ statuses: { [emerald.path]: "done" } }) });

  expect(within(await openGameMenu()).queryByText(/available/i)).toBeNull();
});

it("starts the game menu with where a patched game came from", async () => {
  await launch(fakeHost(), undefined, {
    patchedFrom: { build: "Emerald EN 1.0", patch: "emerald_plus.bps", sha256: "abc" },
    gameArt: fakeGameArt({ statuses: { [emerald.path]: "unsupported" } }),
  });

  const menu = await openGameMenu();
  await waitFor(() => expect(within(menu).getByText(/emerald_plus\.bps/)).toBeTruthy());
  const note = menu.firstElementChild!.textContent!;
  expect(note).toContain("Emerald EN 1.0");
  expect(note).toContain("emerald_plus.bps");
});

it("opens Patch ROM from the game menu", async () => {
  await launch();

  fireEvent.click(within(await openGameMenu()).getByRole("menuitem", { name: "Patch ROM…" }));

  expect(await screen.findByRole("dialog", { name: "Patch ROM" })).toBeTruthy();
  expect(await screen.findByText("Emerald EN 1.0")).toBeTruthy();
});

it("hides Edit save when there's no save", async () => {
  await launch(fakeHost());

  expect(button("Edit save")).toBeNull();
});

it("edits the save from the page, then applies and plays", async () => {
  const engine = fakeEngine({ trainer: may, party: mayParty });
  const { host, onPlay } = await launch(fakeHost({ save: true, resume: false }), engine);

  await editSave();
  expect(editor()).toBeTruthy();
  expect(engine.loaded()).toEqual(new Uint8Array([1, 2, 3]));
  await act(() => engine.engine.trainer.setMoney(9));
  fireEvent.click(await screen.findByRole("button", { name: "Apply and play" }));

  await waitFor(() => expect(onPlay).toHaveBeenCalledWith("new"));
  expect(host.applyEdit).toHaveBeenCalledWith("/games", "gba/Emerald.gba", new Uint8Array([9, 2, 3]));
});

it("applies an edit and stays on the page when this device can't play the game", async () => {
  const engine = fakeEngine({ trainer: may, party: mayParty });
  const { host, onPlay } = await launch(fakeHost({ save: true, resume: false }), engine, { unsupported: "platform" });

  await editSave();
  await act(() => engine.engine.trainer.setMoney(9));
  fireEvent.click(await screen.findByRole("button", { name: "Apply and play" }));

  await waitFor(() => expect(editor()).toBeNull());
  expect(host.applyEdit).toHaveBeenCalledWith("/games", "gba/Emerald.gba", new Uint8Array([9, 2, 3]));
  expect(onPlay).not.toHaveBeenCalled();
});

it("closes the save-first dialog without playing when this device can't play the game", async () => {
  const { onPlay } = await launch(fakeHost({ save: true, info: { playSinceSave: 720 } }), undefined, { unsupported: "platform" });
  await editSave();

  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Resume and save first" }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(onPlay).not.toHaveBeenCalled();
});

it("asks before applying and playing when there's a resume point", async () => {
  const engine = fakeEngine({ trainer: may, party: mayParty });
  const { host, onPlay } = await launch(fakeHost({ save: true }), engine);

  await editSave();
  await act(() => engine.engine.trainer.setMoney(9));
  fireEvent.click(await screen.findByRole("button", { name: "Apply and play" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Apply and play?" });
  expect(host.applyEdit).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Apply and play" }));

  await waitFor(() => expect(onPlay).toHaveBeenCalledWith("new"));
  expect(host.applyEdit).toHaveBeenCalledWith("/games", "gba/Emerald.gba", new Uint8Array([9, 2, 3]));
});

it("goes back to the page when leaving the editor without changes", async () => {
  const { host, onPlay, onBack } = await launch(fakeHost({ save: true, resume: false }));
  await editSave();

  fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Back" }));

  await waitFor(() => expect(editor()).toBeNull());
  expect(host.applyEdit).not.toHaveBeenCalled();
  expect(onPlay).not.toHaveBeenCalled();
  expect(onBack).not.toHaveBeenCalled();
});

it("goes straight into the editor when the resume point matches the save", async () => {
  await launch(fakeHost({ save: true, info: { playSinceSave: 60 } }));

  await editSave();

  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(editor()).toBeTruthy();
});

it.each([
  ["has unsaved play", { playSinceSave: 720 }, /12 minutes of play that isn't in the save/],
  ["doesn't know how much play is unsaved", { playSinceSave: null }, /play that isn't in the save/],
  ["has no info", null, /play that isn't in the save/],
])("warns before editing when the resume point %s", async (_, info, warning) => {
  await launch(fakeHost({ save: true, info }));

  await editSave();

  const dialog = screen.getByRole("alertdialog");
  expect(dialog.textContent).toMatch(warning);
  expect(dialog.textContent).toMatch(/Editing starts from the save/);
  expect(editor()).toBeNull();
});

it("resumes the game to save first", async () => {
  const { onPlay } = await launch(fakeHost({ save: true, info: { playSinceSave: 720 } }));
  await editSave();

  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Resume and save first" }));

  expect(onPlay).toHaveBeenCalledWith("resume", undefined, cover);
});

it("edits from the save anyway", async () => {
  const { onPlay } = await launch(fakeHost({ save: true, info: { playSinceSave: 720 } }));
  await editSave();

  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Continue anyway" }));
  await act(async () => {});

  expect(editor()).toBeTruthy();
  expect(onPlay).not.toHaveBeenCalled();
});

const fireRed: Game = { system: "gba", name: "Pokemon - FireRed Version (USA)", path: "gba/FireRed.gba" };
const crystal: Game = { system: "gbc", name: "Pokemon - Crystal Version (USA)", path: "gbc/Crystal.gbc" };
const library = [emerald, fireRed, crystal];
const transferScreen = () => screen.queryByRole("heading", { name: "Transfer" });

it("offers a transfer when another game in the library has a readable save", async () => {
  await launch(fakeHost({ save: true, others: { [fireRed.path]: "readable" } }), undefined, { games: library });

  expect(await screen.findByRole("button", { name: "Transfer Pokémon" })).toBeTruthy();
});

it.each([
  ["this game has no save", fakeHost({ others: { [fireRed.path]: "readable" } })],
  ["no other game has a save", fakeHost({ save: true })],
  ["the other game's save can't be read", fakeHost({ save: true, others: { [crystal.path]: "unreadable" } })],
])("hides Transfer Pokémon when %s", async (_, host) => {
  await launch(host, undefined, { games: library });

  expect(button("Transfer Pokémon")).toBeNull();
});

it("offers a Stadium save as a partner for a Gen 1 save", async () => {
  const red: Game = { system: "gb", name: "Pokemon - Red Version (USA, Europe)", path: "gb/Red.gb" };
  const stadium: Game = { system: "n64", name: "Pokemon Stadium (USA)", path: "n64/Stadium.z64" };
  const host = fakeHost({ resume: false, others: { [red.path]: "readable", [stadium.path]: "readable" }, romNames: { [stadium.path]: "Stadium" } });
  await launch(host, fakeEngine({ trainer: may, party: mayParty, generation: 1 }), { game: red, games: [red, stadium] });

  fireEvent.click(await screen.findByRole("button", { name: "Transfer Pokémon" }));
  const sendTo = await screen.findByRole("region", { name: "Send to" });

  expect(within(sendTo).getByRole("button", { name: /^Stadium/ })).toBeTruthy();
});

const x: Game = { system: "3ds", name: "Pokemon X (USA)", path: "3ds/X.3ds" };
const omegaRuby: Game = { system: "3ds", name: "Pokemon Omega Ruby (USA)", path: "3ds/Omega Ruby.3ds" };
const black2: Game = { system: "nds", name: "Pokemon - Black Version 2 (USA, Europe)", path: "nds/Black 2.nds" };
const sun: Game = { system: "3ds", name: "Pokemon Sun (USA)", path: "3ds/Sun.3ds" };
const ultraMoon: Game = { system: "3ds", name: "Pokemon Ultra Moon (USA)", path: "3ds/Ultra Moon.3ds" };
const generations: [Game, string, number][] = [
  [fireRed, "FireRed", 3],
  [black2, "Black 2", 5],
  [x, "X", 6],
  [omegaRuby, "Omega Ruby", 6],
  [sun, "Sun", 7],
  [ultraMoon, "Ultra Moon", 7],
];

async function partnersOf(game: Game) {
  const summaries = new Map(
    generations.map(([game, version, generation]): [string, SaveSummary] => [
      game.path,
      {
        revision: summaryRevision,
        version,
        formatId: null,
        generation,
        trainer: null,
        party: [],
        progress: { playTime: null, badges: null, pokedex: null },
      },
    ]),
  );
  const others = Object.fromEntries(generations.map(([game]) => [game.path, "readable" as const]));
  const games = generations.map(([game]) => game);
  await launch(fakeHost({ resume: false, summaries, others }), fakeEngine({ trainer: may, party: mayParty }), { game, games });

  fireEvent.click(await screen.findByRole("button", { name: "Transfer Pokémon" }));
  const sendTo = await screen.findByRole("region", { name: "Send to" });
  await act(async () => {});
  return within(sendTo)
    .getAllByRole("button")
    .map((partner) => generations.find(([, version]) => partner.textContent?.startsWith(version))?.[0]);
}

it.each(generations.map(([game, version]) => [version, game]))("offers every other save as a partner for %s", async (_, game) => {
  expect(await partnersOf(game)).toEqual(generations.map(([other]) => other).filter((other) => other !== game));
});

it("names another game by its ROM, not the engine's guess", async () => {
  await launch(fakeHost({ save: true, resume: false, others: { [fireRed.path]: "readable" }, romNames: { [fireRed.path]: "Sapphire" } }), undefined, {
    games: library,
  });

  fireEvent.click(await screen.findByRole("button", { name: "Transfer Pokémon" }));
  const sendTo = await screen.findByRole("region", { name: "Send to" });

  expect(within(sendTo).getByRole("button", { name: /^Sapphire/ })).toBeTruthy();
  expect(within(sendTo).queryByRole("button", { name: /^Emerald/ })).toBeNull();
});

it("names another game by the engine's version when its ROM can't name it", async () => {
  await launch(fakeHost({ save: true, resume: false, others: { [fireRed.path]: "readable" } }), undefined, { games: library });

  fireEvent.click(await screen.findByRole("button", { name: "Transfer Pokémon" }));
  const sendTo = await screen.findByRole("region", { name: "Send to" });

  expect(within(sendTo).getByRole("button", { name: /^Emerald/ })).toBeTruthy();
});

it("opens the transfer and comes back to the page", async () => {
  await launch(fakeHost({ save: true, resume: false, others: { [fireRed.path]: "readable" } }), undefined, { games: library });

  fireEvent.click(await screen.findByRole("button", { name: "Transfer Pokémon" }));
  await act(async () => {});
  expect(transferScreen()).toBeTruthy();

  fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Back" }));
  expect(transferScreen()).toBeNull();
  expect(document.activeElement).toBe(button("Transfer Pokémon"));
});

it("warns before a transfer when the resume point has unsaved play", async () => {
  const { onPlay } = await launch(
    fakeHost({ save: true, info: { playSinceSave: 720 }, others: { [fireRed.path]: "readable" } }),
    undefined,
    { games: library },
  );

  fireEvent.click(await screen.findByRole("button", { name: "Transfer Pokémon" }));
  await act(async () => {});

  const dialog = screen.getByRole("alertdialog");
  expect(dialog.textContent).toMatch(/Transferring starts from the save/);
  expect(transferScreen()).toBeNull();
  fireEvent.click(within(dialog).getByRole("button", { name: "Resume and save first" }));
  expect(onPlay).toHaveBeenCalledWith("resume", undefined, cover);
});

it("resumes the other game to save it first", async () => {
  const host = fakeHost({ save: true, resume: false, others: { [fireRed.path]: "readable" } });
  host.hasResumeState.mockImplementation(async (_folder: string, path: string) => path === fireRed.path);
  const transfer = { partners: { "FireRed.sav": { version: "FireRed", routes: { send: ["link"], receive: ["link"] }, room: { mine: 1, partner: 1 } } } } satisfies FakeTransfer;
  const { onPlay } = await launch(host, fakeEngine({ trainer: may, party: mayParty, transfer }), { games: library });
  fireEvent.click(await screen.findByRole("button", { name: "Transfer Pokémon" }));
  await act(async () => {});

  fireEvent.click(await screen.findByRole("button", { name: /^Emerald/ }));
  fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Resume and save first" }));

  expect(onPlay).toHaveBeenCalledWith("resume", fireRed);
});

const minute = (at: Date) =>
  `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}T${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;

const brendan: SaveSummary = {
  revision: summaryRevision,
  version: "Emerald",
  formatId: null,
  generation: 3,
  trainer: { id: "12345", name: "BRENDAN", gender: "male", money: 500 },
  party: [
    {
      speciesId: 258,
      speciesIndex: 258,
      species: "Mudkip",
      isUnknown: false,
      isShiny: false,
      gender: "male",
      isEgg: false,
      types: [11],
      level: 5,
      form: { id: 0 },
    },
  ],
  progress: { playTime: null, badges: null, pokedex: null },
};

const edited: FakeBackup = {
  name: "edit.sav",
  at: minute(new Date()),
  reason: "edit",
  sha256: "brendan",
  bytes: [4, 5, 6],
};
const started: FakeBackup = {
  name: "start.sav",
  at: minute(new Date(Date.now() - 3 * 24 * 3600_000)),
  reason: "start",
  sha256: "may",
  bytes: [7, 8, 9],
};

function backupsHost(options: Parameters<typeof fakeHost>[0] = {}) {
  return fakeHost({ save: true, backups: [edited, started], summaries: new Map([["brendan", brendan]]), ...options });
}

async function openBackups() {
  fireEvent.click(button("Backups")!);
  await act(async () => {});
}

async function openBackupsFromMenu() {
  fireEvent.click(within(await openGameMenu()).getByRole("menuitem", { name: "Backups" }));
  await act(async () => {});
}

const rows = () => within(screen.getByRole("main")).getAllByRole<HTMLButtonElement>("button");

it("offers backups from the game menu when there's no save", async () => {
  await launch(fakeHost({ backups: [started] }));

  await openBackupsFromMenu();

  expect(rows()[0].textContent).toMatch(/ · Game start/);
});

it("leaves export and backups out of the game menu with no save and no backups", async () => {
  await launch();

  const menu = await openGameMenu();
  expect(within(menu).queryByRole("menuitem", { name: "Export save" })).toBeNull();
  expect(within(menu).queryByRole("menuitem", { name: "Backups" })).toBeNull();
});

it("hides Backups when the game has none", async () => {
  await launch(fakeHost({ save: true }));

  expect(button("Backups")).toBeNull();
});

it("lists backups newest first with when, why and a summary of each", async () => {
  const host = backupsHost();
  await launch(host);

  await openBackups();

  const [newest, oldest] = rows();
  expect(newest.textContent).toMatch(/^Today .* · Before edit/);
  expect(newest.textContent).toMatch(/BRENDAN ♂/);
  expect(newest.textContent).toMatch(/₽500/);
  expect(await within(newest).findByRole("img", { name: "Mudkip" })).toBeTruthy();
  expect(oldest.textContent).toMatch(/ · Game start/);
  expect(oldest.textContent).toMatch(/MAY ♀/);
  expect(oldest.textContent).toMatch(/₽3,000/);
  expect(await within(oldest).findByRole("img", { name: "Combusken" })).toBeTruthy();
  expect(host.readBackup).toHaveBeenCalledTimes(1);
  expect(host.readBackup).toHaveBeenCalledWith("/games", "gba/Emerald.gba", "start.sav");
});

it("shows play time and badges on a backup row, without the Pokédex", async () => {
  await launch(backupsHost(), fakeEngine({ trainer: may, party: mayParty, progress }));

  await openBackups();

  const summary = rows()[1].textContent!.split("Game start")[1];
  expect(summary).toMatch(/41:02/);
  expect(summary).toMatch(/5 \/ 8/);
  expect(summary).not.toMatch(/Seen|Caught/);
});

it("leaves play time and badges off a backup row when the engine can't read them", async () => {
  await launch(backupsHost(), fakeEngine({ trainer: may, party: mayParty }));

  await openBackups();

  const summary = rows()[1].textContent!.split("Game start")[1];
  expect(summary).toMatch(/MAY ♀/);
  expect(summary).not.toMatch(/Play time|Badges/);
});

it("sums up each backup in the engine only once", async () => {
  const host = backupsHost();
  const engine = fakeEngine({ trainer: may, party: mayParty });
  const load = vi.spyOn(engine.engine.game, "load");
  await launch(host, engine);
  await openBackups();
  fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Back" }));
  await act(async () => {});
  const loads = load.mock.calls.length;

  await openBackups();

  expect(rows()[1].textContent).toMatch(/MAY ♀/);
  expect(load).toHaveBeenCalledTimes(loads);
  expect(host.readBackup).toHaveBeenCalledTimes(1);
});

it("says when a backup can't be read", async () => {
  const engine = fakeEngine({ trainer: may, party: mayParty });
  vi.spyOn(engine.engine.game, "load").mockRejectedValue(new Error("invalid-save"));
  await launch(backupsHost(), engine);

  await openBackupsFromMenu();

  expect(rows()[1].textContent).toMatch(/Can't read this backup/);
});

async function inspectFirst() {
  await openBackups();
  fireEvent.click(rows()[0]);
  await act(async () => {});
}

it("opens a backup's page with its trainer and party", async () => {
  await launch(backupsHost({ resume: false }));

  await inspectFirst();

  expect(screen.getByRole("heading", { name: /^Today .* · Before edit$/ })).toBeTruthy();
  const main = screen.getByRole("main");
  expect(main.textContent).toMatch(/BRENDAN ♂/);
  expect(main.textContent).toMatch(/₽500/);
  const party = within(main).getByRole("list", { name: "Party" });
  expect(within(party).getByText("Mudkip")).toBeTruthy();
  expect(party.textContent).toMatch(/Lv\. 5/);
  expect(document.activeElement).toBe(button("Restore"));
  expect(screen.queryByRole("alertdialog")).toBeNull();
});

it("exports a backup as a file", async () => {
  const { exportHost } = await launch(backupsHost({ resume: false }));
  await inspectFirst();

  await exportFrom(screen.getByRole("region", { name: "Backup" }));

  await waitFor(() =>
    expect(exportHost.saveFile).toHaveBeenCalledWith({ bytes: new Uint8Array([4, 5, 6]), fileName: `${emerald.name} edit.sav` }),
  );
});

it("offers to restore a backup it can't read", async () => {
  const engine = fakeEngine({ trainer: may, party: mayParty });
  vi.spyOn(engine.engine.game, "load").mockRejectedValue(new Error("invalid-save"));
  await launch(backupsHost({ resume: false }), engine);
  await openBackupsFromMenu();

  fireEvent.click(rows()[1]);
  await act(async () => {});

  expect(screen.getByRole("main").textContent).toMatch(/Can't read this backup/);
  expect(button("Restore")).toBeTruthy();
});

it("goes back from a backup's page to the list", async () => {
  await launch(backupsHost({ resume: false }));
  await inspectFirst();

  fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Back" }));
  await act(async () => {});

  expect(screen.getByRole("heading", { name: "Backups" })).toBeTruthy();
  expect(rows()).toHaveLength(2);
});

async function deleteFirst(confirm: string) {
  await inspectFirst();
  fireEvent.click(button("Delete")!);
  await act(async () => {});
  const dialog = screen.getByRole("alertdialog");
  expect(dialog.textContent).toMatch(/Delete this backup\?/);
  fireEvent.click(within(dialog).getByRole("button", { name: confirm }));
  await act(async () => {});
}

it("deletes a backup and goes back to the list without it", async () => {
  const host = backupsHost({ resume: false });
  await launch(host);

  await deleteFirst("Delete");

  expect(host.deleteBackup).toHaveBeenCalledWith("/games", "gba/Emerald.gba", "edit.sav");
  expect(screen.getByRole("heading", { name: "Backups" })).toBeTruthy();
  expect(rows()).toHaveLength(1);
  expect(rows()[0].textContent).toMatch(/Game start/);
});

it("goes back to the game page after deleting the last backup", async () => {
  const host = fakeHost({ save: true, resume: false, backups: [edited], summaries: new Map([["brendan", brendan]]) });
  await launch(host);

  await deleteFirst("Delete");

  expect(host.deleteBackup).toHaveBeenCalledWith("/games", "gba/Emerald.gba", "edit.sav");
  expect(screen.queryByRole("heading", { name: "Backups" })).toBeNull();
  expect(screen.getByRole("region", { name: "Save" })).toBeTruthy();
  expect(button("Backups")).toBeNull();
  expect(document.activeElement).toBe(button("Start"));
});

it("keeps a backup when the delete is cancelled", async () => {
  const host = backupsHost({ resume: false });
  await launch(host);

  await deleteFirst("Cancel");

  expect(host.deleteBackup).not.toHaveBeenCalled();
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(button("Restore")).toBeTruthy();
});

it("closes the delete dialog with B and stays on the backup's page", async () => {
  const host = backupsHost({ resume: false });
  await launch(host);
  await inspectFirst();
  fireEvent.click(button("Delete")!);
  await act(async () => {});

  pads.press(padButtons.b);
  await act(async () => {});

  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(button("Restore")).toBeTruthy();
  expect(host.deleteBackup).not.toHaveBeenCalled();
});

it("drops a restore still being checked when Delete is chosen", async () => {
  const host = backupsHost({ resume: false });
  await launch(host);
  await inspectFirst();
  let checked = (_: boolean) => {};
  host.hasResumeState.mockImplementationOnce(() => new Promise((resolve) => (checked = resolve)));

  fireEvent.click(button("Restore")!);
  fireEvent.click(button("Delete")!);
  await act(async () => checked(false));

  expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
  expect(screen.getByRole("alertdialog").textContent).toMatch(/Delete this backup\?/);
});

it("stays on the backup's page with the reason when deleting fails", async () => {
  const host = backupsHost({ resume: false });
  host.deleteBackup.mockRejectedValue("read-only");
  await launch(host);

  await deleteFirst("Delete");

  expect(screen.getByText("read-only")).toBeTruthy();
  expect(button("Restore")).toBeTruthy();
});

it("ignores Back and the buttons while deleting", async () => {
  const host = backupsHost({ resume: false });
  let deleted = () => {};
  host.deleteBackup.mockImplementationOnce(() => new Promise<void>((resolve) => (deleted = resolve)));
  await launch(host);

  await deleteFirst("Delete");
  pads.press(padButtons.b);
  fireEvent.click(button("Restore")!);
  fireEvent.click(button("Delete")!);
  await act(async () => {});

  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(button("Restore")).toBeTruthy();
  await act(async () => deleted());
  expect(host.deleteBackup).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("heading", { name: "Backups" })).toBeTruthy();
});

async function restoreFirst(confirm: string) {
  await inspectFirst();
  fireEvent.click(button("Restore")!);
  await act(async () => {});
  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: confirm }));
  await act(async () => {});
}

it("restores a backup and shows the restored save on the page", async () => {
  const host = backupsHost({ resume: false });
  await launch(host);

  await restoreFirst("Restore");

  expect(host.restoreBackup).toHaveBeenCalledWith("/games", "gba/Emerald.gba", "edit.sav", 10);
  expect(screen.getByRole("region", { name: "Save" }).textContent).toMatch(/BRENDAN ♂/);
  expect(screen.queryByRole("heading", { name: "Backups" })).toBeNull();
});

it("keeps as many backups before a restore as the setting says", async () => {
  const host = backupsHost({ resume: false });
  await launch(host, undefined, { preferences: { restoreBackupsKept: 3 } });

  await restoreFirst("Restore");

  expect(host.restoreBackup).toHaveBeenCalledWith("/games", "gba/Emerald.gba", "edit.sav", 3);
});

it("drops Resume from the page after restoring", async () => {
  const host = backupsHost({ info: { playSinceSave: 30 } });
  await launch(host);

  await restoreFirst("Restore");

  expect(host.restoreBackup).toHaveBeenCalled();
  expect(button("Resume")).toBeNull();
});

it("warns before restoring when the resume point has unsaved play", async () => {
  const host = backupsHost({ info: { playSinceSave: 720 } });
  await launch(host);
  await inspectFirst();

  fireEvent.click(button("Restore")!);
  await act(async () => {});

  const dialog = screen.getByRole("alertdialog");
  expect(dialog.textContent).toMatch(/12 minutes of play that isn't in the save/);
  expect(dialog.textContent).toMatch(/Restoring a backup drops the resume point/);
  expect(host.restoreBackup).not.toHaveBeenCalled();
});

it("restores anyway past the unsaved play warning", async () => {
  const host = backupsHost({ info: { playSinceSave: 720 } });
  await launch(host);

  await restoreFirst("Continue anyway");

  expect(host.restoreBackup).toHaveBeenCalledWith("/games", "gba/Emerald.gba", "edit.sav", 10);
});

it("stays on the backup's page with the reason when restoring fails", async () => {
  const host = backupsHost({ resume: false });
  host.restoreBackup.mockRejectedValue("disk full");
  await launch(host);

  await restoreFirst("Restore");

  expect(screen.getByText("disk full")).toBeTruthy();
  expect(button("Restore")).toBeTruthy();
});

it("leaves the save alone when the restore is cancelled", async () => {
  const host = backupsHost({ resume: false });
  await launch(host);

  await restoreFirst("Cancel");

  expect(host.restoreBackup).not.toHaveBeenCalled();
  expect(button("Restore")).toBeTruthy();
});

it("inspects and restores a backup with the D-pad and A, and goes back with B", async () => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const at = [...document.querySelectorAll("main li button")].indexOf(this);
    return at < 0 ? new DOMRect() : new DOMRect(0, 100 + at * 100, 100, 80);
  });
  const host = backupsHost({ resume: false });
  const { onBack } = await launch(host);
  await openBackups();
  expect(document.activeElement).toBe(rows()[0]);

  pads.press(padButtons.down);
  expect(document.activeElement).toBe(rows()[1]);
  pads.press(padButtons.a);
  await act(async () => {});
  expect(document.activeElement).toBe(button("Restore"));
  pads.press(padButtons.a);
  await act(async () => {});
  expect(screen.getByRole("alertdialog").textContent).toMatch(/Restore this backup/);

  pads.press(padButtons.b);
  await act(async () => {});
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(button("Restore")).toBeTruthy();

  pads.press(padButtons.b);
  await act(async () => {});
  expect(rows()).toHaveLength(2);

  pads.press(padButtons.b);
  await act(async () => {});
  expect(screen.queryByRole("heading", { name: "Backups" })).toBeNull();
  expect(document.activeElement).toBe(button("Backups"));
  expect(onBack).not.toHaveBeenCalled();
  expect(host.restoreBackup).not.toHaveBeenCalled();
});

it("forgets a restore left with B before it's checked", async () => {
  const host = backupsHost({ resume: false });
  await launch(host);
  await inspectFirst();
  let checked = (_: boolean) => {};
  host.hasResumeState.mockImplementationOnce(() => new Promise((resolve) => (checked = resolve)));

  fireEvent.click(button("Restore")!);
  pads.press(padButtons.b);
  await act(async () => checked(false));

  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(rows()).toHaveLength(2);
});

const noon = new Date().setHours(12, 0, 0, 0);
const slot3 = { slot: 3, savedAt: noon - 3600_000, playSinceSave: null, loadable: true };
const slot5 = { slot: 5, savedAt: noon - 2 * 3600_000, playSinceSave: null, loadable: true };

it("says which slot Resume came from and when it was saved", async () => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "Date"], now: noon });
  await launch(fakeHost({ info: { playSinceSave: 30, slot: 3 }, states: [slot3, slot5] }));

  expect(button(/^Resume/)!.textContent).toMatch(/From slot 3 · saved Today/);
});

it.each([
  ["didn't come from a slot", { playSinceSave: 30 }, [slot3]],
  ["came from a slot that's gone", { playSinceSave: 30, slot: 3 }, [slot5]],
])("leaves the slot off Resume when it %s", async (_, info, states) => {
  await launch(fakeHost({ info, states }));

  expect(button("Resume")).toBeTruthy();
  expect(screen.queryByText(/From slot/)).toBeNull();
});

it("offers Load a state only once a slot is filled", async () => {
  await launch(fakeHost());
  expect(button("Load a state")).toBeNull();
  cleanup();

  await launch(fakeHost({ resume: false, states: [slot5] }));
  expect(button("Load a state")).toBeTruthy();
});

async function pickSlot(slot: number) {
  fireEvent.click(button("Load a state")!);
  await act(async () => {});
  expect(screen.getByRole("heading", { name: "Load state" })).toBeTruthy();
  fireEvent.click(button(new RegExp(`^Slot ${slot}`))!);
  await act(async () => {});
}

it("starts from the slot Resume came from without asking", async () => {
  const { onPlay } = await launch(fakeHost({ info: { playSinceSave: 30, slot: 3 }, states: [slot3, slot5] }));

  await pickSlot(3);

  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(onPlay).toHaveBeenCalledWith({ slot: 3, resume: true });
});

it("asks before starting from another slot", async () => {
  const { onPlay } = await launch(fakeHost({ info: { playSinceSave: 30, slot: 3 }, states: [slot3, slot5] }));

  await pickSlot(5);

  expect(onPlay).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole("alertdialog", { name: "Load slot 5?" })).getByRole("button", { name: "Load" }));
  expect(onPlay).toHaveBeenCalledWith({ slot: 5, resume: true });
});

it("asks before starting from a slot when there's no resume point", async () => {
  const { onPlay } = await launch(fakeHost({ resume: false, states: [slot3] }));

  await pickSlot(3);
  fireEvent.click(within(screen.getByRole("alertdialog", { name: "Load slot 3?" })).getByRole("button", { name: "Load" }));

  expect(onPlay).toHaveBeenCalledWith({ slot: 3, resume: false });
});

it("goes back from the slots to the page", async () => {
  const { onPlay, onBack } = await launch(fakeHost({ states: [slot3] }));
  fireEvent.click(button("Load a state")!);
  await act(async () => {});

  pads.press(padButtons.b);

  expect(screen.queryByRole("heading", { name: "Load state" })).toBeNull();
  expect(document.activeElement).toBe(button("Load a state"));
  expect(onBack).not.toHaveBeenCalled();
  expect(onPlay).not.toHaveBeenCalled();
});

async function deleteSlot(slot: number) {
  fireEvent.click(button(`Delete slot ${slot}`)!);
  await act(async () => {});
  fireEvent.click(within(screen.getByRole("alertdialog", { name: `Delete slot ${slot}?` })).getByRole("button", { name: "Delete" }));
  await act(async () => {});
}

it("takes a deleted slot off Resume", async () => {
  const { host } = await launch(fakeHost({ info: { playSinceSave: 30, slot: 3 }, states: [slot3, slot5] }));
  fireEvent.click(button("Load a state")!);
  await act(async () => {});

  await deleteSlot(3);
  pads.press(padButtons.b);
  await act(async () => {});

  expect(host.deleteState).toHaveBeenCalledWith("/games", "gba/Emerald.gba", 3);
  expect(button(/^Resume/)!.textContent).not.toMatch(/From slot/);
  expect(button("Load a state")).toBeTruthy();
});

it("goes back to the page without Load a state after deleting the last slot", async () => {
  await launch(fakeHost({ states: [slot3] }));
  fireEvent.click(button("Load a state")!);
  await act(async () => {});

  await deleteSlot(3);

  expect(screen.queryByRole("heading", { name: "Load state" })).toBeNull();
  expect(button("Load a state")).toBeNull();
});

function holdable(base: GamePageHost) {
  let held: Promise<void> | undefined;
  let answer = () => {};
  const host = Object.fromEntries(
    Object.entries(base).map(([name, call]) => [
      name,
      async (...args: unknown[]) => {
        if (args.includes(emerald.path)) await held;
        return (call as (...args: unknown[]) => unknown)(...args);
      },
    ]),
  ) as unknown as GamePageHost;
  return {
    host,
    hold: () => void (held = new Promise((resolve) => (answer = resolve))),
    answer: async () => {
      answer();
      await act(async () => {});
    },
  };
}

async function revisit() {
  const summaries = new Map<string, SaveSummary>();
  const { host, hold, answer } = holdable(
    fakeHost({ save: true, backups: [edited], states: [slot3], summaries, others: { [fireRed.path]: "readable" } }),
  );
  await launch(host, undefined, { games: library });
  cleanup();
  summaries.set("abc", brendan);
  hold();
  return { ...(await launch(host, undefined, { games: library })), answer };
}

const saveCard = () => screen.getByRole("region", { name: "Save" });
const waiting = ["Edit save", "Transfer Pokémon", "Backups", "Load a state"];

it("shows the last visit while the game loads again", async () => {
  await revisit();

  expect(button("Resume")).toBeTruthy();
  expect(saveCard().textContent).toMatch(/MAY ♀/);
  expect(button("Backups")).toBeTruthy();
});

it("holds back what needs the game's data while updating, and still plays", async () => {
  const { onPlay } = await revisit();

  expect(screen.getByText("Updating…")).toBeTruthy();
  for (const name of waiting) expect(button(name)!.hasAttribute("disabled")).toBe(true);
  fireEvent.click(button("Resume")!);
  fireEvent.click(button("Start")!);
  expect(onPlay.mock.calls).toEqual([["resume", undefined, cover], ["new"]]);
});

it("shows the new data once the game answers", async () => {
  const { answer } = await revisit();

  await answer();

  expect(saveCard().textContent).toMatch(/BRENDAN ♂/);
  for (const name of waiting) expect(button(name)!.hasAttribute("disabled")).toBe(false);
  expect(screen.queryByText("Updating…")).toBeNull();
});

it("shows only the title for a game opened for the first time until it answers", async () => {
  const { host, hold } = holdable(fakeHost({ save: true, backups: [edited] }));
  hold();
  await launch(host);

  expect(screen.getByRole("heading", { name: "Pokemon - Emerald Version" })).toBeTruthy();
  expect(screen.queryAllByRole("button").map((button) => button.getAttribute("aria-label") ?? button.textContent)).toEqual(["Back", "More"]);
  expect(screen.queryByText("Updating…")).toBeNull();
});

it("keeps focus where it was when the game answers", async () => {
  const { answer } = await revisit();
  button("Start")!.focus();

  await answer();

  expect(document.activeElement).toBe(button("Start"));
});

it("doesn't say it's updating while a game opened for the first time reads its save", async () => {
  const host = fakeHost({ states: [slot3] });
  host.readSave.mockReturnValue(new Promise(() => {}));
  await launch(host);

  expect(button("Resume")).toBeTruthy();
  expect(button("Load a state")!.hasAttribute("disabled")).toBe(false);
  expect(screen.queryByText("Updating…")).toBeNull();
});

it("offers to choose a version of a game that changed on another device", async () => {
  const conflict = {
    file: "save",
    device: { savedOn: "Pixel 10", modified: 1_000, cheats: false },
    cloud: { savedOn: "MacBook Air", modified: 2_000, cheats: false },
  };
  const sync = fakeSync({ account: "player@example.com", conflicts: [conflict] });
  await launch(undefined, undefined, { sync });
  await act(async () => sync.game({ path: emerald.path, state: "conflict" }));

  await act(async () => fireEvent.click(button("Choose version")!));

  expect(sync.host.conflicts).toHaveBeenCalledWith("/games", emerald.path);
  expect(screen.getByRole("dialog")).toBeTruthy();
});

it("closes the conflict sheet on back and stays on the game page", async () => {
  const conflict = {
    file: "save",
    device: { savedOn: "Pixel 10", modified: 1_000, cheats: false },
    cloud: { savedOn: "MacBook Air", modified: 2_000, cheats: false },
  };
  const sync = fakeSync({ account: "player@example.com", conflicts: [conflict] });
  const back = fakeBackHost();
  const { onBack } = await launch(undefined, undefined, { sync, back: back.host });
  await act(async () => sync.game({ path: emerald.path, state: "conflict" }));
  await act(async () => fireEvent.click(button("Choose version")!));

  back.press();

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(onBack).not.toHaveBeenCalled();
});

it("offers no version to choose on a game in sync", async () => {
  const sync = fakeSync({ account: "player@example.com" });
  await launch(undefined, undefined, { sync });

  await act(async () => sync.game({ path: emerald.path, state: "synced", lastSynced: Date.now() }));

  expect(button("Choose version")).toBeNull();
});

it("says what sync is doing with the game, and when it last synced once idle", async () => {
  const sync = fakeSync({ account: "player@example.com", gamesLastSynced: { [emerald.path]: Date.now() - 5 * 60_000 } });
  await launch(undefined, undefined, { sync });
  expect(await screen.findByText("Last synced 5 minutes ago")).toBeTruthy();

  await act(async () => sync.game({ path: emerald.path, state: "transferring", done: 46, total: 100, stage: "uploadingRom" }));
  expect(screen.getByText("Uploading ROM · 46%")).toBeTruthy();

  await act(async () => sync.game({ path: emerald.path, state: "waiting", reason: "mobileData" }));
  expect(screen.getByText("Waiting for Wi-Fi")).toBeTruthy();

  await act(async () => sync.game({ path: emerald.path, state: "synced", lastSynced: Date.now() }));
  expect(screen.getByText("Last synced just now")).toBeTruthy();
});

it("says nothing about sync while signed out", async () => {
  await launch(undefined, undefined, { sync: fakeSync() });

  expect(screen.queryByText(/synced|sync/i)).toBeNull();
});

function retroAchievementsHost(game: RetroAchievementsHost["game"]): RetroAchievementsHost {
  return {
    turn: async () => {},
    account: async () => "Player",
    signIn: async (user) => user,
    signOut: async () => {},
    createAccount: async () => {},
    openProfile: async () => {},
    onEvent: () => () => {},
    badge: async () => undefined,
    playing: async () => null,
    game,
    summary: async () => null,
    hardcore: async () => false,
    setHardcore: async () => {},
    leaveHardcore: async () => {},
    edited: async () => false,
    settleEdited: async () => false,
  };
}

const boulder: Achievement = {
  id: 1,
  title: "Boulder Badge",
  description: "Defeat Brock in Pewter City",
  points: 10,
  badge: "00001",
  earned: { at: null, hardcore: true },
  progress: null,
  rarity: 0.42,
};

it("shows the game's achievements in a card that opens the list, and a row's details", async () => {
  const game = vi.fn(async () => [{ ...boulder, id: 2, title: "Cascade Badge", earned: null }, boulder]);
  await launch(fakeHost(), undefined, { retroAchievements: retroAchievementsHost(game) });
  await act(async () => {});

  expect(game).toHaveBeenCalledWith("/games", "gba/Emerald.gba");
  const card = screen.getByRole("region", { name: "Achievements" });
  expect(within(card).getByText("1/2 · 10 pts")).toBeTruthy();
  fireEvent.click(within(card).getByRole("button", { name: "All achievements" }));
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: /Boulder Badge/ }));
  await act(async () => {});

  const sheet = screen.getByRole("dialog", { name: /Boulder Badge/ });
  expect(within(sheet).getByText("Hardcore")).toBeTruthy();
  expect(within(sheet).getByText("0.4%")).toBeTruthy();
  expect(within(sheet).queryByRole("button", { name: "Resume" })).toBeNull();
});

it("links the Achievements card to the RetroAchievements page", async () => {
  await launch(fakeHost(), undefined, { retroAchievements: retroAchievementsHost(async () => [boulder]) });
  await act(async () => {});

  const card = screen.getByRole("region", { name: "Achievements" });
  fireEvent.click(within(card).getByRole("button", { name: "Player" }));
  await act(async () => {});

  expect(screen.getByRole("heading", { name: "RetroAchievements" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
});

it("leaves the Achievements card out for a game without a set", async () => {
  await launch(fakeHost(), undefined, { retroAchievements: retroAchievementsHost(async () => null) });
  await act(async () => {});

  expect(screen.queryByRole("region", { name: "Achievements" })).toBeNull();
});

it("hands the trainer the engine reads from the save to the edited mark", async () => {
  const host = { ...retroAchievementsHost(async () => null), settleEdited: vi.fn(async () => true) };
  await launch(fakeHost({ save: true }), undefined, { retroAchievements: host });
  await act(async () => {});

  expect(host.settleEdited).toHaveBeenCalledWith("/games", "gba/Emerald.gba", { trainer: "12345/54321 MAY", sha256: expect.any(String) });
});
