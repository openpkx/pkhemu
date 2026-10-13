import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createEngine, type EngineHost } from "@pkhex-everywhere/engine";
import { EngineProvider } from "@pkhex-everywhere/react";
import { afterEach, expect, it, vi } from "vitest";
import { fakeAppUpdate } from "./app-update/fakeAppUpdate";
import { AppUpdateProvider } from "./app-update/appUpdate";
import { AudioSessionProvider, type AudioSessionHost } from "./audio-session/audioSession";
import { fakeGameArt } from "./game-art/fakeGameArt";
import { GameArtProvider } from "./game-art/gameArt";
import { GameSurfaceProvider, noGameSurfaceHost, type GameSurfaceHost } from "./game-surface/gameSurface";
import { GamesFolderProvider, type GamesFolderHost } from "./games-folder/gamesFolder";
import { ExperimentsProvider } from "./lab/lab";
import { fakePlus } from "./plus/fakePlus";
import { PlusProvider } from "./plus/plus";
import { PreferencesProvider, type Preferences, type PreferencesHost } from "./preferences/preferences";
import { SettingsScreen } from "./SettingsScreen";
import { fakeSync } from "./sync/fakeSync";
import { SyncProvider } from "./sync/sync";
import type { System } from "./systems";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(async () => ({ name: "mGBA", version: "0.10.5" })) }));

afterEach(cleanup);

const defaults: Preferences = { touchControls: false, fastForwardSpeed: 2, showFps: false, theme: "system", eventsNoticeDismissed: false, updateDismissedVersion: 0, gameClockOffset: { days: 0, hours: 0 }, restoreBackupsKept: 10, stickSensitivity: 1, playInSilentMode: false, renderer: "automatic" };

const idleEngine: EngineHost = {
  ready: () => new Promise(() => {}),
  onChange: () => {},
  onEvent: () => {},
  getAssemblyExports: () => new Promise(() => {}),
};

function openSettings({
  canOpenFolder = true,
  canPickFolder = true,
  sync = fakeSync({ available: false }),
  plus = undefined as ReturnType<typeof fakePlus> | undefined,
  system = undefined as System | undefined,
  audioSession = undefined as AudioSessionHost | undefined,
  gameSurface = noGameSurfaceHost as GameSurfaceHost,
  update = fakeAppUpdate(),
} = {}) {
  const openFolder = vi.fn(async () => {});
  const onLicences = vi.fn();
  const gamesFolderHost: GamesFolderHost = {
    ...(canPickFolder && { pickFolder: async () => "/roms" }),
    makeFolder: async () => "/roms",
    findFolder: async () => "/roms",
    listFolders: async () => [],
    ensureFolder: async () => {},
    folderExists: async () => true,
    loadSaved: async () => "/games",
    save: async () => {},
    label: (folder) => folder,
    device: "phone",
    ...(canOpenFolder && { openFolder }),
  };
  let saved: Partial<Preferences> = {};
  const preferencesHost: PreferencesHost = {
    load: async () => saved,
    save: async (preferences) => {
      saved = preferences;
    },
  };
  const gameArt = fakeGameArt();
  const settings = (
    <GameSurfaceProvider host={gameSurface}>
      <AppUpdateProvider host={update.host}>
        <SettingsScreen system={system} onBack={() => {}} onLicences={onLicences} />
      </AppUpdateProvider>
    </GameSurfaceProvider>
  );
  const synced = (
    <SyncProvider host={sync.host}>
      <GameArtProvider host={gameArt.host}>
        <ExperimentsProvider
          host={{ load: async () => ({ blend: "on" }), save: async () => {} }}
          registry={[{ id: "blend", label: "Blend frames", line: "Blends skipped frames.", values: ["off", "on"], players: true }]}
        >
          {audioSession ? <AudioSessionProvider host={audioSession}>{settings}</AudioSessionProvider> : settings}
        </ExperimentsProvider>
      </GameArtProvider>
    </SyncProvider>
  );
  render(
    <EngineProvider engine={createEngine({ host: idleEngine })}>
      <GamesFolderProvider host={gamesFolderHost}>
        <PreferencesProvider host={preferencesHost} defaults={defaults}>
          {plus ? <PlusProvider host={plus.host}>{synced}</PlusProvider> : synced}
        </PreferencesProvider>
      </GamesFolderProvider>
    </EngineProvider>,
  );
  return { openFolder, onLicences, saved: () => saved, gameArt };
}

it("shows the games folder and changes it", async () => {
  openSettings();
  const section = await screen.findByRole("region", { name: "Games folder" });
  expect(within(section).getByText("/games")).toBeTruthy();

  fireEvent.click(within(section).getByRole("button", { name: "Change folder" }));

  expect(await within(section).findByText("/roms")).toBeTruthy();
});

it("offers no other folder when the platform has only its own", async () => {
  openSettings({ canPickFolder: false });
  const section = await screen.findByRole("region", { name: "Games folder" });
  expect(within(section).getByText("/games")).toBeTruthy();

  expect(within(section).queryByRole("button")).toBeNull();
});

it("hides Sync when this build can't sync", async () => {
  openSettings();
  await screen.findByRole("region", { name: "Games folder" });
  await act(async () => {});

  expect(screen.queryByRole("region", { name: "Sync" })).toBeNull();
});

it("shows the Lab before About in a build that isn't a store build", async () => {
  openSettings();
  const lab = await screen.findByRole("region", { name: "Lab" });
  const about = screen.getByRole("region", { name: "About" });

  expect(lab.compareDocumentPosition(about) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it("hides the Lab in a store build without Plus", async () => {
  openSettings({ plus: fakePlus() });
  await screen.findByRole("region", { name: "About" });
  await act(async () => {});

  expect(screen.queryByRole("region", { name: "Lab" })).toBeNull();
});

it("connects Google Drive, shows the account and signs out", async () => {
  const sync = fakeSync();
  openSettings({ sync });
  const section = await screen.findByRole("region", { name: "Sync" });

  await act(async () => fireEvent.click(within(section).getByRole("button", { name: "Connect Google Drive" })));

  expect(sync.host.signIn).toHaveBeenCalledWith("google");
  expect(within(section).getByText("player@example.com")).toBeTruthy();
  expect(sync.host.syncAll).toHaveBeenCalledWith("/games");

  await act(async () => fireEvent.click(within(section).getByRole("button", { name: "Sign out" })));

  expect(sync.host.signOut).toHaveBeenCalled();
  expect(within(section).getByRole("button", { name: "Connect Google Drive" })).toBeTruthy();
  expect(within(section).queryByText("player@example.com")).toBeNull();
});

it("connects Dropbox", async () => {
  const sync = fakeSync({ signsInAs: "dropbox@example.com" });
  openSettings({ sync });
  const section = await screen.findByRole("region", { name: "Sync" });

  await act(async () => fireEvent.click(within(section).getByRole("button", { name: "Connect Dropbox" })));

  expect(sync.host.signIn).toHaveBeenCalledWith("dropbox");
  expect(within(section).getByText("dropbox@example.com")).toBeTruthy();
  expect(within(section).queryByRole("button", { name: "Connect Google Drive" })).toBeNull();
});

it("offers only the clouds this build can sync to", async () => {
  openSettings({ sync: fakeSync({ clouds: ["dropbox"] }) });
  const section = await screen.findByRole("region", { name: "Sync" });

  expect(within(section).getByRole("button", { name: "Connect Dropbox" })).toBeTruthy();
  expect(within(section).queryByRole("button", { name: "Connect Google Drive" })).toBeNull();
});

it("syncs now and updates when it last synced", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-08T12:00:00Z"));
  const sync = fakeSync({ account: "player@example.com", lastSynced: Date.parse("2026-10-08T09:00:00Z") });
  sync.host.syncAll.mockImplementationOnce(async () => {});
  openSettings({ sync });
  const section = await screen.findByRole("region", { name: "Sync" });
  expect(await within(section).findByText("Last synced 3 hours ago")).toBeTruthy();
  sync.host.syncAll.mockClear();

  await act(async () => fireEvent.click(within(section).getByRole("button", { name: "Sync now" })));

  expect(sync.host.syncAll).toHaveBeenCalledWith("/games");
  expect(within(section).getByText("Last synced just now")).toBeTruthy();
  vi.useRealTimers();
});

it("shows the run's phase and each game's stage while syncing", async () => {
  const sync = fakeSync({ account: "player@example.com", syncGames: true });
  openSettings({ sync });
  const section = await screen.findByRole("region", { name: "Sync" });
  await within(section).findByText(/^Last synced/);

  await act(async () => sync.report({ syncing: true }));
  await act(async () => sync.runProgress({ phase: "checking", done: 4, total: 12 }));
  expect(within(section).getByText("Checking · 4 of 12 games")).toBeTruthy();
  expect(within(section).getByRole("progressbar", { name: "Sync progress" })).toBeTruthy();

  await act(async () => {
    sync.game({ path: "gba/Emerald.gba", state: "transferring", done: 1, total: 4, stage: "uploadingSaves" });
    sync.game({ path: "gba/Ruby.gba", state: "queued" });
    sync.game({ path: "gba/Sapphire.gba", state: "synced", lastSynced: 1_000 });
    sync.runProgress({ phase: "transferring", done: 46, total: 100, waitingRoms: ["gba/FireRed.gba"] });
  });
  expect(within(section).getByText("Syncing · 46%")).toBeTruthy();
  const games = within(within(section).getByRole("list", { name: "Games syncing" }));
  expect(games.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
    "EmeraldUploading saves · 25%",
    "FireRedROM waiting for Wi-Fi",
    "RubyWaiting to sync",
  ]);

  await act(async () => sync.report({ syncing: false, lastSynced: Date.now() }));
  expect(within(section).getByText("Last synced just now")).toBeTruthy();
  expect(within(section).queryByRole("list", { name: "Games syncing" })).toBeNull();
  expect(within(section).queryByRole("progressbar", { name: "Sync progress" })).toBeNull();
});

it("wraps a long game error instead of keeping it on one line", async () => {
  const sync = fakeSync({ account: "player@example.com", syncGames: true });
  openSettings({ sync });
  const section = await screen.findByRole("region", { name: "Sync" });
  await within(section).findByText(/^Last synced/);
  const message = "Google Drive answered 411 Length Required. ".repeat(7).slice(0, 300);

  await act(async () => {
    sync.report({ syncing: true });
    sync.game({ path: "gba/Emerald.gba", state: "error", message });
  });

  const stage = within(within(section).getByRole("list", { name: "Games syncing" })).getByText(message);
  expect(message).toHaveLength(300);
  expect(stage.classList).not.toContain("shrink-0");
});

it("shows a sync error in the section", async () => {
  openSettings({ sync: fakeSync({ account: "player@example.com", error: "Your Google Drive is full" }) });
  const section = await screen.findByRole("region", { name: "Sync" });

  expect(await within(section).findByText("Your Google Drive is full")).toBeTruthy();
});

it("shows why connecting failed", async () => {
  const sync = fakeSync();
  sync.host.signIn.mockRejectedValueOnce("Google sign-in was cancelled");
  openSettings({ sync });
  const section = await screen.findByRole("region", { name: "Sync" });

  await act(async () => fireEvent.click(within(section).getByRole("button", { name: "Connect Google Drive" })));

  expect(within(section).getByText("Google sign-in was cancelled")).toBeTruthy();
  expect(within(section).getByRole("button", { name: "Connect Google Drive" })).toBeTruthy();
});

it("offers Plus at the store's price in place of the Connect buttons, and connects once it's bought", async () => {
  const plus = fakePlus({ status: { state: "notOwned", price: "€4,49" } });
  openSettings({ sync: fakeSync(), plus });
  const section = await screen.findByRole("region", { name: "Sync" });
  const getPlus = await within(section).findByRole("button", { name: "Get Plus · €4,49" });
  expect(within(section).getByRole("button", { name: "Restore purchases" })).toBeTruthy();
  expect(within(section).queryByRole("button", { name: /^Connect/ })).toBeNull();

  await act(async () => fireEvent.click(getPlus));

  expect(plus.host.buy).toHaveBeenCalled();
  expect(within(section).getByRole("button", { name: "Connect Google Drive" })).toBeTruthy();
  expect(within(section).queryByRole("button", { name: /^Get Plus/ })).toBeNull();
  expect(within(section).queryByRole("button", { name: "Restore purchases" })).toBeNull();
});

it("waits for a pending purchase", async () => {
  openSettings({ sync: fakeSync(), plus: fakePlus({ buys: "pending" }) });
  const section = await screen.findByRole("region", { name: "Sync" });

  await act(async () => fireEvent.click(within(section).getByRole("button", { name: /^Get Plus/ })));

  expect(within(section).getByText("Waiting for the payment to finish")).toBeTruthy();
});

it("shows only a store error when buying fails", async () => {
  const plus = fakePlus();
  plus.host.buy.mockRejectedValueOnce("Google Play is busy");
  openSettings({ sync: fakeSync(), plus });
  const section = await screen.findByRole("region", { name: "Sync" });

  await act(async () => fireEvent.click(within(section).getByRole("button", { name: /^Get Plus/ })));

  expect(within(section).getByText("Google Play is busy").className).toContain("text-destructive");
  expect(within(section).queryByText("Waiting for the payment to finish")).toBeNull();
  expect(within(section).getByRole("button", { name: /^Get Plus/ })).toBeTruthy();
});

it("restores a Plus the player already owns", async () => {
  const plus = fakePlus({ owned: true });
  openSettings({ sync: fakeSync(), plus });
  const section = await screen.findByRole("region", { name: "Sync" });

  await act(async () => fireEvent.click(within(section).getByRole("button", { name: "Restore purchases" })));

  expect(plus.host.restore).toHaveBeenCalled();
  expect(within(section).getByRole("button", { name: "Connect Google Drive" })).toBeTruthy();
});

it("says when Plus can't be bought on this device and still offers Restore purchases", async () => {
  openSettings({ sync: fakeSync(), plus: fakePlus({ status: { state: "unavailable" } }) });
  const section = await screen.findByRole("region", { name: "Sync" });

  expect(await within(section).findByText("Plus can't be bought on this device")).toBeTruthy();
  expect(within(section).getByRole("button", { name: "Restore purchases" })).toBeTruthy();
  expect(within(section).queryByRole("button", { name: /^Get Plus/ })).toBeNull();
  expect(within(section).queryByRole("button", { name: /^Connect/ })).toBeNull();
});

it("shows the Connect buttons and never Plus in an unlocked build", async () => {
  openSettings({ sync: fakeSync(), plus: fakePlus({ status: { state: "unlocked" } }) });
  const section = await screen.findByRole("region", { name: "Sync" });

  expect(await within(section).findByRole("button", { name: "Connect Google Drive" })).toBeTruthy();
  expect(within(section).queryByRole("button", { name: /^Get Plus/ })).toBeNull();
  expect(within(section).queryByRole("button", { name: "Restore purchases" })).toBeNull();
});

it("turns Sync games on and syncs", async () => {
  const sync = fakeSync({ account: "player@example.com" });
  openSettings({ sync });
  const toggle = await screen.findByRole("switch", { name: "Sync games" });
  expect(toggle.getAttribute("aria-checked")).toBe("false");
  sync.host.syncAll.mockClear();

  await act(async () => fireEvent.click(toggle));

  expect(sync.host.setSyncGames).toHaveBeenCalledWith(true);
  expect(sync.host.syncAll).toHaveBeenCalledWith("/games");
  expect(toggle.getAttribute("aria-checked")).toBe("true");
});

it("turns Sync games off without syncing", async () => {
  const sync = fakeSync({ account: "player@example.com", syncGames: true });
  openSettings({ sync });
  const toggle = await screen.findByRole("switch", { name: "Sync games" });
  await waitFor(() => expect(toggle.getAttribute("aria-checked")).toBe("true"));
  sync.host.syncAll.mockClear();

  await act(async () => fireEvent.click(toggle));

  expect(sync.host.setSyncGames).toHaveBeenCalledWith(false);
  expect(sync.host.syncAll).not.toHaveBeenCalled();
});

it("shows the mobile data switches on a phone, and Include ROMs only while Sync games is on", async () => {
  const sync = fakeSync({ account: "player@example.com", mobileData: { on: false, roms: true } });
  openSettings({ sync });
  const mobileData = await screen.findByRole("switch", { name: "Sync on mobile data" });
  await waitFor(() => expect(mobileData.getAttribute("aria-checked")).toBe("false"));
  expect(screen.queryByRole("switch", { name: "Include ROMs" })).toBeNull();

  await act(async () => fireEvent.click(screen.getByRole("switch", { name: "Sync games" })));

  expect(screen.getByRole("switch", { name: "Include ROMs" }).getAttribute("aria-checked")).toBe("true");
});

it("turns Sync on mobile data on and syncs", async () => {
  const sync = fakeSync({ account: "player@example.com", mobileData: { on: false, roms: false } });
  openSettings({ sync });
  const mobileData = await screen.findByRole("switch", { name: "Sync on mobile data" });
  await waitFor(() => expect(mobileData.getAttribute("aria-checked")).toBe("false"));
  sync.host.syncAll.mockClear();

  await act(async () => fireEvent.click(mobileData));

  expect(sync.host.setMobileData).toHaveBeenCalledWith({ on: true, roms: false });
  expect(sync.host.syncAll).toHaveBeenCalledWith("/games");
  expect(mobileData.getAttribute("aria-checked")).toBe("true");
});

it("turns Include ROMs on", async () => {
  const sync = fakeSync({ account: "player@example.com", syncGames: true, mobileData: { on: true, roms: false } });
  openSettings({ sync });
  const roms = await screen.findByRole("switch", { name: "Include ROMs" });

  await act(async () => fireEvent.click(roms));

  expect(sync.host.setMobileData).toHaveBeenCalledWith({ on: true, roms: true });
  expect(roms.getAttribute("aria-checked")).toBe("true");
});

it("has no mobile data switches on desktop", async () => {
  openSettings({ sync: fakeSync({ account: "player@example.com", syncGames: true }) });
  await screen.findByRole("switch", { name: "Sync games" });

  expect(screen.queryByRole("switch", { name: "Sync on mobile data" })).toBeNull();
  expect(screen.queryByRole("switch", { name: "Include ROMs" })).toBeNull();
});

it("turns touch controls on", async () => {
  const { saved } = openSettings();
  const toggle = await screen.findByRole("switch", { name: "Touch controls" });
  expect(toggle.getAttribute("aria-checked")).toBe("false");

  await act(async () => fireEvent.click(toggle));

  expect(toggle.getAttribute("aria-checked")).toBe("true");
  expect(saved().touchControls).toBe(true);
});

it("plays sound in silent mode once it's turned on", async () => {
  const audioSession = { silentSwitch: true, playInSilentMode: vi.fn(async () => {}) };
  const { saved } = openSettings({ audioSession });
  const toggle = await screen.findByRole("switch", { name: "Play sound in silent mode" });
  expect(toggle.getAttribute("aria-checked")).toBe("false");

  await act(async () => fireEvent.click(toggle));

  expect(toggle.getAttribute("aria-checked")).toBe("true");
  expect(saved().playInSilentMode).toBe(true);
  expect(audioSession.playInSilentMode).toHaveBeenLastCalledWith(true);
});

it("has no silent mode switch where the device has no silent mode", async () => {
  openSettings();
  await screen.findByRole("switch", { name: "Touch controls" });

  expect(screen.queryByRole("switch", { name: "Play sound in silent mode" })).toBeNull();
});

it("switches fast-forward to 4×", async () => {
  const { saved } = openSettings();
  const speeds = await screen.findByRole("radiogroup", { name: "Fast-forward speed" });
  const fast = within(speeds).getByRole("radio", { name: "4×" });

  await act(async () => fireEvent.click(fast));

  expect(fast.getAttribute("aria-checked")).toBe("true");
  expect(saved().fastForwardSpeed).toBe(4);
});

it("raises the stick sensitivity", async () => {
  const { saved } = openSettings();
  const sensitivities = await screen.findByRole("radiogroup", { name: "Stick sensitivity" });
  const high = within(sensitivities).getByRole("radio", { name: "High" });

  await act(async () => fireEvent.click(high));

  expect(high.getAttribute("aria-checked")).toBe("true");
  expect(saved().stickSensitivity).toBe(1.5);
});

it("turns the FPS counter on", async () => {
  const { saved } = openSettings();
  const toggle = await screen.findByRole("switch", { name: "Show FPS" });
  expect(toggle.getAttribute("aria-checked")).toBe("false");

  await act(async () => fireEvent.click(toggle));

  expect(toggle.getAttribute("aria-checked")).toBe("true");
  expect(saved().showFps).toBe(true);
});

const nativeSurface: GameSurfaceHost = { renderers: ["native", "compatible"], setPlaying() {} };

it("has no renderer setting where only one renderer exists", async () => {
  openSettings();
  await screen.findByRole("switch", { name: "Show FPS" });

  expect(screen.queryByRole("combobox", { name: "Renderer" })).toBeNull();
});

it("shows which renderer Automatic picks", async () => {
  openSettings({ gameSurface: nativeSurface });

  const renderer = await screen.findByRole("combobox", { name: "Renderer" });

  expect(renderer.textContent).toMatch(/Automatic.*Native/);
});

it("saves the renderer the player picks", async () => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => {};
  const { saved } = openSettings({ gameSurface: nativeSurface });
  const renderer = await screen.findByRole("combobox", { name: "Renderer" });

  fireEvent.keyDown(renderer, { key: "Enter" });
  await act(async () => fireEvent.click(await screen.findByRole("option", { name: /Compatible/ })));

  expect(saved().renderer).toBe("compatible");
});

it("sets the game clock ahead", async () => {
  const { saved } = openSettings();
  const clock = await screen.findByRole("group", { name: "Game clock" });
  const [days, hours] = within(clock).getAllByRole("spinbutton");

  await act(async () => fireEvent.change(days, { target: { value: "3" } }));
  await act(async () => fireEvent.change(hours, { target: { value: "6" } }));

  expect(saved().gameClockOffset).toEqual({ days: 3, hours: 6 });
});

it("doesn't save a game clock offset out of range", async () => {
  const { saved } = openSettings();
  const clock = await screen.findByRole("group", { name: "Game clock" });
  const [days, hours] = within(clock).getAllByRole("spinbutton");

  await act(async () => fireEvent.change(days, { target: { value: "366" } }));
  await act(async () => fireEvent.change(hours, { target: { value: "1.5" } }));

  expect(saved().gameClockOffset).toBeUndefined();
});

it("leaves the game clock out while an N64 game plays", async () => {
  openSettings({ system: "n64" });
  await screen.findByRole("region", { name: "Playing" });

  expect(screen.queryByRole("group", { name: "Game clock" })).toBeNull();
});

it("shows the game clock while a Game Boy game plays", async () => {
  openSettings({ system: "gbc" });

  expect(await screen.findByRole("group", { name: "Game clock" })).toBeTruthy();
});

it("resets the game clock to real time", async () => {
  const { saved } = openSettings();
  const section = await screen.findByRole("region", { name: "Playing" });
  const [days, hours] = within(within(section).getByRole("group", { name: "Game clock" })).getAllByRole("spinbutton");
  expect(within(section).queryByRole("button", { name: "Reset" })).toBeNull();
  await act(async () => fireEvent.change(days, { target: { value: "2" } }));

  await act(async () => fireEvent.click(within(section).getByRole("button", { name: "Reset" })));

  expect(saved().gameClockOffset).toEqual({ days: 0, hours: 0 });
  expect((days as HTMLInputElement).value).toBe("0");
  expect((hours as HTMLInputElement).value).toBe("0");
  expect(within(section).queryByRole("button", { name: "Reset" })).toBeNull();
});

it("switches the theme to dark", async () => {
  const { saved } = openSettings();
  const themes = await screen.findByRole("radiogroup", { name: "Theme" });
  expect(within(themes).getByRole("radio", { name: "System" }).getAttribute("aria-checked")).toBe("true");
  const dark = within(themes).getByRole("radio", { name: "Dark" });

  await act(async () => fireEvent.click(dark));

  expect(dark.getAttribute("aria-checked")).toBe("true");
  expect(saved().theme).toBe("dark");
});

it("opens the backups on desktop", async () => {
  const { openFolder } = openSettings();
  const section = await screen.findByRole("region", { name: "Backups" });

  fireEvent.click(within(section).getByRole("button", { name: /Open/ }));

  expect(openFolder).toHaveBeenCalled();
});

it("sets how many backups to keep before a restore", async () => {
  const { saved } = openSettings();
  const section = await screen.findByRole("region", { name: "Backups" });
  const kept = within(section).getByRole("spinbutton", { name: "Backups before a restore" });
  expect((kept as HTMLInputElement).value).toBe("10");

  await act(async () => fireEvent.change(kept, { target: { value: "3" } }));

  expect(saved().restoreBackupsKept).toBe(3);
});

it.each(["0", "51", "2.5"])("doesn't save %s backups to keep before a restore", async (value) => {
  const { saved } = openSettings();
  const section = await screen.findByRole("region", { name: "Backups" });

  await act(async () =>
    fireEvent.change(within(section).getByRole("spinbutton", { name: "Backups before a restore" }), { target: { value } }),
  );

  expect(saved().restoreBackupsKept).toBeUndefined();
});

it("shows where backups are where the platform can't open folders", async () => {
  openSettings({ canOpenFolder: false });
  const section = await screen.findByRole("region", { name: "Backups" });

  expect(within(section).queryByRole("button")).toBeNull();
  expect(within(section).getByText(/^\/games\//)).toBeTruthy();
});

it("opens the licences from About", async () => {
  const { onLicences } = openSettings();
  const section = await screen.findByRole("region", { name: "About" });

  fireEvent.click(within(section).getByRole("button", { name: "View licences" }));

  expect(onLicences).toHaveBeenCalled();
});

it("says what's free and what Plus adds in a store build", async () => {
  openSettings({ sync: fakeSync(), plus: fakePlus() });
  const section = await screen.findByRole("region", { name: "About" });

  expect(within(section).getByText(/are free/)).toBeTruthy();
  expect(await within(section).findByText(/Plus adds/)).toBeTruthy();
});

it("leaves Plus out of About in an unlocked build", async () => {
  openSettings({ sync: fakeSync(), plus: fakePlus({ status: { state: "unlocked" } }) });
  const section = await screen.findByRole("region", { name: "About" });
  await act(async () => {});

  expect(within(section).getByText(/are free/)).toBeTruthy();
  expect(within(section).queryByText(/Plus/)).toBeNull();
});

it("leaves Plus out of About in a store build that hides sync", async () => {
  openSettings({ sync: fakeSync({ available: false }), plus: fakePlus({ status: { state: "unavailable" } }) });
  const section = await screen.findByRole("region", { name: "About" });
  await act(async () => {});

  expect(within(section).queryByText(/Plus/)).toBeNull();
});

it("offers an available update at the end of About", async () => {
  const update = fakeAppUpdate({ check: { available: true, versionCode: 7, downloaded: false } });
  openSettings({ update });
  const section = await screen.findByRole("region", { name: "About" });

  const button = await within(section).findByRole("button", { name: "Update" });
  expect(within(section).queryByRole("button", { name: "Restart" })).toBeNull();
  expect(within(section).getAllByRole("button").at(-1)).toBe(button);
  fireEvent.click(button);

  expect(update.host.start).toHaveBeenCalled();
});

it("offers to restart into a downloaded update in About", async () => {
  const update = fakeAppUpdate({ check: { available: true, versionCode: 7, downloaded: false } });
  openSettings({ update });
  const section = await screen.findByRole("region", { name: "About" });
  await within(section).findByRole("button", { name: "Update" });

  act(() => update.download());
  fireEvent.click(await within(section).findByRole("button", { name: "Restart" }));

  expect(within(section).queryByRole("button", { name: "Update" })).toBeNull();
  expect(update.host.complete).toHaveBeenCalled();
});

it("leaves About as it is without an update", async () => {
  openSettings();
  const section = await screen.findByRole("region", { name: "About" });
  await act(async () => {});

  expect(within(section).getAllByRole("button").map((button) => button.textContent)).toEqual(["View licences"]);
});

it("credits PKHeX, melonDS and mGBA with links to their sponsor pages in the system browser", async () => {
  openSettings();
  const section = await screen.findByRole("region", { name: "About" });

  const links = Object.fromEntries(
    within(section)
      .getAllByRole("link")
      .map((link) => [link.textContent, link]),
  );

  expect(Object.keys(links)).toEqual(["PKHeX", "melonDS", "mGBA"]);
  expect(links.PKHeX.getAttribute("href")).toBe("https://github.com/sponsors/kwsch");
  expect(links.melonDS.getAttribute("href")).toBe("https://melonds.kuribo64.net/donate.php");
  expect(links.mGBA.getAttribute("href")).toBe("https://mgba.io/donate.html");
  for (const link of Object.values(links)) expect(link.getAttribute("target")).toBe("_blank");
});

it("re-extracts the game art of every game", async () => {
  const { gameArt } = openSettings();
  const section = await screen.findByRole("region", { name: "Game art" });

  await act(async () => fireEvent.click(within(section).getByRole("button")));

  expect(gameArt.host.reextractAll).toHaveBeenCalled();
});

it("shows game art progress while extracting and nothing when idle", async () => {
  const { gameArt } = openSettings();
  const section = await screen.findByRole("region", { name: "Game art" });
  await act(async () => {});
  expect(within(section).queryByRole("progressbar")).toBeNull();

  act(() => gameArt.report({ done: 3, total: 12 }));

  expect(within(section).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("25");
  expect(section.textContent).toMatch(/3\D+12/);

  act(() => gameArt.report(null));

  expect(within(section).queryByRole("progressbar")).toBeNull();
});
