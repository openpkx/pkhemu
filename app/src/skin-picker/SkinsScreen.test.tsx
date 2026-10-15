import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider } from "@/back/back";
import { desktopBackHost } from "@/back/desktopHost";
import { GamesFolderProvider, type GamesFolderHost } from "@/games-folder/gamesFolder";
import { HapticsProvider } from "@/haptics/haptics";
import { fakePlus } from "@/plus/fakePlus";
import { PlusProvider, type PlusStatus } from "@/plus/plus";
import { PreferencesProvider, type Preferences } from "@/preferences/preferences";
import { defaultSkins, skins } from "@/skins";
import { systems, type System } from "@/systems";
import type { PreviewFrameHost } from "./previewFrame";
import { SkinsScreen } from "./SkinsScreen";

vi.mock("@/screen", () => ({ createScreen: () => () => {} }));

const defaults: Preferences = { touchControls: true, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, updateDismissedVersion: 0, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1, playInSilentMode: false, renderer: "automatic", skins: { ...defaultSkins, gb: { skin: "classic-grey", look: "frosted" }, gbc: { skin: "teal", look: "moulded" } }, skinHintSeen: true, screenDepth: true, screenGlass: true, asyncShaders: false };

const gamesFolder: GamesFolderHost = {
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

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function open(shown: readonly System[] = systems, plus: PlusStatus = { state: "unlocked" }) {
  const host: PreviewFrameHost = {
    pausedScreenshot: vi.fn(async () => null),
    recentlyPlayed: vi.fn(async () => ["gb/Red.gb", "gba/Emerald.gba"]),
    lastScreenshot: vi.fn(async () => null),
  };
  const onBack = vi.fn();
  render(
    <PreferencesProvider host={{ load: async () => ({}), save: async () => {} }} defaults={defaults}>
      <GamesFolderProvider host={gamesFolder}>
        <BackProvider host={desktopBackHost}>
          <HapticsProvider host={{ tap() {} }}>
            <PlusProvider host={fakePlus({ status: plus }).host}>
              <SkinsScreen systems={shown} host={host} onBack={onBack} />
            </PlusProvider>
          </HapticsProvider>
        </BackProvider>
      </GamesFolderProvider>
    </PreferencesProvider>,
  );
  await act(async () => {});
  return { host, onBack };
}

const rows = () => within(screen.getByRole("list", { name: "Systems" })).getAllByRole("button");

it("lists every system on the platform with its skin and look", async () => {
  await open();

  expect(rows()).toHaveLength(systems.length);
  expect(rows()[0].textContent).toBe("Game BoyClassic grey · Frosted");
  expect(rows().at(-1)?.textContent).toBe("Nintendo 3DSpkhemu · Moulded");
});

it("lists only the platform's systems", async () => {
  await open(["gb", "gba"]);

  expect(rows().map((row) => row.textContent)).toEqual(["Game BoyClassic grey · Frosted", "Game Boy Advancepkhemu · Moulded"]);
});

it("lists pkhemu for a Plus skin without Plus", async () => {
  await open(["gbc"], { state: "notOwned", price: "$3.99" });

  expect(rows()[0].textContent).toBe("Game Boy Colorpkhemu · Moulded");
});

it("shows a tile of each system's skin", async () => {
  await open(["gb"]);
  const classicGrey = skins.gb.find(({ id }) => id === "classic-grey")!;

  expect(rows()[0].querySelector<HTMLElement>("[style*='background-image']")?.style.backgroundImage).toContain(classicGrey.image);
});

it("opens a system's picker with its last resume screenshot, and goes back to the list", async () => {
  const { host, onBack } = await open();

  fireEvent.click(screen.getByRole("button", { name: /^Game Boy Advance/ }));
  await act(async () => {});

  expect(screen.getByRole("heading", { name: "Game Boy Advance skin" })).toBeTruthy();
  expect(host.lastScreenshot).toHaveBeenCalledWith("/games", "gba/Emerald.gba");

  fireEvent.keyDown(window, { key: "Escape" });
  await act(async () => {});
  expect(screen.queryByRole("heading", { name: "Game Boy Advance skin" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Skins" })).toBeTruthy();
  expect(onBack).not.toHaveBeenCalled();
});

it("goes back from the list", async () => {
  const { onBack } = await open();

  fireEvent.keyDown(window, { key: "Escape" });

  expect(onBack).toHaveBeenCalled();
});
