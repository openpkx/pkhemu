import { StrictMode, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { PokemonId, PokemonSummary } from "@pkhex-everywhere/engine";
import { EngineProvider } from "@pkhex-everywhere/react";
import { BackProvider } from "@/back/back";
import { BoxArtProvider } from "@/box-art/boxArt";
import { BoxArtSheet } from "@/box-art/BoxArtSheet";
import { fakeBoxArt } from "@/box-art/fakeBoxArt";
import { SyncBadge } from "@/components/SyncBadge";
import { Toast } from "@/components/Toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { EditorScreen } from "@/editor/EditorScreen";
import { ExportProvider } from "@/editor/exportFile";
import { fakeEngine, type FakeEventEncounter } from "@/editor/fakeEngine";
import { saveHome } from "@/editor/saveHome";
import { teamsPage } from "@/editor/teams";
import { WithUndo } from "@/editor/undo";
import { fakeGameArt } from "@/game-art/fakeGameArt";
import { GameArtFor, GameArtProvider } from "@/game-art/gameArt";
import { GamePage, type GamePageHost } from "@/game-page/GamePage";
import { openGameMemory } from "@/game-memory/gameMemory";
import emeraldWild from "@/game-memory/snapshots/emerald-wild.json";
import { snapshotMemory } from "@/game-memory/snapshots/snapshotMemory";
import { GamesFolderProvider, type GamesFolderHost } from "@/games-folder/gamesFolder";
import { GravityProvider, type GravityHost } from "@/gravity/gravity";
import { GameScreen } from "@/GameScreen";
import { Home } from "@/Home";
import { androidImportHost } from "@/import/androidHost";
import { desktopImportHost } from "@/import/desktopHost";
import { ImportProvider, ReplaceSaveDialog, WhichGameDialog } from "@/import/importFiles";
import { iosEmulatorHint, iosImportHost } from "@/import/iosHost";
import { Copying, FolderSummaryScreen, SaveConflicts, Scanning, WhereAreYourGames } from "@/import/ImportFolder";
import { createInput } from "@/input/input";
import { NewFolder, PreviousFolder } from "@/onboarding/Welcome";
import { fakeFolder } from "@/library/fakeFolder";
import { LibraryProvider, type LibraryHost } from "@/library/library";
import type { Game } from "@/library/scan";
import { PatchRomDialog, PatchRomProvider, type PatchRomHost } from "@/patch-rom/patchRom";
import { OpponentPill } from "@/pokemon-info/OpponentPill";
import { PreferencesProvider, type Preferences } from "@/preferences/preferences";
import { SettingsScreen } from "@/SettingsScreen";
import { fakeSync } from "@/sync/fakeSync";
import type { SyncBadgeState } from "@/sync/gameStatus";
import { SyncProvider } from "@/sync/sync";
import { systems, type System } from "@/systems";
import { TransferScreen, type TransferHost } from "@/transfer/TransferScreen";
import { SkinPicker } from "@/skin-picker/SkinPicker";
import { TransferPakScreen } from "@/transfer-pak/TransferPak";
import "@/index.css";
import { defaultSkins } from "@/skins";

const params = new URLSearchParams(location.search);
const theme = params.get("theme") === "light" ? "light" : "dark";
const playing = params.get("screen")?.startsWith("playing-") ?? false;
const forcedShift = params.has("shift");
// Headless Chromium reports the device-pixel box at 1× under an emulated scale factor, so size from the CSS box instead.
if (playing && devicePixelRatio !== 1) {
  const Native = ResizeObserver;
  window.ResizeObserver = class extends Native {
    constructor(report: ResizeObserverCallback) {
      super((entries, observer) => report(entries.map(({ contentRect, target }) => ({ contentRect, target }) as ResizeObserverEntry), observer));
    }
  };
}
const gravityHost: GravityHost = { tilts: true, start() {}, stop() {}, read: () => (forcedShift ? { x: 0, y: 0, z: 9.81 } : undefined) };

const callbacks = new Map<number, (message: unknown) => void>();

// RGB565, as the core sends it. A 3DS frame's bottom half is black beside the 320-pixel bottom screen.
function frame(width: number, height: number) {
  const buffer = new ArrayBuffer(16 + width * height * 2);
  const view = new DataView(buffer);
  view.setUint16(4, width, true);
  view.setUint16(6, height, true);
  const pixels = new Uint16Array(buffer, 16);
  const rgb565 = (r: number, g: number, b: number) => ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const light = ((x >> 4) + (y >> 4)) % 2 === 0;
      const bottom = height > 192 && y >= height / 2;
      const beside = bottom && width === 400 && (x < 40 || x >= 360);
      pixels[y * width + x] = beside
        ? 0
        : bottom
        ? light ? rgb565(88, 120, 200) : rgb565(58, 80, 150)
        : light ? rgb565(88, 179, 104) : rgb565(58, 138, 74);
    }
  }
  return buffer;
}

async function playingCommand(command: string, args: Record<string, unknown>) {
  if (command === "play") {
    const sizes: Record<string, number[]> = { "playing-gb": [160, 144], "playing-gbc": [160, 144], "playing-nds": [256, 384], "playing-n64": [640, 480], "playing-3ds": [400, 480] };
    const size = sizes[params.get("screen")!] ?? [240, 160];
    callbacks.get((args.onFrame as { id: number }).id)?.({ index: 0, message: frame(size[0], size[1]) });
    return 60;
  }
  if (command === "list_states") return { current: null, slots: [], canUndoLoad: false };
  if (command === "can_undo_edit") return false;
  return undefined;
}

Object.assign(window, {
  __TAURI_EVENT_PLUGIN_INTERNALS__: { unregisterListener: () => {} },
  __TAURI_INTERNALS__: {
    transformCallback: (callback: (message: unknown) => void) => {
      const id = callbacks.size + 1;
      callbacks.set(id, callback);
      return id;
    },
    invoke: async (command: string, args: Record<string, unknown>) => {
      if (playing) return playingCommand(command, args);
      throw new Error(`${command} isn't available in screenshots`);
    },
  },
});
document.documentElement.dataset.theme = theme;

const games = [
  "gb/Red.gb",
  "gbc/Crystal.gbc",
  "gba/Emerald.gba",
  "gba/FireRed.gba",
  "gba/hacks/Radical Red.gba",
  "nds/Platinum.nds",
  "nds/HeartGold.nds",
  "3ds/PKSM.3dsx",
];

const preferences: Preferences = {
  touchControls: playing || params.get("screen") === "settings-skins",
  fastForwardSpeed: 2,
  showFps: false,
  theme,
  eventsNoticeDismissed: false,
  updateDismissedVersion: 0,
  gameClockOffset: { days: 0, hours: 0 },
  restoreBackupsKept: 10,
  stickSensitivity: 1,
  playInSilentMode: false,
  renderer: "automatic",
  skins:
    params.has("skin") || params.has("look")
      ? {
          ...defaultSkins,
          [params.get("screen")!.replace(/^(playing|skin-picker)-/, "")]: {
            skin: params.get("skin") ?? "pkhemu",
            look: params.get("look") === "frosted" ? "frosted" : "moulded",
          },
        }
      : defaultSkins,
  skinHintSeen: params.has("hinted"),
  screenDepth: !playing || forcedShift,
  screenGlass: playing ? params.get("glass") === "on" : params.get("glass") !== "off",
  asyncShaders: true,
};

const welcome = params.get("screen")?.startsWith("welcome") ?? false;
const ipad = params.get("screen")?.endsWith("-ipad") ?? false;
const ios = ipad || (params.get("screen")?.endsWith("-ios") ?? false);
const gamesFolderHost: GamesFolderHost = {
  pickFolder: async () => "/games",
  makeFolder: async () => "/games",
  ...(!ios && { findFolder: async () => "Documents" }),
  listFolders: async () => [],
  ensureFolder: async () => {},
  folderExists: async () => true,
  loadSaved: async () => (welcome ? null : "/games"),
  save: async () => {},
  label: (folder) => folder,
  device: ipad ? "iPad" : ios ? "iPhone" : params.get("screen")?.endsWith("-mac") ? "Mac" : "phone",
  openFolder: async () => {},
};

async function png(width: number, height: number, draw: (context: OffscreenCanvasRenderingContext2D) => void) {
  const canvas = new OffscreenCanvas(width, height);
  draw(canvas.getContext("2d")!);
  return new Uint8Array(await (await canvas.convertToBlob()).arrayBuffer());
}

const galleryNames = [
  "Pokemon - Emerald Version (USA, Europe)",
  "Pokemon - Emerald Version (Japan)",
  "Pokemon - Emerald Version (France)",
  "Pokemon - Emerald Version (Germany)",
  "Pokemon - Emerald Version (Italy)",
  "Pokemon - Emerald Version (Spain)",
  "Pokemon - Ruby Version (USA)",
  "Pokemon - Sapphire Version (USA)",
];
const gallery = Object.fromEntries(
  ["Named_Boxarts", "Named_Titles"].flatMap((kind) =>
    galleryNames.map((name) => [`Nintendo - Game Boy Advance/${kind}/${name}.png`, new Uint8Array()]),
  ),
);
const boxArt = fakeBoxArt(params.get("screen") === "box-art-sheet" ? gallery : {});
boxArt.cache.set(
  "gba/FireRed",
  await png(256, 256, (context) => {
    const gradient = context.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, "#ff6a3d");
    gradient.addColorStop(1, "#7a1020");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    context.fillStyle = "#ffffff";
    context.font = "bold 36px sans-serif";
    context.fillText("FIRE", 24, 200);
  }),
);

const lastScreen = await png(240, 160, (context) => {
  for (let y = 0; y < 160; y += 16) {
    for (let x = 0; x < 240; x += 16) {
      context.fillStyle = (x + y) % 32 ? "#3a8a4a" : "#58b368";
      context.fillRect(x, y, 16, 16);
    }
  }
  context.fillStyle = "#f8f8f8";
  context.fillRect(0, 112, 240, 48);
});

const dsLastScreen = await png(256, 384, (context) => {
  for (let y = 0; y < 192; y += 16) {
    for (let x = 0; x < 256; x += 16) {
      context.fillStyle = (x + y) % 32 ? "#3a6a9a" : "#5890c8";
      context.fillRect(x, y, 16, 16);
    }
  }
  context.fillStyle = "#f8f8f8";
  context.fillRect(0, 144, 256, 48);
  context.fillStyle = "#c83a3a";
  context.fillRect(0, 192, 256, 192);
  context.fillStyle = "#f8f8f8";
  context.fillRect(32, 240, 192, 96);
});

const threeDsLastScreen = await png(400, 480, (context) => {
  for (let y = 0; y < 240; y += 16) {
    for (let x = 0; x < 400; x += 16) {
      context.fillStyle = (x + y) % 32 ? "#3a8a6a" : "#58b890";
      context.fillRect(x, y, 16, 16);
    }
  }
  context.fillStyle = "#f8f8f8";
  context.fillRect(0, 192, 400, 48);
  context.fillStyle = "#000000";
  context.fillRect(0, 240, 400, 240);
  context.fillStyle = "#c83a3a";
  context.fillRect(40, 240, 320, 240);
});

const lastScreens: Record<string, typeof lastScreen> = {
  "gba/Emerald.gba": lastScreen,
  "nds/Platinum.nds": dsLastScreen,
  "3ds/PKSM.3dsx": threeDsLastScreen,
};

const list = fakeFolder(games);
const emptyList = fakeFolder(systems.map((system) => `${system}/.keep`));
const libraryHost = ({ recent = ["gba/Emerald.gba", "nds/Platinum.nds"], resume = true, empty = false } = {}): LibraryHost => ({
  listDir: (_folder, path) => (empty ? emptyList(path) : list(path)),
  recentlyPlayed: async () => recent,
  scanGameArt: async () => {},
  resumeScreenshot: async (_folder, path) => (resume && lastScreens[path] ? [...lastScreens[path]] : null),
  hasResumeState: async () => resume,
  playHistory: async () => ({ lastPlayed: Date.now() - 2 * 3600 * 1000, playTime: 0 }),
});

const emerald: Game = { system: "gba", name: "Emerald", path: "gba/Emerald.gba" };
const emeraldSave = { bytes: [1, 2, 3], modified: Date.now() - 2 * 3600_000, sha256: "emerald" };
const pageGames: Record<System, Game> = {
  gb: { system: "gb", name: "Red", path: "gb/Red.gb" },
  gbc: { system: "gbc", name: "Crystal", path: "gbc/Crystal.gbc" },
  gba: emerald,
  nds: { system: "nds", name: "Platinum", path: "nds/Platinum.nds" },
  n64: { system: "n64", name: "Stadium", path: "n64/Stadium.z64" },
  "3ds": { system: "3ds", name: "PKSM", path: "3ds/PKSM.3dsx" },
};
const gamePageHost = ({ withArt = false, screenshot = lastScreen } = {}): GamePageHost => ({
  hasResumeState: async () => withArt,
  resumePreview: async () => (withArt ? { screenshot: [...screenshot] } : null),
  resumeInfo: async () => null,
  applyEdit: async () => {},
  writeTransfer: async () => {},
  keptCopies: async () => [],
  keepCopies: async () => {},
  deleteGame: async () => {},
  playHistory: async () => ({ lastPlayed: Date.now() - 86_400_000, playTime: 23 * 3600 }),
  readSave: async () => emeraldSave,
  readSaveFiles: async () => [{ extension: "sav", bytes: emeraldSave.bytes }],
  threeDsUpdate: async () => null,
  romGameName: async (_folder, path) => `Pokémon ${Object.values(pageGames).find((game) => game.path === path)?.name}`,
  saveSummary: async () => null,
  keepSaveSummary: async () => {},
  saveFormat: async () => null,
  keepSaveFormat: async () => {},
  listBackups: async () => [{ name: "edit", at: new Date(Date.now() - 86_400_000).toISOString(), reason: "edit", sha256: "edit" }],
  readBackup: async () => new Uint8Array(),
  restoreBackup: async () => {},
  deleteBackup: async () => {},
  listStates: async () => ({
    current: null,
    slots: [{ slot: 1, savedAt: Date.now() - 3600_000, playSinceSave: null, loadable: true }],
    canUndoLoad: false,
  }),
  stateScreenshot: async () => null,
  deleteState: async () => {},
  transferPak: async (_folder, path) => (path === pageGames.n64.path ? { game: pageGames.gb.path } : null),
  chooseTransferPak: async () => {},
});

const patchRomHost: PatchRomHost = {
  baseBuild: async () => "Emerald EN 1.0",
  pick: async () => null,
  bases: async () => ({ checked: true, games: [] }),
  dropped: async () => ({ file: "", name: "", format: null, baseChecked: false }),
  checkName: async () => {},
  create: async () => ({ path: "", sha256: "", baseChecked: false }),
  patchedFrom: async () =>
    params.get("screen") === "game-page-gba-menu" ? { build: "Emerald EN 1.0", patch: "emerald_seaglass_expansion_3.1.bps", sha256: "" } : null,
  keepPatchedFrom: async () => {},
};

function pokemon(species: string, slot: number, level: number, gender: PokemonSummary["gender"]): PokemonSummary {
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
    gender,
    isEgg: false,
    types: [],
  };
}

const { engine } = fakeEngine({
  species: [{ id: 261, name: "Poochyena" }],
  inMemory: {
    POOCHYENA: { species: 261, level: 3, isShiny: true, nature: 3, ivs: { health: 31, attack: 31, defense: 28, specialAttack: 1, specialDefense: 2, speed: 3 } },
  },
  transfer: {
    partners: {
      "FireRed.sav": { version: "FireRed", routes: { send: ["link"], receive: ["link"] }, room: { mine: 4, partner: 12 } },
      "Crystal.sav": { version: "Crystal", routes: { send: ["unofficial"], receive: ["unofficial"] }, room: { mine: 4, partner: 20 } },
      "Red.sav": { version: "Red", routes: { send: null, receive: null }, room: { mine: 4, partner: 20 } },
    },
  },
  trainer: { id: "41207/00000", name: "MAY", maxNameLength: 7, gender: "female", money: 3000, battlePoints: null, rival: null },
  party: [pokemon("Combusken", 0, 18, "male"), pokemon("Wingull", 1, 12, "female"), pokemon("Lotad", 2, 9, "female")],
  progress: { playTime: { hours: 23, minutes: 41, seconds: 0 }, badges: { earned: 6, total: 8 }, pokedex: { seen: 120, caught: 84 } },
});

const inBox = (summary: PokemonSummary, slot: number): PokemonSummary => ({ ...summary, at: { source: "box", box: 0, slot } });
const stadium = fakeEngine({
  generation: 1,
  teams: [
    { name: "RED", cup: "Poké Cup", members: [pokemon("Pikachu", 0, 50, "male"), pokemon("Onix", 1, 52, "male"), pokemon("Lapras", 2, 54, "female")] },
    { name: null, cup: "Poké Cup", members: [] },
    { name: "RED", cup: "Prime Cup", members: [pokemon("Mewtwo", 0, 100, "genderless")] },
  ],
  box: [inBox(pokemon("Rattata", 0, 5, "male"), 0), inBox(pokemon("Zubat", 1, 9, "female"), 1)],
}).engine;

const platinum = fakeEngine({
  generation: 4,
  version: "Platinum",
  mysteryGift: {
    unlocked: false,
    slots: 3,
    cards: [
      { title: "Shaymin", kind: "pokemon", species: { id: 492, name: "Shaymin" }, item: null, language: "ENG", cardId: 12, known: true },
    ],
    received: [12],
    events: [
      { id: "manaphy", title: "Manaphy Egg", kind: "pokemon", species: { id: 490, name: "Manaphy" }, item: null, language: "ENG", cardId: 1 },
      { id: "member", title: "Member Card", kind: "item", species: null, item: { id: 455, name: "Member Card" }, language: null, cardId: 4 },
      { id: "letter", title: "Oak's Letter", kind: "item", species: null, item: { id: 456, name: "Oak's Letter" }, language: null, cardId: 5 },
      { id: "regigigas-en", title: "Regigigas", kind: "pokemon", species: { id: 486, name: "Regigigas" }, item: null, language: "ENG", cardId: 9, level: 100 },
      { id: "regigigas-jp", title: "レジギガス", kind: "pokemon", species: { id: 486, name: "Regigigas" }, item: null, language: "JPN", cardId: 9, level: 100 },
      { id: "shaymin", title: "Shaymin", kind: "pokemon", species: { id: 492, name: "Shaymin" }, item: null, language: "ENG", cardId: 12, level: 50 },
      { id: "seals", title: "Seal Set", kind: "other", species: null, item: null, language: "ENG", cardId: 20 },
    ],
  },
}).engine;

function giftEvent(species: string, speciesId: number, levelRange: string, trainerName: string | null, language: string | null): FakeEventEncounter {
  const form = { id: 0, name: "" };
  return { species, speciesId, form, name: "Event Gift", isEgg: false, ball: "Poké Ball", levelRange, location: "Fateful encounter", version: "Ruby", trainerName, trainerId: null, language };
}

const firered = fakeEngine({
  version: "FireRed",
  capabilities: ["encounters", "legality"],
  species: [
    { id: 1, name: "Bulbasaur" },
    { id: 4, name: "Charmander" },
    { id: 7, name: "Squirtle" },
  ],
  eventEncounters: [
    giftEvent("Jirachi", 385, "5", "WISHMKR", "ENG"),
    giftEvent("Mew", 151, "10", null, null),
    giftEvent("Celebi", 251, "10", "10ANIV", "JPN"),
    giftEvent("Celebi", 251, "70", "10ANIV", "ENG"),
    giftEvent("Pikachu", 25, "10", "PCNYB", "ENG"),
    giftEvent("Latios", 381, "70", null, "JPN"),
  ],
}).engine;

function FakeEditor({ engine, home }: { engine: typeof stadium; home: typeof saveHome }) {
  return (
    <EngineProvider engine={engine}>
      <GameArtFor path={emerald.path}>
        <EditorScreen
          host={{ read: async () => new Uint8Array([1]), apply: async () => {}, playTimeSinceSave: async () => 0 }}
          home={home}
          onBackGesture={() => () => {}}
          onClose={() => {}}
          onSaveFirst={() => {}}
        />
      </GameArtFor>
    </EngineProvider>
  );
}

function FastForwardOn({ children }: { children: ReactNode }) {
  useEffect(() => {
    // A timeout, so StrictMode's second run doesn't toggle it back off.
    const timer = setTimeout(() => dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" })), 100);
    return () => clearTimeout(timer);
  }, []);
  return children;
}

const transferHost: TransferHost = {
  readSave: (_folder, path) => (path === pageGames.nds.path ? new Promise(() => {}) : gamePageHost().readSave("/games", path)),
  saveFormat: async () => null,
  hasResumeState: async () => false,
  resumeInfo: async () => null,
  writeTransfer: async () => {},
  keptCopies: async () => [],
  keepCopies: async () => {},
};
const fireRed: Game = { system: "gba", name: "FireRed", path: "gba/FireRed.gba" };
const transferPartners = [fireRed, pageGames.gbc, pageGames.gb, pageGames.nds].map((game) => ({ game, name: game.name }));

const wildMemory = await openGameMemory("gba", snapshotMemory(emeraldWild));
const input = createInput(() => []);
const badges: SyncBadgeState[] = [
  { kind: "ring", percent: 60, label: "Uploading saves · 60%" },
  { kind: "done", label: "Synced" },
  { kind: "waiting", label: "Waiting to sync" },
  { kind: "attention", label: "Changed on another device" },
];
const screenshotUrl = URL.createObjectURL(new Blob([lastScreen], { type: "image/png" }));

function Overlays() {
  return (
    <main className="grid gap-6 p-4 pt-28">
      <div className="relative aspect-[3/2] max-w-xl overflow-hidden bg-black">
        <img src={screenshotUrl} alt="" className="absolute inset-0 size-full object-contain [image-rendering:pixelated]" />
        <div className="absolute inset-x-0 top-3 flex flex-col items-center gap-2">
          {wildMemory !== "unsupported" && (
            <OpponentPill memory={wildMemory} active randomized={false} open={false} input={input} onOpen={() => {}} onClose={() => {}} />
          )}
          <Toast inline>
            <WithUndo onUndo={() => {}}>Loaded slot 3</WithUndo>
          </Toast>
        </div>
      </div>
      <div className="grid max-w-xl grid-cols-4 gap-3">
        {badges.map((badge) => (
          <div key={badge.kind} className="relative aspect-square overflow-hidden rounded-tile bg-card">
            <img src={screenshotUrl} alt="" className="absolute inset-0 size-full object-cover [image-rendering:pixelated]" />
            <span className="absolute top-2 right-2">
              <SyncBadge badge={badge} />
            </span>
          </div>
        ))}
      </div>
      <Toast>Sent 3 to FireRed</Toast>
    </main>
  );
}

function FolderSummaryExample() {
  return (
    <FolderSummaryScreen
      folder="RetroArch"
      summary={{
        games: [
          { path: "gbc/Crystal.gbc", name: "Crystal", system: "gbc", save: true },
          { path: "gba/Pokemon - Emerald Version (USA, Europe).gba", name: "Pokemon - Emerald Version (USA, Europe)", system: "gba", save: true },
          { path: "gba/FireRed.gba", name: "FireRed", system: "gba", save: false },
          { path: "nds/HeartGold.nds", name: "HeartGold", system: "nds", save: true },
          { path: "nds/Platinum.nds", name: "Platinum", system: "nds", save: false },
          { path: "gb/Red.gb", name: "Red", system: "gb", save: true },
        ],
        withSave: 4,
        size: 412 * 1024 * 1024,
        leftOut: 12,
        known: 0,
        unmatched: 2,
        app: null,
      }}
      saves={4}
      onboarding={params.get("screen") === "import-folder-summary-onboarding"}
      onBack={() => {}}
      onAddSaves={() => {}}
      onChooseAnother={() => {}}
      onContinue={() => {}}
    />
  );
}

const screens: Record<string, () => ReactNode> = {
  library: () => <Home libraryHost={libraryHost()} gamePageHost={gamePageHost()} />,
  "library-3ds": () => <Home libraryHost={libraryHost({ recent: ["3ds/PKSM.3dsx", "nds/Platinum.nds"] })} gamePageHost={gamePageHost()} />,
  "library-no-resume": () => <Home libraryHost={libraryHost({ resume: false })} gamePageHost={gamePageHost()} />,
  "library-cloud": () => <Home libraryHost={libraryHost({ recent: ["gba/Sapphire.gba", "gba/Emerald.gba"] })} gamePageHost={gamePageHost()} />,
  "library-unplayed": () => <Home libraryHost={libraryHost({ recent: [] })} gamePageHost={gamePageHost()} />,
  "library-box-art": () => <Home libraryHost={libraryHost({ recent: ["gba/FireRed.gba", "gba/Emerald.gba"] })} gamePageHost={gamePageHost()} />,
  settings: () => <SettingsScreen onBack={() => {}} onLicences={() => {}} />,
  "settings-skins": () => <SettingsScreen onBack={() => {}} onLicences={() => {}} />,
  welcome: () => <Home libraryHost={libraryHost()} gamePageHost={gamePageHost()} />,
  "welcome-folder": () => <NewFolder onBack={() => {}} onReady={() => {}} />,
  "welcome-mac": () => <Home libraryHost={libraryHost()} gamePageHost={gamePageHost()} />,
  "welcome-folder-mac": () => <NewFolder onBack={() => {}} onReady={() => {}} />,
  "welcome-ios": () => <Home libraryHost={libraryHost()} gamePageHost={gamePageHost()} systems={["gb", "gbc", "gba", "nds"]} />,
  "welcome-folder-ios": () => <NewFolder onBack={() => {}} onReady={() => {}} />,
  "welcome-ipad": () => <Home libraryHost={libraryHost()} gamePageHost={gamePageHost()} systems={["gb", "gbc", "gba", "nds"]} />,
  "welcome-previous": () => <PreviousFolder onBack={() => {}} />,
  "welcome-previous-warning": () => <PreviousFolder onBack={() => {}} />,
  ...Object.fromEntries(
    systems.flatMap((system) => {
      const page = (withArt: boolean) => () => (
        <LibraryProvider host={libraryHost()} folder="/games" onOpen={() => {}} onPlay={() => {}}>
          <GameArtFor path={pageGames[system].path}>
            <GamePage
              host={gamePageHost({ withArt, screenshot: lastScreens[pageGames[system].path] ?? lastScreen })}
              folder="/games" game={pageGames[system]} games={Object.values(pageGames)} onPlay={() => {}} onDelete={() => {}} onBack={() => {}} />
          </GameArtFor>
        </LibraryProvider>
      );
      return [
        [`game-page-${system}`, page(false)],
        [`game-page-${system}-art`, page(true)],
        ...(system === "gba" ? [[`game-page-${system}-menu`, page(false)]] : []),
      ];
    }),
  ),
  ...Object.fromEntries(
    (["gb", "gbc", "gba", "nds", "n64", "3ds"] as const).map((system) => [
      `playing-${system}`,
      () => (
        <FastForwardOn>
          <GameScreen folder="/games" game={pageGames[system]} resume={false} dismissedPads={new Set()} onQuit={() => {}} onUnsupported={() => {}} />
        </FastForwardOn>
      ),
    ]),
  ),
  ...Object.fromEntries(
    (["gb", "gbc", "gba", "nds", "n64", "3ds"] as const).map((system) => {
      const [width, height] = ({ gb: [160, 144], gbc: [160, 144], nds: [256, 384], n64: [320, 240], "3ds": [400, 480] } as Record<string, number[]>)[system] ?? [240, 160];
      const picture = { width, height, pixels: new Uint16Array(frame(width, height), 16) };
      return [
        `skin-picker-${system}`,
        () => (
          <SkinPicker system={system} frame={params.has("empty") ? undefined : picture} game={pageGames[system].name} onClose={() => {}} />
        ),
      ];
    }),
  ),
  "transfer-pak": () => (
    <TransferPakScreen games={Object.values(pageGames)} chosen={pageGames.gb.path} input={input} onRestart={() => {}} onBack={() => {}} />
  ),
  "library-empty": () => <Home libraryHost={libraryHost({ recent: [], empty: true })} gamePageHost={gamePageHost()} />,
  "library-empty-android": () => (
    <GamesFolderProvider host={{ ...gamesFolderHost, openFolder: undefined }}>
      <Home libraryHost={libraryHost({ recent: [], empty: true })} gamePageHost={gamePageHost()} />
    </GamesFolderProvider>
  ),
  "library-import-menu": () => <Home libraryHost={libraryHost()} gamePageHost={gamePageHost()} />,
  "import-which-game": () => (
    <>
      <Home libraryHost={libraryHost()} gamePageHost={gamePageHost()} />
      <WhichGameDialog
        open
        question={{
          kind: "game",
          file: { file: "", name: "Pokemon Ruby (USA).srm", modified: 0 },
          games: Object.values(pageGames),
          answer: () => {},
        }}
      />
    </>
  ),
  "import-replace": () => (
    <>
      <Home libraryHost={libraryHost()} gamePageHost={gamePageHost()} />
      <ReplaceSaveDialog
        open
        question={{
          kind: "replace",
          game: emerald,
          existing: new Date(2026, 9, 1, 9, 30).getTime(),
          picked: new Date(2026, 9, 10, 18, 5).getTime(),
          answer: () => {},
        }}
      />
    </>
  ),
  "import-folder-where": () => <WhereAreYourGames onBack={() => {}} onChoose={() => {}} />,
  "import-folder-where-emulator": () => (
    <ImportProvider host={androidImportHost}>
      <WhereAreYourGames emulator onBack={() => {}} onChoose={() => {}} />
    </ImportProvider>
  ),
  "import-folder-where-emulator-ios": () => (
    <ImportProvider host={iosImportHost}>
      <WhereAreYourGames emulator onBack={() => {}} onChoose={() => {}} />
    </ImportProvider>
  ),
  "import-folder-where-emulator-ipad": () => (
    <ImportProvider host={{ ...iosImportHost, emulatorHint: iosEmulatorHint("iPad") }}>
      <WhereAreYourGames emulator onBack={() => {}} onChoose={() => {}} />
    </ImportProvider>
  ),
  "import-folder-where-emulator-mac": () => (
    <ImportProvider host={desktopImportHost}>
      <WhereAreYourGames emulator onBack={() => {}} onChoose={() => {}} />
    </ImportProvider>
  ),
  "import-folder-scanning": () => <Scanning folder="RetroArch" saves={false} />,
  "import-folder-summary": () => <FolderSummaryExample />,
  "import-folder-summary-onboarding": () => <FolderSummaryExample />,
  "import-folder-empty": () => (
    <FolderSummaryScreen
      folder="Download"
      summary={null}
      saves={0}
      onboarding
      onBack={() => {}}
      onAddSaves={() => {}}
      onChooseAnother={() => {}}
      onContinue={() => {}}
    />
  ),
  "import-folder-new-folder": () => (
    <NewFolder
      title="Now a folder for pkhemu"
      line="Your games get copied here, sorted by system. The originals stay where they are."
      onBack={() => {}}
      onReady={() => {}}
    />
  ),
  "import-folder-copying": () => <Copying done={2} total={6} game="FireRed" cancelling={false} onCancel={() => {}} />,
  "import-folder-conflicts": () => (
    <SaveConflicts
      conflicts={[
        {
          game: emerald,
          existing: new Date(2026, 9, 1, 9, 30).getTime(),
          save: { game: emerald.path, file: { file: "", name: "Emerald.srm", modified: new Date(2026, 9, 10, 18, 5).getTime() } },
        },
        {
          game: pageGames.nds,
          existing: new Date(2026, 8, 20, 21, 10).getTime(),
          save: { game: pageGames.nds.path, file: { file: "", name: "Platinum.dsv", modified: new Date(2026, 9, 9, 12, 40).getTime() } },
        },
      ]}
      onBack={() => {}}
      onContinue={() => {}}
    />
  ),
  overlays: () => <Overlays />,
  "overlays-dialog": () => (
    <>
      <Home libraryHost={libraryHost()} gamePageHost={gamePageHost()} />
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Emerald?</AlertDialogTitle>
            <AlertDialogDescription>This removes the game and its saves from this device.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" className="text-destructive">
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  ),
  transfer: () => (
    <GameArtFor path={emerald.path}>
      <TransferScreen
        host={transferHost}
        folder="/games"
        game={emerald}
        name="Emerald"
        partners={transferPartners}
        onPlay={() => {}}
        onBack={() => {}}
      />
    </GameArtFor>
  ),
  "box-art-sheet": () => (
    <>
      <Home libraryHost={libraryHost()} gamePageHost={gamePageHost()} />
      <BoxArtSheet open game={emerald} onClose={() => {}} onChanged={() => {}} />
    </>
  ),
  "patch-rom": () => <PatchRomDialog open folder="/games" game={emerald} onClose={() => {}} onCreated={() => {}} />,
  editor: () => (
    <GameArtFor path={emerald.path}>
      <EditorScreen
        host={{ read: async () => new Uint8Array(emeraldSave.bytes), apply: async () => {}, playTimeSinceSave: async () => 0 }}
        home={saveHome}
        onBackGesture={() => () => {}}
        onClose={() => {}}
        onSaveFirst={() => {}}
      />
    </GameArtFor>
  ),
  "editor-stadium": () => <FakeEditor engine={stadium} home={saveHome} />,
  "editor-teams": () => <FakeEditor engine={stadium} home={teamsPage} />,
  "editor-events": () => <FakeEditor engine={firered} home={saveHome} />,
  "editor-events-confirm": () => <FakeEditor engine={firered} home={saveHome} />,
  "editor-mystery-gift": () => <FakeEditor engine={platinum} home={saveHome} />,
  "editor-mystery-gift-preview": () => <FakeEditor engine={platinum} home={saveHome} />,
  "editor-mystery-gift-review": () => <FakeEditor engine={platinum} home={saveHome} />,
};

const screen = screens[params.get("screen") ?? ""] ?? screens.library;
const sync =
  params.get("screen") === "library-cloud"
    ? fakeSync({ account: "player@example.com", syncGames: true, cloudGames: ["gba/Sapphire.gba"] })
    : fakeSync({ available: false });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EngineProvider engine={engine}>
      <GravityProvider host={gravityHost}>
        <PreferencesProvider host={{ load: async () => ({}), save: async () => {} }} defaults={preferences}>
          <GamesFolderProvider host={gamesFolderHost}>
            <SyncProvider host={sync.host}>
              <BackProvider host={{ listen: () => () => {}, exit: () => {} }}>
                <BoxArtProvider host={boxArt.host}>
                  <GameArtProvider host={fakeGameArt().host}>
                    <PatchRomProvider host={patchRomHost}>
                      <ExportProvider host={{ saveFile: async () => undefined, saveFiles: async () => undefined }}>{screen()}</ExportProvider>
                    </PatchRomProvider>
                  </GameArtProvider>
                </BoxArtProvider>
              </BackProvider>
            </SyncProvider>
          </GamesFolderProvider>
        </PreferencesProvider>
      </GravityProvider>
    </EngineProvider>
  </StrictMode>,
);
