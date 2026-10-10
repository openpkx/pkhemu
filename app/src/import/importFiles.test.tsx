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
import { fakeImport } from "./fakeImport";
import { ImportProvider, type ExistingSave } from "./importFiles";
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

const file = (name: string, more: Partial<ImportFile> = {}): ImportFile => ({ file: `/picked/${name}`, name, modified: 0, ...more });

function renderImport(
  paths: string[],
  { picked, sha1s, saves }: { picked: ImportFile[]; sha1s?: Record<string, string>; saves?: Record<string, ExistingSave> },
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
  const host = fakeImport({ picked, sha1s, saves, onCopy: (path) => void paths.push(path) });
  render(
    <GamesFolderProvider host={gamesFolder}>
      <SyncProvider host={fakeSync({ available: false }).host}>
        <BoxArtProvider host={fakeBoxArt().host}>
          <BackProvider>
            <LibraryProvider host={library} folder="/games" onOpen={() => {}} onPlay={() => {}}>
              <ImportProvider host={host}>
                <LibraryScreen onSettings={() => {}} />
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
  expect(host.copySave).toHaveBeenCalledWith("/games", "gba/Emerald.gba", srm);
  expect(host.copyRom).toHaveBeenCalledTimes(1);
  expect(await screen.findByRole("button", { name: /Emerald/ })).toBeTruthy();
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
  expect(host.copySave).toHaveBeenCalledWith("/games", "gba/Emerald.gba", ruby);
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
  expect(host.copySave).toHaveBeenCalledWith("/games", "gba/Emerald.gba", srm);
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
  expect(host.copySave).toHaveBeenCalledWith("/games", "gba/Ruby.gba", file("Ruby.srm"));
});

it("imports from the empty library", async () => {
  const host = renderImport(["gb/.keep"], { picked: [file("Red.gb")] });

  const empty = await screen.findByTestId("empty-library");
  expect(within(empty).getByText("This app doesn't include any games.")).toBeTruthy();
  fireEvent.click(within(empty).getByRole("button", { name: "Import files" }));

  await waitFor(() => expect(host.copyRom).toHaveBeenCalledWith("/games", "/picked/Red.gb", "gb/Red.gb"));
  expect(await screen.findByRole("button", { name: /Red/ })).toBeTruthy();
});
