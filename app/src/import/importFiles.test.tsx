import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackProvider } from "@/back/back";
import { BoxArtProvider } from "@/box-art/boxArt";
import { fakeBoxArt } from "@/box-art/fakeBoxArt";
import { GamesFolderProvider, type GamesFolderHost } from "@/games-folder/gamesFolder";
import { fakeFolder } from "@/library/fakeFolder";
import { LibraryProvider, type LibraryHost } from "@/library/library";
import { LibraryScreen } from "@/library/LibraryScreen";
import { fakeSync } from "@/sync/fakeSync";
import { SyncProvider } from "@/sync/sync";
import { systems } from "@/systems";
import { fakeImport } from "./fakeImport";
import { PatchRomProvider, type PatchRomHost } from "@/patch-rom/patchRom";
import type { PatchedFrom } from "@/preferences/gameSettings";
import { ImportProvider, importSummary, type ExistingSave } from "./importFiles";
import type { ImportFile } from "./match";

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
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

let patchHost: PatchRomHost;

function fakePatchRom(): PatchRomHost {
  const patchedFrom = new Map<string, PatchedFrom>();
  return {
    baseBuild: vi.fn(async () => "FireRed EN 1.0"),
    pick: vi.fn(async () => null),
    bases: vi.fn(async (_folder: string, _patch: string, games: string[]) => ({ checked: true, games: games.filter((path) => path.includes("FireRed")) })),
    dropped: vi.fn(async () => Promise.reject(new Error("no drops"))),
    checkName: vi.fn(async () => {}),
    create: vi.fn(async (_folder: string, _path: string, system: string, name: string) => ({ path: `${system}/${name}.${system}`, sha256: "c0ffee", baseChecked: true })),
    patchedFrom: vi.fn(async (path: string) => patchedFrom.get(path) ?? null),
    keepPatchedFrom: vi.fn(async (path: string, from: PatchedFrom) => void patchedFrom.set(path, from)),
  };
}

const file = (name: string, more: Partial<ImportFile> = {}): ImportFile => ({ file: `/picked/${name}`, name, modified: 0, ...more });

function renderImport(
  paths: string[],
  {
    picked = [],
    opened,
    sha1s,
    saves,
    boxArt = fakeBoxArt(),
  }: {
    picked?: ImportFile[];
    opened?: ImportFile[];
    sha1s?: Record<string, string>;
    saves?: Record<string, ExistingSave>;
    boxArt?: ReturnType<typeof fakeBoxArt>;
  },
) {
  const list = fakeFolder(paths);
  const library: LibraryHost = {
    listDir: (_folder, path) => list(path),
    recentlyPlayed: async () => [],
    scanGameArt: async () => {},
    resumeScreenshot: async () => null,
    hasResumeState: async () => false,
    playHistory: async () => ({ lastPlayed: null, playTime: 0 }),
  };
  const host = fakeImport({ picked, opened, sha1s, saves, onCopy: (path) => void paths.push(path) });
  patchHost = fakePatchRom();
  render(
    <GamesFolderProvider host={gamesFolder}>
      <SyncProvider host={fakeSync({ available: false }).host}>
        <BoxArtProvider host={boxArt.host}>
          <BackProvider>
            <LibraryProvider host={library} folder="/games" onOpen={() => {}} onPlay={() => {}}>
              <ImportProvider host={host}>
                <PatchRomProvider host={patchHost}>
                  <LibraryScreen systems={systems} onSettings={() => {}} />
                </PatchRomProvider>
              </ImportProvider>
            </LibraryProvider>
          </BackProvider>
        </BoxArtProvider>
      </SyncProvider>
    </GamesFolderProvider>,
  );
  return host;
}

async function importFiles() {
  await screen.findAllByRole("region");
  const trigger = screen.getByRole("button", { name: "Import" });
  act(() => {
    fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" });
  });
  fireEvent.click(await screen.findByRole("menuitem", { name: "Import files" }));
}

const toast = () => screen.findByRole("status");

it("adds a ROM and its save together", async () => {
  const srm = file("emerald.srm");
  const host = renderImport(["gb/Red.gb"], { picked: [file("Emerald.gba"), srm, file("notes.txt")] });

  await importFiles();

  expect((await toast()).textContent).toBe("Added 1 game and 1 save");
  expect(host.copyRom).toHaveBeenCalledWith("/games", "/picked/Emerald.gba", "gba/Emerald.gba");
  expect(host.copySave).toHaveBeenCalledWith("/games", { file: srm, game: "gba/Emerald.gba" });
  expect(host.copyRom).toHaveBeenCalledTimes(1);
  expect(await screen.findByRole("button", { name: /Emerald/ })).toBeTruthy();
});

it("names a picked file it couldn't read", async () => {
  const unreadable = file("Mario.zip", { error: "Mario.zip: invalid Zip archive" });
  const host = renderImport(["gb/Red.gb"], { picked: [unreadable, file("Emerald.gba")] });

  await importFiles();

  expect((await toast()).textContent).toBe("Added 1 game. Couldn't read Mario.zip");
  expect(host.copyRom).toHaveBeenCalledTimes(1);
});

it("says it couldn't read the only file picked instead of adding nothing", async () => {
  renderImport(["gb/Red.gb"], { picked: [file("Mario.zip", { error: "Mario.zip: invalid Zip archive" })] });

  await importFiles();

  expect((await toast()).textContent).toBe("Couldn't read Mario.zip");
});

it("imports the files another app opened pkhemu with", async () => {
  const host = renderImport(["gb/Red.gb"], { opened: [file("Emerald.gba"), file("Emerald.srm")] });

  expect((await toast()).textContent).toBe("Added 1 game and 1 save");
  expect(host.copyRom).toHaveBeenCalledWith("/games", "/picked/Emerald.gba", "gba/Emerald.gba");
  expect(host.pick).not.toHaveBeenCalled();
});

it("imports files opened while pkhemu is running", async () => {
  const host = renderImport(["gb/Red.gb"], {});
  await screen.findAllByRole("region");

  act(() => host.open([file("Emerald.gba")]));

  expect((await toast()).textContent).toBe("Added 1 game");
  expect(host.copyRom).toHaveBeenCalledWith("/games", "/picked/Emerald.gba", "gba/Emerald.gba");
});

it("opens the Patch ROM dialog for an opened patch, with the base it fits picked", async () => {
  const host = renderImport(["gb/Red.gb", "gba/FireRed.gba"], { opened: [file("Unbound.bps", { patch: "bps" })] });

  const dialog = await screen.findByRole("dialog", { name: "Patch ROM" });
  await waitFor(() => expect(within(dialog).getByRole("combobox", { name: "Base ROM" }).textContent).toBe("FireRed"));
  fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

  expect((await toast()).textContent).toBe("Created Unbound · Add box art");
  expect(patchHost.create).toHaveBeenCalledWith("/games", "gba/FireRed.gba", "gba", "Unbound", "/picked/Unbound.bps");
  expect(host.copyRom).not.toHaveBeenCalled();
});

it("offers box art for a ROM hack made from an opened patch, starting on its base game's art", async () => {
  const png = new Uint8Array([137, 80, 78, 71]);
  const boxArt = fakeBoxArt({ "Nintendo - Game Boy Advance/Named_Boxarts/Pokemon - FireRed Version (USA, Europe).png": png });
  renderImport(["gba/FireRed.gba"], { opened: [file("Unbound.bps", { patch: "bps" })], boxArt });

  const dialog = await screen.findByRole("dialog", { name: "Patch ROM" });
  await waitFor(() => expect(within(dialog).getByRole("combobox", { name: "Base ROM" }).textContent).toBe("FireRed"));
  fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));
  fireEvent.click(await within(await toast()).findByRole("button", { name: "Add box art" }));

  const sheet = await screen.findByRole("dialog", { name: "Box art" });
  expect(within(sheet).getByRole<HTMLInputElement>("searchbox").value).toBe("FireRed");
  const selected = await within(sheet).findByRole("button", { current: true });
  expect(selected.getAttribute("aria-label")).toBe("Pokemon - FireRed Version (USA, Europe)");
});

it("says nothing when the player closes the dialog for an opened patch", async () => {
  renderImport(["gba/FireRed.gba"], { opened: [file("Unbound.bps", { patch: "bps" })] });

  const dialog = await screen.findByRole("dialog", { name: "Patch ROM" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.queryByRole("status")?.textContent ?? "").toBe("");
});

const nameField = (dialog: HTMLElement) => within(dialog).getByRole<HTMLInputElement>("textbox", { name: "Name" });

it("opens the patch found in an opened zip", async () => {
  const zip = file("Unbound.zip", { inner: null });
  const patch = file("Unbound v2.ips", { file: "/unzipped/1", patch: "ips", archive: "Unbound.zip" });
  renderImport(["gba/FireRed.gba"], { opened: [zip, patch] });

  const dialog = await screen.findByRole("dialog", { name: "Patch ROM" });
  await waitFor(() => expect(nameField(dialog).value).toBe("Unbound v2"));
  expect(within(dialog).getByText("Unbound v2.ips")).toBeTruthy();
  expect(patchHost.bases).toHaveBeenCalledWith("/games", "/unzipped/1", ["gba/FireRed.gba"]);
});

it("names the game after the zip when the patch inside has a generic name", async () => {
  const patch = file("PATCH.bps", { file: "/unzipped/1", patch: "bps", archive: "Pokemon Unbound 2.1.zip" });
  renderImport(["gba/FireRed.gba"], { opened: [file("Pokemon Unbound 2.1.zip"), patch] });

  const dialog = await screen.findByRole("dialog", { name: "Patch ROM" });
  await waitFor(() => expect(nameField(dialog).value).toBe("Pokemon Unbound 2.1"));
});

it("asks which patch to open when a zip holds several", async () => {
  const patches = [
    file("Unbound.bps", { file: "/unzipped/1", patch: "bps", archive: "Unbound.zip" }),
    file("Unbound (Speedchoice).bps", { file: "/unzipped/2", patch: "bps", archive: "Unbound.zip" }),
  ];
  renderImport(["gba/FireRed.gba"], { opened: [file("Unbound.zip"), ...patches] });

  const which = await screen.findByRole("dialog", { name: "Which patch?" });
  expect(screen.queryByRole("dialog", { name: "Patch ROM" })).toBeNull();
  fireEvent.click(within(which).getByRole("combobox", { name: "Patch" }));
  const options = within(await screen.findByRole("listbox")).getAllByRole("option");
  expect(options.map((option) => option.textContent)).toEqual(["Unbound.bps", "Unbound (Speedchoice).bps"]);
  fireEvent.click(options[1]);
  fireEvent.click(within(which).getByRole("button", { name: "Open" }));

  const dialog = await screen.findByRole("dialog", { name: "Patch ROM" });
  await waitFor(() => expect(nameField(dialog).value).toBe("Unbound (Speedchoice)"));
  expect(patchHost.bases).toHaveBeenCalledWith("/games", "/unzipped/2", ["gba/FireRed.gba"]);
});

it("says nothing when the player skips choosing a patch from a zip", async () => {
  const patches = ["1", "2"].map((n) => file(`Hack ${n}.ips`, { file: `/unzipped/${n}`, patch: "ips", archive: "Hacks.zip" }));
  renderImport(["gba/FireRed.gba"], { opened: [file("Hacks.zip"), ...patches] });

  const which = await screen.findByRole("dialog", { name: "Which patch?" });
  fireEvent.click(within(which).getByRole("button", { name: "Cancel" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(patchHost.bases).not.toHaveBeenCalled();
  expect(screen.queryByRole("status")?.textContent ?? "").toBe("");
});

it("imports a ROM shared with a patch first and offers it as the base", async () => {
  const host = renderImport(["gb/Red.gb"], { opened: [file("Unbound.bps", { patch: "bps" }), file("FireRed.gba")] });

  const dialog = await screen.findByRole("dialog", { name: "Patch ROM" });
  expect(host.copyRom).toHaveBeenCalledWith("/games", "/picked/FireRed.gba", "gba/FireRed.gba");
  await waitFor(() => expect(within(dialog).getByRole("combobox", { name: "Base ROM" }).textContent).toBe("FireRed"));
  fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

  expect((await toast()).textContent).toBe("Added 1 game. Created Unbound · Add box art");
  expect(patchHost.create).toHaveBeenCalledWith("/games", "gba/FireRed.gba", "gba", "Unbound", "/picked/Unbound.bps");
});

it("adds the game an opened patch needs and continues with it as the base", async () => {
  const host = renderImport(["gb/Red.gb"], { opened: [file("Unbound.bps", { patch: "bps" })], picked: [file("FireRed.gba")] });

  const dialog = await screen.findByRole("dialog", { name: "Patch ROM" });
  fireEvent.click(await within(dialog).findByRole("button", { name: "Add game" }));

  await waitFor(() => expect(within(dialog).getByRole("combobox", { name: "Base ROM" }).textContent).toBe("FireRed"));
  expect(host.copyRom).toHaveBeenCalledWith("/games", "/picked/FireRed.gba", "gba/FireRed.gba");
  fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

  expect((await toast()).textContent).toBe("Added 1 game. Created Unbound · Add box art");
  expect(patchHost.create).toHaveBeenCalledWith("/games", "gba/FireRed.gba", "gba", "Unbound", "/picked/Unbound.bps");
});

it("opens the first of several patches and says to open one at a time", async () => {
  renderImport(["gba/FireRed.gba"], { opened: [file("Unbound.bps", { patch: "bps" }), file("Glazed.ips", { patch: "ips" })] });

  const dialog = await screen.findByRole("dialog", { name: "Patch ROM" });
  await waitFor(() => expect(nameField(dialog).value).toBe("Unbound"));
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

  expect((await toast()).textContent).toBe("Open one patch at a time");
  expect(patchHost.bases).toHaveBeenCalledTimes(1);
});

it("skips a ROM already in pkhemu", async () => {
  const host = renderImport(["gba/Emerald.gba"], {
    picked: [file("Pokemon Emerald.gba", { sha1: "e1" })],
    sha1s: { "gba/Emerald.gba": "e1" },
  });

  await importFiles();

  expect((await toast()).textContent).toBe("Already in pkhemu");
  expect(host.copyRom).not.toHaveBeenCalled();
});

it("asks which game a save with no match is for, and uses the one picked", async () => {
  const ruby = file("Ruby.sav");
  const host = renderImport(["gb/Red.gb", "gba/Emerald.gba"], { picked: [ruby] });

  await importFiles();

  const dialog = await screen.findByRole("dialog", { name: "Which game is this save for?" });
  expect(within(dialog).getByText("Ruby.sav doesn't match a game by name.")).toBeTruthy();
  expect((within(dialog).getByRole("button", { name: "Use for this game" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(within(dialog).getByRole("combobox"));
  const list = await screen.findByRole("listbox");
  expect(within(list).getAllByRole("option").map((option) => option.textContent)).toEqual(["Emerald", "Red"]);
  fireEvent.click(within(list).getByRole("option", { name: "Emerald" }));
  fireEvent.click(await within(dialog).findByRole("button", { name: "Use for Emerald" }));

  expect((await toast()).textContent).toBe("Added 1 save");
  expect(host.copySave).toHaveBeenCalledWith("/games", { file: ruby, game: "gba/Emerald.gba" });
});

it("leaves out a save the player skips", async () => {
  const host = renderImport(["gba/Emerald.gba"], { picked: [file("Ruby.sav")] });

  await importFiles();
  fireEvent.click(await screen.findByRole("button", { name: "Skip this save" }));

  expect((await toast()).textContent).toBe("Nothing added");
  expect(host.copySave).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("asks before replacing a save, then replaces it", async () => {
  const existing = new Date(2026, 9, 1, 9, 30).getTime();
  const picked = new Date(2026, 9, 10, 18, 5).getTime();
  const srm = file("Emerald.srm", { modified: picked });
  const host = renderImport(["gba/Emerald.gba"], { picked: [srm], saves: { "gba/Emerald.gba": { modified: existing, same: false } } });

  await importFiles();

  const dialog = await screen.findByRole("alertdialog", { name: "Replace Emerald's save?" });
  expect(within(dialog).getByText("pkhemu's save goes to Backups first.")).toBeTruthy();
  expect(host.copySave).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Replace" }));

  expect((await toast()).textContent).toBe("Added 1 save");
  expect(host.copySave).toHaveBeenCalledWith("/games", { file: srm, game: "gba/Emerald.gba" });
});

it("keeps pkhemu's save when the player says so", async () => {
  const host = renderImport(["gba/Emerald.gba"], {
    picked: [file("Emerald.srm")],
    saves: { "gba/Emerald.gba": { modified: 0, same: false } },
  });

  await importFiles();
  fireEvent.click(await screen.findByRole("button", { name: "Keep pkhemu's" }));

  expect((await toast()).textContent).toBe("Nothing added");
  expect(host.copySave).not.toHaveBeenCalled();
});

it("doesn't ask about a save pkhemu already has", async () => {
  const host = renderImport(["gba/Emerald.gba"], { picked: [file("Emerald.srm")], saves: { "gba/Emerald.gba": { modified: 0, same: true } } });

  await importFiles();

  expect((await toast()).textContent).toBe("Already in pkhemu");
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(host.copySave).not.toHaveBeenCalled();
});

it("goes on past a file it can't import and says which", async () => {
  const host = renderImport(["gba/Emerald.gba", "gba/Ruby.gba"], { picked: [file("Emerald.srm"), file("Ruby.srm")] });
  vi.mocked(host.existingSave).mockImplementation(async (_folder, rom) => {
    if (rom === "gba/Emerald.gba") throw "Emerald.srm is a compressed RetroArch save, which pkhemu can't read";
    return null;
  });

  await importFiles();

  expect((await toast()).textContent).toBe("Added 1 save. Emerald.srm is a compressed RetroArch save, which pkhemu can't read");
  expect(host.copySave).toHaveBeenCalledTimes(1);
  expect(host.copySave).toHaveBeenCalledWith("/games", { file: file("Ruby.srm"), game: "gba/Ruby.gba" });
});

it("imports from the empty library", async () => {
  const host = renderImport(["gb/.keep"], { picked: [file("Red.gb")] });

  const empty = await screen.findByTestId("empty-library");
  fireEvent.click(within(empty).getByRole("button", { name: "Import files" }));

  await waitFor(() => expect(host.copyRom).toHaveBeenCalledWith("/games", "/picked/Red.gb", "gb/Red.gb"));
  expect(await screen.findByRole("button", { name: /Red/ })).toBeTruthy();
});

it("names the game an update went to", () => {
  expect(importSummary(0, 0, false, [], undefined, false, ["3ds/Pokemon X (Europe).3ds"])).toBe("Updated Pokemon X");
  expect(importSummary(1, 0, false, [], undefined, false, ["3ds/X.3ds", "3ds/X (2).3ds"])).toBe("Added 1 game. Updated 2 games");
});
