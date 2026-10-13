import { expect, it } from "vitest";
import type { Game } from "@/library/scan";
import { planImport, type ImportFile } from "./match";

const file = (name: string, more: Partial<ImportFile> = {}): ImportFile => ({ file: `/picked/${name}`, name, modified: 0, ...more });

const game = (path: string, more: Partial<Game> = {}): Game => {
  const [system, ...rest] = path.split("/");
  const name = rest[rest.length - 1].replace(/\.[^.]+$/, "");
  return { system: system as Game["system"], name, path, ...more };
};

const empty = { games: [], sha1s: {} };

it("puts each ROM in its system's folder by extension", () => {
  const plan = planImport(
    [file("Red.gb"), file("Crystal.GBC"), file("Emerald.gba"), file("HeartGold.nds"), file("Stadium.z64"), file("Snap.v64")],
    empty,
  );

  expect(plan.roms.map((rom) => rom.path)).toEqual([
    "gb/Red.gb",
    "gbc/Crystal.GBC",
    "gba/Emerald.gba",
    "nds/HeartGold.nds",
    "n64/Stadium.z64",
    "n64/Snap.v64",
  ]);
});

it("puts a zipped ROM in the folder of the ROM inside", () => {
  const plan = planImport([file("Crystal.zip", { inner: "roms/Crystal.gbc" }), file("Platinum.7z", { inner: "Platinum.nds" })], empty);

  expect(plan.roms.map((rom) => rom.path)).toEqual(["gbc/Crystal.zip", "nds/Platinum.7z"]);
});

it("ignores files that are neither ROM nor save, and archives with no ROM", () => {
  const plan = planImport(
    [file("readme.txt"), file("Crystal.rtc"), file("Emerald.state1"), file("cover.png"), file("music.zip", { inner: null })],
    empty,
  );

  expect(plan).toEqual({ roms: [], saves: [], unmatched: [], known: 0 });
});

it("matches .sav, .srm and .dsv saves to the ROMs picked with them, whatever the letter case", () => {
  const plan = planImport([file("emerald.SRM"), file("Emerald.gba"), file("PLATINUM.dsv"), file("Platinum.nds"), file("Red.sav"), file("RED.GB")], empty);

  expect(plan.saves).toEqual([
    { file: file("emerald.SRM"), game: "gba/Emerald.gba" },
    { file: file("PLATINUM.dsv"), game: "nds/Platinum.nds" },
    { file: file("Red.sav"), game: "gb/RED.GB" },
  ]);
});

it("matches a save to a zipped ROM by the archive's name or the ROM's inside it", () => {
  const crystal = file("Crystal (USA).zip", { inner: "Pokemon Crystal.gbc" });

  const byArchive = planImport([crystal, file("crystal (usa).srm")], empty);
  const byInner = planImport([crystal, file("pokemon crystal.sav")], empty);

  expect(byArchive.saves.map((save) => save.game)).toEqual(["gbc/Crystal (USA).zip"]);
  expect(byInner.saves.map((save) => save.game)).toEqual(["gbc/Crystal (USA).zip"]);
});

it("matches a save to a library game when no picked ROM has its name", () => {
  const plan = planImport([file("emerald.srm")], { games: [game("gba/Emerald.gba"), game("gba/hacks/Radical Red.gba")], sha1s: {} });

  expect(plan.saves).toEqual([{ file: file("emerald.srm"), game: "gba/Emerald.gba" }]);
});

it("matches a save to the picked ROM before a library game of the same name", () => {
  const plan = planImport([file("Red.gb"), file("Red.sav")], { games: [game("gba/hacks/Red.gba")], sha1s: {} });

  expect(plan.saves).toEqual([{ file: file("Red.sav"), game: "gb/Red.gb" }]);
});

it("doesn't match a save to a game that's only in the cloud", () => {
  const plan = planImport([file("Sapphire.sav")], { games: [game("gba/Sapphire.gba", { cloudOnly: true })], sha1s: {} });

  expect(plan.unmatched).toEqual([file("Sapphire.sav")]);
});

it("keeps the newest of several saves for one game", () => {
  const plan = planImport(
    [file("Emerald.gba"), file("Emerald.sav", { modified: 200 }), file("emerald.srm", { modified: 300 }), file("EMERALD.dsv", { modified: 100 })],
    empty,
  );

  expect(plan.saves).toEqual([{ file: file("emerald.srm", { modified: 300 }), game: "gba/Emerald.gba" }]);
});

it("lists saves that match no game", () => {
  const plan = planImport([file("Emerald.gba"), file("Ruby.sav")], empty);

  expect(plan.unmatched).toEqual([file("Ruby.sav")]);
});

it("skips a ROM whose SHA-1 is already in the library, and gives its save to the game already there", () => {
  const plan = planImport([file("Pokemon Emerald.gba", { sha1: "e1" }), file("Pokemon Emerald.sav")], {
    games: [game("gba/Emerald.gba")],
    sha1s: { "gba/Emerald.gba": "e1" },
  });

  expect(plan.roms).toEqual([]);
  expect(plan.known).toBe(1);
  expect(plan.saves).toEqual([{ file: file("Pokemon Emerald.sav"), game: "gba/Emerald.gba" }]);
});

it("copies a ROM picked twice once", () => {
  const plan = planImport([file("Emerald.gba", { sha1: "e1" }), file("Emerald (copy).gba", { sha1: "e1" })], empty);

  expect(plan.roms.map((rom) => rom.path)).toEqual(["gba/Emerald.gba"]);
});

it("gives a different ROM a free name when its name is taken", () => {
  const plan = planImport([file("Emerald.gba", { sha1: "hack" }), file("emerald.zip", { inner: "Emerald.gba", sha1: "other" })], {
    games: [game("gba/Emerald.gba"), game("gba/Emerald (2).gba", { cloudOnly: true })],
    sha1s: { "gba/Emerald.gba": "e1" },
  });

  expect(plan.roms.map((rom) => rom.path)).toEqual(["gba/Emerald (3).gba", "gba/emerald (4).zip"]);
});

it("names ROMs that Delta named by SHA-1 from their headers, and pairs each with its save and clock", () => {
  const [crystal, emerald, platinum] = ["c".repeat(40), "e".repeat(40), "f".repeat(40)];
  const plan = planImport(
    [
      file(`${crystal}.gbc`, { title: "Crystal" }),
      file(`${crystal}.sav`),
      file(`${crystal}.rtc`),
      file(`${emerald}.gba`, { title: "Emerald" }),
      file(`${emerald}.sav`),
      file(`${platinum}.nds`, { title: "Platinum" }),
      file(`${platinum}.dsv`),
    ],
    empty,
  );

  expect(plan.roms.map((rom) => rom.path)).toEqual(["gbc/Crystal.gbc", "gba/Emerald.gba", "nds/Platinum.nds"]);
  expect(plan.saves).toEqual([
    { file: file(`${crystal}.sav`), game: "gbc/Crystal.gbc", clock: file(`${crystal}.rtc`) },
    { file: file(`${emerald}.sav`), game: "gba/Emerald.gba" },
    { file: file(`${platinum}.dsv`), game: "nds/Platinum.nds" },
  ]);
});
