import { expect, it } from "vitest";
import { identifyBuild, type Range } from "./builds";

function rom(at: Record<number, number[]>) {
  const asked: Range[] = [];
  const read = async (ranges: Range[]) => {
    asked.push(...ranges);
    return Uint8Array.from(
      ranges.flatMap(({ address, length }) => {
        const bytes = at[address];
        if (bytes?.length !== length) throw new Error(`${length} bytes at ${address.toString(16)} aren't mapped`);
        return bytes;
      }),
    );
  };
  return { read, asked };
}

const ascii = (code: string) => [...code].map((c) => c.charCodeAt(0));
const gba = (code: string, revision: number) => rom({ 0x080000ac: ascii(code), 0x080000bc: [revision] });

it.each([
  ["AXVE", 0, "Ruby EN 1.0", 2],
  ["AXVE", 1, "Ruby EN 1.1", 2],
  ["AXPE", 2, "Sapphire EN 1.2", 1],
  ["BPEE", 0, "Emerald EN", 3],
  ["BPRE", 0, "FireRed EN 1.0", 4],
  ["BPRE", 1, "FireRed EN 1.1", 4],
  ["BPGE", 0, "LeafGreen EN 1.0", 5],
  ["BPGE", 1, "LeafGreen EN 1.1", 5],
])("identifies %s revision %i as %s", async (code, revision, name, version) => {
  const build = await identifyBuild("gba", gba(code, revision).read);

  expect(build).toMatchObject({ name, version, format: "pk3" });
});

const ds = (code: string, revision: number) => rom({ 0x027ffe0c: ascii(code), 0x027ffe1e: [revision] });

it.each([
  ["ADAE", 13, "Diamond EU", 10],
  ["APAE", 13, "Pearl EU", 11],
  ["CPUE", 10, "Platinum US", 12],
  ["IPKE", 0, "HeartGold US", 7],
  ["IPGE", 0, "SoulSilver US", 8],
])("identifies %s revision %i as %s from the header the DS copies into main RAM", async (code, revision, name, version) => {
  const build = await identifyBuild("nds", ds(code, revision).read);

  expect(build).toMatchObject({ name, version, format: "pk4" });
});

it.each([
  ["a game in another language", "BPRF", 0],
  ["a revision that was never released", "BPEE", 1],
  ["a GBA game that isn't Pokémon", "AMKE", 0],
])("finds no build for %s", async (_, code, revision) => {
  expect(await identifyBuild("gba", gba(code, revision).read)).toBe("unsupported");
});

it.each([
  ["IREO", 0, "Black 2 EN", 23],
  ["IRDO", 0, "White 2 EN", 22],
  ["IRBO", 0, "Black EN", 21],
  ["IRAO", 0, "White EN", 20],
])("identifies %s revision %i as %s, a Gen 5 build", async (code, revision, name, version) => {
  const build = await identifyBuild("nds", ds(code, revision).read);

  expect(build).toMatchObject({ name, version, format: "pk5" });
});

it.each([
  ["a Diamond revision we have no addresses for", "ADAE", 5],
  ["a Platinum revision we have no addresses for", "CPUE", 0],
  ["HeartGold in another language", "IPKF", 0],
  ["Black 2 in another language", "IREF", 0],
  ["White in another language", "IRAF", 0],
])("finds no build for %s", async (_, code, revision) => {
  expect(await identifyBuild("nds", ds(code, revision).read)).toBe("unsupported");
});

it.each(["gb", "gbc"] as const)("finds no build on %s without reading memory", async (system) => {
  const nothing = rom({});

  expect(await identifyBuild(system, nothing.read)).toBe("unsupported");
  expect(nothing.asked).toEqual([]);
});
