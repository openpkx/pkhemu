// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gen3Sections, pk3Crypt } from "./transforms";

const transforms = new URL("./layouts/transforms/", import.meta.url);
const doc = (name: string) => readFileSync(new URL(name, transforms), "utf8");
const vector = (name: string) => new Uint8Array(readFileSync(new URL(`vectors/${name}`, transforms)));
const hexBytes = (text: string) => Uint8Array.from(text.trim().split(/\s+/), (pair) => parseInt(pair, 16));
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function headings(text: string) {
  return text
    .split(/^### /m)
    .slice(1)
    .map((part) => ({ title: part.slice(0, part.indexOf("\n")), body: part }));
}

describe("pk3-crypt", () => {
  const pokemon = headings(doc("pk3-crypt.md")).map(({ title, body }) => {
    const [encrypted, decoded] = [...body.matchAll(/```\n([^`]+)```/g)].map(([, bytes]) => hexBytes(bytes));
    return { title, encrypted, decoded };
  });

  it("has the doc's three vectors", () => expect(pokemon.map(({ title }) => title)).toEqual(["box:1:1", "box:1:2", "box:1:3"]));

  it.each(pokemon)("decodes $title", ({ encrypted, decoded }) => {
    expect(pk3Crypt(encrypted)).toEqual(decoded);
  });

  it("decodes a party Pokémon's 100 bytes, keeping the plain stats after the substructures", () => {
    const party = new Uint8Array(100);
    party.set(pokemon[0].encrypted);
    party.fill(0x2a, 80);

    const decoded = pk3Crypt(party);

    expect(decoded.slice(0, 80)).toEqual(pokemon[0].decoded);
    expect(decoded.slice(80)).toEqual(new Uint8Array(20).fill(0x2a));
  });

  it("decodes an empty slot to zeros", () => expect(pk3Crypt(new Uint8Array(80))).toEqual(new Uint8Array(80)));
});

describe("gen3-sections", () => {
  const saves = headings(doc("gen3-sections.md")).map(({ title, body }) => ({
    file: title,
    length: parseInt(body.match(/With `length` (0x[0-9A-F]+)/)![1], 16),
    sections: [...body.matchAll(/^\| (\d+) \| 0x[0-9A-F]+ \| ([0-9a-f]{64}) \|$/gm)].map(([, section, hash]) => ({
      section: Number(section),
      hash,
    })),
    bytes: [...body.matchAll(/^- `section:(\d+)` (0x[0-9A-F]+), [^:]+: `([0-9A-F ]+)`/gm)].map(([, section, offset, bytes]) => ({
      section: Number(section),
      offset: parseInt(offset, 16),
      bytes: hexBytes(bytes),
    })),
  }));

  it("has the doc's vectors", () => {
    expect(saves.map(({ file }) => file)).toEqual(["frlg.sav", "unbound.sav"]);
    for (const { sections } of saves) expect(sections.map(({ section }) => section)).toEqual([...Array(14).keys()]);
  });

  it.each(saves)("reads every section of $file", ({ file, length, sections, bytes }) => {
    const save = vector(file);
    for (const { section, hash } of sections) expect(sha256(gen3Sections(save, { section }, length)), `section ${section}`).toBe(hash);
    for (const { section, offset, bytes: expected } of bytes)
      expect(gen3Sections(save, { section }, length).slice(offset, offset + expected.length)).toEqual(expected);
  });

  it("reads a sector where it sits", () => {
    const save = vector("frlg.sav");
    expect(gen3Sections(save, { sector: 0x17 }, 0xf80)).toEqual(save.slice(0x17000, 0x17f80));
  });

  const slotBCopiedToA = () => {
    const save = vector("frlg.sav");
    save.copyWithin(0, 0xe000, 0x1c000);
    save[0] = 0x2a;
    return save;
  };
  const setCounter = (save: Uint8Array, slot: number, counter: number) => {
    for (let sector = 0; sector < 14; sector++) new DataView(save.buffer).setUint32((slot * 14 + sector) * 0x1000 + 0xffc, counter, true);
  };

  it("takes slot A when both slots hold the same counter", () => {
    expect(gen3Sections(slotBCopiedToA(), { section: 5 }, 0xf80)[0]).toBe(0x2a);
  });

  it("takes the slot whose counter wrapped to 0 as the newer", () => {
    const save = slotBCopiedToA();
    setCounter(save, 0, 0xffffffff);
    setCounter(save, 1, 0);
    expect(gen3Sections(save, { section: 5 }, 0xf80)[0]).not.toBe(0x2a);
    setCounter(save, 0, 0);
    setCounter(save, 1, 0xffffffff);
    expect(gen3Sections(save, { section: 5 }, 0xf80)[0]).toBe(0x2a);
  });

  it("takes the only valid slot, whatever its counter", () => {
    const save = slotBCopiedToA();
    setCounter(save, 0, 1);
    new DataView(save.buffer).setUint16(0xe000 + 0xff4, 0, true);
    new DataView(save.buffer).setUint16(0xf000 + 0xff4, 0, true);
    expect(gen3Sections(save, { section: 5 }, 0xf80)[0]).toBe(0x2a);
  });

  it("refuses a file that isn't a Gen 3 save", () => {
    expect(() => gen3Sections(new Uint8Array(0x20000), { section: 0 }, 0xf80)).toThrow("isn't a Gen 3 save");
  });
});
