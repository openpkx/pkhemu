import { expect, it } from "vitest";
import { addSaves, folderImportToast, megabytes, summarize } from "./folder";
import { planImport, type ImportFile } from "./match";

const file = (path: string, more: Partial<ImportFile> = {}): ImportFile => ({
  file: `/RetroArch/${path}`,
  name: path.slice(path.lastIndexOf("/") + 1),
  modified: 0,
  size: 0,
  ...more,
});
const empty = { games: [], sha1s: {} };

it("counts the games, the ones with a save and the size to copy", () => {
  const files = [
    file("roms/Emerald.gba", { size: 16_000_000 }),
    file("roms/Crystal.gbc", { size: 2_000_000 }),
    file("roms/Platinum.nds", { size: 128_000_000 }),
    file("saves/Emerald.srm", { size: 128_000 }),
    file("saves/Emerald (old).srm", { size: 128_000 }),
  ];

  const summary = summarize(planImport(files, empty), { files, other: 3 });

  expect(summary.games).toEqual([
    { path: "gbc/Crystal.gbc", name: "Crystal", system: "gbc", save: false },
    { path: "gba/Emerald.gba", name: "Emerald", system: "gba", save: true },
    { path: "nds/Platinum.nds", name: "Platinum", system: "nds", save: false },
  ]);
  expect(summary.withSave).toBe(1);
  expect(summary.size).toBe(146_128_000);
  expect(summary.leftOut).toBe(4);
  expect(summary.known).toBe(0);
});

it("fills in missing saves from another folder and counts only the saves it takes", () => {
  const roms = { files: [file("roms/Emerald.gba"), file("roms/Crystal.gbc")], other: 1 };
  const saves = { files: [file("saves/Crystal.srm"), file("saves/Tetris.srm"), file("saves/Pinball.gba")], other: 2 };

  const found = addSaves(roms, saves);
  const summary = summarize(planImport(found.files, empty), found);

  expect(summary.games.map((game) => [game.name, game.save])).toEqual([
    ["Crystal", true],
    ["Emerald", false],
  ]);
  expect(summary.leftOut).toBe(1 + 2 + 1 + 1);
});

it("counts a clock that goes with a save as copied", () => {
  const files = [file("Games/Crystal.gbc"), file("Games/Crystal.sav"), file("Games/Crystal.rtc", { size: 4 }), file("Games/Red.rtc")];

  const summary = summarize(planImport(files, empty), { files, other: 0 });

  expect(summary.leftOut).toBe(1);
  expect(summary.size).toBe(4);
});

it("takes clocks along with the saves from another folder", () => {
  const found = addSaves({ files: [file("roms/Crystal.gbc")], other: 0 }, { files: [file("saves/Crystal.sav"), file("saves/Crystal.rtc")], other: 0 });

  expect(planImport(found.files, empty).saves).toEqual([{ file: file("saves/Crystal.sav"), game: "gbc/Crystal.gbc", clock: file("saves/Crystal.rtc") }]);
});

it("says what it copied, and how many of all when some didn't make it", () => {
  expect(folderImportToast({ games: 6, roms: 6, saves: 4, found: false, failed: [] })).toBe("Copied 6 games and 4 saves");
  expect(folderImportToast({ games: 1, roms: 1, saves: 0, found: false, failed: [] })).toBe("Copied 1 game");
  expect(folderImportToast({ games: 0, roms: 0, saves: 1, found: false, failed: [] })).toBe("Copied 1 save");
  expect(folderImportToast({ games: 6, roms: 3, saves: 0, found: false, failed: [] })).toBe("Copied 3 of 6 games");
  expect(folderImportToast({ games: 6, roms: 5, saves: 2, found: false, failed: ["Emerald.gba: disk full"] })).toBe(
    "Copied 5 of 6 games and 2 saves. Emerald.gba: disk full",
  );
  expect(folderImportToast({ games: 2, roms: 0, saves: 0, found: false, failed: ["a", "b"] })).toBe("Copied 0 of 2 games. Couldn't copy 2 files");
  expect(folderImportToast({ games: 0, roms: 0, saves: 0, found: true, failed: [] })).toBe("Already in pkhemu");
  expect(folderImportToast({ games: 0, roms: 0, saves: 0, found: false, failed: ["a"] })).toBe("a");
});

it("writes sizes in megabytes", () => {
  expect(megabytes(146_128_000)).toBe("139 MB");
  expect(megabytes(2_500_000)).toBe("2.4 MB");
  expect(megabytes(0)).toBe("0 MB");
});
