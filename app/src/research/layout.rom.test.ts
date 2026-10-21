// @vitest-environment node
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, createReadStream, openSync, readFileSync, readSync } from "node:fs";
import type { Readable } from "node:stream";
import { expect, it } from "vitest";
import { decodeSpaces, pickLayout, readSave, type PickedLayout } from "./layout";
import { data, files, findSave, gen3Text } from "@/testing/research";
import { readValues } from "./values";

const hacks = ["Unbound", "Radical Red", "Imperium"];

// Far enough to reach a 3DS card's first partition header.
const HEAD = 0x4200;

type Rom = { head: Buffer; bytes(): Buffer; sha1(): Promise<string> };

async function sha1Of(stream: Readable) {
  const hash = createHash("sha1");
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
}

async function sha1OfUnzipped(path: string, pattern: string) {
  const unzip = spawn("unzip", ["-p", path, pattern]);
  const exited = new Promise<number | null>((resolve, reject) => unzip.on("error", reject).on("close", resolve));
  const [sha1, code] = await Promise.all([sha1Of(unzip.stdout), exited]);
  if (code !== 0) throw new Error(`unzip exited with ${code} on ${path}`);
  return sha1;
}

function fileRom(path: string): Rom {
  const head = Buffer.alloc(HEAD);
  const fd = openSync(path, "r");
  let read: number;
  try {
    read = readSync(fd, head, 0, HEAD, 0);
  } finally {
    closeSync(fd);
  }
  return { head: head.subarray(0, read), bytes: () => readFileSync(path), sha1: () => sha1Of(createReadStream(path)) };
}

function zipRom(path: string, entry: string): Rom {
  // unzip reads an entry name as a pattern, and dump names hold brackets.
  const pattern = entry.replace(/[[\]*?]/g, "\\$&");
  return {
    head: execFileSync("sh", ["-c", `unzip -p "$1" "$2" | head -c ${HEAD}`, "sh", path, pattern]),
    bytes: () => execFileSync("unzip", ["-p", path, pattern], { maxBuffer: 64 << 20 }),
    sha1: () => sha1OfUnzipped(path, pattern),
  };
}

function romsIn(path: string, extension: RegExp): Rom[] {
  if (extension.test(path)) return [fileRom(path)];
  if (!/\.zip$/i.test(path)) return [];
  const entries = execFileSync("unzip", ["-Z1", path], { encoding: "utf8" }).split("\n").filter((entry) => extension.test(entry));
  return entries.map((entry) => zipRom(path, entry));
}

const findRom = (extension: RegExp, fits: (rom: Rom) => boolean) =>
  [`${data}roms`, `${data}test-folder`]
    .flatMap(files)
    .flatMap((path) => romsIn(path, extension))
    .find(fits);

// Hacks keep their base game's header, so they're told apart by their name in the ROM.
const nameIn = (rom: Buffer, name: string) => rom.includes(Buffer.from(gen3Text(name)));

const gbaRom =
  (code: string, revision: number, hack?: string) =>
  ({ head, bytes }: Rom) => {
    if (head.toString("latin1", 0xac, 0xb0) !== code || head[0xbc] !== revision) return false;
    const rom = bytes();
    return hack ? nameIn(rom, hack) : !hacks.some((name) => nameIn(rom, name));
  };

const gbRom =
  (title: string, checksum: number) =>
  ({ head }: Rom) =>
    head.length >= 0x150 && head.toString("latin1", 0x134, 0x134 + title.length) === title && head.readUInt16BE(0x14e) === checksum;

const dsRom =
  (code: string, revision: number) =>
  ({ head }: Rom) =>
    head.length >= 0x200 && head.toString("latin1", 0x0c, 0x10) === code && head[0x1e] === revision;

const threeDsRom =
  (code: string, revision: number) =>
  ({ head }: Rom) => {
    if (head.length < 0x320 || head.toString("latin1", 0x100, 0x104) !== "NCSD") return false;
    const partition = head.readUInt32LE(0x120) * 0x200;
    return head.length >= partition + 0x160 && head.toString("latin1", partition + 0x150, partition + 0x150 + code.length) === code && head.readUInt16LE(0x312) === revision;
  };

type Trainer = { trainer: { name: string } };

async function expectRead(save: Uint8Array, path: string, picked: PickedLayout) {
  const spaces = await decodeSpaces(save, picked.layout);
  expect(spaces.flatMap(({ ranges }) => ranges)).toContainEqual(expect.objectContaining({ id: "money" }));
  const { trainer } = (await readSave(save, picked.layout)) as unknown as Trainer;
  expect(trainer.name, path).not.toBe("");
  const { pouches } = await readValues(save, picked.layout);
  expect(pouches.length, path).toBeGreaterThan(0);
}

const gb = /\.gbc?$/i;
const nds = /\.nds$/i;

it.for([
  { title: "Red", rom: "POKEMON RED, global checksum 0x91E6", extension: gb, fits: gbRom("POKEMON RED", 0x91e6), format: "rby", checked: true },
  { title: "Yellow", rom: "POKEMON YELLOW, global checksum 0x047C", extension: gb, fits: gbRom("POKEMON YELLOW", 0x047c), format: "rby", checked: true },
  { title: "Crystal", rom: "PM_CRYSTAL, global checksum 0x18D2", extension: gb, fits: gbRom("PM_CRYSTAL", 0x18d2), format: "crystal", checked: true },
  { title: "Ruby", rom: "AXVE revision 1", extension: /\.gba$/i, fits: gbaRom("AXVE", 1), format: "rs", checked: true },
  { title: "Sapphire", rom: "AXPE revision 2", extension: /\.gba$/i, fits: gbaRom("AXPE", 2), format: "rs", checked: true },
  { title: "Emerald", rom: "BPEE revision 0", extension: /\.gba$/i, fits: gbaRom("BPEE", 0), format: "emerald", checked: true },
  { title: "FireRed", rom: "BPRE revision 1", extension: /\.gba$/i, fits: gbaRom("BPRE", 1), format: "frlg", checked: true },
  { title: "Unbound", rom: "BPRE revision 0", extension: /\.gba$/i, fits: gbaRom("BPRE", 0, "Unbound"), format: "unbound", checked: true },
  { title: "Radical Red", rom: "BPRE revision 0", extension: /\.gba$/i, fits: gbaRom("BPRE", 0, "Radical Red"), format: "radicalred", checked: true },
  { title: "Imperium", rom: "BPEE revision 0", extension: /\.gba$/i, fits: gbaRom("BPEE", 0, "Imperium"), format: "emerald-imperium", checked: false },
  { title: "Diamond", rom: "ADAE revision 13", extension: nds, fits: dsRom("ADAE", 13), format: "dp", checked: true },
  { title: "Platinum", rom: "CPUE revision 1", extension: nds, fits: dsRom("CPUE", 1), format: "pt", checked: true },
  { title: "SoulSilver", rom: "IPGE revision 0", extension: nds, fits: dsRom("IPGE", 0), format: "hgss", checked: true },
  { title: "Black", rom: "IRBO revision 0", extension: nds, fits: dsRom("IRBO", 0), format: "bw", checked: true },
  { title: "White 2", rom: "IRDO revision 0", extension: nds, fits: dsRom("IRDO", 0), format: "b2w2", checked: true },
  // The X dump here is decrypted, and No-Intro lists only encrypted 3DS dumps.
  { title: "X", rom: "CTR-P-EKJA revision 0", extension: /\.3ds$/i, fits: threeDsRom("CTR-P-EKJA", 0), format: "xy", checked: false },
])("reads a $title save through the layout its ROM picks", { timeout: 300_000 }, async (row, { skip }) => {
  const { title, extension, fits, format, checked } = row;
  const rom = findRom(extension, fits);
  if (!rom) return skip(`needs a ${title} ROM (${row.rom}) in data/roms/ or data/test-folder/`);
  const sha1 = await rom.sha1();
  const found = findSave(format, sha1);
  if (!found) return skip(`needs a ${title} save in data/saves/`);

  const picked = await pickLayout(found.save, { romSha1: sha1, romHack: false });
  expect(picked, `${title}: no layout picked with ROM ${sha1}`).toMatchObject({ checked, layout: { target: { format } } });
  await expectRead(found.save, found.path, picked!);
});

it("reads a Colosseum memory card through its layout", { timeout: 300_000 }, async ({ skip }) => {
  const found = findSave("memory-card-colosseum");
  if (!found) return skip("needs a raw memory card with a Colosseum save in data/saves/");

  const picked = await pickLayout(found.save, { romSha1: null, romHack: false });
  expect(picked).toMatchObject({ checked: false, layout: { target: { format: "memory-card-colosseum" } } });
  await expectRead(found.save, found.path, picked!);
});
