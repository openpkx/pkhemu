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

it("puts 3DS games in the 3ds folder, a CIA as a .cxi", () => {
  const files = [file("X.3ds"), file("Y.CIA"), file("ORAS.cci"), file("Sun.cxi"), file("Moon.app"), file("PKSM.3dsx")];

  const plan = planImport(files, empty);

  expect(plan.roms.map((rom) => rom.path)).toEqual(["3ds/X.3ds", "3ds/Y.cxi", "3ds/ORAS.cci", "3ds/Sun.cxi", "3ds/Moon.app", "3ds/PKSM.3dsx"]);
});

it("puts GameCube discs in the gc folder, zipped ones too", () => {
  const files = [file("Colosseum.iso"), file("XD.GCM"), file("Box.rvz"), file("Channel.ciso"), file("Battle.gcz"), file("Zipped.zip", { inner: "XD.rvz" })];

  expect(planImport(files, empty).roms.map((rom) => rom.path)).toEqual([
    "gc/Colosseum.iso",
    "gc/XD.GCM",
    "gc/Box.rvz",
    "gc/Channel.ciso",
    "gc/Battle.gcz",
    "gc/Zipped.zip",
  ]);
});

it("matches an Azahar save to its 3DS game by title ID, in the import or the library", () => {
  const [x, y] = ["0004000000055d00", "0004000000055e00"];
  const main = (folder: string, titleId: string | null) => file("main", { file: `/picked/${folder}/main`, folder, titleId });
  const library = { games: [game("3ds/My X.3ds"), game("3ds/main.3ds")], sha1s: {}, titleIds: { "3ds/My X.3ds": x } };

  const plan = planImport([file("Y.3ds", { titleId: y }), main("x", x), main("y", y), main("too big", null), main("usum", "00040000001b5100")], library);

  expect(plan.saves.map((save) => [save.file.folder, save.game])).toEqual([
    ["x", "3ds/My X.3ds"],
    ["y", "3ds/Y.3ds"],
  ]);
  expect(plan.unmatched.map((save) => save.folder)).toEqual(["too big", "usum"]);
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

  expect(plan).toEqual({ roms: [], saves: [], unmatched: [], patches: [], morePatches: false, known: 0 });
});

it("recognises a patch by its magic bytes, whatever its name", () => {
  const bps = file("Unbound.bps", { patch: "bps" });
  const named = file("hack.patch", { patch: "ips" });

  const plan = planImport([bps, file("Unbound.txt"), named, file("Emerald.gba")], empty);

  expect(plan.patches).toEqual([bps]);
  expect(plan.morePatches).toBe(true);
  expect(plan.roms.map((rom) => rom.path)).toEqual(["gba/Emerald.gba"]);
});

it("offers every patch in the first zip that has one, and only those", () => {
  const zipped = ["Unbound.bps", "Speedchoice.bps"].map((name) => file(name, { patch: "bps", archive: "Unbound.zip" }));
  const other = file("Glazed.ips", { patch: "ips", archive: "Glazed.zip" });

  const alone = planImport([file("Unbound.zip"), ...zipped], empty);
  const withOther = planImport([file("Unbound.zip"), ...zipped, file("Glazed.zip"), other], empty);

  expect(alone).toMatchObject({ patches: zipped, morePatches: false });
  expect(withOther).toMatchObject({ patches: zipped, morePatches: true });
});

it("matches .sav, .srm and .dsv saves to the ROMs picked with them, whatever the letter case", () => {
  const plan = planImport([file("emerald.SRM"), file("Emerald.gba"), file("PLATINUM.dsv"), file("Platinum.nds"), file("Red.sav"), file("RED.GB")], empty);

  expect(plan.saves).toEqual([
    { file: file("emerald.SRM"), game: "gba/Emerald.gba" },
    { file: file("PLATINUM.dsv"), game: "nds/Platinum.nds" },
    { file: file("Red.sav"), game: "gb/RED.GB" },
  ]);
});

it("matches a save and clock named after the whole ROM file, as Manic EMU named them before 1.5.3", () => {
  const plan = planImport([file("Crystal.gbc"), file("Crystal.gb.sav"), file("Crystal.gb.rtc"), file("Emerald.gba"), file("emerald.GBA.srm")], empty);

  expect(plan.saves).toEqual([
    { file: file("Crystal.gb.sav"), game: "gbc/Crystal.gbc", clock: file("Crystal.gb.rtc") },
    { file: file("emerald.GBA.srm"), game: "gba/Emerald.gba" },
  ]);
});

it("takes Provenance's .sav2 as a save", () => {
  const plan = planImport([file("Emerald.gba"), file("Emerald.sav2")], empty);

  expect(plan.saves).toEqual([{ file: file("Emerald.sav2"), game: "gba/Emerald.gba" }]);
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

it("pairs each save with the clock in its own folder", () => {
  const files = (gambatte: number, mgba: number) => [
    file("Crystal.gbc", { folder: "/roms" }),
    file("Crystal.srm", { folder: "/saves/Gambatte", modified: gambatte }),
    file("Crystal.rtc", { folder: "/saves/Gambatte" }),
    file("Crystal.srm", { folder: "/saves/mGBA", modified: mgba }),
  ];

  expect(planImport(files(2, 1), empty).saves).toEqual([
    {
      file: file("Crystal.srm", { folder: "/saves/Gambatte", modified: 2 }),
      game: "gbc/Crystal.gbc",
      clock: file("Crystal.rtc", { folder: "/saves/Gambatte" }),
    },
  ]);
  expect(planImport(files(1, 2), empty).saves).toEqual([
    { file: file("Crystal.srm", { folder: "/saves/mGBA", modified: 2 }), game: "gbc/Crystal.gbc" },
  ]);
});
