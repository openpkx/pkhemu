import { expect, it } from "vitest";
import { knownLayouts, layoutFormat, pickLayout, type Layout } from "./layout";

const fireRedRev1 = "dd5945db9b930750cb39d00c84da8571feebf417";
const unknownRom = "0000000000000000000000000000000000000000";

const layout = (format: string, version: string, roms: string[] = []): Layout => ({
  target: { kind: "save", format, version, roms: roms.map((sha1) => ({ sha1, name: sha1 })) },
  spaces: [],
});

it("picks the known layout whose ROMs hold the game's SHA-1", async () => {
  const picked = pickLayout(await knownLayouts(), { format: "frlg", romSha1: fireRedRev1 });

  expect(picked?.layout.target).toMatchObject({ format: "frlg", version: "1.0" });
  expect(picked?.checked).toBe(true);
  expect(pickLayout(await knownLayouts(), { format: "frlg", romSha1: fireRedRev1.toUpperCase() })?.checked).toBe(true);
});

it("prefers the SHA-1 over the save format", () => {
  const hotfix = layout("unbound", "2.0", ["a".repeat(40)]);
  const picked = pickLayout([layout("unbound", "2.1"), hotfix], { format: "unbound", romSha1: "a".repeat(40) });
  expect(picked).toEqual({ layout: hotfix, checked: true });
});

it("falls back to the newest layout for the save format, not checked against the ROM", () => {
  const newest = layout("unbound", "2.10");
  const picked = pickLayout([layout("unbound", "2.9"), newest, layout("frlg", "3.0")], { format: "unbound", romSha1: unknownRom });
  expect(picked).toEqual({ layout: newest, checked: false });
});

it("has no layout for a game with neither", async () => {
  expect(pickLayout(await knownLayouts(), { format: "radicalred", romSha1: unknownRom })).toBeUndefined();
});

it("names the layout format of the engine's save version", () => {
  expect(layoutFormat({ versionId: 1, formatId: null })).toBe("rs");
  expect(layoutFormat({ versionId: 2, formatId: null })).toBe("rs");
  expect(layoutFormat({ versionId: 3, formatId: null })).toBe("emerald");
  expect(layoutFormat({ versionId: 4, formatId: null })).toBe("frlg");
  expect(layoutFormat({ versionId: 5, formatId: null })).toBe("frlg");
  expect(layoutFormat({ versionId: 4, formatId: "unbound" })).toBe("unbound");
  expect(layoutFormat({ versionId: 10, formatId: null })).toBeUndefined();
});
