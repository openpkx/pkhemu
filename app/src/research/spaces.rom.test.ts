// @vitest-environment node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Engine } from "@pkhex-everywhere/engine";
import { beforeAll, expect, it } from "vitest";
import { knownLayouts, pickLayout } from "./layout";
import { decodeSpaces, type DecodedSpace } from "./spaces";
import { data, files, findSave, gen3Text, readGen3Text, testEngine } from "@/testing/research";

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

const range = (space: DecodedSpace, name: string) => space.ranges.find((range) => range.name === name);
const readU32 = (bytes: Uint8Array, offset: number) => new DataView(bytes.buffer, bytes.byteOffset).getUint32(offset, true);

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
])("decodes the trainer name and money the engine reads from a $title save", { timeout: 300_000 }, async (game, { skip }) => {
  const { title, code, revision, format, hack } = game;
  const rom = findRom(code, revision, hack);
  if (!rom) return skip(`needs a ${title} ROM (${code} revision ${revision}) in data/roms/ or data/test-folder/`);
  const found = await findSave(engine, format);
  if (!found) return skip(`needs a ${title} save in data/saves/`);

  const picked = pickLayout(await knownLayouts(), { format, romSha1: createHash("sha1").update(rom).digest("hex") });
  expect(picked, `${title}: no layout lists its ROM`).toMatchObject({ checked: true, layout: { target: { format } } });

  const spaces = decodeSpaces(found.save, picked!.layout);
  const [trainer, items] = ["section:0", "section:1"].map((name) => spaces.find((space) => space.name === name)!);
  const name = range(trainer, "Trainer name")!;
  const money = range(items, "Money")!;
  const key = range(trainer, "Security key");

  const card = await engine.trainer.get();
  expect(readGen3Text(trainer.bytes.subarray(name.offset, name.offset + name.length)), found.path).toBe(card.name);
  const securityKey = key ? readU32(trainer.bytes, key.offset) : 0;
  expect((readU32(items.bytes, money.offset) ^ securityKey) >>> 0, found.path).toBe(card.money);
});
