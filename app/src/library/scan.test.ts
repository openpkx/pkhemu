import { expect, it } from "vitest";
import { fakeFolder } from "./fakeFolder";
import { scanLibrary, withCloudGames } from "./scan";

it("finds games in each system folder, named from the filename", async () => {
  const listDir = fakeFolder([
    "gb/Red.gb",
    "gbc/Crystal.gbc",
    "gba/Emerald.gba",
    "gba/FireRed.zip",
  ]);

  const library = await scanLibrary(listDir);

  expect(library.sections).toEqual([
    { system: "gb", games: [{ system: "gb", name: "Red", path: "gb/Red.gb" }] },
    { system: "gbc", games: [{ system: "gbc", name: "Crystal", path: "gbc/Crystal.gbc" }] },
    {
      system: "gba",
      games: [
        { system: "gba", name: "Emerald", path: "gba/Emerald.gba" },
        { system: "gba", name: "FireRed", path: "gba/FireRed.zip" },
      ],
    },
  ]);
});

it("finds DS games, plain and zipped, in the nds folder", async () => {
  const listDir = fakeFolder(["nds/HeartGold.nds", "nds/Platinum.zip", "nds/HeartGold.sav"]);

  const library = await scanLibrary(listDir);

  expect(library.sections).toEqual([
    {
      system: "nds",
      games: [
        { system: "nds", name: "HeartGold", path: "nds/HeartGold.nds" },
        { system: "nds", name: "Platinum", path: "nds/Platinum.zip" },
      ],
    },
  ]);
});

it("finds N64 games in every byte order, plain and zipped, in the n64 folder", async () => {
  const listDir = fakeFolder(["n64/Stadium.z64", "n64/Stadium 2.zip", "n64/Snap.N64", "n64/Puzzle League.v64", "n64/Stadium.fla"]);

  const library = await scanLibrary(listDir);

  expect(library.sections).toEqual([
    {
      system: "n64",
      games: [
        { system: "n64", name: "Puzzle League", path: "n64/Puzzle League.v64" },
        { system: "n64", name: "Snap", path: "n64/Snap.N64" },
        { system: "n64", name: "Stadium", path: "n64/Stadium.z64" },
        { system: "n64", name: "Stadium 2", path: "n64/Stadium 2.zip" },
      ],
    },
  ]);
});

it("finds games in 7z archives", async () => {
  const listDir = fakeFolder(["gba/Emerald.7z", "nds/Platinum.7Z"]);

  const library = await scanLibrary(listDir);

  expect(library.sections).toEqual([
    { system: "gba", games: [{ system: "gba", name: "Emerald", path: "gba/Emerald.7z" }] },
    { system: "nds", games: [{ system: "nds", name: "Platinum", path: "nds/Platinum.7Z" }] },
  ]);
});

it("skips files that aren't games", async () => {
  const listDir = fakeFolder([
    "gba/Emerald.gba",
    "gba/Emerald.sav",
    "gba/readme.txt",
    "gba/._Emerald.gba",
  ]);

  const library = await scanLibrary(listDir);

  expect(library.sections.flatMap((s) => s.games.map((g) => g.name))).toEqual(["Emerald"]);
});

it("matches extensions in any case", async () => {
  const listDir = fakeFolder(["gba/EMERALD.GBA"]);

  const library = await scanLibrary(listDir);

  expect(library.sections[0].games[0].name).toBe("EMERALD");
});

it("skips a game's data folder", async () => {
  const listDir = fakeFolder([
    "gba/Emerald.gba",
    "gba/Emerald/states/resume.state",
    "gba/FireRed.zip",
    "gba/FireRed/backups/",
  ]);

  const library = await scanLibrary(listDir);

  expect(library.sections).toEqual([
    {
      system: "gba",
      games: [
        { system: "gba", name: "Emerald", path: "gba/Emerald.gba" },
        { system: "gba", name: "FireRed", path: "gba/FireRed.zip" },
      ],
    },
  ]);
});

it("skips a data folder named in a different case", async () => {
  const listDir = fakeFolder(["gba/Emerald.gba", "gba/emerald/Backup.gba"]);

  const library = await scanLibrary(listDir);

  expect(library.sections.map((s) => s.folder)).toEqual([undefined]);
});

it("shows other subfolders as their own sections, one level deep", async () => {
  const listDir = fakeFolder([
    "gba/Emerald.gba",
    "gba/hacks/Radical Red.gba",
    "gba/hacks/Radical Red/states/",
    "gba/hacks/old/Glazed.gba",
  ]);

  const library = await scanLibrary(listDir);

  expect(library.sections).toEqual([
    { system: "gba", games: [{ system: "gba", name: "Emerald", path: "gba/Emerald.gba" }] },
    {
      system: "gba",
      folder: "hacks",
      games: [{ system: "gba", name: "Radical Red", path: "gba/hacks/Radical Red.gba" }],
    },
  ]);
});

it("leaves out empty sections", async () => {
  const listDir = fakeFolder(["gb/", "gbc/misc/", "gba/hacks/notes.txt"]);

  const library = await scanLibrary(listDir);

  expect(library.sections).toEqual([]);
});

it("counts games outside a system folder without listing them", async () => {
  const listDir = fakeFolder([
    "Emerald.gba",
    "Red.gb",
    "Crystal.zip",
    "notes.txt",
    "snes/Earthbound.sfc",
  ]);

  const library = await scanLibrary(listDir);

  expect(library).toEqual({ sections: [], outsideSystemFolders: 3 });
});

it("treats a missing system folder as empty", async () => {
  const listDir = fakeFolder(["gba/Emerald.gba"]);

  const library = await scanLibrary(listDir);

  expect(library.sections.map((s) => s.system)).toEqual(["gba"]);
});

it("sorts games by name, numbers in order", async () => {
  const listDir = fakeFolder(["gb/b 10.gb", "gb/b 2.gb", "gb/A.gb"]);

  const library = await scanLibrary(listDir);

  expect(library.sections[0].games.map((g) => g.name)).toEqual(["A", "b 2", "b 10"]);
});

it("adds cloud-only games to the sections a scan would put them in", async () => {
  const library = await scanLibrary(fakeFolder(["gba/Emerald.gba", "gba/Hacks/Radical Red.gba"]));

  const merged = withCloudGames(library, ["gba/Emerald.gba", "gba/Crystal Dust.gba", "nds/Hacks/Renegade.nds", "gb/Red.gb", "Loose.gba"]);

  expect(merged.sections).toEqual([
    { system: "gb", games: [{ system: "gb", name: "Red", path: "gb/Red.gb", cloudOnly: true }] },
    {
      system: "gba",
      games: [
        { system: "gba", name: "Crystal Dust", path: "gba/Crystal Dust.gba", cloudOnly: true },
        { system: "gba", name: "Emerald", path: "gba/Emerald.gba" },
      ],
    },
    { system: "gba", folder: "Hacks", games: [{ system: "gba", name: "Radical Red", path: "gba/Hacks/Radical Red.gba" }] },
    {
      system: "nds",
      folder: "Hacks",
      games: [{ system: "nds", name: "Renegade", path: "nds/Hacks/Renegade.nds", cloudOnly: true }],
    },
  ]);
});
