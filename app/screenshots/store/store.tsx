import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { PokemonId, PokemonSummary } from "@pkhex-everywhere/engine";
import { EngineProvider } from "@pkhex-everywhere/react";
import { BackProvider } from "@/back/back";
import { BoxArtProvider } from "@/box-art/boxArt";
import { fakeBoxArt } from "@/box-art/fakeBoxArt";
import { EditorScreen } from "@/editor/EditorScreen";
import { ExportProvider } from "@/editor/exportFile";
import { fakeEngine } from "@/editor/fakeEngine";
import { saveHome } from "@/editor/saveHome";
import { fakeGameArt } from "@/game-art/fakeGameArt";
import { GameArtFor, GameArtProvider } from "@/game-art/gameArt";
import { GamesFolderProvider, type GamesFolderHost } from "@/games-folder/gamesFolder";
import { GameScreen } from "@/GameScreen";
import { Home } from "@/Home";
import { experiments } from "@/lab/experiments";
import { ExperimentsProvider } from "@/lab/lab";
import { fakeFolder } from "@/library/fakeFolder";
import type { LibraryHost } from "@/library/library";
import type { Game } from "@/library/scan";
import { PatchRomProvider, type PatchRomHost } from "@/patch-rom/patchRom";
import { androidHosts } from "@/platform/androidHosts";
import { iosHosts } from "@/platform/iosHosts";
import { PreferencesProvider, type Preferences } from "@/preferences/preferences";
import type { SkinChoice } from "@/skins";
import { fakeSync } from "@/sync/fakeSync";
import { SyncProvider } from "@/sync/sync";
import "@/index.css";

const params = new URLSearchParams(location.search);
const screen = params.get("screen") ?? "library";
const hosts = params.get("platform") === "ios" ? iosHosts : androidHosts;
const playing = screen.startsWith("playing-");

if (playing && devicePixelRatio !== 1) {
  const Native = ResizeObserver;
  window.ResizeObserver = class extends Native {
    constructor(report: ResizeObserverCallback) {
      super((entries, observer) => report(entries.map(({ contentRect, target }) => ({ contentRect, target }) as ResizeObserverEntry), observer));
    }
  };
}

const bytes = async (name: string) => new Uint8Array(await (await fetch(`/store-frames/${name}.png`)).arrayBuffer());

async function rgb565(name: string) {
  const bitmap = await createImageBitmap(await (await fetch(`/store-frames/${name}.png`)).blob());
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d")!;
  context.drawImage(bitmap, 0, 0);
  const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
  const buffer = new ArrayBuffer(16 + bitmap.width * bitmap.height * 2);
  const view = new DataView(buffer);
  view.setUint16(4, bitmap.width, true);
  view.setUint16(6, bitmap.height, true);
  const pixels = new Uint16Array(buffer, 16);
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = ((data[i * 4] >> 3) << 11) | ((data[i * 4 + 1] >> 2) << 5) | (data[i * 4 + 2] >> 3);
  }
  return buffer;
}

const games: Record<string, Game> = {
  tobu: { system: "gb", name: "Tobu Tobu Girl", path: "gb/Tobu Tobu Girl.gb" },
  libbet: { system: "gb", name: "Libbet and the Magic Floor", path: "gb/Libbet and the Magic Floor.gb" },
  rhythm: { system: "gb", name: "Rhythm Land", path: "gb/Rhythm Land.gb" },
  tobudx: { system: "gbc", name: "Tobu Tobu Girl Deluxe", path: "gbc/Tobu Tobu Girl Deluxe.gbc" },
  ucity: { system: "gbc", name: "µCity", path: "gbc/µCity.gbc" },
  geometrix: { system: "gbc", name: "Geometrix", path: "gbc/Geometrix.gbc" },
  collie: { system: "gba", name: "Collie Defense", path: "gba/Collie Defense.gba" },
  feline: { system: "gba", name: "Feline", path: "gba/Feline.gba" },
  lro: { system: "gba", name: "Luggage Retrieval Officer", path: "gba/Luggage Retrieval Officer.gba" },
  jamclown: { system: "nds", name: "JamClown", path: "nds/JamClown.nds" },
  traffic: { system: "nds", name: "Traffic Escape", path: "nds/Traffic Escape.nds" },
  sblobber: { system: "n64", name: "sblobber64", path: "n64/sblobber64.z64" },
  kumi: { system: "n64", name: "Kumi-Daiko Beatoff 64", path: "n64/Kumi-Daiko Beatoff 64.n64" },
};

const covers: Record<string, string> = {
  tobu: "tobu-04",
  libbet: "libbet-02",
  rhythm: "rhythm-03",
  tobudx: "tobudx-04",
  ucity: "ucity-03",
  geometrix: "geometrix-06",
  collie: "collie-13",
  feline: "feline-03",
  lro: "lro-01",
  jamclown: "jamclown-04",
  traffic: "traffic-01",
};
const lastScreens: Record<string, string> = { collie: "collie-13", tobudx: "tobudx-10", ucity: "ucity-03", jamclown: "jamclown-04", lro: "lro-07" };
const recent = ["collie", "tobudx", "ucity", "jamclown", "lro"];

const boxArt = fakeBoxArt();
for (const [key, frame] of Object.entries(covers)) boxArt.cache.set(`${games[key].system}/${games[key].name}`, await bytes(frame));
const resume: Record<string, Uint8Array> = {};
for (const [key, frame] of Object.entries(lastScreens)) resume[games[key].path] = await bytes(frame);

const list = fakeFolder(
  Object.values(games)
    .filter((game) => hosts.systems.includes(game.system))
    .map((game) => game.path),
);
const libraryHost: LibraryHost = {
  listDir: (_folder, path) => list(path),
  recentlyPlayed: async () => recent.map((key) => games[key].path),
  scanGameArt: async () => {},
  resumeScreenshot: async (_folder, path) => (resume[path] ? [...resume[path]] : null),
  hasResumeState: async () => true,
  playHistory: async () => ({ lastPlayed: Date.now() - 40 * 60 * 1000, playTime: 0 }),
};

const playingGame: Record<string, [Game, string, SkinChoice?]> = {
  "playing-gbc": [games.tobudx, "tobudx-10"],
  "playing-gba": [games.collie, "collie-13", { skin: "indigo", look: "moulded" }],
  "playing-nds": [games.jamclown, "jamclown-04", { skin: "pkhemu", look: "frosted" }],
  "playing-gb": [games.rhythm, "rhythm-03", { skin: "classic-grey", look: "moulded" }],
  "playing-pause": [games.tobu, "tobu-10"],
};
const playingFrame = playing ? await rgb565(playingGame[screen][1]) : null;
const callbacks = new Map<number, (message: unknown) => void>();

Object.assign(window, {
  __TAURI_EVENT_PLUGIN_INTERNALS__: { unregisterListener: () => {} },
  __TAURI_INTERNALS__: {
    transformCallback: (callback: (message: unknown) => void) => {
      const id = callbacks.size + 1;
      callbacks.set(id, callback);
      return id;
    },
    invoke: async (command: string, args: Record<string, unknown>) => {
      if (command === "play") {
        callbacks.get((args.onFrame as { id: number }).id)?.({ index: 0, message: playingFrame!.slice(0) });
        return 60;
      }
      if (command === "list_states") return { current: null, slots: [], canUndoLoad: false };
      if (command === "can_undo_edit") return false;
      return undefined;
    },
  },
});
document.documentElement.dataset.theme = "dark";

const [playedGame, , skin] = playingGame[screen] ?? [];
const preferences: Preferences = {
  ...hosts.defaultPreferences,
  touchControls: playing,
  theme: "dark",
  skins: playedGame && skin ? { ...hosts.defaultPreferences.skins, [playedGame.system]: skin } : hosts.defaultPreferences.skins,
};

const gamesFolderHost: GamesFolderHost = {
  pickFolder: async () => "/games",
  makeFolder: async () => "/games",
  findFolder: async () => "/games",
  listFolders: async () => [],
  ensureFolder: async () => {},
  folderExists: async () => true,
  loadSaved: async () => "/games",
  save: async () => {},
  label: (folder) => folder,
  device: hosts.gamesFolder.device,
  openFolder: async () => {},
};

const patchRomHost: PatchRomHost = {
  baseBuild: async () => null,
  pick: async () => null,
  bases: async () => ({ checked: true, games: [] }),
  dropped: async () => ({ file: "", name: "", format: null, baseChecked: false }),
  checkName: async () => {},
  create: async () => ({ path: "", sha256: "", baseChecked: false }),
  patchedFrom: async () => null,
  keepPatchedFrom: async () => {},
};

type Creature = { name: string; level: number; gender: PokemonSummary["gender"]; draw: (c: OffscreenCanvasRenderingContext2D) => void };

function eyes(c: OffscreenCanvasRenderingContext2D, y: number, x1: number, x2: number) {
  for (const x of [x1, x2]) {
    c.fillStyle = "#1a1426";
    c.fillRect(x, y, 4, 6);
    c.fillStyle = "#ffffff";
    c.fillRect(x + 1, y + 1, 2, 2);
  }
}

function blob(c: OffscreenCanvasRenderingContext2D, color: string, shade: string, cx: number, cy: number, rx: number, ry: number) {
  c.fillStyle = shade;
  c.beginPath();
  c.ellipse(cx, cy + 2, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(cx, cy, rx, ry - 1, 0, 0, Math.PI * 2);
  c.fill();
}

const creatures: Creature[] = [
  {
    name: "Sproutle", level: 24, gender: "female",
    draw: (c) => {
      c.fillStyle = "#3f9b4b";
      c.beginPath(); c.ellipse(26, 14, 9, 4, -0.6, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(38, 14, 9, 4, 0.6, 0, Math.PI * 2); c.fill();
      blob(c, "#8fd46a", "#5aa646", 32, 38, 18, 16);
      eyes(c, 33, 24, 36);
      c.fillStyle = "#ff9fb0"; c.fillRect(20, 42, 4, 2); c.fillRect(40, 42, 4, 2);
    },
  },
  {
    name: "Emberkit", level: 27, gender: "male",
    draw: (c) => {
      c.fillStyle = "#ffb43c";
      c.beginPath(); c.moveTo(44, 46); c.lineTo(60, 24); c.lineTo(52, 48); c.fill();
      c.fillStyle = "#e8582c";
      c.beginPath(); c.moveTo(18, 26); c.lineTo(22, 10); c.lineTo(30, 24); c.fill();
      c.beginPath(); c.moveTo(34, 24); c.lineTo(42, 10); c.lineTo(46, 26); c.fill();
      blob(c, "#f2763a", "#c2502a", 32, 38, 17, 15);
      c.fillStyle = "#ffe0b8"; c.beginPath(); c.ellipse(32, 44, 9, 6, 0, 0, Math.PI * 2); c.fill();
      eyes(c, 31, 24, 36);
    },
  },
  {
    name: "Ripplet", level: 22, gender: "female",
    draw: (c) => {
      c.fillStyle = "#3b7fd9";
      c.beginPath(); c.moveTo(32, 6); c.quadraticCurveTo(52, 34, 48, 44); c.quadraticCurveTo(32, 62, 16, 44); c.quadraticCurveTo(12, 34, 32, 6); c.fill();
      c.fillStyle = "#6fb1ff";
      c.beginPath(); c.moveTo(32, 9); c.quadraticCurveTo(49, 34, 46, 43); c.quadraticCurveTo(32, 58, 18, 43); c.quadraticCurveTo(15, 34, 32, 9); c.fill();
      c.fillStyle = "#d6ecff"; c.fillRect(22, 26, 3, 6);
      eyes(c, 36, 24, 36);
    },
  },
  {
    name: "Pebblin", level: 25, gender: "male",
    draw: (c) => {
      c.fillStyle = "#6c6f7d";
      c.beginPath(); c.moveTo(12, 50); c.lineTo(16, 24); c.lineTo(30, 14); c.lineTo(46, 18); c.lineTo(54, 34); c.lineTo(52, 52); c.closePath(); c.fill();
      c.fillStyle = "#9a9eae";
      c.beginPath(); c.moveTo(15, 48); c.lineTo(19, 26); c.lineTo(31, 17); c.lineTo(45, 21); c.lineTo(51, 34); c.lineTo(49, 49); c.closePath(); c.fill();
      c.fillStyle = "#7e8292"; c.fillRect(36, 24, 6, 3); c.fillRect(22, 44, 8, 2);
      eyes(c, 32, 24, 38);
    },
  },
  {
    name: "Mothlit", level: 23, gender: "female",
    draw: (c) => {
      c.fillStyle = "#b07cff";
      c.beginPath(); c.ellipse(16, 30, 13, 17, -0.4, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(48, 30, 13, 17, 0.4, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#ffe36e"; c.beginPath(); c.arc(14, 28, 4, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(50, 28, 4, 0, Math.PI * 2); c.fill();
      blob(c, "#e9dcff", "#bca6e6", 32, 36, 9, 14);
      c.strokeStyle = "#5b3fa0"; c.lineWidth = 2;
      c.beginPath(); c.moveTo(29, 23); c.lineTo(24, 12); c.moveTo(35, 23); c.lineTo(40, 12); c.stroke();
      eyes(c, 29, 26, 34);
    },
  },
  {
    name: "Fluffin", level: 21, gender: "female",
    draw: (c) => {
      c.fillStyle = "#e7a6d8";
      for (const [x, y, r] of [[20, 34, 11], [32, 26, 13], [44, 34, 11], [26, 44, 11], [38, 44, 11]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = "#ffd3f1";
      for (const [x, y, r] of [[20, 33, 9], [32, 25, 11], [44, 33, 9], [26, 42, 9], [38, 42, 9]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
      eyes(c, 31, 25, 35);
    },
  },
];

async function sprite(draw: Creature["draw"], size: number) {
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext("2d")!;
  context.imageSmoothingEnabled = false;
  context.scale(size / 64, size / 64);
  draw(context);
  return new Uint8Array(await (await canvas.convertToBlob()).arrayBuffer());
}

function summary(creature: Creature, index: number, at: PokemonSummary["at"]): PokemonSummary {
  return {
    id: `${creature.name}:${index}` as PokemonId,
    at,
    speciesId: index + 1,
    speciesIndex: index + 1,
    species: creature.name,
    isUnknown: false,
    editable: true,
    form: { id: 0, name: "" },
    nickname: creature.name.toUpperCase(),
    level: creature.level,
    isShiny: false,
    gender: creature.gender,
    isEgg: false,
    types: [],
  };
}

const editorGame = games.collie;
const party = creatures.slice(0, 4).map((creature, index) => summary(creature, index, { source: "party", slot: index }));
const box = creatures.map((creature, index) => summary({ ...creature, level: creature.level - 9 }, index, { source: "box", box: 0, slot: index }));
const { engine } = fakeEngine({
  trainer: { id: "20481/00000", name: "ALEX", maxNameLength: 7, gender: "female", money: 12800, battlePoints: null, rival: null },
  party,
  box,
});
const artSha = "store";
const art: Record<string, Uint8Array> = {};
for (const [index, creature] of creatures.entries()) {
  art[`sprite-${index + 1}-0`] = await sprite(creature.draw, 64);
  art[`icon-${index + 1}-0`] = await sprite(creature.draw, 32);
}
const gameArt = fakeGameArt({ games: { [editorGame.path]: artSha }, art: { [artSha]: art } });

const screens: Record<string, () => ReactNode> = {
  library: () => <Home libraryHost={libraryHost} gamePageHost={undefined as never} systems={hosts.systems} />,
  "library-more": () => <Home libraryHost={libraryHost} gamePageHost={undefined as never} systems={hosts.systems} />,
  editor: () => (
    <GameArtFor path={editorGame.path}>
      <EditorScreen
        host={{ read: async () => new Uint8Array([1]), apply: async () => {}, playTimeSinceSave: async () => 0 }}
        home={saveHome}
        onBackGesture={() => () => {}}
        onClose={() => {}}
        onSaveFirst={() => {}}
      />
    </GameArtFor>
  ),
  ...Object.fromEntries(
    Object.entries(playingGame).map(([name, [game]]) => [
      name,
      () => (
        <ExperimentsProvider host={{ load: async () => ({}), save: async () => {} }} registry={experiments}>
          <GameScreen folder="/games" game={game} resume={false} dismissedPads={new Set()} onQuit={() => {}} onUnsupported={() => {}} />
        </ExperimentsProvider>
      ),
    ]),
  ),
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EngineProvider engine={engine}>
      <PreferencesProvider host={{ load: async () => ({}), save: async () => {} }} defaults={preferences}>
        <GamesFolderProvider host={gamesFolderHost}>
          <SyncProvider host={fakeSync({ available: false }).host}>
            <BackProvider host={{ listen: () => () => {}, exit: () => {} }}>
              <BoxArtProvider host={boxArt.host}>
                <GameArtProvider host={gameArt.host}>
                  <PatchRomProvider host={patchRomHost}>
                    <ExportProvider host={{ saveFile: async () => undefined, saveFiles: async () => undefined }}>{screens[screen]()}</ExportProvider>
                  </PatchRomProvider>
                </GameArtProvider>
              </BoxArtProvider>
            </BackProvider>
          </SyncProvider>
        </GamesFolderProvider>
      </PreferencesProvider>
    </EngineProvider>
  </StrictMode>,
);
