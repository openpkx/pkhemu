// @vitest-environment node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Engine } from "@pkhex-everywhere/engine";
import { beforeAll, expect, it } from "vitest";
import { decodeSpaces, knownLayouts, pickLayout, readSave } from "./layout";
import { data, files, findSave, gen3Text, testEngine } from "@/testing/research";

const hacks = ["Unbound", "Radical Red", "Imperium"];

function gbaRoms(path: string): Buffer[] {
  if (/\.gba$/i.test(path)) return [readFileSync(path)];
  if (!/\.zip$/i.test(path)) return [];
  const entries = execFileSync("unzip", ["-Z1", path], { encoding: "utf8" }).split("\n").filter((entry) => /\.gba$/i.test(entry));
  return entries.map((entry) => execFileSync("unzip", ["-p", path, entry], { maxBuffer: 64 << 20 }));
}

// Hacks keep their base game's header, so they're told apart by their name in the ROM.
const nameIn = (rom: Buffer, name: string) => rom.includes(Buffer.from(gen3Text(name)));

function findRom(code: string, revision: number, hack?: string) {
  return [`${data}roms`, `${data}test-folder`]
    .flatMap(files)
    .flatMap(gbaRoms)
    .find(
      (rom) =>
        rom.toString("latin1", 0xac, 0xb0) === code &&
        rom[0xbc] === revision &&
        (hack ? nameIn(rom, hack) : !hacks.some((name) => nameIn(rom, name))),
    );
}

type Trainer = { trainer: { name: string; money: number } };

let engine: Engine;
beforeAll(() => {
  engine = testEngine();
});

it.for([
  { title: "Ruby", code: "AXVE", revision: 1, format: "rs" },
  { title: "Sapphire", code: "AXPE", revision: 2, format: "rs" },
  { title: "Emerald", code: "BPEE", revision: 0, format: "emerald" },
  { title: "FireRed", code: "BPRE", revision: 1, format: "frlg" },
  { title: "Unbound", code: "BPRE", revision: 0, format: "unbound", hack: "Unbound" },
  { title: "Radical Red", code: "BPRE", revision: 0, format: "radicalred", hack: "Radical Red" },
  { title: "Imperium", code: "BPEE", revision: 0, format: "emerald-imperium", hack: "Imperium" },
])("reads the trainer name and money the engine reads from a $title save", { timeout: 300_000 }, async (game, { skip }) => {
  const { title, code, revision, format, hack } = game;
  const layouts = await knownLayouts();
  if (!layouts.some(({ target }) => target.format === format)) return skip(`the layouts copy has no ${format} layout yet`);
  const rom = findRom(code, revision, hack);
  if (!rom) return skip(`needs a ${title} ROM (${code} revision ${revision}) in data/roms/ or data/test-folder/`);
  const found = await findSave(engine, format);
  if (!found) return skip(`needs a ${title} save in data/saves/`);

  const picked = pickLayout(layouts, { format, romSha1: createHash("sha1").update(rom).digest("hex") });
  expect(picked, `${title}: no layout lists its ROM`).toMatchObject({ checked: true, layout: { target: { format } } });

  const spaces = await decodeSpaces(found.save, picked!.layout);
  expect(spaces.find(({ name }) => name === "section:1")?.ranges).toContainEqual(expect.objectContaining({ id: "money" }));
  const { trainer } = (await readSave(found.save, picked!.layout)) as unknown as Trainer;
  const card = await engine.trainer.get();
  expect(trainer.name, found.path).toBe(card.name);
  expect(trainer.money, found.path).toBe(card.money);
});
